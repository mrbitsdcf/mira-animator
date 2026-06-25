/**
 * Integration tests for the CLI brand command.
 * Tests arg parsing, validation, error output, and end-to-end flow.
 *
 * Validates: Requirements 9.5, 9.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Mock process.exit to throw instead of exiting
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
});

// Mock loadConfig to return a truthy value (config check passes)
vi.mock('../../lib/utils/paths.js', () => ({
    loadConfig: () => ({ installed: true }),
    MIRA_ROOT: process.cwd(),
    PROJECT_ROOT: process.cwd(),
    CONFIG_PATH: join(process.cwd(), 'mira.config.json'),
}));

// Capture console output
let consoleErrorOutput = [];
let consoleLogOutput = [];
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation((...args) => {
    consoleErrorOutput.push(args.join(' '));
});
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation((...args) => {
    consoleLogOutput.push(args.join(' '));
});

describe('CLI brand command', () => {
    let brand;
    const tmpDir = join(process.cwd(), '__test_tmp_brand__');

    beforeEach(async () => {
        consoleErrorOutput = [];
        consoleLogOutput = [];
        mockExit.mockClear();
        mockConsoleError.mockClear();
        mockConsoleLog.mockClear();

        // Dynamically import brand command (after mocks are set up)
        const mod = await import('../../lib/commands/brand.js');
        brand = mod.default;
    });

    afterEach(() => {
        // Clean up temp directory if created
        if (existsSync(tmpDir)) {
            rmSync(tmpDir, { recursive: true, force: true });
        }
        // Clean up mira-templates if created during tests
        const templatesDir = join(process.cwd(), 'mira-templates');
        if (existsSync(templatesDir)) {
            rmSync(templatesDir, { recursive: true, force: true });
        }
    });

    describe('Argument validation', () => {
        it('exits with error when no template name is provided', async () => {
            await expect(brand([])).rejects.toThrow('process.exit(1)');

            const errorOutput = consoleErrorOutput.join('\n');
            expect(errorOutput).toContain('obrigatório');
        });

        it('exits with error for invalid template name (uppercase)', async () => {
            await expect(brand(['MyTemplate', '--source=./file.css'])).rejects.toThrow('process.exit(1)');

            const errorOutput = consoleErrorOutput.join('\n');
            expect(errorOutput).toContain('inválido');
        });

        it('exits with error for reserved name "mira-dark"', async () => {
            await expect(brand(['mira-dark', '--source=./file.css'])).rejects.toThrow('process.exit(1)');

            const errorOutput = consoleErrorOutput.join('\n');
            expect(errorOutput).toContain('reservado');
        });

        it('exits with error when --source flag is missing', async () => {
            await expect(brand(['my-brand'])).rejects.toThrow('process.exit(1)');

            const errorOutput = consoleErrorOutput.join('\n');
            expect(errorOutput).toContain('obrigatória');
        });

        it('exits with error when source file does not exist', async () => {
            await expect(brand(['my-brand', '--source=./nonexistent-file.css'])).rejects.toThrow('process.exit(1)');

            const errorOutput = consoleErrorOutput.join('\n');
            expect(errorOutput).toContain('não encontrado');
        });
    });

    describe('End-to-end flow', () => {
        it('completes successfully with a valid CSS source file', async () => {
            // Create a temp directory with a CSS file containing brand colors
            mkdirSync(tmpDir, { recursive: true });
            const cssFile = join(tmpDir, 'brand.css');
            writeFileSync(cssFile, `
                :root {
                    --primary: #e63946;
                    --bg: #f1faee;
                    --accent: #457b9d;
                }
                body {
                    font-family: 'Montserrat', sans-serif;
                    color: #1d3557;
                    background-color: #f1faee;
                }
            `, 'utf-8');

            // Restore process.exit mock to not throw for this test — 
            // we expect success (no exit call)
            mockExit.mockRestore();
            const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
                throw new Error(`process.exit(${code})`);
            });

            // Run the brand command
            await brand(['test-brand', `--source=${cssFile}`]);

            // Verify no process.exit was called (success path)
            expect(exitSpy).not.toHaveBeenCalled();

            // Verify output files were created
            const themePath = join(process.cwd(), 'mira-templates', 'themes', 'test-brand.css');
            const deckPath = join(process.cwd(), 'mira-templates', 'decks', 'test-brand', 'index.html');

            expect(existsSync(themePath)).toBe(true);
            expect(existsSync(deckPath)).toBe(true);

            // Verify console output contains success summary
            const logOutput = consoleLogOutput.join('\n');
            expect(logOutput).toContain('Template gerado com sucesso');

            exitSpy.mockRestore();
            // Re-apply the original mock for other tests
            vi.spyOn(process, 'exit').mockImplementation((code) => {
                throw new Error(`process.exit(${code})`);
            });
        });
    });
});
