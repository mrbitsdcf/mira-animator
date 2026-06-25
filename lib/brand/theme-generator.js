/**
 * @fileoverview Theme Generator – produces a complete Mira CSS theme from BrandIdentity.
 * @module lib/brand/theme-generator
 */

import { parseColor, luminance, lighten } from './color-utils.js';

/**
 * Generate a complete Mira CSS theme string from brand identity data.
 *
 * @param {Object} input
 * @param {string} input.name - Template name (kebab-case slug)
 * @param {import('./types.js').BrandIdentity} input.identity - Extracted brand identity
 * @returns {string} Complete CSS theme string
 * @throws {Error} If primary or background color is missing
 */
export function generateTheme({ name, identity }) {
    // Validate required colors (Requirement 3.11)
    if (!identity.primary) {
        throw new Error('Missing required: primary color');
    }
    if (!identity.background) {
        throw new Error('Missing required: background color');
    }

    // Parse primary and background colors
    const primary = parseColor(identity.primary);
    const bg = parseColor(identity.background);

    // Derive text color based on background luminance (Requirement 3.4)
    const bgLum = luminance(bg.r, bg.g, bg.b);
    const textHex = bgLum < 0.5 ? '#ffffff' : '#1a1a1a';
    const text = parseColor(textHex);

    // Derive accent-2 by lightening primary at 0.35 (Requirement 3.7)
    const accent2 = lighten(identity.primary, 0.35);

    // Format primary as normalized 6-digit hex
    const primaryHex = `#${primary.r.toString(16).padStart(2, '0')}${primary.g.toString(16).padStart(2, '0')}${primary.b.toString(16).padStart(2, '0')}`;
    const bgHex = `#${bg.r.toString(16).padStart(2, '0')}${bg.g.toString(16).padStart(2, '0')}${bg.b.toString(16).padStart(2, '0')}`;

    // Build CSS comment header (Requirement 3.9)
    const sourceFormat = identity.sourceFormat || 'unknown';
    const header = `/* MIRA THEME: ${name} (source: ${sourceFormat}) */`;

    // Build :root block with all 15 variables (Requirement 3.1)
    const rootBlock = `:root {
    --mira-primary: ${primaryHex};
    --mira-bg: ${bgHex};
    --mira-text: ${textHex};
    --mira-text-soft: rgba(${text.r}, ${text.g}, ${text.b}, 0.70);
    --mira-text-softer: rgba(${text.r}, ${text.g}, ${text.b}, 0.50);
    --mira-card-bg: rgba(${text.r}, ${text.g}, ${text.b}, 0.05);
    --mira-card-border: rgba(${text.r}, ${text.g}, ${text.b}, 0.10);
    --mira-glow-soft: rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.15);
    --mira-glow-strong: rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.25);
    --mira-icon-bg: rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.15);
    --mira-icon-border: rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.30);
    --mira-pill-bg: rgba(${text.r}, ${text.g}, ${text.b}, 0.04);
    --mira-pill-border: rgba(${text.r}, ${text.g}, ${text.b}, 0.08);
    --mira-stage-glow: rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.06);
    --mira-accent-2: ${accent2};
}`;

    // Assemble full CSS
    let css = `${header}\n${rootBlock}`;

    // Append body font rule for custom fonts (Requirement 3.10)
    // Only if a custom font (not "Inter") was extracted and fonts were not defaulted
    if (!identity.fontsDefaulted) {
        // Check headingFont first, then bodyFont — use whichever is not "Inter"
        const headingCustom = identity.headingFont && identity.headingFont !== 'Inter' ? identity.headingFont : null;
        const bodyCustom = identity.bodyFont && identity.bodyFont !== 'Inter' ? identity.bodyFont : null;
        const customFont = headingCustom || bodyCustom;
        if (customFont) {
            css += `\n\nbody { font-family: '${customFont}', sans-serif; }`;
        }
    }

    return css;
}
