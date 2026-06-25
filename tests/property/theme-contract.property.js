/**
 * Property 4: Theme CSS variable contract completeness
 * **Validates: Requirements 3.1, 8.2**
 *
 * For any valid BrandIdentity with a primary color and a background color,
 * the Theme_Generator SHALL produce a CSS string containing exactly all 15
 * `--mira-*` variable declarations.
 */
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateTheme } from '../../lib/brand/theme-generator.js';

/**
 * The 15 required CSS custom properties that every Mira theme must define.
 */
const ALL_MIRA_VARIABLES = [
    '--mira-primary',
    '--mira-bg',
    '--mira-text',
    '--mira-text-soft',
    '--mira-text-softer',
    '--mira-card-bg',
    '--mira-card-border',
    '--mira-glow-soft',
    '--mira-glow-strong',
    '--mira-icon-bg',
    '--mira-icon-border',
    '--mira-pill-bg',
    '--mira-pill-border',
    '--mira-stage-glow',
    '--mira-accent-2',
];

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
 * Arbitrary for a minimal valid BrandIdentity object with required fields.
 */
const arbBrandIdentity = fc.record({
    primary: arbHexColor,
    background: arbHexColor,
    sourceFormat: fc.constantFrom('css', 'html', 'pptx', 'pdf', 'csv', 'svg', 'image', 'url', 'zip'),
    fontsDefaulted: fc.boolean(),
    headingFont: fc.constantFrom('Inter', 'Montserrat', 'Roboto', 'Open Sans', 'Poppins'),
    bodyFont: fc.constantFrom('Inter', 'Roboto', 'Open Sans', 'Lato', 'Nunito'),
});

describe('Property 4: Theme CSS variable contract completeness', () => {
    test('for any valid BrandIdentity, all 15 --mira-* variables are present in the CSS output', () => {
        fc.assert(
            fc.property(arbBrandIdentity, (identity) => {
                const css = generateTheme({ name: 'test-template', identity });

                for (const variable of ALL_MIRA_VARIABLES) {
                    expect(css).toContain(`${variable}:`);
                }
            }),
            { numRuns: 100 },
        );
    });

    test('for any valid BrandIdentity, the CSS contains exactly 15 --mira-* variable declarations', () => {
        fc.assert(
            fc.property(arbBrandIdentity, (identity) => {
                const css = generateTheme({ name: 'test-template', identity });

                // Count all --mira-* declarations using regex
                const miraVarMatches = css.match(/--mira-[\w-]+:/g);
                expect(miraVarMatches).not.toBeNull();
                expect(miraVarMatches.length).toBe(15);
            }),
            { numRuns: 100 },
        );
    });

    test('for any valid BrandIdentity, the CSS starts with the MIRA THEME comment header', () => {
        fc.assert(
            fc.property(arbBrandIdentity, (identity) => {
                const css = generateTheme({ name: 'test-template', identity });

                expect(css).toMatch(/^\/\* MIRA THEME: /);
            }),
            { numRuns: 100 },
        );
    });

    test('for any valid BrandIdentity, no extra --mira-* variables are present beyond the 15 required', () => {
        fc.assert(
            fc.property(arbBrandIdentity, (identity) => {
                const css = generateTheme({ name: 'test-template', identity });

                const miraVarMatches = css.match(/--mira-([\w-]+):/g);
                const foundVars = miraVarMatches.map((m) => m.slice(0, -1)); // remove trailing ':'

                for (const found of foundVars) {
                    expect(ALL_MIRA_VARIABLES).toContain(found);
                }
            }),
            { numRuns: 100 },
        );
    });
});
