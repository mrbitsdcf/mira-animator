/**
 * @fileoverview PDF parser - extracts colors and fonts from PDF documents.
 * Uses pdf-parse for text/metadata extraction and regex patterns
 * to find colors in content streams and text.
 * @module lib/brand/parsers/pdf
 */

/** @typedef {import('../types.js').ParseResult} ParseResult */

import { parseColor } from '../color-utils.js';

const MAX_COLORS = 12;
const MAX_FONTS = 5;

/**
 * Convert an RGB object to a normalized #RRGGBB hex string.
 * @param {{r: number, g: number, b: number}} rgb
 * @returns {string}
 */
function rgbToHex({ r, g, b }) {
    const toHex = (c) => Math.min(255, Math.max(0, Math.round(c))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Try to parse a color string and add its normalized hex to the set.
 * Silently skips colors that can't be parsed.
 * @param {string} colorStr - Raw color string
 * @param {Set<string>} colorSet - Set of normalized hex values
 */
function tryAddColor(colorStr, colorSet) {
    if (colorSet.size >= MAX_COLORS) return;
    try {
        const rgb = parseColor(colorStr);
        const hex = rgbToHex(rgb).toLowerCase();
        colorSet.add(hex);
    } catch {
        // Skip unparseable colors
    }
}

/**
 * Extract colors from PDF text content.
 * Looks for hex (#RGB, #RRGGBB), rgb(), and hsl() patterns.
 * @param {string} text - Extracted PDF text
 * @param {Set<string>} colorSet - Set to accumulate colors into
 */
function extractColorsFromText(text, colorSet) {
    if (!text) return;

    // Match hex colors: #RGB or #RRGGBB
    const hexPattern = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
    let match;
    while ((match = hexPattern.exec(text)) !== null) {
        tryAddColor(match[0], colorSet);
    }

    // Match rgb() and rgba()
    const rgbPattern = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/gi;
    while ((match = rgbPattern.exec(text)) !== null) {
        tryAddColor(match[0], colorSet);
    }

    // Match hsl() and hsla()
    const hslPattern = /hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%(?:\s*,\s*[\d.]+)?\s*\)/gi;
    while ((match = hslPattern.exec(text)) !== null) {
        tryAddColor(match[0], colorSet);
    }
}

/**
 * Extract colors from PDF content stream operators.
 * Parses rg/RG (RGB fill/stroke) and k/K (CMYK fill/stroke) operators.
 *
 * PDF color operators:
 * - `R G B rg` → fill color RGB (values 0-1, multiply by 255)
 * - `R G B RG` → stroke color RGB (values 0-1, multiply by 255)
 * - `C M Y K k` → fill CMYK (convert: R=255*(1-C)*(1-K), G=255*(1-M)*(1-K), B=255*(1-Y)*(1-K))
 * - `C M Y K K` → stroke CMYK
 *
 * @param {string} text - Raw PDF text/content that may contain stream operators
 * @param {Set<string>} colorSet - Set to accumulate colors into
 */
function extractColorsFromContentStream(text, colorSet) {
    if (!text) return;

    // Match RGB operators: "0.5 0.2 0.8 rg" or "0.5 0.2 0.8 RG"
    const rgbOpPattern = /([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(rg|RG)\b/g;
    let match;
    while ((match = rgbOpPattern.exec(text)) !== null) {
        if (colorSet.size >= MAX_COLORS) break;
        const r = Math.round(parseFloat(match[1]) * 255);
        const g = Math.round(parseFloat(match[2]) * 255);
        const b = Math.round(parseFloat(match[3]) * 255);
        if (isValidComponent(r) && isValidComponent(g) && isValidComponent(b)) {
            const hex = rgbToHex({ r, g, b }).toLowerCase();
            colorSet.add(hex);
        }
    }

    // Match CMYK operators: "0.1 0.2 0.3 0.0 k" or "0.1 0.2 0.3 0.0 K"
    const cmykOpPattern = /([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(k|K)\b/g;
    while ((match = cmykOpPattern.exec(text)) !== null) {
        if (colorSet.size >= MAX_COLORS) break;
        const c = parseFloat(match[1]);
        const m = parseFloat(match[2]);
        const y = parseFloat(match[3]);
        const k = parseFloat(match[4]);
        // CMYK to RGB conversion
        const r = Math.round(255 * (1 - c) * (1 - k));
        const g = Math.round(255 * (1 - m) * (1 - k));
        const b = Math.round(255 * (1 - y) * (1 - k));
        if (isValidComponent(r) && isValidComponent(g) && isValidComponent(b)) {
            const hex = rgbToHex({ r, g, b }).toLowerCase();
            colorSet.add(hex);
        }
    }
}

/**
 * Check if a component value is within valid RGB range.
 * @param {number} value
 * @returns {boolean}
 */
function isValidComponent(value) {
    return Number.isFinite(value) && value >= 0 && value <= 255;
}

/**
 * Extract font information from PDF metadata and text.
 * Looks at metadata fields like Creator, Producer, and embedded font references.
 * @param {object} info - PDF metadata info object from pdf-parse
 * @param {string} text - Extracted text content
 * @returns {string[]} Array of unique font family names, max 5
 */
function extractFonts(info, text) {
    const found = new Set();

    // Extract font hints from metadata
    if (info) {
        // Creator field often contains font info (e.g., "Adobe InDesign" with font metadata)
        const metaFields = [info.Creator, info.Producer, info.Author];
        for (const field of metaFields) {
            if (typeof field === 'string') {
                extractFontNamesFromString(field, found);
            }
        }
    }

    // Look for font references in the text (common in PDF metadata/bookmarks)
    if (text) {
        // Match common font-family patterns that might appear in embedded text
        const fontPattern = /(?:font-family|FontName|BaseFont)[:\s]*['"]?([A-Za-z][A-Za-z0-9\s-]+)/gi;
        let match;
        while ((match = fontPattern.exec(text)) !== null) {
            const fontName = cleanFontName(match[1]);
            if (fontName && found.size < MAX_FONTS) {
                found.add(fontName);
            }
        }

        // Match PostScript font name patterns (e.g., /Helvetica, /TimesNewRoman-Bold)
        const psPattern = /\/([A-Z][A-Za-z]+-?[A-Za-z]*)/g;
        while ((match = psPattern.exec(text)) !== null) {
            if (found.size >= MAX_FONTS) break;
            const fontName = cleanFontName(match[1]);
            if (fontName) {
                found.add(fontName);
            }
        }
    }

    return Array.from(found).slice(0, MAX_FONTS);
}

/**
 * Extract font names from a metadata string.
 * @param {string} str - Metadata field value
 * @param {Set<string>} fontSet - Set to add found fonts to
 */
function extractFontNamesFromString(str, fontSet) {
    // Common font families that might appear in Creator/Producer fields
    const knownFonts = [
        'Helvetica', 'Arial', 'Times New Roman', 'Times',
        'Courier', 'Verdana', 'Georgia', 'Tahoma',
        'Calibri', 'Cambria', 'Segoe UI', 'Roboto',
        'Open Sans', 'Lato', 'Montserrat', 'Oswald',
        'Raleway', 'Poppins', 'Noto Sans', 'Source Sans Pro',
    ];

    for (const font of knownFonts) {
        if (fontSet.size >= MAX_FONTS) break;
        if (str.includes(font)) {
            fontSet.add(font);
        }
    }
}

/**
 * Clean and validate a font name extracted from PDF content.
 * Removes weight/style suffixes and validates the result.
 * @param {string} raw - Raw font name
 * @returns {string|null} Cleaned font name, or null if invalid
 */
function cleanFontName(raw) {
    if (!raw || raw.length < 2) return null;

    // Remove common suffixes (Bold, Italic, Regular, etc.)
    let name = raw
        .replace(/[-,](Bold|Italic|Regular|Light|Medium|Thin|Black|ExtraBold|SemiBold|ExtraLight)\b/gi, '')
        .replace(/\s+(Bold|Italic|Regular|Light|Medium|Thin|Black|ExtraBold|SemiBold|ExtraLight)\s*$/gi, '')
        .trim();

    // Skip very short names or purely numeric
    if (name.length < 2 || /^\d+$/.test(name)) return null;

    // Skip common non-font identifiers
    const skipList = ['Type', 'Identity', 'Encoding', 'CIDFont', 'TrueType', 'CMap'];
    if (skipList.includes(name)) return null;

    return name;
}

/**
 * Parse a PDF buffer and extract brand identity elements.
 * @param {Buffer} source - PDF file data as a Buffer
 * @returns {Promise<ParseResult>} Extraction result with colors and fonts
 * @throws {Error} If pdf-parse cannot process the buffer
 */
export async function parse(source) {
    if (!source || !Buffer.isBuffer(source) || source.length === 0) {
        return { colors: [], fonts: [], logos: [], layouts: [] };
    }

    // Lazy-import pdf-parse
    let pdfParse;
    try {
        const mod = await import('pdf-parse');
        pdfParse = mod.default || mod;
    } catch (err) {
        throw new Error(`Failed to load pdf-parse library: ${err.message}`);
    }

    let data;
    try {
        data = await pdfParse(source);
    } catch (err) {
        throw new Error(`Failed to parse PDF file: ${err.message}. Verify the file is a valid PDF.`);
    }

    const colorSet = new Set();

    // Extract colors from the text content
    const text = data.text || '';
    extractColorsFromText(text, colorSet);

    // Extract colors from content stream operators in the text
    extractColorsFromContentStream(text, colorSet);

    // Extract font information
    const fonts = extractFonts(data.info || {}, text);

    return {
        colors: Array.from(colorSet).slice(0, MAX_COLORS),
        fonts,
        logos: [],
        layouts: [],
    };
}
