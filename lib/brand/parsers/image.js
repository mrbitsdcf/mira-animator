/**
 * @fileoverview Image parser - extracts dominant colors via quantization from PNG/JPG/WEBP.
 * Uses sharp for pixel access and quantize for median-cut color extraction.
 * @module lib/brand/parsers/image
 */

/** @typedef {import('../types.js').ParseResult} ParseResult */

const MAX_COLORS = 12;
const MAX_DIMENSION = 200;

/**
 * Threshold for near-white colors to filter out (background noise).
 * Any color where ALL components are >= 0xF0 is considered near-white.
 */
const NEAR_WHITE_THRESHOLD = 0xF0;

/**
 * Threshold for near-black colors to filter out (background noise).
 * Any color where ALL components are <= 0x10 is considered near-black.
 */
const NEAR_BLACK_THRESHOLD = 0x10;

/**
 * Check if a color is near-white (#f0f0f0+).
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {boolean}
 */
function isNearWhite(r, g, b) {
    return r >= NEAR_WHITE_THRESHOLD && g >= NEAR_WHITE_THRESHOLD && b >= NEAR_WHITE_THRESHOLD;
}

/**
 * Check if a color is near-black (#101010-).
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {boolean}
 */
function isNearBlack(r, g, b) {
    return r <= NEAR_BLACK_THRESHOLD && g <= NEAR_BLACK_THRESHOLD && b <= NEAR_BLACK_THRESHOLD;
}

/**
 * Convert RGB components to a #RRGGBB hex string.
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {string}
 */
function rgbToHex(r, g, b) {
    const toHex = (c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Parse an image (Buffer or file path) and extract dominant colors
 * using median-cut color quantization.
 *
 * @param {Buffer | string} source - Image data as Buffer or a file path string
 * @returns {Promise<ParseResult>} Extraction result with dominant colors
 */
export async function parse(source) {
    // Lazy-import sharp and quantize
    const { default: sharp } = await import('sharp');
    const { default: quantize } = await import('quantize');

    // Load image: source can be a Buffer or a file path string
    let image = sharp(source);

    // Resize to max 200x200 for performance (preserve aspect ratio)
    image = image.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
    });

    // Get raw RGBA pixel data
    const { data, info } = await image
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const pixelCount = width * height;

    // Build pixel array for quantize: array of [R, G, B]
    // Skip fully transparent pixels (alpha < 128)
    const pixels = [];
    for (let i = 0; i < pixelCount; i++) {
        const offset = i * channels;
        const a = data[offset + 3];
        if (a < 128) continue; // skip transparent pixels

        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        pixels.push([r, g, b]);
    }

    if (pixels.length === 0) {
        return { colors: [], fonts: [], logos: [], layouts: [] };
    }

    // Run median-cut quantization
    const colorMap = quantize(pixels, MAX_COLORS);

    if (!colorMap) {
        return { colors: [], fonts: [], logos: [], layouts: [] };
    }

    // Get palette ranked by pixel frequency (population)
    const palette = colorMap.palette();

    // Filter out near-white and near-black colors, deduplicate, convert to hex
    const seen = new Set();
    const colors = [];
    for (const [r, g, b] of palette) {
        if (isNearWhite(r, g, b) || isNearBlack(r, g, b)) continue;
        const hex = rgbToHex(r, g, b);
        if (seen.has(hex)) continue;
        seen.add(hex);
        colors.push(hex);
        if (colors.length >= MAX_COLORS) break;
    }

    return {
        colors,
        fonts: [],
        logos: [],
        layouts: [],
    };
}
