/**
 * @fileoverview PPTX parser - extracts theme colors, fonts, and slide layouts from PowerPoint.
 * PPTX files are ZIP archives containing XML files. Key extraction targets:
 * - ppt/theme/theme1.xml: color scheme and font scheme
 * - ppt/presentation.xml: slide layout references
 * @module lib/brand/parsers/pptx
 */

/** @typedef {import('../types.js').ParseResult} ParseResult */

const MAX_COLORS = 12;
const MAX_FONTS = 5;

/**
 * Color scheme element names in theme XML (a:clrScheme children).
 * @type {string[]}
 */
const COLOR_ELEMENTS = [
    'dk1', 'dk2', 'lt1', 'lt2',
    'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6',
    'hlink', 'folHlink',
];

/**
 * Extract hex color value from a color scheme element XML snippet.
 * Handles both <a:srgbClr val="RRGGBB"/> and <a:sysClr val="..." lastClr="RRGGBB"/>.
 * @param {string} elementXml - XML content of a single color element
 * @returns {string | null} Normalized hex color (#RRGGBB) or null
 */
function extractColorFromElement(elementXml) {
    // Try <a:srgbClr val="RRGGBB"/>
    const srgbMatch = elementXml.match(/a:srgbClr[^>]*\bval\s*=\s*"([0-9a-fA-F]{6})"/i);
    if (srgbMatch) {
        return `#${srgbMatch[1].toLowerCase()}`;
    }

    // Try <a:sysClr ... lastClr="RRGGBB"/>
    const sysMatch = elementXml.match(/a:sysClr[^>]*\blastClr\s*=\s*"([0-9a-fA-F]{6})"/i);
    if (sysMatch) {
        return `#${sysMatch[1].toLowerCase()}`;
    }

    return null;
}

/**
 * Extract colors from the color scheme in theme XML.
 * Parses <a:clrScheme> block for dk1, dk2, lt1, lt2, accent1-6, hlink, folHlink.
 * @param {string} themeXml - Content of ppt/theme/theme1.xml
 * @returns {string[]} Array of unique hex colors (#RRGGBB), max 12
 */
function extractColorsFromTheme(themeXml) {
    const colors = [];
    const seen = new Set();

    for (const element of COLOR_ELEMENTS) {
        // Match <a:element>...</a:element> (handles multiline)
        const pattern = new RegExp(`<a:${element}\\b[^>]*>([\\s\\S]*?)</a:${element}>`, 'i');
        const match = themeXml.match(pattern);
        if (match) {
            const hex = extractColorFromElement(match[1]);
            if (hex && !seen.has(hex)) {
                seen.add(hex);
                colors.push(hex);
                if (colors.length >= MAX_COLORS) break;
            }
        }
    }

    return colors;
}

/**
 * Extract font names from the font scheme in theme XML.
 * Parses <a:fontScheme> for majorFont (heading) and minorFont (body).
 * @param {string} themeXml - Content of ppt/theme/theme1.xml
 * @returns {string[]} Array of unique font family names, max 5
 */
function extractFontsFromTheme(themeXml) {
    const fonts = [];
    const seen = new Set();

    // Extract major font (heading): <a:majorFont><a:latin typeface="..."/></a:majorFont>
    const majorMatch = themeXml.match(/<a:majorFont[^>]*>([\s\S]*?)<\/a:majorFont>/i);
    if (majorMatch) {
        const latinMatch = majorMatch[1].match(/a:latin[^>]*\btypeface\s*=\s*"([^"]+)"/i);
        if (latinMatch) {
            const font = latinMatch[1].trim();
            if (font && !seen.has(font.toLowerCase())) {
                seen.add(font.toLowerCase());
                fonts.push(font);
            }
        }
    }

    // Extract minor font (body): <a:minorFont><a:latin typeface="..."/></a:minorFont>
    const minorMatch = themeXml.match(/<a:minorFont[^>]*>([\s\S]*?)<\/a:minorFont>/i);
    if (minorMatch) {
        const latinMatch = minorMatch[1].match(/a:latin[^>]*\btypeface\s*=\s*"([^"]+)"/i);
        if (latinMatch) {
            const font = latinMatch[1].trim();
            if (font && !seen.has(font.toLowerCase())) {
                seen.add(font.toLowerCase());
                fonts.push(font);
            }
        }
    }

    // Also try to find East Asian and Complex Script fonts if present
    const eaFonts = themeXml.matchAll(/a:ea[^>]*\btypeface\s*=\s*"([^"]+)"/gi);
    for (const eaMatch of eaFonts) {
        const font = eaMatch[1].trim();
        if (font && !seen.has(font.toLowerCase()) && fonts.length < MAX_FONTS) {
            seen.add(font.toLowerCase());
            fonts.push(font);
        }
    }

    return fonts.slice(0, MAX_FONTS);
}

/**
 * Extract basic layout patterns from presentation XML.
 * Looks at slide layout references to determine common patterns.
 * @param {string} presentationXml - Content of ppt/presentation.xml
 * @returns {import('../types.js').LayoutPattern[]} Detected layout patterns
 */
function extractLayoutPatterns(presentationXml) {
    // Count slide references to infer basic structure
    const slideMatches = presentationXml.match(/<p:sldId\b/gi);
    const slideCount = slideMatches ? slideMatches.length : 0;

    if (slideCount === 0) return [];

    // Basic layout pattern inference based on slide count
    /** @type {import('../types.js').LayoutPattern[]} */
    const layouts = [];

    if (slideCount >= 1) {
        layouts.push({
            type: 'hero-content',
            columns: 1,
            hasHero: true,
            hasFooter: slideCount > 2,
            description: `Presentation with ${slideCount} slides, hero-content layout`,
        });
    }

    return layouts;
}

/**
 * Parse a PPTX file buffer and extract brand-relevant data.
 * PPTX files are ZIP archives containing XML. This parser extracts:
 * - Color scheme from ppt/theme/theme1.xml
 * - Font scheme from ppt/theme/theme1.xml
 * - Basic layout patterns from ppt/presentation.xml
 *
 * @param {Buffer} source - PPTX file data as a Buffer
 * @returns {Promise<ParseResult>} Extraction result with colors, fonts, logos, layouts
 * @throws {Error} If file cannot be unzipped or theme XML not found
 */
export async function parse(source) {
    if (!source || !Buffer.isBuffer(source)) {
        throw new Error('PPTX parser requires a Buffer as input');
    }

    // Lazy-import unzipper
    const unzipper = await import('unzipper');

    let directory;
    try {
        directory = await unzipper.Open.buffer(source);
    } catch (err) {
        throw new Error(
            `Failed to unzip PPTX file: ${err.message}. Verify that the file is a valid PPTX/ZIP archive.`
        );
    }

    // Find theme file (ppt/theme/theme1.xml)
    const themeFile = directory.files.find(
        (f) => /ppt\/theme\/theme\d*\.xml$/i.test(f.path)
    );

    if (!themeFile) {
        throw new Error(
            'PPTX theme file not found (ppt/theme/theme1.xml). ' +
            'The file may be corrupted or not a valid PowerPoint file.'
        );
    }

    // Read theme XML
    let themeXml;
    try {
        const themeBuffer = await themeFile.buffer();
        themeXml = themeBuffer.toString('utf-8');
    } catch (err) {
        throw new Error(
            `Failed to read theme XML from PPTX: ${err.message}. Verify file integrity.`
        );
    }

    // Extract colors from color scheme
    const colors = extractColorsFromTheme(themeXml);

    // Extract fonts from font scheme
    const fonts = extractFontsFromTheme(themeXml);

    // Try to extract layout patterns from presentation.xml
    let layouts = [];
    const presentationFile = directory.files.find(
        (f) => /ppt\/presentation\.xml$/i.test(f.path)
    );

    if (presentationFile) {
        try {
            const presBuffer = await presentationFile.buffer();
            const presentationXml = presBuffer.toString('utf-8');
            layouts = extractLayoutPatterns(presentationXml);
        } catch {
            // Non-critical: layouts are optional
        }
    }

    return {
        colors,
        fonts,
        logos: [],
        layouts,
    };
}
