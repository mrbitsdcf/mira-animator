/**
 * Property 7: Output path and naming consistency
 * **Validates: Requirements 5.4, 7.6**
 *
 * For any generated template with slug S, the theme file SHALL be written to
 * `mira-templates/themes/S.css` and the deck template SHALL be written to
 * `mira-templates/decks/S/index.html`, and all output files SHALL reside
 * exclusively within `mira-templates/`.
 */
import { describe, test, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { register } from '../../lib/brand/registry.js';

/**
 * Arbitrary for a valid kebab-case template slug matching ^[a-z][a-z0-9-]{1,48}[a-z0-9]$
 */
const arbSlug = fc
    .tuple(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 1 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), { minLength: 1, maxLength: 10 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 1 }),
    )
    .map(([first, mid, last]) => first + mid + last);

/**
 * Track temp directories for cleanup.
 */
const tempDirs = [];

afterEach(async () => {
    for (const dir of tempDirs) {
        await rm(dir, { recursive: true, force: true }).catch(() => { });
    }
    tempDirs.length = 0;
});

describe('Property 7: Output path and naming consistency', () => {
    test('for any valid slug S, themePath equals mira-templates/themes/S.css', async () => {
        await fc.assert(
            fc.asyncProperty(arbSlug, async (slug) => {
                const tempDir = await mkdtemp(join(tmpdir(), 'mira-paths-'));
                tempDirs.push(tempDir);

                const originalCwd = process.cwd();
                process.chdir(tempDir);
                try {
                    const result = await register({
                        name: slug,
                        themeCSS: ':root { --mira-primary: #ff0000; }',
                        deckHTML: '<html><body>test</body></html>',
                        assets: [],
                    });

                    const expectedThemePath = join('mira-templates', 'themes', `${slug}.css`);
                    expect(result.themePath).toBe(expectedThemePath);
                } finally {
                    process.chdir(originalCwd);
                }
            }),
            { numRuns: 100 },
        );
    });

    test('for any valid slug S, deckPath equals mira-templates/decks/S/index.html', async () => {
        await fc.assert(
            fc.asyncProperty(arbSlug, async (slug) => {
                const tempDir = await mkdtemp(join(tmpdir(), 'mira-paths-'));
                tempDirs.push(tempDir);

                const originalCwd = process.cwd();
                process.chdir(tempDir);
                try {
                    const result = await register({
                        name: slug,
                        themeCSS: ':root { --mira-primary: #ff0000; }',
                        deckHTML: '<html><body>test</body></html>',
                        assets: [],
                    });

                    const expectedDeckPath = join('mira-templates', 'decks', slug, 'index.html');
                    expect(result.deckPath).toBe(expectedDeckPath);
                } finally {
                    process.chdir(originalCwd);
                }
            }),
            { numRuns: 100 },
        );
    });

    test('for any valid slug S, assetsPath equals mira-templates/decks/S/assets', async () => {
        await fc.assert(
            fc.asyncProperty(arbSlug, async (slug) => {
                const tempDir = await mkdtemp(join(tmpdir(), 'mira-paths-'));
                tempDirs.push(tempDir);

                const originalCwd = process.cwd();
                process.chdir(tempDir);
                try {
                    const result = await register({
                        name: slug,
                        themeCSS: ':root { --mira-primary: #ff0000; }',
                        deckHTML: '<html><body>test</body></html>',
                        assets: [],
                    });

                    const expectedAssetsPath = join('mira-templates', 'decks', slug, 'assets');
                    expect(result.assetsPath).toBe(expectedAssetsPath);
                } finally {
                    process.chdir(originalCwd);
                }
            }),
            { numRuns: 100 },
        );
    });

    test('for any valid slug S, all returned paths start with mira-templates/', async () => {
        await fc.assert(
            fc.asyncProperty(arbSlug, async (slug) => {
                const tempDir = await mkdtemp(join(tmpdir(), 'mira-paths-'));
                tempDirs.push(tempDir);

                const originalCwd = process.cwd();
                process.chdir(tempDir);
                try {
                    const result = await register({
                        name: slug,
                        themeCSS: ':root { --mira-primary: #ff0000; }',
                        deckHTML: '<html><body>test</body></html>',
                        assets: [],
                    });

                    const prefix = `mira-templates${join('/')}`;
                    expect(result.themePath.startsWith(prefix) || result.themePath.startsWith('mira-templates/')).toBe(true);
                    expect(result.deckPath.startsWith(prefix) || result.deckPath.startsWith('mira-templates/')).toBe(true);
                    expect(result.assetsPath.startsWith(prefix) || result.assetsPath.startsWith('mira-templates/')).toBe(true);
                } finally {
                    process.chdir(originalCwd);
                }
            }),
            { numRuns: 100 },
        );
    });

    test('for any valid slug S, slug appears in both theme filename and deck directory name', async () => {
        await fc.assert(
            fc.asyncProperty(arbSlug, async (slug) => {
                const tempDir = await mkdtemp(join(tmpdir(), 'mira-paths-'));
                tempDirs.push(tempDir);

                const originalCwd = process.cwd();
                process.chdir(tempDir);
                try {
                    const result = await register({
                        name: slug,
                        themeCSS: ':root { --mira-primary: #ff0000; }',
                        deckHTML: '<html><body>test</body></html>',
                        assets: [],
                    });

                    // Theme filename should be <slug>.css
                    expect(result.themePath).toContain(`${slug}.css`);
                    // Deck path should contain the slug as a directory component
                    expect(result.deckPath).toContain(join(slug, 'index.html'));
                } finally {
                    process.chdir(originalCwd);
                }
            }),
            { numRuns: 100 },
        );
    });
});
