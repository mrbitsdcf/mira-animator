/**
 * Property 6: Deck template structural integrity
 * **Validates: Requirements 4.3, 4.9, 8.1, 8.3**
 *
 * For any generated deck template HTML, the output SHALL contain the markers
 * `/* @MIRA:THEME:START *​/` and `/* @MIRA:THEME:END *​/` with CSS content between them,
 * and SHALL contain CDN references to Tailwind, AOS, Lucide, and D3.
 */
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateTheme } from '../../lib/brand/theme-generator.js';
import { generateDeck } from '../../lib/brand/deck-generator.js';

/**
 * Arbitrary for a valid 6-digit hex color string (e.g., "#a3f2c1").
 */
const arbHexColor = fc
    .tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
    )
    .map(([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);

/**
 * Arbitrary for a valid kebab-case template name.
 */
const arbTemplateName = fc
    .tuple(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 1 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), { minLength: 1, maxLength: 10 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 1 }),
    )
    .map(([first, mid, last]) => first + mid + last);

/**
 * Arbitrary for a minimal valid BrandIdentity object.
 */
const arbBrandIdentity = fc.record({
    primary: arbHexColor,
    background: arbHexColor,
    sourceFormat: fc.constantFrom('css', 'html', 'pptx', 'pdf', 'csv', 'svg', 'image', 'url', 'zip'),
    fontsDefaulted: fc.boolean(),
    headingFont: fc.constantFrom('Inter', 'Montserrat', 'Roboto', 'Open Sans', 'Poppins'),
    bodyFont: fc.constantFrom('Inter', 'Roboto', 'Open Sans', 'Lato', 'Nunito'),
    layouts: fc.constantFrom([], [{ type: 'grid', columns: 2, hasHero: false, description: 'Two-column grid' }]),
});

describe('Property 6: Deck template structural integrity', () => {
    test('for any valid BrandIdentity, the deck HTML contains @MIRA:THEME:START and @MIRA:THEME:END markers', async () => {
        await fc.assert(
            fc.asyncProperty(arbTemplateName, arbBrandIdentity, async (name, identity) => {
                const themeCSS = generateTheme({ name, identity });
                const html = await generateDeck({ name, themeCSS, identity });

                expect(html).toContain('/* @MIRA:THEME:START */');
                expect(html).toContain('/* @MIRA:THEME:END */');
            }),
            { numRuns: 100 },
        );
    });

    test('for any valid BrandIdentity, CSS content exists between the @MIRA:THEME markers', async () => {
        await fc.assert(
            fc.asyncProperty(arbTemplateName, arbBrandIdentity, async (name, identity) => {
                const themeCSS = generateTheme({ name, identity });
                const html = await generateDeck({ name, themeCSS, identity });

                const startMarker = '/* @MIRA:THEME:START */';
                const endMarker = '/* @MIRA:THEME:END */';
                const startIdx = html.indexOf(startMarker) + startMarker.length;
                const endIdx = html.indexOf(endMarker);

                // There must be non-whitespace CSS content between the markers
                const contentBetween = html.substring(startIdx, endIdx).trim();
                expect(contentBetween.length).toBeGreaterThan(0);
                // The theme CSS should include :root with variables
                expect(contentBetween).toContain(':root');
                expect(contentBetween).toContain('--mira-primary');
            }),
            { numRuns: 100 },
        );
    });

    test('for any valid BrandIdentity, the deck HTML contains CDN reference to Tailwind', async () => {
        await fc.assert(
            fc.asyncProperty(arbTemplateName, arbBrandIdentity, async (name, identity) => {
                const themeCSS = generateTheme({ name, identity });
                const html = await generateDeck({ name, themeCSS, identity });

                expect(html).toContain('cdn.tailwindcss.com');
            }),
            { numRuns: 100 },
        );
    });

    test('for any valid BrandIdentity, the deck HTML contains CDN reference to AOS', async () => {
        await fc.assert(
            fc.asyncProperty(arbTemplateName, arbBrandIdentity, async (name, identity) => {
                const themeCSS = generateTheme({ name, identity });
                const html = await generateDeck({ name, themeCSS, identity });

                expect(html).toContain('unpkg.com/aos');
            }),
            { numRuns: 100 },
        );
    });

    test('for any valid BrandIdentity, the deck HTML contains CDN reference to Lucide', async () => {
        await fc.assert(
            fc.asyncProperty(arbTemplateName, arbBrandIdentity, async (name, identity) => {
                const themeCSS = generateTheme({ name, identity });
                const html = await generateDeck({ name, themeCSS, identity });

                expect(html).toContain('unpkg.com/lucide');
            }),
            { numRuns: 100 },
        );
    });

    test('for any valid BrandIdentity, the deck HTML contains CDN reference to D3', async () => {
        await fc.assert(
            fc.asyncProperty(arbTemplateName, arbBrandIdentity, async (name, identity) => {
                const themeCSS = generateTheme({ name, identity });
                const html = await generateDeck({ name, themeCSS, identity });

                expect(html).toContain('d3js.org/d3.v7');
            }),
            { numRuns: 100 },
        );
    });

    test('for any valid BrandIdentity, the deck HTML <title> contains "Mira — Template:"', async () => {
        await fc.assert(
            fc.asyncProperty(arbTemplateName, arbBrandIdentity, async (name, identity) => {
                const themeCSS = generateTheme({ name, identity });
                const html = await generateDeck({ name, themeCSS, identity });

                expect(html).toContain('Mira — Template:');
            }),
            { numRuns: 100 },
        );
    });
});
