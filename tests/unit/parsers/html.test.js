import { describe, it, expect } from 'vitest';
import { parse } from '../../../lib/brand/parsers/html.js';

describe('HTML parser', () => {
    describe('color extraction from <style> blocks', () => {
        it('extracts hex colors from style blocks', async () => {
            const html = `
                <html><head><style>
                    .brand { color: #e63946; background: #1d3557; }
                </style></head><body></body></html>
            `;
            const result = await parse(html);
            expect(result.colors).toContain('#e63946');
            expect(result.colors).toContain('#1d3557');
        });

        it('extracts rgb colors from style blocks', async () => {
            const html = `
                <html><head><style>
                    .accent { color: rgb(100, 200, 50); }
                </style></head><body></body></html>
            `;
            const result = await parse(html);
            expect(result.colors).toContain('#64c832');
        });

        it('extracts colors from multiple style blocks', async () => {
            const html = `
                <html><head>
                    <style>.a { color: #ff0000; }</style>
                    <style>.b { color: #00ff00; }</style>
                </head><body></body></html>
            `;
            const result = await parse(html);
            expect(result.colors).toContain('#ff0000');
            expect(result.colors).toContain('#00ff00');
        });
    });

    describe('color extraction from inline styles', () => {
        it('extracts hex colors from inline style attributes', async () => {
            const html = `
                <html><body>
                    <div style="color: #abcdef;">Hello</div>
                </body></html>
            `;
            const result = await parse(html);
            expect(result.colors).toContain('#abcdef');
        });

        it('extracts background-color from inline styles', async () => {
            const html = `
                <html><body>
                    <section style="background-color: #123456;">Content</section>
                </body></html>
            `;
            const result = await parse(html);
            expect(result.colors).toContain('#123456');
        });
    });

    describe('layout pattern detection', () => {
        it('detects grid layout from CSS grid-template-columns', async () => {
            const html = `
                <html><head><style>
                    .container { display: grid; grid-template-columns: 1fr 1fr 1fr; }
                </style></head><body>
                    <main><div class="container"><div></div><div></div><div></div></div></main>
                </body></html>
            `;
            const result = await parse(html);
            expect(result.layouts.length).toBeGreaterThan(0);
            const gridLayout = result.layouts.find(l => l.type === 'grid');
            expect(gridLayout).toBeDefined();
            expect(gridLayout.columns).toBe(3);
        });

        it('detects hero-content layout from header element', async () => {
            const html = `
                <html><body>
                    <header><h1>Brand Name</h1></header>
                    <main><p>Content here</p></main>
                </body></html>
            `;
            const result = await parse(html);
            expect(result.layouts.length).toBeGreaterThan(0);
            const heroLayout = result.layouts.find(l => l.type === 'hero-content');
            expect(heroLayout).toBeDefined();
            expect(heroLayout.hasHero).toBe(true);
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

        it('HTML with no styles returns empty colors/fonts', async () => {
            const html = '<html><body><p>Just text</p></body></html>';
            const result = await parse(html);
            expect(result.colors).toEqual([]);
            expect(result.fonts).toEqual([]);
        });

        it('HTML with only structural elements returns layouts only', async () => {
            const html = `
                <html><body>
                    <header><h1>Title</h1></header>
                    <main><section>Content</section></main>
                    <footer>Footer</footer>
                </body></html>
            `;
            const result = await parse(html);
            expect(result.colors).toEqual([]);
            expect(result.layouts.length).toBeGreaterThan(0);
        });
    });
});
