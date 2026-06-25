/**
 * @fileoverview Brand Extractor - orchestrates parsing and normalizes results into BrandIdentity.
 * Detects source type (path vs URL), validates file size, delegates to appropriate parsers,
 * and normalizes extraction results into a BrandIdentity object.
 * @module lib/brand/extractor
 */

/** @typedef {import('./types.js').BrandIdentity} BrandIdentity */
/** @typedef {import('./types.js').RawExtraction} RawExtraction */
/** @typedef {import('./types.js').LogoAsset} LogoAsset */
/** @typedef {import('./types.js').LayoutPattern} LayoutPattern */

import { parseColor, luminance } from './color-utils.js';
import { stat, readFile } from 'node:fs/promises';
import { extname } from 'node:path';

/**
 * Per-format file size limits in bytes.
 * @type {Record<string, number>}
 */
const SIZE_LIMITS = {
    pptx: 100 * 1024 * 1024,   // 100 MB
    ppt: 100 * 1024 * 1024,    // 100 MB
    pdf: 100 * 1024 * 1024,    // 100 MB
    css: 10 * 1024 * 1024,     // 10 MB
    html: 10 * 1024 * 1024,    // 10 MB
    csv: 10 * 1024 * 1024,     // 10 MB
    svg: 10 * 1024 * 1024,     // 10 MB
    image: 50 * 1024 * 1024,   // 50 MB
    zip: 200 * 1024 * 1024,    // 200 MB
};

/**
 * File extension to format mapping.
 * @type {Record<string, string>}
 */
const EXTENSION_TO_FORMAT = {
    '.css': 'css',
    '.html': 'html',
    '.svg': 'svg',
    '.csv': 'csv',
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.webp': 'image',
    '.pdf': 'pdf',
    '.pptx': 'pptx',
    '.ppt': 'pptx',
    '.zip': 'zip',
};

/**
 * Format to parser module path mapping.
 * @type {Record<string, string>}
 */
const FORMAT_TO_PARSER = {
    css: './parsers/css.js',
    html: './parsers/html.js',
    svg: './parsers/svg.js',
    csv: './parsers/csv.js',
    image: './parsers/image.js',
    pdf: './parsers/pdf.js',
    pptx: './parsers/pptx.js',
    zip: './parsers/zip.js',
};

/**
 * Text-based formats that should be read with utf-8 encoding.
 * @type {Set<string>}
 */
const TEXT_FORMATS = new Set(['css', 'html', 'svg', 'csv']);

/**
 * All supported file extensions for error messages.
 * @type {string[]}
 */
const SUPPORTED_EXTENSIONS = ['.ppt', '.pptx', '.pdf', '.css', '.html', '.csv', '.svg', '.png', '.jpg', '.webp', '.zip'];

/**
 * Convert an RGB object to a normalized #RRGGBB hex string.
 * @param {{r: number, g: number, b: number}} rgb
 * @returns {string}
 */
function rgbToHex({ r, g, b }) {
    const toHex = (c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Determine whether a source string is a URL.
 * @param {string} source - File path or URL string
 * @returns {boolean}
 */
function isURL(source) {
    return source.startsWith('http://') || source.startsWith('https://');
}

/**
 * Detect the format from a file extension.
 * @param {string} filePath - The file path to examine
 * @returns {string} The format identifier
 * @throws {Error} If the extension is not supported
 */
function detectFormat(filePath) {
    const ext = extname(filePath).toLowerCase();
    const format = EXTENSION_TO_FORMAT[ext];
    if (!format) {
        throw new Error(
            `Unsupported file format: "${ext}". Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`
        );
    }
    return format;
}

/**
 * Get the size limit key for a format.
 * @param {string} format - The detected format
 * @param {string} ext - The file extension (lowercase with dot)
 * @returns {number} The maximum file size in bytes
 */
function getSizeLimit(format, ext) {
    // For pptx/ppt formats, use the extension without dot as the key
    if (format === 'pptx') {
        const key = ext.slice(1); // '.pptx' → 'pptx', '.ppt' → 'ppt'
        return SIZE_LIMITS[key] || SIZE_LIMITS.pptx;
    }
    return SIZE_LIMITS[format] || SIZE_LIMITS.css;
}

/**
 * Format file size for human-readable display.
 * @param {number} bytes - Size in bytes
 * @returns {string}
 */
function formatSize(bytes) {
    if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} bytes`;
}

/**
 * Determine background color from a list of extracted colors.
 * Groups colors by luminance into light (>= 0.5) and dark (< 0.5) ranges.
 * Background is the lightest or darkest color from the group with more members.
 * @param {string[]} colors - Array of hex color strings
 * @returns {string} Background hex color
 */
function determineBackground(colors) {
    if (colors.length === 0) return '#ffffff';

    const colorData = colors.map((hex) => {
        const rgb = parseColor(hex);
        const lum = luminance(rgb.r, rgb.g, rgb.b);
        return { hex, rgb, lum };
    });

    const lightColors = colorData.filter((c) => c.lum >= 0.5);
    const darkColors = colorData.filter((c) => c.lum < 0.5);

    if (lightColors.length >= darkColors.length) {
        // More light colors → pick the lightest as background
        lightColors.sort((a, b) => b.lum - a.lum);
        return lightColors[0].hex;
    } else {
        // More dark colors → pick the darkest as background
        darkColors.sort((a, b) => a.lum - b.lum);
        return darkColors[0].hex;
    }
}

/**
 * Determine the mode (light/dark) based on background color luminance.
 * @param {string} bgHex - Background color hex string
 * @returns {'light' | 'dark'}
 */
function classifyMode(bgHex) {
    const rgb = parseColor(bgHex);
    const lum = luminance(rgb.r, rgb.g, rgb.b);
    return lum < 0.5 ? 'dark' : 'light';
}

/**
 * Extract brand identity from a source file or URL.
 *
 * @param {Object} options - Extraction options
 * @param {string} options.source - File path or URL to extract from
 * @param {number} [options.timeout=30000] - URL fetch timeout in ms
 * @param {number} [options.maxFileSize] - Override per-format size limits
 * @returns {Promise<BrandIdentity>} Normalized brand identity
 * @throws {Error} If source is not found, format is unsupported, file is too large, or parsing fails
 */
export async function extract(options) {
    const { source, timeout = 30000 } = options;

    if (!source || typeof source !== 'string') {
        throw new Error('Source is required and must be a string (file path or URL)');
    }

    // URL source: delegate directly to URL parser
    if (isURL(source)) {
        const urlParser = await import('./parsers/url.js');
        const parseResult = await urlParser.parse(source);
        return normalizeResult(parseResult, 'url');
    }

    // File path source: validate existence, size, and format
    let fileStat;
    try {
        fileStat = await stat(source);
    } catch {
        throw new Error(`File not found: ${source}`);
    }

    const ext = extname(source).toLowerCase();
    const format = detectFormat(source);
    const sizeLimit = options.maxFileSize || getSizeLimit(format, ext);

    if (fileStat.size > sizeLimit) {
        throw new Error(
            `File exceeds maximum size for ${format} format. ` +
            `File size: ${formatSize(fileStat.size)}, maximum allowed: ${formatSize(sizeLimit)}`
        );
    }

    // Read the file
    const isText = TEXT_FORMATS.has(format);
    const fileContent = await readFile(source, isText ? 'utf-8' : undefined);

    // Load and run the appropriate parser
    const parserPath = FORMAT_TO_PARSER[format];
    const parser = await import(parserPath);
    const parseResult = await parser.parse(fileContent);

    // Use the source format from the extension for the identity
    const sourceFormat = ext.slice(1); // '.pptx' → 'pptx'

    return normalizeResult(parseResult, sourceFormat);
}

/**
 * Normalize a ParseResult into a BrandIdentity.
 * Applies color selection logic, mode classification, and font defaults.
 *
 * @param {import('./types.js').ParseResult} parseResult - Raw extraction from parser
 * @param {string} sourceFormat - Source format identifier
 * @returns {BrandIdentity}
 */
function normalizeResult(parseResult, sourceFormat) {
    const { colors = [], fonts = [], logos = [], layouts = [] } = parseResult;

    // Determine primary color (first in list = most frequent)
    const primary = colors.length > 0 ? colors[0] : null;

    // Determine secondary color (second in list, if distinct)
    const secondary = colors.length > 1 ? colors[1] : undefined;

    // Determine background color
    let background;
    if (colors.length > 1) {
        background = determineBackground(colors);
    } else if (colors.length === 1) {
        // Single color → determine default background based on primary luminance
        const rgb = parseColor(primary);
        const lum = luminance(rgb.r, rgb.g, rgb.b);
        background = lum < 0.5 ? '#1a1a1a' : '#ffffff';
    } else {
        // No colors → default light background
        background = '#ffffff';
    }

    // Classify mode from background
    const mode = classifyMode(background);

    // Handle fonts
    let headingFont, bodyFont, fontsDefaulted;
    if (fonts.length > 0) {
        headingFont = fonts[0];
        bodyFont = fonts.length > 1 ? fonts[1] : fonts[0];
        fontsDefaulted = false;
    } else {
        headingFont = 'Inter';
        bodyFont = 'Inter';
        fontsDefaulted = true;
    }

    // Normalize logos into LogoAsset format
    const normalizedLogos = logos.map((logo, idx) => {
        if (Buffer.isBuffer(logo)) {
            return {
                buffer: logo,
                filename: `logo-${idx + 1}.png`,
                format: 'png',
            };
        }
        // If already a LogoAsset object, pass through
        return logo;
    });

    /** @type {BrandIdentity} */
    const identity = {
        primary: primary || '#000000',
        background,
        mode,
        headingFont,
        bodyFont,
        fontsDefaulted,
        logos: normalizedLogos,
        layouts,
        sourceFormat,
    };

    // Only include secondary if it's defined
    if (secondary) {
        identity.secondary = secondary;
    }

    return identity;
}
