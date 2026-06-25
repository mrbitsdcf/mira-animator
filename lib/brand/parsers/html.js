/**
 * @fileoverview HTML parser - extracts colors, fonts, and layout patterns from HTML content.
 * Delegates CSS extraction to the CSS parser for colors and fonts.
 * @module lib/brand/parsers/html
 */

/** @typedef {import('../types.js').ParseResult} ParseResult */
/** @typedef {import('../types.js').LayoutPattern} LayoutPattern */

import { parse as parseCSS } from './css.js';

const MAX_COLORS = 12;
const MAX_FONTS = 5;

/**
 * Extract all content from <style> blocks in HTML.
 * @param {string} source - HTML content
 * @returns {string[]} Array of CSS content strings from style blocks
 */
function extractStyleBlocks(source) {
    const blocks = [];
    const stylePattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;
    while ((match = stylePattern.exec(source)) !== null) {
        blocks.push(match[1]);
    }
    return blocks;
}

/**
 * Extract inline style attribute values from HTML elements.
 * @param {string} source - HTML content
 * @returns {string[]} Array of CSS declaration strings from style attributes
 */
function extractInlineStyles(source) {
    const styles = [];
    const inlinePattern = /style\s*=\s*"([^"]*)"/gi;
    let match;
    while ((match = inlinePattern.exec(source)) !== null) {
        styles.push(match[1]);
    }
    // Also handle single-quoted style attributes
    const inlineSinglePattern = /style\s*=\s*'([^']*)'/gi;
    while ((match = inlineSinglePattern.exec(source)) !== null) {
        styles.push(match[1]);
    }
    return styles;
}

/**
 * Detect structural layout patterns from DOM elements using regex-based analysis.
 * Looks for grid-like structures, hero sections, and split layouts.
 * @param {string} source - HTML content
 * @returns {LayoutPattern[]} Detected layout patterns
 */
function extractLayouts(source) {
    const layouts = [];

    // Detect hero section: <header> or full-width image patterns
    const hasHeader = /<header[\s>]/i.test(source);
    const hasFullWidthImg = /width\s*:\s*100%|class\s*=\s*["'][^"']*(?:hero|banner|full-width|w-full)[^"']*["']/i.test(source);
    const hasHero = hasHeader || hasFullWidthImg;

    // Detect footer section
    const hasFooter = /<footer[\s>]/i.test(source);

    // Detect grid-like structures: multiple sibling <div> elements suggesting columns
    const gridDetected = detectGridStructure(source);

    if (gridDetected.isGrid) {
        layouts.push({
            type: 'grid',
            columns: gridDetected.columns,
            hasHero,
            hasFooter,
            description: `${gridDetected.columns}-column grid layout${hasHero ? ' with hero header' : ''}`,
        });
    } else if (hasHero && !gridDetected.isGrid) {
        // Hero-content layout: hero section followed by content
        layouts.push({
            type: 'hero-content',
            columns: 1,
            hasHero: true,
            hasFooter,
            description: 'Hero section with content below',
        });
    } else if (detectSplitLayout(source)) {
        layouts.push({
            type: 'split',
            columns: 2,
            hasHero,
            hasFooter,
            description: 'Two-panel split layout',
        });
    } else if (hasMainContent(source)) {
        // Single column layout detected
        layouts.push({
            type: 'single',
            columns: 1,
            hasHero,
            hasFooter,
            description: 'Single column layout',
        });
    }

    return layouts;
}

/**
 * Detect grid-like structure patterns in HTML.
 * Looks for CSS grid declarations, flexbox with multiple children, or
 * multiple sibling divs within a container suggesting columns.
 * @param {string} source - HTML content
 * @returns {{isGrid: boolean, columns: 1|2|3}} Grid detection result
 */
function detectGridStructure(source) {
    // Check for explicit CSS grid declarations
    const gridTemplateMatch = source.match(/grid-template-columns\s*:\s*([^;}"']+)/i);
    if (gridTemplateMatch) {
        const gridValue = gridTemplateMatch[1].trim();
        // Count column definitions (repeat(), fractional units, or explicit values)
        const repeatMatch = gridValue.match(/repeat\(\s*(\d+)/);
        if (repeatMatch) {
            const cols = Math.min(3, Math.max(1, parseInt(repeatMatch[1], 10)));
            return { isGrid: true, columns: /** @type {1|2|3} */ (cols) };
        }
        // Count space-separated values (1fr 1fr 1fr, etc.)
        const colParts = gridValue.split(/\s+/).filter(p => p && !p.startsWith('/'));
        if (colParts.length >= 2) {
            const cols = Math.min(3, colParts.length);
            return { isGrid: true, columns: /** @type {1|2|3} */ (cols) };
        }
    }

    // Check for grid/flex class patterns (Tailwind, Bootstrap, etc.)
    const gridClassMatch = source.match(/class\s*=\s*["'][^"']*\b(?:grid|row)\b[^"']*["']/gi);
    if (gridClassMatch) {
        // Check for column count indicators
        const colCountMatch = source.match(/\b(?:grid-cols-|col-)(\d+)\b/i);
        if (colCountMatch) {
            const cols = Math.min(3, Math.max(1, parseInt(colCountMatch[1], 10)));
            return { isGrid: true, columns: /** @type {1|2|3} */ (cols) };
        }

        // Count child divs inside grid containers to estimate columns
        const columnsFromChildren = countGridChildren(source);
        if (columnsFromChildren >= 2) {
            return { isGrid: true, columns: /** @type {1|2|3} */ (Math.min(3, columnsFromChildren)) };
        }
    }

    // Check for display:grid or display:flex with multiple immediate children
    const hasDisplayGrid = /display\s*:\s*(?:grid|flex)/i.test(source);
    if (hasDisplayGrid) {
        const columnsFromChildren = countGridChildren(source);
        if (columnsFromChildren >= 2) {
            return { isGrid: true, columns: /** @type {1|2|3} */ (Math.min(3, columnsFromChildren)) };
        }
    }

    return { isGrid: false, columns: /** @type {1|2|3} */ (1) };
}

/**
 * Count likely column children within grid/flex containers.
 * Heuristic: look for containers with multiple direct <div> children on the same level.
 * @param {string} source - HTML content
 * @returns {number} Estimated number of columns
 */
function countGridChildren(source) {
    // Look for patterns like multiple adjacent col/column divs
    const colPatterns = source.match(/<div[^>]*class\s*=\s*["'][^"']*\b(?:col|column|cell|item|card)[^"']*["'][^>]*>/gi);
    if (colPatterns && colPatterns.length >= 2) {
        return Math.min(3, colPatterns.length);
    }

    // Look for adjacent divs inside a grid/flex container
    // Simplified: count divs that are siblings (rough heuristic)
    const containerMatch = source.match(/<div[^>]*(?:class\s*=\s*["'][^"']*(?:grid|row|flex|columns|container)[^"']*["']|style\s*=\s*["'][^"']*display\s*:\s*(?:grid|flex)[^"']*["'])[^>]*>([\s\S]*?)<\/div>/i);
    if (containerMatch) {
        const containerContent = containerMatch[1];
        // Count top-level divs in container (simplified)
        const childDivs = containerContent.match(/<div[\s>]/gi);
        if (childDivs && childDivs.length >= 2) {
            return Math.min(3, childDivs.length);
        }
    }

    return 0;
}

/**
 * Detect split layout (two-panel side-by-side) pattern.
 * @param {string} source - HTML content
 * @returns {boolean}
 */
function detectSplitLayout(source) {
    // Look for two-column patterns: flex with two children, or split-related classes
    const splitClasses = /class\s*=\s*["'][^"']*\b(?:split|two-col|sidebar|aside)[^"']*["']/i.test(source);
    if (splitClasses) return true;

    // Check for <aside> + <main> or <aside> + <article> pattern
    const hasAside = /<aside[\s>]/i.test(source);
    const hasMainOrArticle = /<(?:main|article)[\s>]/i.test(source);
    if (hasAside && hasMainOrArticle) return true;

    return false;
}

/**
 * Check if HTML has recognizable main content structure.
 * @param {string} source - HTML content
 * @returns {boolean}
 */
function hasMainContent(source) {
    return /<(?:main|article|section|body)[\s>]/i.test(source);
}

/**
 * Merge colors from multiple ParseResult sources, deduplicating and capping at MAX_COLORS.
 * @param {string[][]} colorArrays - Arrays of hex color strings
 * @returns {string[]} Merged unique colors, max 12
 */
function mergeColors(colorArrays) {
    const seen = new Set();
    const result = [];
    for (const colors of colorArrays) {
        for (const color of colors) {
            const normalized = color.toLowerCase();
            if (!seen.has(normalized) && result.length < MAX_COLORS) {
                seen.add(normalized);
                result.push(normalized);
            }
        }
    }
    return result;
}

/**
 * Merge fonts from multiple ParseResult sources, deduplicating and capping at MAX_FONTS.
 * @param {string[][]} fontArrays - Arrays of font family name strings
 * @returns {string[]} Merged unique fonts, max 5
 */
function mergeFonts(fontArrays) {
    const seen = new Set();
    const result = [];
    for (const fonts of fontArrays) {
        for (const font of fonts) {
            const key = font.toLowerCase();
            if (!seen.has(key) && result.length < MAX_FONTS) {
                seen.add(key);
                result.push(font);
            }
        }
    }
    return result;
}

/**
 * Parse HTML content and extract brand identity elements.
 * Extracts <style> blocks and inline styles, delegates CSS parsing to css.js,
 * and detects structural layout patterns from the DOM structure.
 *
 * @param {string} source - HTML file content as a string
 * @returns {Promise<ParseResult>} Extraction result with colors, fonts, layouts
 */
export async function parse(source) {
    if (!source || typeof source !== 'string') {
        return { colors: [], fonts: [], logos: [], layouts: [] };
    }

    // 1. Extract all CSS content from <style> blocks
    const styleBlocks = extractStyleBlocks(source);

    // 2. Extract inline style attributes
    const inlineStyles = extractInlineStyles(source);

    // 3. Combine all CSS content and delegate to CSS parser
    const allCSS = [...styleBlocks, ...inlineStyles].join('\n');
    const cssResult = await parseCSS(allCSS);

    // 4. Extract structural layout patterns
    const layouts = extractLayouts(source);

    // 5. Return merged result
    return {
        colors: cssResult.colors.slice(0, MAX_COLORS),
        fonts: cssResult.fonts.slice(0, MAX_FONTS),
        logos: [],
        layouts,
    };
}
