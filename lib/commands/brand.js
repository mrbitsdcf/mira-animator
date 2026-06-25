/**
 * @fileoverview CLI command: brand — generates a Mira theme + deck template from brand assets.
 * Invoked as `npx mira-animator brand <template-name> --source=<path-or-url>`.
 * @module lib/commands/brand
 */

import { stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { isValidTemplateName, RESERVED_NAMES } from '../brand/color-utils.js';
import { loadConfig } from '../utils/paths.js';

/**
 * Determine whether a source string is a URL (http:// or https://).
 * @param {string} source
 * @returns {boolean}
 */
function isURL(source) {
    return source.startsWith('http://') || source.startsWith('https://');
}

/**
 * Validate that a URL is reachable within the given timeout.
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 * @throws {Error} If the URL is unreachable or returns a non-2xx status
 */
async function validateURL(url, timeoutMs = 10000) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'follow',
        });

        clearTimeout(timer);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error(`Connection timed out after ${timeoutMs / 1000}s`);
        }
        throw err;
    }
}

/**
 * Parse CLI flags from args array.
 * @param {string[]} args
 * @returns {{ positional: string[], flags: Record<string, string|true> }}
 */
function parseArgs(args) {
    const positional = [];
    const flags = {};

    for (const arg of args) {
        if (arg.startsWith('--')) {
            const eqIdx = arg.indexOf('=');
            if (eqIdx !== -1) {
                flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
            } else {
                flags[arg.slice(2)] = true;
            }
        } else {
            positional.push(arg);
        }
    }

    return { positional, flags };
}

/**
 * brand CLI command — generates a Mira theme + deck template from brand identity assets.
 *
 * Usage: npx mira-animator brand <template-name> --source=<path-or-url>
 *
 * @param {string[]} args - CLI arguments after the command name
 */
export default async function brand(args) {
    // Check Mira installation
    const config = loadConfig();
    if (!config) {
        console.error(
            chalk.red('\n  Mira não está instalado nesta pasta.') +
            '\n  Execute "npx mira-animator install" primeiro.\n'
        );
        process.exit(1);
    }

    const { positional, flags } = parseArgs(args);

    // --- Validate template name ---
    const name = positional[0];
    if (!name) {
        console.error(chalk.red('\n  Nome do template é obrigatório.'));
        console.error(`\n  Uso: npx mira-animator brand <nome> --source=<caminho-ou-url>`);
        console.error('\n  Regras do nome:');
        console.error('    • Apenas letras minúsculas, números e hífens');
        console.error('    • 3 a 50 caracteres');
        console.error('    • Deve começar com letra e terminar com letra ou número');
        console.error(`    • Padrão: ^[a-z][a-z0-9-]{1,48}[a-z0-9]$\n`);
        process.exit(1);
    }

    if (!isValidTemplateName(name)) {
        if (RESERVED_NAMES.includes(name)) {
            console.error(chalk.red(`\n  Nome reservado: "${name}".`));
            console.error(`  Nomes reservados: ${RESERVED_NAMES.join(', ')}\n`);
        } else {
            console.error(chalk.red(`\n  Nome inválido: "${name}".`));
            console.error('\n  Regras do nome:');
            console.error('    • Apenas letras minúsculas, números e hífens');
            console.error('    • 3 a 50 caracteres');
            console.error('    • Deve começar com letra e terminar com letra ou número');
            console.error(`    • Padrão: ^[a-z][a-z0-9-]{1,48}[a-z0-9]$\n`);
        }
        process.exit(1);
    }

    // --- Validate --source flag ---
    const source = flags.source;
    if (!source) {
        console.error(chalk.red('\n  A flag --source é obrigatória.'));
        console.error(`\n  Uso: npx mira-animator brand <nome> --source=<caminho-ou-url>`);
        console.error('\n  Exemplos:');
        console.error('    npx mira-animator brand acme-corp --source=./brand-guidelines.pptx');
        console.error('    npx mira-animator brand my-brand --source=https://example.com\n');
        process.exit(1);
    }

    // Validate source existence
    if (isURL(source)) {
        // Validate URL format and reachability
        try {
            new URL(source); // validates format
        } catch {
            console.error(chalk.red(`\n  URL inválida: "${source}"\n`));
            process.exit(1);
        }

        try {
            await validateURL(source, 10000);
        } catch (err) {
            console.error(chalk.red(`\n  Falha ao conectar: ${source}`));
            console.error(`  Motivo: ${err.message}\n`);
            process.exit(1);
        }
    } else {
        // Validate local path exists
        try {
            await stat(source);
        } catch {
            console.error(chalk.red(`\n  Arquivo não encontrado: ${source}\n`));
            process.exit(1);
        }
    }

    // --- Check for existing template ---
    const themePath = join('mira-templates', 'themes', `${name}.css`);
    const deckDir = join('mira-templates', 'decks', name);

    if (existsSync(themePath) || existsSync(deckDir)) {
        try {
            const { default: inquirer } = await import('inquirer');
            const { overwrite } = await inquirer.prompt([{
                type: 'confirm',
                name: 'overwrite',
                message: `Template "${name}" já existe. Deseja sobrescrever?`,
                default: false,
            }]);

            if (!overwrite) {
                console.log('\n  Operação cancelada.\n');
                process.exit(0);
            }
        } catch {
            // Non-interactive mode (e.g., piped input) — just warn and proceed
            console.log(chalk.yellow(`\n  Aviso: template "${name}" será sobrescrito.\n`));
        }
    }

    // --- Execute pipeline ---
    try {
        // Lazy-import pipeline modules to avoid loading heavy deps unless needed
        const { extract } = await import('../brand/extractor.js');
        const { generateTheme } = await import('../brand/theme-generator.js');
        const { generateDeck } = await import('../brand/deck-generator.js');
        const { register } = await import('../brand/registry.js');

        console.log(chalk.cyan(`\n  Extraindo identidade visual de: ${source}...`));
        const identity = await extract({ source });

        console.log(chalk.cyan('  Gerando tema CSS...'));
        const themeCSS = generateTheme({ name, identity });

        console.log(chalk.cyan('  Gerando deck template...'));
        const deckHTML = await generateDeck({ name, themeCSS, identity });

        console.log(chalk.cyan('  Registrando template...'));
        const result = await register({ name, themeCSS, deckHTML, assets: identity.logos || [] });

        // --- Print summary ---
        console.log(chalk.green('\n  ✓ Template gerado com sucesso!\n'));
        console.log(`  Tema:    ${result.themePath}`);
        console.log(`  Deck:    ${result.deckPath}`);
        console.log(`  Cor:     ${identity.primary}`);
        console.log(`  Modo:    ${identity.mode}\n`);
    } catch (err) {
        console.error(chalk.red(`\n  Erro: ${err.message}\n`));
        process.exit(1);
    }
}
