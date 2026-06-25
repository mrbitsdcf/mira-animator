import { describe, it, expect } from 'vitest';
import { parse } from '../../../lib/brand/parsers/svg.js';

describe('SVG parser', () => {
    describe('fill color extraction', () => {
        it('extracts fill colors from attributes', async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <rect fill="#e63946" width="100" height="100"/>
                    <circle fill="#457b9d" r="50"/>
                </svg>
            `;
            const result = await parse(svg);
            expect(result.colors).toContain('#e63946');
            expect(result.colors).toContain('#457b9d');
        });

        it('extracts fill colors from inline styles', async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <rect style="fill: #1d3557;" width="100" height="100"/>
                </svg>
            `;
            const result = await parse(svg);
            expect(result.colors).toContain('#1d3557');
        });
    });

    describe('stroke color extraction', () => {
        it('extracts stroke colors from attributes', async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <line stroke="#a8dadc" x1="0" y1="0" x2="100" y2="100"/>
                </svg>
            `;
            const result = await parse(svg);
            expect(result.colors).toContain('#a8dadc');
        });

        it('extracts stroke colors from inline styles', async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <path style="stroke: #f1faee;" d="M0 0 L100 100"/>
                </svg>
            `;
            const result = await parse(svg);
            expect(result.colors).toContain('#f1faee');
        });
    });

    describe('font extraction', () => {
        it('extracts font-family from attributes', async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <text font-family="Montserrat" x="10" y="50">Hello</text>
                </svg>
            `;
            const result = await parse(svg);
            expect(result.fonts).toContain('Montserrat');
        });

        it('extracts font-family from inline styles', async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <text style="font-family: 'Open Sans', sans-serif;" x="10" y="50">World</text>
                </svg>
            `;
            const result = await parse(svg);
            expect(result.fonts).toContain('Open Sans');
        });

        it('extracts font-family from style blocks', async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <style>
                        text { font-family: Roboto; }
                    </style>
                    <text x="10" y="50">Styled</text>
                </svg>
            `;
            const result = await parse(svg);
            expect(result.fonts).toContain('Roboto');
        });

        it('filters out generic font families', async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <text font-family="sans-serif" x="10" y="50">Generic</text>
                </svg>
            `;
            const result = await parse(svg);
            expect(result.fonts).not.toContain('sans-serif');
        });
    });

    describe('skip values', () => {
        it("skips 'none' fill value", async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <rect fill="none" width="100" height="100"/>
                    <rect fill="#ff0000" width="50" height="50"/>
                </svg>
            `;
            const result = await parse(svg);
            expect(result.colors).not.toContain('none');
            expect(result.colors).toContain('#ff0000');
        });

        it("skips 'transparent' fill value", async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <circle fill="transparent" r="50"/>
                </svg>
            `;
            const result = await parse(svg);
            expect(result.colors).toHaveLength(0);
        });

        it("skips 'inherit' stroke value", async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <line stroke="inherit" x1="0" y1="0" x2="100" y2="100"/>
                </svg>
            `;
            const result = await parse(svg);
            expect(result.colors).toHaveLength(0);
        });

        it("skips 'currentColor' fill value", async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <rect fill="currentColor" width="100" height="100"/>
                </svg>
            `;
            const result = await parse(svg);
            expect(result.colors).toHaveLength(0);
        });
    });

    describe('deduplication and limits', () => {
        it('deduplicates identical colors', async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <rect fill="#ff0000" width="100" height="100"/>
                    <circle fill="#ff0000" r="50"/>
                    <line stroke="#ff0000" x1="0" y1="0" x2="10" y2="10"/>
                </svg>
            `;
            const result = await parse(svg);
            const redCount = result.colors.filter(c => c === '#ff0000').length;
            expect(redCount).toBe(1);
        });

        it('caps colors at 12', async () => {
            const rects = Array.from({ length: 20 }, (_, i) =>
                `<rect fill="#${i.toString(16).padStart(2, '0')}${(i * 3).toString(16).padStart(2, '0')}ff" width="10" height="10"/>`
            ).join('\n');
            const svg = `<svg xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
            const result = await parse(svg);
            expect(result.colors.length).toBeLessThanOrEqual(12);
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

        it('SVG with no colors or fonts returns empty arrays', async () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
                    <rect width="50" height="50"/>
                </svg>
            `;
            const result = await parse(svg);
            expect(result.colors).toEqual([]);
            expect(result.fonts).toEqual([]);
        });
    });
});
