/**
 * @fileoverview CSV parser - extracts colors and font names from CSV content.
 * @module lib/brand/parsers/csv
 */

/** @typedef {import('../types.js').ParseResult} ParseResult */

import { parseColor } from '../color-utils.js';

/**
 * Generic font families to filter out (not brand-specific).
 */
const GENERIC_FAMILIES = new Set([
    'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
    'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
]);

/**
 * Column headers that indicate a font name column.
 */
const FONT_HEADER_PATTERNS = [
    'font', 'font-family', 'fontfamily', 'typeface', 'typography',
    'font_family', 'font name', 'fontname',
];

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
 * Detect the delimiter used in the CSV content (comma or semicolon).
 * Counts occurrences in the first few lines to decide.
 * @param {string} source - CSV content
 * @returns {string} ',' or ';'
 */
function detectDelimiter(source) {
    const sampleLines = source.split('\n').slice(0, 5).join('\n');
    const commas = (sampleLines.match(/,/g) || []).length;
    const semicolons = (sampleLines.match(/;/g) || []).length;
    return semicolons > commas ? ';' : ',';
}

/**
 * Split a CSV line by delimiter, respecting quoted fields and parenthesized expressions.
 * Handles cases like rgb(0, 128, 255) that contain the delimiter within parentheses.
 * @param {string} line - A single CSV line
 * @param {string} delimiter - The field delimiter
 * @returns {string[]} Array of cell values
 */
function splitCSVLine(line, delimiter) {
    const cells = [];
    let current = '';
    let inQuotes = false;
    let parenDepth = 0;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && parenDepth === 0) {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i++; // skip escaped quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === '(' && !inQuotes) {
            parenDepth++;
            current += char;
        } else if (char === ')' && !inQuotes) {
            parenDepth = Math.max(0, parenDepth - 1);
            current += char;
        } else if (char === delimiter && !inQuotes && parenDepth === 0) {
            cells.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    cells.push(current.trim());
    return cells;
}

/**
 * Try to parse a cell value as a color.
 * Returns the normalized hex string or null if not a color.
 * @param {string} cell - Cell content
 * @returns {string|null} Normalized hex color or null
 */
function tryParseColor(cell) {
    const trimmed = cell.trim();
    if (!trimmed) return null;

    // Quick checks for color patterns
    const isHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed);
    const isRgb = /^rgba?\(/i.test(trimmed);
    const isHsl = /^hsla?\(/i.test(trimmed);

    if (!isHex && !isRgb && !isHsl) return null;

    try {
        const rgb = parseColor(trimmed);
        return rgbToHex(rgb).toLowerCase();
    } catch {
        return null;
    }
}

/**
 * Common single-word values that look like font names but aren't.
 * These are typical CSV data values, headers, or labels.
 */
const NON_FONT_WORDS = new Set([
    'primary', 'secondary', 'accent', 'background', 'foreground',
    'heading', 'body', 'title', 'subtitle', 'text', 'label',
    'name', 'value', 'type', 'color', 'font', 'style', 'weight',
    'normal', 'bold', 'italic', 'regular', 'light', 'medium',
    'dark', 'border', 'shadow', 'hover', 'active', 'focus',
    'header', 'footer', 'main', 'sidebar', 'card', 'button',
    'link', 'icon', 'image', 'logo', 'nav', 'menu', 'item',
    'small', 'large', 'extra', 'thin', 'black', 'white',
]);

/**
 * Check if a cell value looks like a proper font name.
 * Font names typically have multiple words (e.g., "Open Sans", "Source Code Pro")
 * or are well-known single-word fonts (e.g., "Montserrat", "Roboto", "Lato").
 * @param {string} cell - Cell content
 * @returns {boolean}
 */
function looksLikeFontName(cell) {
    const trimmed = cell.trim();
    if (!trimmed) return false;
    if (trimmed.length < 3 || trimmed.length > 60) return false;

    // Reject if it looks like a color value
    if (/^#[0-9a-fA-F]/.test(trimmed)) return false;
    if (/^rgba?\(/i.test(trimmed)) return false;
    if (/^hsla?\(/i.test(trimmed)) return false;

    // Reject if it contains special chars that fonts don't have
    // Allow letters, spaces, hyphens, and digits (e.g., "Open Sans 3")
    if (/[^a-zA-Z0-9\s\-]/.test(trimmed)) return false;

    // Reject pure numbers
    if (/^\d+$/.test(trimmed)) return false;

    // Must start with an uppercase letter (proper font name)
    if (!/^[A-Z]/.test(trimmed)) return false;

    // Reject common non-font words (case insensitive check)
    if (NON_FONT_WORDS.has(trimmed.toLowerCase())) return false;

    // Multi-word names are more likely to be fonts (e.g., "Open Sans", "Source Code Pro")
    const words = trimmed.split(/\s+/);
    if (words.length >= 2) {
        // Multi-word: each word should start with uppercase
        return words.every(w => /^[A-Z]/.test(w));
    }

    // Single word: must be at least 4 chars to avoid common short labels
    return trimmed.length >= 4;
}

/**
 * Determine which columns are font columns based on header names.
 * @param {string[]} headers - Array of header cell values
 * @returns {Set<number>} Set of column indices that are font columns
 */
function detectFontColumns(headers) {
    const fontColumns = new Set();
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase().trim();
        if (FONT_HEADER_PATTERNS.some(p => header.includes(p))) {
            fontColumns.add(i);
        }
    }
    return fontColumns;
}

/**
 * Parse CSV content and extract brand identity elements (colors and fonts).
 * Handles both comma and semicolon delimiters.
 * @param {string} source - CSV file content as a string
 * @returns {Promise<ParseResult>} Extraction result with colors and fonts
 */
export async function parse(source) {
    if (!source || typeof source !== 'string') {
        return { colors: [], fonts: [], logos: [], layouts: [] };
    }

    const trimmed = source.trim();
    if (!trimmed) {
        return { colors: [], fonts: [], logos: [], layouts: [] };
    }

    const delimiter = detectDelimiter(trimmed);
    const lines = trimmed.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length === 0) {
        return { colors: [], fonts: [], logos: [], layouts: [] };
    }

    const colors = new Set();
    const fonts = new Set();

    // Parse first line as potential header
    const headerCells = splitCSVLine(lines[0], delimiter);
    const fontColumns = detectFontColumns(headerCells);

    // Determine if first line looks like a header row
    // A header row typically has no color values and contains descriptive text
    const hasHeader = lines.length > 1 && headerCells.every(cell => tryParseColor(cell) === null);

    // If there's no header, treat all lines as data
    const startRow = hasHeader ? 1 : 0;

    // If no header, clear font columns since we can't detect them
    if (!hasHeader) {
        fontColumns.clear();
    }
    for (let rowIdx = startRow; rowIdx < lines.length; rowIdx++) {
        const cells = splitCSVLine(lines[rowIdx], delimiter);

        for (let colIdx = 0; colIdx < cells.length; colIdx++) {
            const cell = cells[colIdx];
            if (!cell) continue;

            // Try to parse as color
            if (colors.size < MAX_COLORS) {
                const hex = tryParseColor(cell);
                if (hex) {
                    colors.add(hex);
                    continue;
                }
            }

            // If this is a known font column, take the value
            if (fontColumns.has(colIdx) && fonts.size < MAX_FONTS) {
                const fontName = cell.trim().replace(/^['"]|['"]$/g, '');
                if (fontName && !GENERIC_FAMILIES.has(fontName.toLowerCase()) && !NON_FONT_WORDS.has(fontName.toLowerCase())) {
                    fonts.add(fontName);
                    continue;
                }
            }

            // Otherwise, check if cell looks like a font name
            if (fonts.size < MAX_FONTS && looksLikeFontName(cell)) {
                const fontName = cell.trim();
                if (!GENERIC_FAMILIES.has(fontName.toLowerCase())) {
                    fonts.add(fontName);
                }
            }
        }
    }

    return {
        colors: Array.from(colors).slice(0, MAX_COLORS),
        fonts: Array.from(fonts).slice(0, MAX_FONTS),
        logos: [],
        layouts: [],
    };
}
