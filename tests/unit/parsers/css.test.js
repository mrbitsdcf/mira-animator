import { describe, it, expect } from 'vitest';
import { parse } from '../../../lib/brand/parsers/css.js';

describe('CSS parser', () => {
    describe('color extraction', () => {
        it('extracts 3-digit hex colors (#f00)', async () => {
            const css = 'body { color: #f00; }';
            const result = await parse(css);
            expect(result.colors).toContain('#ff0000');
        });

        it('extracts 6-digit hex colors (#ff0000)', async () => {
            const css = '.brand { background: #1a2b3c; }';
            const result = await parse(css);
            expect(result.colors).toContain('#1a2b3c');
        });

        it('extracts rgb colors', async () => {
            const css = '.box { color: rgb(128, 64, 32); }';
            const result = await parse(css);
            expect(result.colors).toContain('#804020');
        });

        it('extracts rgba colors (ignoring alpha)', async () => {
            const css = '.overlay { background: rgba(255, 0, 128, 0.5); }';
            const result = await parse(css);
            expect(result.colors).toContain('#ff0080');
        });

        it('extracts hsl colors', async () => {
            const css = '.accent { color: hsl(0, 100%, 50%); }';
            const result = await parse(css);
            expect(result.colors).toContain('#ff0000');
        });

        it('extracts hsla colors (ignoring alpha)', async () => {
            const css = '.glow { border-color: hsla(120, 100%, 50%, 0.8); }';
            const result = await parse(css);
            expect(result.colors).toContain('#00ff00');
        });

        it('deduplicates colors', async () => {
            const css = `
                .a { color: #ff0000; }
                .b { color: #ff0000; }
                .c { color: rgb(255, 0, 0); }
            `;
            const result = await parse(css);
            const redCount = result.colors.filter(c => c === '#ff0000').length;
            expect(redCount).toBe(1);
        });

        it('caps at 12 colors', async () => {
            const colors = Array.from({ length: 20 }, (_, i) =>
                `#${i.toString(16).padStart(2, '0')}aa${i.toString(16).padStart(2, '0')}`
            );
            const css = colors.map((c, i) => `.c${i} { color: ${c}; }`).join('\n');
            const result = await parse(css);
            expect(result.colors.length).toBeLessThanOrEqual(12);
        });
    });

    describe('font extraction', () => {
        it('extracts font-family declarations', async () => {
            const css = 'body { font-family: "Open Sans", sans-serif; }';
            const result = await parse(css);
            expect(result.fonts).toContain('Open Sans');
        });

        it('extracts multiple font families', async () => {
            const css = `
                h1 { font-family: "Montserrat", sans-serif; }
                p { font-family: "Roboto", "Helvetica", sans-serif; }
            `;
            const result = await parse(css);
            expect(result.fonts).toContain('Montserrat');
            expect(result.fonts).toContain('Roboto');
            expect(result.fonts).toContain('Helvetica');
        });

        it('filters out generic families (sans-serif, monospace, etc.)', async () => {
            const css = 'body { font-family: sans-serif; }';
            const result = await parse(css);
            expect(result.fonts).not.toContain('sans-serif');
        });

        it('caps at 5 fonts', async () => {
            const fonts = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta'];
            const css = fonts.map(f => `.f { font-family: "${f}"; }`).join('\n');
            const result = await parse(css);
            expect(result.fonts.length).toBeLessThanOrEqual(5);
        });
    });

    describe('edge cases', () => {
        it('empty input returns empty result', async () => {
            const result = await parse('');
            expect(result.colors).toEqual([]);
            expect(result.fonts).toEqual([]);
            expect(result.logos).toEqual([]);
            expect(result.layouts).toEqual([]);
        });

        it('null input returns empty result', async () => {
            const result = await parse(null);
            expect(result.colors).toEqual([]);
            expect(result.fonts).toEqual([]);
        });

        it('CSS with no colors or fonts returns empty arrays', async () => {
            const css = '.box { margin: 10px; padding: 5px; display: flex; }';
            const result = await parse(css);
            expect(result.colors).toEqual([]);
            expect(result.fonts).toEqual([]);
        });

        it('single color source extracts that one color', async () => {
            const css = 'body { background: #e63946; }';
            const result = await parse(css);
            expect(result.colors).toHaveLength(1);
            expect(result.colors[0]).toBe('#e63946');
        });
    });
});
