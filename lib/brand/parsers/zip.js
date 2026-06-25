/**
 * @fileoverview ZIP parser - decompresses ZIP archives and delegates to appropriate parsers.
 * Filters eligible files (max 50, no nested ZIPs), parses each by extension,
 * and merges results (union of colors up to 12, union of fonts up to 5).
 * @module lib/brand/parsers/zip
 */

/** @typedef {import('../types.js').ParseResult} ParseResult */

const MAX_COLORS = 12;
const MAX_FONTS = 5;
const MAX_FILES = 50;

/**
 * Supported file extensions and their parser module mappings.
 * @type {Record<string, string>}
 */
const EXTENSION_TO_PARSER = {
    '.css': './css.js',
    '.html': './html.js',
    '.svg': './svg.js',
    '.csv': './csv.js',
    '.png': './image.js',
    '.jpg': './image.js',
    '.jpeg': './image.js',
    '.webp': './image.js',
    '.pdf': './pdf.js',
    '.pptx': './pptx.js',
    '.ppt': './pptx.js',
};

/**
 * Set of eligible extensions for quick lookup.
 * @type {Set<string>}
 */
const ELIGIBLE_EXTENSIONS = new Set(Object.keys(EXTENSION_TO_PARSER));

/**
 * Extensions where the parser accepts a string (text content).
 * All others receive a Buffer.
 * @type {Set<string>}
 */
const TEXT_EXTENSIONS = new Set(['.css', '.html', '.svg', '.csv']);

/**
 * Get the file extension (lowercase, including the dot) from a path.
 * @param {string} filePath - File path or name
 * @returns {string} Lowercase extension (e.g., '.css', '.pptx')
 */
function getExtension(filePath) {
    const lastDot = filePath.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filePath.slice(lastDot).toLowerCase();
}

/**
 * Parse a ZIP archive buffer and extract brand identity from eligible files inside.
 * - Rejects nested ZIPs (files ending in .zip)
 * - Caps at 50 eligible files (takes the first 50)
 * - Delegates to appropriate parsers per file type
 * - Merges all results: union of unique colors (up to 12), union of unique fonts (up to 5)
 * - Individual file parse errors are handled gracefully (skip and continue)
 *
 * @param {Buffer} source - ZIP file data as a Buffer
 * @returns {Promise<ParseResult>} Merged extraction result from all eligible files
 * @throws {Error} If unzipper cannot open the buffer or no eligible files are found
 */
export async function parse(source) {
    if (!source || !Buffer.isBuffer(source)) {
        throw new Error('ZIP parser requires a Buffer as input');
    }

    // Lazy-import unzipper
    const unzipper = await import('unzipper');

    let directory;
    try {
        directory = await unzipper.Open.buffer(source);
    } catch (err) {
        throw new Error(
            `Failed to decompress ZIP archive: ${err.message}. Verify that the file is a valid ZIP archive.`
        );
    }

    // List all files in the archive (exclude directories)
    const allFiles = directory.files.filter((f) => f.type === 'File');

    // Filter eligible files: supported extension and not .zip (no nested ZIPs)
    const eligibleFiles = [];
    const allFileNames = [];

    for (const file of allFiles) {
        const name = file.path;
        allFileNames.push(name);
        const ext = getExtension(name);

        // Reject nested ZIPs
        if (ext === '.zip') continue;

        // Only include files with supported extensions
        if (ELIGIBLE_EXTENSIONS.has(ext)) {
            eligibleFiles.push(file);
        }

        // Stop at max file cap
        if (eligibleFiles.length >= MAX_FILES) break;
    }

    // If no eligible files found, throw an error listing archive contents and supported extensions
    if (eligibleFiles.length === 0) {
        const supportedList = Array.from(ELIGIBLE_EXTENSIONS).sort().join(', ');
        throw new Error(
            `ZIP archive contains no files with supported extensions. ` +
            `Files found: [${allFileNames.join(', ')}]. ` +
            `Supported extensions: ${supportedList}`
        );
    }

    // Parse each eligible file and collect results
    const colorSet = new Set();
    const fontSet = new Set();
    /** @type {Buffer[]} */
    const allLogos = [];
    /** @type {import('../types.js').LayoutPattern[]} */
    const allLayouts = [];

    // Cache loaded parser modules to avoid re-importing
    /** @type {Record<string, { parse: Function }>} */
    const parserCache = {};

    for (const file of eligibleFiles) {
        const ext = getExtension(file.path);
        const parserPath = EXTENSION_TO_PARSER[ext];
        if (!parserPath) continue;

        try {
            // Read file buffer
            const fileBuffer = await file.buffer();

            // Load parser (cached)
            if (!parserCache[parserPath]) {
                parserCache[parserPath] = await import(parserPath);
            }
            const parser = parserCache[parserPath];

            // Determine input type: text parsers get a string, others get a Buffer
            const input = TEXT_EXTENSIONS.has(ext)
                ? fileBuffer.toString('utf-8')
                : fileBuffer;

            // Delegate to the parser
            const result = await parser.parse(input);

            // Merge colors (union, deduplicated)
            if (result.colors && Array.isArray(result.colors)) {
                for (const color of result.colors) {
                    if (colorSet.size < MAX_COLORS) {
                        colorSet.add(color.toLowerCase());
                    }
                }
            }

            // Merge fonts (union, deduplicated)
            if (result.fonts && Array.isArray(result.fonts)) {
                for (const font of result.fonts) {
                    if (fontSet.size < MAX_FONTS) {
                        fontSet.add(font);
                    }
                }
            }

            // Merge logos
            if (result.logos && Array.isArray(result.logos)) {
                allLogos.push(...result.logos);
            }

            // Merge layouts
            if (result.layouts && Array.isArray(result.layouts)) {
                allLayouts.push(...result.layouts);
            }
        } catch {
            // Handle individual file parse errors gracefully: skip and continue
        }
    }

    return {
        colors: Array.from(colorSet).slice(0, MAX_COLORS),
        fonts: Array.from(fontSet).slice(0, MAX_FONTS),
        logos: allLogos,
        layouts: allLayouts,
    };
}
