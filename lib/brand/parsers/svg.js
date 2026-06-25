/**
 * @fileoverview SVG parser - extracts fill/stroke colors and font attributes from SVG.
 * @module lib/brand/parsers/svg
 */

/** @typedef {import('../types.js').ParseResult} ParseResult */

import { parseColor } from '../color-utils.js';

/**
 * Generic CSS font families to filter out.
 * @type {Set<string>}
 */
const GENERIC_FAMILIES = new Set([
    'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
    'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
    'emoji', 'math', 'fangsong', 'inherit', 'initial', 'unset',
]);

/**
 * Values to skip when extracting colors.
 * @type {Set<string>}
 */
const SKIP_VALUES = new Set(['none', 'transparent', 'inherit', 'currentcolor']);

/**
 * Try to parse a color string to normalized #RRGGBB hex.
 * Returns null if the value should be skipped or is unparseable.
 * @param {string} raw - Raw color string
 * @returns {string | null} Normalized hex color or null
 */
function tryParseColor(raw) {
    const value = raw.trim().toLowerCase();
    if (!value || SKIP_VALUES.has(value)) return null;

    try {
        const { r, g, b } = parseColor(value);
        const toHex = (c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch {
        return null;
    }
}

/**
 * Extract colors from fill and stroke attributes in SVG markup.
 * @param {string} svg - SVG content string
 * @returns {string[]} Array of raw color strings
 */
function extractAttributeColors(svg) {
    const colors = [];

    // Match fill="..." attributes (not inside style attributes)
    const fillRe = /\bfill\s*=\s*"([^"]+)"/gi;
    let match;
    while ((match = fillRe.exec(svg)) !== null) {
        colors.push(match[1]);
    }

    // Match stroke="..." attributes
    const strokeRe = /\bstroke\s*=\s*"([^"]+)"/gi;
    while ((match = strokeRe.exec(svg)) !== null) {
        colors.push(match[1]);
    }

    return colors;
}

/**
 * Extract colors from inline style="..." attributes.
 * Looks for color, fill, stroke declarations within style values.
 * @param {string} svg - SVG content string
 * @returns {string[]} Array of raw color strings
 */
function extractInlineStyleColors(svg) {
    const colors = [];
    const styleAttrRe = /\bstyle\s*=\s*"([^"]+)"/gi;
    let match;

    while ((match = styleAttrRe.exec(svg)) !== null) {
        const styleValue = match[1];
        // Extract color-related properties from inline styles
        const propRe = /(?:color|fill|stroke|background-color|background)\s*:\s*([^;]+)/gi;
        let propMatch;
        while ((propMatch = propRe.exec(styleValue)) !== null) {
            colors.push(propMatch[1].trim());
        }
    }

    return colors;
}

/**
 * Extract colors from <style> blocks within SVG.
 * @param {string} svg - SVG content string
 * @returns {string[]} Array of raw color strings
 */
function extractStyleBlockColors(svg) {
    const colors = [];
    const styleBlockRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let blockMatch;

    while ((blockMatch = styleBlockRe.exec(svg)) !== null) {
        const cssContent = blockMatch[1];
        // Extract color-related property values from CSS rules
        const propRe = /(?:color|fill|stroke|background-color|background)\s*:\s*([^;}\s]+(?:\([^)]*\))?)/gi;
        let propMatch;
        while ((propMatch = propRe.exec(cssContent)) !== null) {
            colors.push(propMatch[1].trim());
        }
    }

    return colors;
}

/**
 * Extract font-family names from SVG attributes and style blocks.
 * @param {string} svg - SVG content string
 * @returns {string[]} Array of raw font family names
 */
function extractFonts(svg) {
    const fonts = [];

    // Extract font-family="..." attributes
    const fontAttrRe = /\bfont-family\s*=\s*"([^"]+)"/gi;
    let match;
    while ((match = fontAttrRe.exec(svg)) !== null) {
        fonts.push(match[1]);
    }

    // Extract font-family from inline style="..." attributes
    const styleAttrRe = /\bstyle\s*=\s*"([^"]+)"/gi;
    while ((match = styleAttrRe.exec(svg)) !== null) {
        const styleValue = match[1];
        const fontPropRe = /font-family\s*:\s*([^;]+)/gi;
        let fontMatch;
        while ((fontMatch = fontPropRe.exec(styleValue)) !== null) {
            fonts.push(fontMatch[1].trim());
        }
    }

    // Extract font-family from <style> blocks
    const styleBlockRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    while ((match = styleBlockRe.exec(svg)) !== null) {
        const cssContent = match[1];
        const fontPropRe = /font-family\s*:\s*([^;}]+)/gi;
        let fontMatch;
        while ((fontMatch = fontPropRe.exec(cssContent)) !== null) {
            fonts.push(fontMatch[1].trim());
        }
    }

    return fonts;
}

/**
 * Normalize a font-family string: split comma-separated values,
 * strip quotes, filter generic families, return unique names.
 * @param {string[]} rawFonts - Array of raw font-family strings
 * @returns {string[]} Deduplicated, filtered font names (max 5)
 */
function normalizeFonts(rawFonts) {
    const seen = new Set();
    const result = [];

    for (const raw of rawFonts) {
        // Split comma-separated font stacks
        const parts = raw.split(',');
        for (const part of parts) {
            // Strip quotes and trim
            const name = part.trim().replace(/^['"]|['"]$/g, '');
            const lower = name.toLowerCase();

            if (!name || GENERIC_FAMILIES.has(lower) || seen.has(lower)) continue;

            seen.add(lower);
            result.push(name);

            if (result.length >= 5) return result;
        }
    }

    return result;
}

/**
 * Parse SVG content and extract brand-relevant data.
 * @param {string} source - SVG content as string
 * @returns {Promise<ParseResult>} Extraction result with colors, fonts, logos, layouts
 */
export async function parse(source) {
    const svg = typeof source === 'string' ? source : String(source);

    // Collect raw color values from all sources
    const rawColors = [
        ...extractAttributeColors(svg),
        ...extractInlineStyleColors(svg),
        ...extractStyleBlockColors(svg),
    ];

    // Parse and deduplicate colors
    const colorSet = new Set();
    const colors = [];

    for (const raw of rawColors) {
        const hex = tryParseColor(raw);
        if (hex && !colorSet.has(hex)) {
            colorSet.add(hex);
            colors.push(hex);
            if (colors.length >= 12) break;
        }
    }

    // Collect and normalize fonts
    const rawFonts = extractFonts(svg);
    const fonts = normalizeFonts(rawFonts);

    return {
        colors,
        fonts,
        logos: [],
        layouts: [],
    };
}
