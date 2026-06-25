/**
 * Property 3: Light/dark classification correctness
 * **Validates: Requirements 2.3, 3.4**
 *
 * For any background color with RGB components (R, G, B), when the WCAG
 * relative luminance is below 0.5, the mode SHALL be classified as "dark";
 * otherwise "light".
 */
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { luminance } from '../../lib/brand/color-utils.js';

/**
 * Reference implementation of WCAG relative luminance.
 * Used to independently verify our color-utils luminance function.
 */
function referenceLuminance(r, g, b) {
    const linearize = (c) => {
        const srgb = c / 255;
        return srgb <= 0.04045
            ? srgb / 12.92
            : Math.pow((srgb + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Classify mode based on luminance threshold.
 */
function classifyMode(r, g, b) {
    return luminance(r, g, b) < 0.5 ? 'dark' : 'light';
}

describe('Property 3: Light/dark classification correctness', () => {
    const rgbArb = fc.record({
        r: fc.integer({ min: 0, max: 255 }),
        g: fc.integer({ min: 0, max: 255 }),
        b: fc.integer({ min: 0, max: 255 }),
    });

    test('luminance of pure black is 0', () => {
        expect(luminance(0, 0, 0)).toBe(0);
    });

    test('luminance of pure white is 1', () => {
        expect(luminance(255, 255, 255)).toBeCloseTo(1, 5);
    });

    test('pure black is classified as dark', () => {
        expect(classifyMode(0, 0, 0)).toBe('dark');
    });

    test('pure white is classified as light', () => {
        expect(classifyMode(255, 255, 255)).toBe('light');
    });

    test('for any RGB color, luminance matches the WCAG reference formula', () => {
        fc.assert(
            fc.property(rgbArb, ({ r, g, b }) => {
                const actual = luminance(r, g, b);
                const expected = referenceLuminance(r, g, b);
                expect(actual).toBeCloseTo(expected, 10);
            }),
            { numRuns: 200 },
        );
    });

    test('for any RGB color, luminance is in [0, 1]', () => {
        fc.assert(
            fc.property(rgbArb, ({ r, g, b }) => {
                const L = luminance(r, g, b);
                expect(L).toBeGreaterThanOrEqual(0);
                expect(L).toBeLessThanOrEqual(1);
            }),
            { numRuns: 200 },
        );
    });

    test('for any RGB color, classification is "dark" when luminance < 0.5, else "light"', () => {
        fc.assert(
            fc.property(rgbArb, ({ r, g, b }) => {
                const L = luminance(r, g, b);
                const mode = classifyMode(r, g, b);
                if (L < 0.5) {
                    expect(mode).toBe('dark');
                } else {
                    expect(mode).toBe('light');
                }
            }),
            { numRuns: 200 },
        );
    });

    test('luminance is monotonically non-decreasing when all components increase equally', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 254 }),
                (base) => {
                    const L1 = luminance(base, base, base);
                    const L2 = luminance(base + 1, base + 1, base + 1);
                    expect(L2).toBeGreaterThanOrEqual(L1);
                },
            ),
            { numRuns: 100 },
        );
    });
});
