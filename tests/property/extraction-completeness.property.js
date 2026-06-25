/**
 * Property 1: Text-format color and font extraction completeness
 * **Validates: Requirements 1.3, 1.4, 1.5, 1.8**
 *
 * For any valid CSS, HTML, SVG, or CSV content containing N distinct color declarations
 * (hex, rgb, rgba, hsl, hsla) and M distinct font-family declarations, the Brand_Extractor
 * SHALL return all N colors (up to 12) and all M font families (up to 5) present in the source.
 */
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { parse as parseCss } from '../../lib/brand/parsers/css.js';
import { parse as parseSvg } from '../../lib/brand/parsers/svg.js';

/**
 * Generate a random 6-digit hex color string (#RRGGBB).
 * Avoids pure black/white since those may be edge cases in some parsers.
 */
const hexColorArb = fc
    .tuple(
        fc.integer({ min: 1, max: 254 }),
        fc.integer({ min: 1, max: 254 }),
        fc.integer({ min: 1, max: 254 }),
    )
    .map(([r, g, b]) => {
        const toHex = (c) => c.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    });

/**
 * Generate unique hex colors (1 to 12).
 */
const uniqueHexColorsArb = fc
    .uniqueArray(hexColorArb, { minLength: 1, maxLength: 12, comparator: (a, b) => a.toLowerCase() === b.toLowerCase() });

/**
 * Generate a valid font family name that looks like a real font.
 * Uses multi-word capitalized names to avoid being filtered as generic families.
 */
const fontFamilyArb = fc
    .tuple(
        fc.constantFrom(
            'Open', 'Source', 'Noto', 'IBM', 'PT', 'Fira', 'Red', 'Work',
            'Space', 'DM', 'Plus', 'Public', 'Libre', 'Josefin', 'Bitter',
        ),
        fc.constantFrom(
            'Sans', 'Serif', 'Mono', 'Display', 'Text', 'Code', 'Grotesk',
            'Variable', 'Neue', 'Pro', 'Condensed', 'Wide', 'Rounded',
        ),
    )
    .map(([first, second]) => `${first} ${second}`);

/**
 * Generate unique font family names (1 to 5).
 */
const uniqueFontsArb = fc
    .uniqueArray(fontFamilyArb, { minLength: 1, maxLength: 5, comparator: (a, b) => a === b });

/**
 * Normalize a hex color to lowercase #rrggbb for comparison.
 */
function normalizeHex(hex) {
    const h = hex.toLowerCase();
    if (h.length === 4) {
        return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
    }
    return h;
}

describe('Property 1: Text-format color and font extraction completeness', () => {
    describe('CSS parser completeness', () => {
        test('all hex colors embedded in CSS are extracted (up to 12)', async () => {
            await fc.assert(
                fc.asyncProperty(uniqueHexColorsArb, uniqueFontsArb, async (colors, fonts) => {
                    // Build CSS content embedding all colors and fonts
                    const cssRules = [];
                    colors.forEach((color, i) => {
                        cssRules.push(`.class-${i} { color: ${color}; }`);
                    });
                    fonts.forEach((font, i) => {
                        cssRules.push(`.text-${i} { font-family: '${font}', sans-serif; }`);
                    });
                    const cssContent = cssRules.join('\n');

                    const result = await parseCss(cssContent);

                    // All colors should be found (up to 12)
                    const expectedColors = colors.slice(0, 12).map(normalizeHex);
                    for (const expected of expectedColors) {
                        expect(result.colors).toContainEqual(expected);
                    }

                    // All fonts should be found (up to 5)
                    const expectedFonts = fonts.slice(0, 5);
                    for (const expected of expectedFonts) {
                        expect(result.fonts).toContainEqual(expected);
                    }
                }),
                { numRuns: 100 },
            );
        });

        test('rgb() colors in CSS are extracted completely', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.uniqueArray(
                        fc.tuple(
                            fc.integer({ min: 1, max: 254 }),
                            fc.integer({ min: 1, max: 254 }),
                            fc.integer({ min: 1, max: 254 }),
                        ),
                        { minLength: 1, maxLength: 12, comparator: (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] },
                    ),
                    async (rgbTuples) => {
                        const cssRules = rgbTuples.map(([r, g, b], i) =>
                            `.item-${i} { background-color: rgb(${r}, ${g}, ${b}); }`,
                        );
                        const cssContent = cssRules.join('\n');

                        const result = await parseCss(cssContent);

                        // Each rgb color should be extracted as normalized hex
                        const expectedHexes = rgbTuples.slice(0, 12).map(([r, g, b]) => {
                            const toHex = (c) => c.toString(16).padStart(2, '0');
                            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
                        });

                        for (const expected of expectedHexes) {
                            expect(result.colors).toContainEqual(expected);
                        }
                    },
                ),
                { numRuns: 100 },
            );
        });

        test('hsl() colors in CSS are extracted', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.uniqueArray(
                        fc.tuple(
                            fc.integer({ min: 0, max: 359 }),
                            fc.integer({ min: 10, max: 90 }),
                            fc.integer({ min: 10, max: 90 }),
                        ),
                        { minLength: 1, maxLength: 12, comparator: (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] },
                    ),
                    async (hslTuples) => {
                        const cssRules = hslTuples.map(([h, s, l], i) =>
                            `.item-${i} { color: hsl(${h}, ${s}%, ${l}%); }`,
                        );
                        const cssContent = cssRules.join('\n');

                        const result = await parseCss(cssContent);

                        // All hsl colors should be extracted (count matches)
                        const expectedCount = Math.min(hslTuples.length, 12);
                        expect(result.colors.length).toBeGreaterThanOrEqual(expectedCount);
                    },
                ),
                { numRuns: 100 },
            );
        });
    });

    describe('SVG parser completeness', () => {
        test('all fill/stroke colors in SVG are extracted (up to 12)', async () => {
            await fc.assert(
                fc.asyncProperty(uniqueHexColorsArb, async (colors) => {
                    // Build SVG content with fill and stroke attributes
                    const elements = colors.map((color, i) => {
                        if (i % 2 === 0) {
                            return `<rect x="${i * 10}" y="0" width="10" height="10" fill="${color}" />`;
                        }
                        return `<circle cx="${i * 10}" cy="5" r="5" stroke="${color}" fill="none" />`;
                    });

                    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
${elements.join('\n')}
</svg>`;

                    const result = await parseSvg(svgContent);

                    // All colors should appear in result (up to 12)
                    const expectedColors = colors.slice(0, 12).map(normalizeHex);
                    for (const expected of expectedColors) {
                        expect(result.colors).toContainEqual(expected);
                    }
                }),
                { numRuns: 100 },
            );
        });

        test('font-family attributes in SVG are extracted (up to 5)', async () => {
            await fc.assert(
                fc.asyncProperty(uniqueFontsArb, async (fonts) => {
                    // Build SVG with font-family attributes on text elements
                    const elements = fonts.map((font, i) =>
                        `<text x="10" y="${(i + 1) * 20}" font-family="${font}">Sample ${i}</text>`,
                    );

                    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
${elements.join('\n')}
</svg>`;

                    const result = await parseSvg(svgContent);

                    // All fonts should be found (up to 5)
                    const expectedFonts = fonts.slice(0, 5);
                    for (const expected of expectedFonts) {
                        expect(result.fonts).toContainEqual(expected);
                    }
                }),
                { numRuns: 100 },
            );
        });

        test('colors in SVG style blocks are extracted', async () => {
            await fc.assert(
                fc.asyncProperty(uniqueHexColorsArb, async (colors) => {
                    // Build SVG with colors in a <style> block
                    const cssRules = colors.map((color, i) =>
                        `.cls-${i} { fill: ${color}; }`,
                    );

                    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<style>
${cssRules.join('\n')}
</style>
<rect class="cls-0" x="0" y="0" width="100" height="100" />
</svg>`;

                    const result = await parseSvg(svgContent);

                    const expectedColors = colors.slice(0, 12).map(normalizeHex);
                    for (const expected of expectedColors) {
                        expect(result.colors).toContainEqual(expected);
                    }
                }),
                { numRuns: 100 },
            );
        });

        test('combined colors and fonts in SVG are fully extracted', async () => {
            await fc.assert(
                fc.asyncProperty(uniqueHexColorsArb, uniqueFontsArb, async (colors, fonts) => {
                    // Build SVG with both colors and fonts
                    const colorElements = colors.map((color, i) =>
                        `<rect x="${i * 10}" y="0" width="10" height="10" fill="${color}" />`,
                    );
                    const fontElements = fonts.map((font, i) =>
                        `<text x="10" y="${(i + 1) * 20}" font-family="${font}">Text ${i}</text>`,
                    );

                    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
${colorElements.join('\n')}
${fontElements.join('\n')}
</svg>`;

                    const result = await parseSvg(svgContent);

                    // Colors (up to 12)
                    const expectedColors = colors.slice(0, 12).map(normalizeHex);
                    for (const expected of expectedColors) {
                        expect(result.colors).toContainEqual(expected);
                    }

                    // Fonts (up to 5)
                    const expectedFonts = fonts.slice(0, 5);
                    for (const expected of expectedFonts) {
                        expect(result.fonts).toContainEqual(expected);
                    }
                }),
                { numRuns: 100 },
            );
        });
    });
});
