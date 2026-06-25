/**
 * Property 11: Unsupported format error lists all supported formats
 * **Validates: Requirements 1.10**
 *
 * For any file with an extension not in the supported set (.ppt, .pptx, .pdf, .css, .html,
 * .csv, .svg, .png, .jpg, .webp, .zip), the error message SHALL list all supported format extensions.
 */
import { describe, test, expect, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { extract } from '../../lib/brand/extractor.js';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * All supported extensions that MUST appear in the error message.
 */
const SUPPORTED_EXTENSIONS = ['.ppt', '.pptx', '.pdf', '.css', '.html', '.csv', '.svg', '.png', '.jpg', '.webp', '.zip'];

/**
 * Extensions that are NOT in the supported set — used to generate test cases.
 * These are common file formats that the extractor does not support.
 */
const UNSUPPORTED_EXTENSIONS = [
    '.docx', '.txt', '.mp3', '.exe', '.ai', '.psd', '.md', '.xml', '.json', '.yaml',
    '.doc', '.xls', '.xlsx', '.bmp', '.gif', '.tiff', '.mov', '.mp4', '.avi', '.wav',
    '.py', '.js', '.ts', '.rb', '.go', '.rs', '.toml', '.ini', '.conf', '.log',
    '.tar', '.gz', '.rar', '.7z', '.dmg', '.iso', '.bin', '.dat', '.sql', '.db',
];

/**
 * Arbitrary that generates unsupported file extensions from a diverse set.
 */
const unsupportedExtArb = fc.constantFrom(...UNSUPPORTED_EXTENSIONS);

/**
 * Track created temp files for cleanup.
 */
const createdFiles = [];
const tempDir = join(tmpdir(), 'mira-brand-unsupported-format-test');

describe('Property 11: Unsupported format error lists all supported formats', () => {
    afterAll(async () => {
        // Clean up all temp files
        for (const filePath of createdFiles) {
            try {
                await unlink(filePath);
            } catch {
                // Ignore cleanup errors
            }
        }
    });

    test('error message lists ALL supported extensions for any unsupported file format', async () => {
        // Ensure temp directory exists
        await mkdir(tempDir, { recursive: true });

        await fc.assert(
            fc.asyncProperty(unsupportedExtArb, async (ext) => {
                // Create a temporary file with the unsupported extension
                const filename = `test-brand-file-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
                const filePath = join(tempDir, filename);

                await writeFile(filePath, 'dummy content for test');
                createdFiles.push(filePath);

                // Attempt to extract — should throw with unsupported format error
                let error;
                try {
                    await extract({ source: filePath });
                } catch (e) {
                    error = e;
                }

                // Must throw an error
                expect(error).toBeDefined();
                expect(error).toBeInstanceOf(Error);

                // Error message must list ALL supported extensions
                const message = error.message;
                for (const supportedExt of SUPPORTED_EXTENSIONS) {
                    expect(message).toContain(supportedExt);
                }

                // Error message should mention "Unsupported" or the unsupported extension
                expect(message.toLowerCase()).toContain('unsupported');
            }),
            { numRuns: 100 },
        );
    });

    test('error message contains the actual unsupported extension that was provided', async () => {
        // Ensure temp directory exists
        await mkdir(tempDir, { recursive: true });

        await fc.assert(
            fc.asyncProperty(unsupportedExtArb, async (ext) => {
                // Create a temporary file with the unsupported extension
                const filename = `test-brand-ctx-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
                const filePath = join(tempDir, filename);

                await writeFile(filePath, 'dummy content for context test');
                createdFiles.push(filePath);

                // Attempt to extract
                let error;
                try {
                    await extract({ source: filePath });
                } catch (e) {
                    error = e;
                }

                // Must throw an error
                expect(error).toBeDefined();
                expect(error).toBeInstanceOf(Error);

                // Error message should contain the unsupported extension
                expect(error.message).toContain(ext);
            }),
            { numRuns: 100 },
        );
    });
});
