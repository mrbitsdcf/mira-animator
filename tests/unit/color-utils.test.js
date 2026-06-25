import { describe, it, expect } from 'vitest';
import { parseColor, luminance, lighten, isValidTemplateName } from '../../lib/brand/color-utils.js';

describe('parseColor', () => {
    it('parses 3-digit hex (#f00) to {r: 255, g: 0, b: 0}', () => {
        expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses 6-digit hex (#ff0000) to {r: 255, g: 0, b: 0}', () => {
        expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses rgb(128, 64, 32) to {r: 128, g: 64, b: 32}', () => {
        expect(parseColor('rgb(128, 64, 32)')).toEqual({ r: 128, g: 64, b: 32 });
    });

    it('parses rgba(128, 64, 32, 0.5) to {r: 128, g: 64, b: 32} (alpha ignored)', () => {
        expect(parseColor('rgba(128, 64, 32, 0.5)')).toEqual({ r: 128, g: 64, b: 32 });
    });

    it('parses hsl(0, 100%, 50%) to {r: 255, g: 0, b: 0}', () => {
        expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses hsla(120, 100%, 50%, 0.8) to {r: 0, g: 255, b: 0}', () => {
        expect(parseColor('hsla(120, 100%, 50%, 0.8)')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it("parses named color 'blue' to {r: 0, g: 0, b: 255}", () => {
        expect(parseColor('blue')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it("parses named color 'teal' to {r: 0, g: 128, b: 128}", () => {
        expect(parseColor('teal')).toEqual({ r: 0, g: 128, b: 128 });
    });

    it('throws Error for invalid color format', () => {
        expect(() => parseColor('not-a-color')).toThrow(Error);
        expect(() => parseColor('not-a-color')).toThrow(/Unrecognized color format/);
    });
});

describe('luminance', () => {
    it('returns 0.0 for pure black (0, 0, 0)', () => {
        expect(luminance(0, 0, 0)).toBe(0);
    });

    it('returns 1.0 for pure white (255, 255, 255)', () => {
        expect(luminance(255, 255, 255)).toBeCloseTo(1.0, 4);
    });

    it('returns approximately 0.2126 for pure red (255, 0, 0)', () => {
        expect(luminance(255, 0, 0)).toBeCloseTo(0.2126, 4);
    });

    it('returns a value between 0 and 1 for any valid input', () => {
        const result = luminance(128, 64, 200);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
    });
});

describe('lighten', () => {
    it('lighten(#000000, 0) returns #000000 (no change)', () => {
        expect(lighten('#000000', 0)).toBe('#000000');
    });

    it('lighten(#000000, 1) returns #ffffff (full white)', () => {
        expect(lighten('#000000', 1)).toBe('#ffffff');
    });

    it('lighten(#000000, 0.5) returns approximately #808080', () => {
        const result = lighten('#000000', 0.5);
        // round(0 + (255 - 0) * 0.5) = round(127.5) = 128 = 0x80
        expect(result).toBe('#808080');
    });

    it('lighten(#ff0000, 0.35) returns correct value using formula', () => {
        // R: round(255 + (255 - 255) * 0.35) = 255
        // G: round(0 + (255 - 0) * 0.35) = round(89.25) = 89
        // B: round(0 + (255 - 0) * 0.35) = round(89.25) = 89
        expect(lighten('#ff0000', 0.35)).toBe('#ff5959');
    });
});

describe('isValidTemplateName', () => {
    it("'my-template' is valid", () => {
        expect(isValidTemplateName('my-template')).toBe(true);
    });

    it("'a1' is invalid (too short, only 2 chars)", () => {
        expect(isValidTemplateName('a1')).toBe(false);
    });

    it("'abc' is valid (3 chars, minimum length)", () => {
        expect(isValidTemplateName('abc')).toBe(true);
    });

    it("'Abc' is invalid (uppercase letter)", () => {
        expect(isValidTemplateName('Abc')).toBe(false);
    });

    it("'-abc' is invalid (starts with hyphen)", () => {
        expect(isValidTemplateName('-abc')).toBe(false);
    });

    it("'abc-' is invalid (ends with hyphen)", () => {
        expect(isValidTemplateName('abc-')).toBe(false);
    });

    it("'mira-dark' is invalid (reserved name)", () => {
        expect(isValidTemplateName('mira-dark')).toBe(false);
    });

    it("'aula-capitulo' is invalid (reserved name)", () => {
        expect(isValidTemplateName('aula-capitulo')).toBe(false);
    });
});
