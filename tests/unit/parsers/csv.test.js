import { describe, it, expect } from 'vitest';
import { parse } from '../../../lib/brand/parsers/csv.js';

describe('CSV parser', () => {
    describe('hex color extraction', () => {
        it('extracts hex colors from cells', async () => {
            const csv = `color,name\n#e63946,Primary\n#1d3557,Background`;
            const result = await parse(csv);
            expect(result.colors).toContain('#e63946');
            expect(result.colors).toContain('#1d3557');
        });

        it('extracts 3-digit hex colors', async () => {
            const csv = `color\n#f00\n#0f0\n#00f`;
            const result = await parse(csv);
            expect(result.colors).toContain('#ff0000');
            expect(result.colors).toContain('#00ff00');
            expect(result.colors).toContain('#0000ff');
        });

        it('extracts rgb colors from cells', async () => {
            const csv = `type,value\naccent,rgb(128, 64, 32)`;
            const result = await parse(csv);
            expect(result.colors).toContain('#804020');
        });
    });

    describe('font extraction', () => {
        it('extracts font names from font-labeled columns', async () => {
            const csv = `font-family,color\nMontserrat,#ff0000\nOpen Sans,#00ff00`;
            const result = await parse(csv);
            expect(result.fonts).toContain('Montserrat');
            expect(result.fonts).toContain('Open Sans');
        });

        it('extracts font names from "typeface" columns', async () => {
            const csv = `typeface,weight\nRoboto,400\nLato,700`;
            const result = await parse(csv);
            expect(result.fonts).toContain('Roboto');
            expect(result.fonts).toContain('Lato');
        });
    });

    describe('delimiter handling', () => {
        it('handles comma-delimited CSV', async () => {
            const csv = `name,color\nPrimary,#e63946\nSecondary,#457b9d`;
            const result = await parse(csv);
            expect(result.colors).toContain('#e63946');
            expect(result.colors).toContain('#457b9d');
        });

        it('handles semicolon-delimited CSV', async () => {
            const csv = `name;color\nPrimary;#e63946\nSecondary;#457b9d`;
            const result = await parse(csv);
            expect(result.colors).toContain('#e63946');
            expect(result.colors).toContain('#457b9d');
        });
    });

    describe('edge cases', () => {
        it('handles empty file', async () => {
            const result = await parse('');
            expect(result.colors).toEqual([]);
            expect(result.fonts).toEqual([]);
            expect(result.logos).toEqual([]);
            expect(result.layouts).toEqual([]);
        });

        it('handles null input', async () => {
            const result = await parse(null);
            expect(result.colors).toEqual([]);
            expect(result.fonts).toEqual([]);
        });

        it('handles header-only CSV (no data rows)', async () => {
            const csv = `color,font-family,name`;
            const result = await parse(csv);
            expect(result.colors).toEqual([]);
            expect(result.fonts).toEqual([]);
        });

        it('handles CSV with only whitespace', async () => {
            const result = await parse('   \n  \n  ');
            expect(result.colors).toEqual([]);
            expect(result.fonts).toEqual([]);
        });

        it('handles CSV with no color or font data', async () => {
            const csv = `name,value\nfoo,bar\nbaz,qux`;
            const result = await parse(csv);
            expect(result.colors).toEqual([]);
        });
    });
});
