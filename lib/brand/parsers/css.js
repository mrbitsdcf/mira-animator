/**
 * @fileoverview CSS parser - extracts colors and font declarations from CSS content.
 * @module lib/brand/parsers/css
 */

/** @typedef {import('../types.js').ParseResult} ParseResult */

import { parseColor } from '../color-utils.js';

/**
 * CSS named colors (17 standard) to detect in source.
 * Must match the set in color-utils.js.
 */
const NAMED_COLORS = [
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
    'gray', 'grey', 'orange', 'purple', 'pink', 'brown', 'navy', 'olive', 'teal',
];

/**
 * Generic font families to filter out (not brand-specific).
 */
const GENERIC_FAMILIES = new Set([
    'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
    'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
]);

const MAX_COLORS = 12;
const MAX_FONTS = 5;

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
 * Extract all color values from CSS content.
 * Finds hex, rgb(), rgba(), hsl(), hsla(), and named colors.
 * @param {string} source - CSS content string
 * @returns {string[]} Array of unique hex color codes (normalized to #RRGGBB), max 12
 */
function extractColors(source) {
    const found = new Set();

    // Match hex colors: #RGB or #RRGGBB
    // Use word boundary to avoid matching things like #container
    const hexPattern = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
    let match;
    while ((match = hexPattern.exec(source)) !== null) {
        tryAddColor(match[0], found);
    }

    // Match rgb() and rgba()
    const rgbPattern = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/gi;
    while ((match = rgbPattern.exec(source)) !== null) {
        tryAddColor(match[0], found);
    }

    // Match hsl() and hsla()
    const hslPattern = /hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%(?:\s*,\s*[\d.]+)?\s*\)/gi;
    while ((match = hslPattern.exec(source)) !== null) {
        tryAddColor(match[0], found);
    }

    // Match named colors as standalone words (property values context)
    // Use word boundary to avoid partial matches
    const namedPattern = new RegExp(`\\b(${NAMED_COLORS.join('|')})\\b`, 'gi');
    while ((match = namedPattern.exec(source)) !== null) {
        tryAddColor(match[1], found);
    }

    return Array.from(found).slice(0, MAX_COLORS);
}

/**
 * Try to parse a color string and add its normalized hex to the set.
 * Silently skips colors that can't be parsed.
 * @param {string} colorStr - Raw color string from CSS
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
 * Extract font-family names from CSS content.
 * Looks for `font-family:` declarations and the `font:` shorthand.
 * Filters out generic families and deduplicates.
 * @param {string} source - CSS content string
 * @returns {string[]} Array of unique font family names, max 5
 */
function extractFonts(source) {
    const found = new Set();

    // Match font-family declarations: font-family: value;
    const fontFamilyPattern = /font-family\s*:\s*([^;}]+)/gi;
    let match;
    while ((match = fontFamilyPattern.exec(source)) !== null) {
        parseFontList(match[1], found);
    }

    // Match font shorthand: font: [style] [variant] [weight] [size/line-height] family[, family...]
    // The font shorthand has size before the family list, so we look for the part after size
    const fontShorthandPattern = /font\s*:\s*(?:(?:italic|oblique|normal|inherit)\s+)?(?:(?:small-caps|normal|inherit)\s+)?(?:(?:bold|bolder|lighter|normal|\d+)\s+)?(?:[\d.]+(?:px|pt|em|rem|%|vw|vh)(?:\s*\/\s*[\d.]+(?:px|pt|em|rem|%)?)?)\s+([^;}]+)/gi;
    while ((match = fontShorthandPattern.exec(source)) !== null) {
        parseFontList(match[1], found);
    }

    return Array.from(found).slice(0, MAX_FONTS);
}

/**
 * Parse a comma-separated font list and add non-generic names to the set.
 * @param {string} fontList - Comma-separated font family list
 * @param {Set<string>} fontSet - Set of font names found
 */
function parseFontList(fontList, fontSet) {
    const families = fontList.split(',');
    for (const family of families) {
        // Remove quotes (single or double) and trim
        const cleaned = family.trim().replace(/^['"]|['"]$/g, '');
        if (!cleaned) continue;

        // Skip generic families
        const lower = cleaned.toLowerCase();
        if (GENERIC_FAMILIES.has(lower)) continue;

        // Skip CSS keywords that might appear
        if (['inherit', 'initial', 'unset', 'revert'].includes(lower)) continue;

        fontSet.add(cleaned);
    }
}

/**
 * Parse CSS content and extract brand identity elements.
 * @param {string} source - CSS file content as a string
 * @returns {Promise<ParseResult>} Extraction result with colors and fonts
 */
export async function parse(source) {
    if (!source || typeof source !== 'string') {
        return { colors: [], fonts: [], logos: [], layouts: [] };
    }

    const colors = extractColors(source);
    const fonts = extractFonts(source);

    return {
        colors,
        fonts,
        logos: [],
        layouts: [],
    };
}
