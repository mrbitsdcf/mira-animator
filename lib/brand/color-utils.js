/**
 * @fileoverview Color utilities for parsing, luminance calculation, and name validation.
 * @module lib/brand/color-utils
 */

/**
 * CSS named colors (17 standard colors).
 * @type {Record<string, {r: number, g: number, b: number}>}
 */
const NAMED_COLORS = {
    black: { r: 0, g: 0, b: 0 },
    white: { r: 255, g: 255, b: 255 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    yellow: { r: 255, g: 255, b: 0 },
    cyan: { r: 0, g: 255, b: 255 },
    magenta: { r: 255, g: 0, b: 255 },
    gray: { r: 128, g: 128, b: 128 },
    grey: { r: 128, g: 128, b: 128 },
    orange: { r: 255, g: 165, b: 0 },
    purple: { r: 128, g: 0, b: 128 },
    pink: { r: 255, g: 192, b: 203 },
    brown: { r: 165, g: 42, b: 42 },
    navy: { r: 0, g: 0, b: 128 },
    olive: { r: 128, g: 128, b: 0 },
    teal: { r: 0, g: 128, b: 128 },
};

/**
 * Reserved template names that cannot be used.
 * @type {string[]}
 */
export const RESERVED_NAMES = [
    'mira-dark',
    'light-minimal',
    'corporate-blue',
    'neon-emerald',
    'aula-capitulo',
    'pitch-projeto',
    'demo-tecnica',
];

/**
 * Convert HSL values to RGB.
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {{r: number, g: number, b: number}}
 */
function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = s / 100;
    l = l / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r1, g1, b1;

    if (h < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }

    return {
        r: Math.round((r1 + m) * 255),
        g: Math.round((g1 + m) * 255),
        b: Math.round((b1 + m) * 255),
    };
}

/**
 * Parse any CSS color format to {r, g, b}.
 * Supports: 3-digit hex, 6-digit hex, rgb(), rgba(), hsl(), hsla(), named colors.
 * @param {string} color - Color string to parse
 * @returns {{r: number, g: number, b: number}}
 * @throws {Error} If color format is not recognized
 */
export function parseColor(color) {
    const input = color.trim().toLowerCase();

    // Named colors
    if (NAMED_COLORS[input]) {
        return { ...NAMED_COLORS[input] };
    }

    // Hex colors
    if (input.startsWith('#')) {
        const hex = input.slice(1);
        if (hex.length === 3) {
            // #RGB → #RRGGBB
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            return { r, g, b };
        }
        if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return { r, g, b };
        }
    }

    // rgb(R, G, B) or rgba(R, G, B, A)
    const rgbMatch = input.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/);
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1], 10),
            g: parseInt(rgbMatch[2], 10),
            b: parseInt(rgbMatch[3], 10),
        };
    }

    // hsl(H, S%, L%) or hsla(H, S%, L%, A)
    const hslMatch = input.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*[\d.]+)?\s*\)$/);
    if (hslMatch) {
        const h = parseFloat(hslMatch[1]);
        const s = parseFloat(hslMatch[2]);
        const l = parseFloat(hslMatch[3]);
        return hslToRgb(h, s, l);
    }

    throw new Error(`Unrecognized color format: "${color}"`);
}

/**
 * Calculate WCAG relative luminance for an RGB color.
 * Uses linearized sRGB formula.
 * L = 0.2126*Rlin + 0.7152*Glin + 0.0722*Blin
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {number} Relative luminance (0.0 = black, 1.0 = white)
 */
export function luminance(r, g, b) {
    const linearize = (c) => {
        const srgb = c / 255;
        return srgb <= 0.04045
            ? srgb / 12.92
            : Math.pow((srgb + 0.055) / 1.055, 2.4);
    };

    const rLin = linearize(r);
    const gLin = linearize(g);
    const bLin = linearize(b);

    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Lighten a hex color by mixing with white at a given ratio.
 * Formula: new_component = round(C + (255 - C) * ratio)
 * @param {string} hex - Hex color string (#RRGGBB or #RGB)
 * @param {number} ratio - Lightening ratio (0.0 = no change, 1.0 = white)
 * @returns {string} Lightened hex color as #RRGGBB
 */
export function lighten(hex, ratio) {
    const { r, g, b } = parseColor(hex);

    const newR = Math.round(r + (255 - r) * ratio);
    const newG = Math.round(g + (255 - g) * ratio);
    const newB = Math.round(b + (255 - b) * ratio);

    const toHex = (c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0');

    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Validate a kebab-case template name.
 * Pattern: ^[a-z][a-z0-9-]{1,48}[a-z0-9]$
 * Must NOT be in RESERVED_NAMES.
 * @param {string} name - Template name to validate
 * @returns {boolean} True if valid
 */
export function isValidTemplateName(name) {
    if (typeof name !== 'string') return false;
    if (RESERVED_NAMES.includes(name)) return false;
    return /^[a-z][a-z0-9-]{1,48}[a-z0-9]$/.test(name);
}
