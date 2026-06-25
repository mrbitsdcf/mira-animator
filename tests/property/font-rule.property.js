/**
 * Property 9: Conditional font rule inclusion
 * **Validates: Requirements 3.10, 4.10**
 *
 * For any BrandIdentity where the heading or body font is not "Inter",
 * the Theme_Generator SHALL append a `body { font-family: ... }` rule after
 * the `:root` block; when both fonts are "Inter" or defaulted, no such rule
 * SHALL appear.
 */
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateTheme } from '../../lib/brand/theme-generator.js';

/**
 * Arbitrary for a valid hex color (#RRGGBB).
 */
const hexColorArb = fc
    .tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
    )
    .map(([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);

/**
 * Arbitrary for a custom (non-"Inter") font name.
 */
const customFontArb = fc.constantFrom(
    'Montserrat',
    'Open Sans',
    'Roboto',
    'Lato',
    'Poppins',
    'Raleway',
    'Oswald',
    'Playfair Display',
    'Source Sans Pro',
    'Nunito',
);

/**
 * Arbitrary for a BrandIdentity with fontsDefaulted=false and a custom heading font (not "Inter").
 * This MUST produce a body font-family rule in the CSS output.
 */
const identityWithCustomHeadingFontArb = fc.record({
    primary: hexColorArb,
    background: hexColorArb,
    headingFont: customFontArb,
    bodyFont: fc.constantFrom('Inter', 'Montserrat', 'Roboto', 'Lato'),
    fontsDefaulted: fc.constant(false),
    sourceFormat: fc.constantFrom('pptx', 'pdf', 'css', 'html', 'url'),
});

/**
 * Arbitrary for a BrandIdentity with fontsDefaulted=false and a custom body font (not "Inter"),
 * but heading font IS "Inter". This tests that body font also triggers the rule.
 */
const identityWithCustomBodyFontOnlyArb = fc.record({
    primary: hexColorArb,
    background: hexColorArb,
    headingFont: fc.constant('Inter'),
    bodyFont: customFontArb,
    fontsDefaulted: fc.constant(false),
    sourceFormat: fc.constantFrom('pptx', 'pdf', 'css', 'html', 'url'),
});

/**
 * Arbitrary for a BrandIdentity with fontsDefaulted=true (defaults applied).
 * No body font-family rule should appear.
 */
const identityWithDefaultedFontsArb = fc.record({
    primary: hexColorArb,
    background: hexColorArb,
    headingFont: fc.constantFrom('Inter', 'Montserrat', 'Roboto'),
    bodyFont: fc.constantFrom('Inter', 'Open Sans', 'Lato'),
    fontsDefaulted: fc.constant(true),
    sourceFormat: fc.constantFrom('pptx', 'pdf', 'css', 'html', 'url'),
});

/**
 * Arbitrary for a BrandIdentity with fontsDefaulted=false but both fonts are "Inter".
 * No body font-family rule should appear.
 */
const identityWithBothInterArb = fc.record({
    primary: hexColorArb,
    background: hexColorArb,
    headingFont: fc.constant('Inter'),
    bodyFont: fc.constant('Inter'),
    fontsDefaulted: fc.constant(false),
    sourceFormat: fc.constantFrom('pptx', 'pdf', 'css', 'html', 'url'),
});

const FONT_RULE_PATTERN = /body\s*\{\s*font-family:/;

describe('Property 9: Conditional font rule inclusion', () => {
    test('custom heading font (not "Inter") with fontsDefaulted=false → CSS contains body font-family rule', () => {
        fc.assert(
            fc.property(identityWithCustomHeadingFontArb, (identity) => {
                const css = generateTheme({ name: 'test-brand', identity });
                expect(css).toMatch(FONT_RULE_PATTERN);
                // The rule should appear AFTER the :root block
                const rootEnd = css.indexOf('}');
                const fontRuleIdx = css.search(FONT_RULE_PATTERN);
                expect(fontRuleIdx).toBeGreaterThan(rootEnd);
            }),
            { numRuns: 100 },
        );
    });

    test('custom body font (not "Inter") with heading="Inter" and fontsDefaulted=false → CSS contains body font-family rule', () => {
        fc.assert(
            fc.property(identityWithCustomBodyFontOnlyArb, (identity) => {
                const css = generateTheme({ name: 'test-brand', identity });
                expect(css).toMatch(FONT_RULE_PATTERN);
                // The rule should appear AFTER the :root block
                const rootEnd = css.indexOf('}');
                const fontRuleIdx = css.search(FONT_RULE_PATTERN);
                expect(fontRuleIdx).toBeGreaterThan(rootEnd);
            }),
            { numRuns: 100 },
        );
    });

    test('fontsDefaulted=true → CSS does NOT contain body font-family rule', () => {
        fc.assert(
            fc.property(identityWithDefaultedFontsArb, (identity) => {
                const css = generateTheme({ name: 'test-brand', identity });
                expect(css).not.toMatch(FONT_RULE_PATTERN);
            }),
            { numRuns: 100 },
        );
    });

    test('fontsDefaulted=false but both fonts are "Inter" → CSS does NOT contain body font-family rule', () => {
        fc.assert(
            fc.property(identityWithBothInterArb, (identity) => {
                const css = generateTheme({ name: 'test-brand', identity });
                expect(css).not.toMatch(FONT_RULE_PATTERN);
            }),
            { numRuns: 100 },
        );
    });
});
