/**
 * Property 5: Theme variable derivation correctness
 * **Validates: Requirements 3.2, 3.3, 3.5, 3.6, 3.7, 3.8**
 *
 * For any primary color (R, G, B) and derived text color (Tr, Tg, Tb),
 * the Theme_Generator SHALL produce variables whose values exactly match
 * the derivation formulas.
 */
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateTheme } from '../../lib/brand/theme-generator.js';
import { luminance, parseColor } from '../../lib/brand/color-utils.js';

/**
 * Parse the CSS output from generateTheme and extract variable values.
 * @param {string} css - The generated CSS string
 * @returns {Record<string, string>} Map of variable name to value
 */
function parseCSSVariables(css) {
    const vars = {};
    const regex = /--([\w-]+)\s*:\s*([^;]+);/g;
    let match;
    while ((match = regex.exec(css)) !== null) {
        vars[`--${match[1]}`] = match[2].trim();
    }
    return vars;
}

/**
 * Derive expected text color from background luminance.
 */
function deriveTextColor(bgR, bgG, bgB) {
    const bgLum = luminance(bgR, bgG, bgB);
    return bgLum < 0.5 ? { r: 255, g: 255, b: 255 } : { r: 26, g: 26, b: 26 };
}

/**
 * Compute expected accent-2 hex from primary color using lighten formula.
 * Formula: new_component = round(C + (255 - C) * 0.35)
 */
function expectedAccent2(r, g, b) {
    const newR = Math.round(r + (255 - r) * 0.35);
    const newG = Math.round(g + (255 - g) * 0.35);
    const newB = Math.round(b + (255 - b) * 0.35);
    const toHex = (c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0');
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Build a hex color string from RGB components.
 */
function toHex(r, g, b) {
    const h = (c) => c.toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
}

describe('Property 5: Theme variable derivation correctness', () => {
    // Arbitrary for RGB color component (0-255)
    const rgbArb = fc.record({
        r: fc.integer({ min: 0, max: 255 }),
        g: fc.integer({ min: 0, max: 255 }),
        b: fc.integer({ min: 0, max: 255 }),
    });

    // Generate a brand identity from arbitrary primary and background colors
    const brandIdentityArb = fc.tuple(rgbArb, rgbArb).map(([primary, background]) => ({
        primary: toHex(primary.r, primary.g, primary.b),
        background: toHex(background.r, background.g, background.b),
        primaryRGB: primary,
        backgroundRGB: background,
    }));

    test('--mira-glow-soft equals rgba(R, G, B, 0.15) of primary', () => {
        fc.assert(
            fc.property(brandIdentityArb, ({ primary, background, primaryRGB }) => {
                const css = generateTheme({
                    name: 'test-derivation',
                    identity: { primary, background, sourceFormat: 'css', fontsDefaulted: true },
                });
                const vars = parseCSSVariables(css);
                const expected = `rgba(${primaryRGB.r}, ${primaryRGB.g}, ${primaryRGB.b}, 0.15)`;
                expect(vars['--mira-glow-soft']).toBe(expected);
            }),
            { numRuns: 100 },
        );
    });

    test('--mira-glow-strong equals rgba(R, G, B, 0.25) of primary', () => {
        fc.assert(
            fc.property(brandIdentityArb, ({ primary, background, primaryRGB }) => {
                const css = generateTheme({
                    name: 'test-derivation',
                    identity: { primary, background, sourceFormat: 'css', fontsDefaulted: true },
                });
                const vars = parseCSSVariables(css);
                const expected = `rgba(${primaryRGB.r}, ${primaryRGB.g}, ${primaryRGB.b}, 0.25)`;
                expect(vars['--mira-glow-strong']).toBe(expected);
            }),
            { numRuns: 100 },
        );
    });

    test('--mira-icon-bg equals rgba(R, G, B, 0.15) of primary', () => {
        fc.assert(
            fc.property(brandIdentityArb, ({ primary, background, primaryRGB }) => {
                const css = generateTheme({
                    name: 'test-derivation',
                    identity: { primary, background, sourceFormat: 'css', fontsDefaulted: true },
                });
                const vars = parseCSSVariables(css);
                const expected = `rgba(${primaryRGB.r}, ${primaryRGB.g}, ${primaryRGB.b}, 0.15)`;
                expect(vars['--mira-icon-bg']).toBe(expected);
            }),
            { numRuns: 100 },
        );
    });

    test('--mira-icon-border equals rgba(R, G, B, 0.30) of primary', () => {
        fc.assert(
            fc.property(brandIdentityArb, ({ primary, background, primaryRGB }) => {
                const css = generateTheme({
                    name: 'test-derivation',
                    identity: { primary, background, sourceFormat: 'css', fontsDefaulted: true },
                });
                const vars = parseCSSVariables(css);
                const expected = `rgba(${primaryRGB.r}, ${primaryRGB.g}, ${primaryRGB.b}, 0.30)`;
                expect(vars['--mira-icon-border']).toBe(expected);
            }),
            { numRuns: 100 },
        );
    });

    test('--mira-stage-glow equals rgba(R, G, B, 0.06) of primary', () => {
        fc.assert(
            fc.property(brandIdentityArb, ({ primary, background, primaryRGB }) => {
                const css = generateTheme({
                    name: 'test-derivation',
                    identity: { primary, background, sourceFormat: 'css', fontsDefaulted: true },
                });
                const vars = parseCSSVariables(css);
                const expected = `rgba(${primaryRGB.r}, ${primaryRGB.g}, ${primaryRGB.b}, 0.06)`;
                expect(vars['--mira-stage-glow']).toBe(expected);
            }),
            { numRuns: 100 },
        );
    });

    test('--mira-text-soft equals rgba(Tr, Tg, Tb, 0.70) of derived text color', () => {
        fc.assert(
            fc.property(brandIdentityArb, ({ primary, background, backgroundRGB }) => {
                const css = generateTheme({
                    name: 'test-derivation',
                    identity: { primary, background, sourceFormat: 'css', fontsDefaulted: true },
                });
                const vars = parseCSSVariables(css);
                const text = deriveTextColor(backgroundRGB.r, backgroundRGB.g, backgroundRGB.b);
                const expected = `rgba(${text.r}, ${text.g}, ${text.b}, 0.70)`;
                expect(vars['--mira-text-soft']).toBe(expected);
            }),
            { numRuns: 100 },
        );
    });

    test('--mira-text-softer equals rgba(Tr, Tg, Tb, 0.50) of derived text color', () => {
        fc.assert(
            fc.property(brandIdentityArb, ({ primary, background, backgroundRGB }) => {
                const css = generateTheme({
                    name: 'test-derivation',
                    identity: { primary, background, sourceFormat: 'css', fontsDefaulted: true },
                });
                const vars = parseCSSVariables(css);
                const text = deriveTextColor(backgroundRGB.r, backgroundRGB.g, backgroundRGB.b);
                const expected = `rgba(${text.r}, ${text.g}, ${text.b}, 0.50)`;
                expect(vars['--mira-text-softer']).toBe(expected);
            }),
            { numRuns: 100 },
        );
    });

    test('--mira-card-bg equals rgba(Tr, Tg, Tb, 0.05) of derived text color', () => {
        fc.assert(
            fc.property(brandIdentityArb, ({ primary, background, backgroundRGB }) => {
                const css = generateTheme({
                    name: 'test-derivation',
                    identity: { primary, background, sourceFormat: 'css', fontsDefaulted: true },
                });
                const vars = parseCSSVariables(css);
                const text = deriveTextColor(backgroundRGB.r, backgroundRGB.g, backgroundRGB.b);
                const expected = `rgba(${text.r}, ${text.g}, ${text.b}, 0.05)`;
                expect(vars['--mira-card-bg']).toBe(expected);
            }),
            { numRuns: 100 },
        );
    });

    test('--mira-card-border equals rgba(Tr, Tg, Tb, 0.10) of derived text color', () => {
        fc.assert(
            fc.property(brandIdentityArb, ({ primary, background, backgroundRGB }) => {
                const css = generateTheme({
                    name: 'test-derivation',
                    identity: { primary, background, sourceFormat: 'css', fontsDefaulted: true },
                });
                const vars = parseCSSVariables(css);
                const text = deriveTextColor(backgroundRGB.r, backgroundRGB.g, backgroundRGB.b);
                const expected = `rgba(${text.r}, ${text.g}, ${text.b}, 0.10)`;
                expect(vars['--mira-card-border']).toBe(expected);
            }),
            { numRuns: 100 },
        );
    });

    test('--mira-pill-bg equals rgba(Tr, Tg, Tb, 0.04) of derived text color', () => {
        fc.assert(
            fc.property(brandIdentityArb, ({ primary, background, backgroundRGB }) => {
                const css = generateTheme({
                    name: 'test-derivation',
                    identity: { primary, background, sourceFormat: 'css', fontsDefaulted: true },
                });
                const vars = parseCSSVariables(css);
                const text = deriveTextColor(backgroundRGB.r, backgroundRGB.g, backgroundRGB.b);
                const expected = `rgba(${text.r}, ${text.g}, ${text.b}, 0.04)`;
                expect(vars['--mira-pill-bg']).toBe(expected);
            }),
            { numRuns: 100 },
        );
    });

    test('--mira-pill-border equals rgba(Tr, Tg, Tb, 0.08) of derived text color', () => {
        fc.assert(
            fc.property(brandIdentityArb, ({ primary, background, backgroundRGB }) => {
                const css = generateTheme({
                    name: 'test-derivation',
                    identity: { primary, background, sourceFormat: 'css', fontsDefaulted: true },
                });
                const vars = parseCSSVariables(css);
                const text = deriveTextColor(backgroundRGB.r, backgroundRGB.g, backgroundRGB.b);
                const expected = `rgba(${text.r}, ${text.g}, ${text.b}, 0.08)`;
                expect(vars['--mira-pill-border']).toBe(expected);
            }),
            { numRuns: 100 },
        );
    });

    test('--mira-accent-2 equals hex of round(C + (255-C)*0.35) per primary component', () => {
        fc.assert(
            fc.property(brandIdentityArb, ({ primary, background, primaryRGB }) => {
                const css = generateTheme({
                    name: 'test-derivation',
                    identity: { primary, background, sourceFormat: 'css', fontsDefaulted: true },
                });
                const vars = parseCSSVariables(css);
                const expected = expectedAccent2(primaryRGB.r, primaryRGB.g, primaryRGB.b);
                expect(vars['--mira-accent-2']).toBe(expected);
            }),
            { numRuns: 100 },
        );
    });

    test('all derivation formulas hold simultaneously for any primary+background pair', () => {
        fc.assert(
            fc.property(brandIdentityArb, ({ primary, background, primaryRGB, backgroundRGB }) => {
                const css = generateTheme({
                    name: 'test-all',
                    identity: { primary, background, sourceFormat: 'css', fontsDefaulted: true },
                });
                const vars = parseCSSVariables(css);
                const text = deriveTextColor(backgroundRGB.r, backgroundRGB.g, backgroundRGB.b);
                const P = primaryRGB;
                const T = text;

                // Primary-derived variables
                expect(vars['--mira-glow-soft']).toBe(`rgba(${P.r}, ${P.g}, ${P.b}, 0.15)`);
                expect(vars['--mira-glow-strong']).toBe(`rgba(${P.r}, ${P.g}, ${P.b}, 0.25)`);
                expect(vars['--mira-icon-bg']).toBe(`rgba(${P.r}, ${P.g}, ${P.b}, 0.15)`);
                expect(vars['--mira-icon-border']).toBe(`rgba(${P.r}, ${P.g}, ${P.b}, 0.30)`);
                expect(vars['--mira-stage-glow']).toBe(`rgba(${P.r}, ${P.g}, ${P.b}, 0.06)`);

                // Text-derived variables
                expect(vars['--mira-text-soft']).toBe(`rgba(${T.r}, ${T.g}, ${T.b}, 0.70)`);
                expect(vars['--mira-text-softer']).toBe(`rgba(${T.r}, ${T.g}, ${T.b}, 0.50)`);
                expect(vars['--mira-card-bg']).toBe(`rgba(${T.r}, ${T.g}, ${T.b}, 0.05)`);
                expect(vars['--mira-card-border']).toBe(`rgba(${T.r}, ${T.g}, ${T.b}, 0.10)`);
                expect(vars['--mira-pill-bg']).toBe(`rgba(${T.r}, ${T.g}, ${T.b}, 0.04)`);
                expect(vars['--mira-pill-border']).toBe(`rgba(${T.r}, ${T.g}, ${T.b}, 0.08)`);

                // Accent-2
                expect(vars['--mira-accent-2']).toBe(expectedAccent2(P.r, P.g, P.b));
            }),
            { numRuns: 100 },
        );
    });
});
