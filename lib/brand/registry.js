/**
 * @fileoverview Template Registry - writes theme, deck, and assets to mira-templates/.
 * @module lib/brand/registry
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/** @typedef {import('./types.js').RegistryResult} RegistryResult */
/** @typedef {import('./types.js').AssetFile} AssetFile */

/**
 * Register a generated brand template by writing theme, deck, and assets
 * to the mira-templates directory structure.
 *
 * @param {Object} input
 * @param {string} input.name - Template slug (kebab-case)
 * @param {string} input.themeCSS - Generated theme CSS content
 * @param {string} input.deckHTML - Generated deck template HTML content
 * @param {AssetFile[]} input.assets - Asset files to write (logos, card templates)
 * @returns {Promise<RegistryResult>} Paths to written files
 */
export async function register({ name, themeCSS, deckHTML, assets }) {
    const themePath = join('mira-templates', 'themes', `${name}.css`);
    const deckPath = join('mira-templates', 'decks', name, 'index.html');
    const assetsPath = join('mira-templates', 'decks', name, 'assets');

    // Create directories (recursive handles nested + existing dirs)
    await mkdir(join('mira-templates', 'themes'), { recursive: true });
    await mkdir(join('mira-templates', 'decks', name), { recursive: true });
    await mkdir(assetsPath, { recursive: true });

    // Write theme CSS file
    await writeFile(themePath, themeCSS, 'utf-8');

    // Write deck template HTML
    await writeFile(deckPath, deckHTML, 'utf-8');

    // Write each asset file
    for (const asset of assets) {
        const assetPath = join(assetsPath, asset.filename);
        await writeFile(assetPath, asset.buffer);
    }

    return { themePath, deckPath, assetsPath };
}
