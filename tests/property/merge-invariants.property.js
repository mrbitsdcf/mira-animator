/**
 * Property 2: Multi-source merge preserves union with caps
 * **Validates: Requirements 1.7**
 *
 * For any set of RawExtraction results from multiple files in a ZIP archive,
 * the merged result SHALL contain the union of all unique colors capped at 12
 * and the union of all unique font families capped at 5, with no duplicates.
 */
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Merge multiple ParseResult objects into a single result.
 * Replicates the merge logic specified for the ZIP parser:
 * - Union of all unique colors (case-insensitive), capped at 12
 * - Union of all unique font families (case-insensitive), capped at 5
 * - No duplicates in the output
 */
function mergeResults(results) {
    const colorSet = new Set();
    const fontSet = new Set();
    const colors = [];
    const fonts = [];

    for (const result of results) {
        for (const color of result.colors) {
            const normalized = color.toLowerCase();
            if (!colorSet.has(normalized) && colors.length < 12) {
                colorSet.add(normalized);
                colors.push(normalized);
            }
        }
        for (const font of result.fonts) {
            const key = font.toLowerCase();
            if (!fontSet.has(key) && fonts.length < 5) {
                fontSet.add(key);
                fonts.push(font);
            }
        }
    }
    return { colors, fonts };
}

/**
 * Arbitrary for a hex color string (#RRGGBB format).
 */
const arbHexColor = fc
    .tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
    )
    .map(([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);

/**
 * Arbitrary for a font family name.
 */
const arbFontFamily = fc.oneof(
    fc.constant('Arial'),
    fc.constant('Helvetica'),
    fc.constant('Times New Roman'),
    fc.constant('Georgia'),
    fc.constant('Verdana'),
    fc.constant('Courier New'),
    fc.constant('Trebuchet MS'),
    fc.constant('Impact'),
    fc.constant('Comic Sans MS'),
    fc.constant('Palatino'),
    fc.constant('Garamond'),
    fc.constant('Bookman'),
    fc.constant('Montserrat'),
    fc.constant('Open Sans'),
    fc.constant('Roboto'),
    fc.constant('Lato'),
    fc.constant('Inter'),
    fc.constant('Poppins'),
    fc.constant('Oswald'),
    fc.constant('Raleway'),
);

/**
 * Arbitrary for a single ParseResult with random colors and fonts.
 */
const arbParseResult = fc.record({
    colors: fc.array(arbHexColor, { minLength: 0, maxLength: 15 }),
    fonts: fc.array(arbFontFamily, { minLength: 0, maxLength: 8 }),
});

/**
 * Arbitrary for an array of 2-10 ParseResult objects.
 */
const arbParseResults = fc.array(arbParseResult, { minLength: 2, maxLength: 10 });

describe('Property 2: Multi-source merge preserves union with caps', () => {
    test('merged result contains no duplicate colors', () => {
        fc.assert(
            fc.property(arbParseResults, (results) => {
                const merged = mergeResults(results);
                const uniqueColors = new Set(merged.colors);
                expect(uniqueColors.size).toBe(merged.colors.length);
            }),
            { numRuns: 200 },
        );
    });

    test('merged result contains no duplicate fonts', () => {
        fc.assert(
            fc.property(arbParseResults, (results) => {
                const merged = mergeResults(results);
                const uniqueFonts = new Set(merged.fonts.map((f) => f.toLowerCase()));
                expect(uniqueFonts.size).toBe(merged.fonts.length);
            }),
            { numRuns: 200 },
        );
    });

    test('merged result has at most 12 colors', () => {
        fc.assert(
            fc.property(arbParseResults, (results) => {
                const merged = mergeResults(results);
                expect(merged.colors.length).toBeLessThanOrEqual(12);
            }),
            { numRuns: 200 },
        );
    });

    test('merged result has at most 5 fonts', () => {
        fc.assert(
            fc.property(arbParseResults, (results) => {
                const merged = mergeResults(results);
                expect(merged.fonts.length).toBeLessThanOrEqual(5);
            }),
            { numRuns: 200 },
        );
    });

    test('every color in the result exists in at least one source', () => {
        fc.assert(
            fc.property(arbParseResults, (results) => {
                const merged = mergeResults(results);
                const allSourceColors = new Set(
                    results.flatMap((r) => r.colors.map((c) => c.toLowerCase())),
                );
                for (const color of merged.colors) {
                    expect(allSourceColors.has(color.toLowerCase())).toBe(true);
                }
            }),
            { numRuns: 200 },
        );
    });

    test('every font in the result exists in at least one source', () => {
        fc.assert(
            fc.property(arbParseResults, (results) => {
                const merged = mergeResults(results);
                const allSourceFonts = new Set(
                    results.flatMap((r) => r.fonts.map((f) => f.toLowerCase())),
                );
                for (const font of merged.fonts) {
                    expect(allSourceFonts.has(font.toLowerCase())).toBe(true);
                }
            }),
            { numRuns: 200 },
        );
    });

    test('if total unique colors across all sources <= 12, all appear in result', () => {
        fc.assert(
            fc.property(arbParseResults, (results) => {
                const allUniqueColors = new Set(
                    results.flatMap((r) => r.colors.map((c) => c.toLowerCase())),
                );
                const merged = mergeResults(results);
                if (allUniqueColors.size <= 12) {
                    expect(merged.colors.length).toBe(allUniqueColors.size);
                    for (const color of allUniqueColors) {
                        expect(merged.colors).toContain(color);
                    }
                }
            }),
            { numRuns: 200 },
        );
    });

    test('if total unique fonts across all sources <= 5, all appear in result', () => {
        fc.assert(
            fc.property(arbParseResults, (results) => {
                const allUniqueFonts = new Set(
                    results.flatMap((r) => r.fonts.map((f) => f.toLowerCase())),
                );
                const merged = mergeResults(results);
                if (allUniqueFonts.size <= 5) {
                    expect(merged.fonts.length).toBe(allUniqueFonts.size);
                    for (const font of allUniqueFonts) {
                        expect(merged.fonts.map((f) => f.toLowerCase())).toContain(font);
                    }
                }
            }),
            { numRuns: 200 },
        );
    });
});
