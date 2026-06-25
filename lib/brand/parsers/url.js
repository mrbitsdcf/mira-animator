/**
 * @fileoverview URL parser - fetches a web page and delegates to the HTML parser for extraction.
 * @module lib/brand/parsers/url
 */

/** @typedef {import('../types.js').ParseResult} ParseResult */

import { parse as parseHTML } from './html.js';

/**
 * Validate that a string is a well-formed HTTP or HTTPS URL.
 * @param {string} source - The URL string to validate
 * @returns {boolean} True if the URL is valid
 */
function isValidURL(source) {
    try {
        const url = new URL(source);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Parse a URL source by fetching its HTML content and delegating to the HTML parser.
 * Uses native fetch with a 30-second timeout via AbortController.
 *
 * @param {string} source - URL string (http:// or https://)
 * @returns {Promise<ParseResult>} Extraction result with colors, fonts, logos, and layouts
 * @throws {Error} If URL is invalid, fetch times out, network fails, or HTTP status is non-2xx
 */
export async function parse(source) {
    // Validate URL format
    if (!isValidURL(source)) {
        throw new Error(`Invalid URL format: ${source}`);
    }

    // Set up 30-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
        response = await fetch(source, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'MiraBrandExtractor/1.0',
            },
        });
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error(`URL fetch timeout after 30 seconds: ${source}`);
        }
        throw new Error(`URL fetch failed: ${source} - ${err.message}`);
    } finally {
        clearTimeout(timeoutId);
    }

    // Check for non-2xx status
    if (!response.ok) {
        throw new Error(`URL fetch failed: ${source} - HTTP status ${response.status}`);
    }

    // Get HTML content and delegate to HTML parser
    const html = await response.text();
    return parseHTML(html);
}
