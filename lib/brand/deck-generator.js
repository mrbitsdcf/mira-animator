/**
 * @fileoverview Deck Generator – produces a deck template HTML incorporating theme and layouts.
 * Reads the aula-capitulo skeleton, injects theme CSS + base.css between @MIRA:THEME markers,
 * applies layout patterns, and adds Google Fonts links for custom fonts.
 * @module lib/brand/deck-generator
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @typedef {import('./types.js').BrandIdentity} BrandIdentity */
/** @typedef {import('./types.js').LayoutPattern} LayoutPattern */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..');

/** Default skeleton path relative to project root */
const DEFAULT_SKELETON_PATH = resolve(PROJECT_ROOT, 'templates', 'decks', 'aula-capitulo', 'index.html');

/** Default base.css path */
const DEFAULT_BASE_CSS_PATH = resolve(PROJECT_ROOT, 'templates', 'themes', 'base.css');

/**
 * Capitalize a kebab-case slug into a title string.
 * e.g. "acme-corp" → "Acme Corp", "my-brand" → "My Brand"
 * @param {string} slug - Kebab-case name
 * @returns {string} Title-cased name
 */
function slugToTitle(slug) {
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Generate a minimal fallback HTML5 skeleton when the skeleton file is not found.
 * @returns {string} Basic HTML5 skeleton with all required elements
 */
function generateFallbackSkeleton() {
    return `<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mira — Template</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap" rel="stylesheet">
    <style>
        /* @MIRA:THEME:START */
        /* @MIRA:THEME:END */
    </style>
</head>

<body>
    <header class="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6">
        <div class="relative z-10 text-center max-w-4xl" data-aos="fade-up">
            <h1 class="text-6xl md:text-7xl font-black leading-tight mb-6">Template</h1>
        </div>
    </header>

    <main class="flex flex-col items-center px-6 py-16">
    </main>

    <footer class="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6">
        <div class="relative z-10 text-center max-w-3xl" data-aos="zoom-in">
            <p class="text-softer mt-12 text-sm tracking-widest uppercase">Feito com Mira</p>
        </div>
    </footer>

    <script>
        AOS.init({ duration: 800, once: true });
        lucide.createIcons();
    </script>
</body>

</html>`;
}

/**
 * Build layout classes and structure for <main> based on extracted layout patterns.
 * @param {LayoutPattern[]} layouts - Detected layout patterns
 * @returns {{ mainClasses: string, mainContent: string } | null} Layout modifications or null if no patterns
 */
function buildLayoutContent(layouts) {
    if (!layouts || layouts.length === 0) return null;

    // Use the first layout pattern as the primary structure
    const layout = layouts[0];
    let mainClasses = '';
    let mainContent = '';

    switch (layout.type) {
        case 'grid':
            mainClasses = `grid md:grid-cols-${layout.columns} gap-8`;
            mainContent = Array.from({ length: layout.columns }, (_, i) =>
                `        <div class="glass-card p-8" data-aos="fade-up" data-aos-delay="${i * 100}">\n` +
                `            <h3 class="text-2xl font-bold mb-4">[CONTEÚDO_${i + 1}]</h3>\n` +
                `            <p class="text-soft">[DESCRIÇÃO_${i + 1}]</p>\n` +
                `        </div>`
            ).join('\n');
            break;

        case 'hero-content':
            mainClasses = 'flex flex-col';
            mainContent =
                `        <section class="min-h-[50vh] flex items-center justify-center" data-aos="fade-up">\n` +
                `            <h2 class="text-5xl font-black text-center">[TÍTULO_HERO]</h2>\n` +
                `        </section>\n` +
                `        <div class="grid md:grid-cols-${layout.columns} gap-8 w-full max-w-5xl mx-auto">\n` +
                Array.from({ length: layout.columns }, (_, i) =>
                    `            <div class="glass-card p-8" data-aos="fade-up" data-aos-delay="${i * 100}">\n` +
                    `                <p class="text-soft">[CONTEÚDO_${i + 1}]</p>\n` +
                    `            </div>`
                ).join('\n') + '\n' +
                `        </div>`;
            break;

        case 'split':
            mainClasses = 'grid md:grid-cols-2 gap-8 items-stretch';
            mainContent =
                `        <div class="glass-card p-10" data-aos="fade-right">\n` +
                `            <h3 class="text-3xl font-bold mb-4">[LADO_A]</h3>\n` +
                `            <p class="text-soft">[DESCRIÇÃO_A]</p>\n` +
                `        </div>\n` +
                `        <div class="glass-card p-10" data-aos="fade-left">\n` +
                `            <h3 class="text-3xl font-bold mb-4">[LADO_B]</h3>\n` +
                `            <p class="text-soft">[DESCRIÇÃO_B]</p>\n` +
                `        </div>`;
            break;

        case 'single':
        default:
            mainClasses = 'flex flex-col items-center';
            mainContent =
                `        <div class="glass-card w-full max-w-5xl p-8" data-aos="fade-up">\n` +
                `            <h3 class="text-3xl font-bold mb-4">[CONTEÚDO]</h3>\n` +
                `            <p class="text-soft">[DESCRIÇÃO]</p>\n` +
                `        </div>`;
            break;
    }

    return { mainClasses, mainContent };
}

/**
 * Generate a deck template HTML from theme CSS and brand identity.
 *
 * @param {Object} input
 * @param {string} input.name - Template name (kebab-case slug)
 * @param {string} input.themeCSS - Generated theme CSS string
 * @param {BrandIdentity} input.identity - Extracted brand identity
 * @param {string} [input.baseCSSPath] - Path to base.css file
 * @param {string} [input.skeletonPath] - Path to the base skeleton HTML file
 * @returns {Promise<string>} Complete HTML string for the deck template
 */
export async function generateDeck({ name, themeCSS, identity, baseCSSPath, skeletonPath }) {
    // Resolve paths with defaults
    const skelPath = skeletonPath || DEFAULT_SKELETON_PATH;
    const cssPath = baseCSSPath || DEFAULT_BASE_CSS_PATH;

    // Read skeleton HTML (fallback to generated skeleton if file not found)
    let html;
    try {
        html = await readFile(skelPath, 'utf-8');
    } catch {
        html = generateFallbackSkeleton();
    }

    // Read base.css (empty string if not found)
    let baseCSS = '';
    try {
        baseCSS = await readFile(cssPath, 'utf-8');
    } catch {
        // base.css is optional — proceed without it
    }

    // Build the theme content block to inject
    const themeBlock = `${themeCSS}\n\n${baseCSS}`.trim();

    // Inject theme CSS between @MIRA:THEME markers
    const markerStart = '/* @MIRA:THEME:START */';
    const markerEnd = '/* @MIRA:THEME:END */';

    if (html.includes(markerStart) && html.includes(markerEnd)) {
        // Replace content between existing markers
        const startIdx = html.indexOf(markerStart) + markerStart.length;
        const endIdx = html.indexOf(markerEnd);
        html = html.substring(0, startIdx) + '\n' + themeBlock + '\n' + html.substring(endIdx);
    } else {
        // No markers found — inject a <style> block with markers in <head>
        const styleBlock = `    <style>\n        ${markerStart}\n${themeBlock}\n        ${markerEnd}\n    </style>`;
        const headCloseIdx = html.indexOf('</head>');
        if (headCloseIdx !== -1) {
            html = html.substring(0, headCloseIdx) + styleBlock + '\n' + html.substring(headCloseIdx);
        }
    }

    // Update <title> to "Mira — Template: <Name>"
    const titleName = slugToTitle(name);
    const titleRegex = /<title>[^<]*<\/title>/i;
    html = html.replace(titleRegex, `<title>Mira — Template: ${titleName}</title>`);

    // Add Google Fonts link for custom fonts (not "Inter", not defaulted)
    if (identity && !identity.fontsDefaulted) {
        const customFonts = [];
        if (identity.headingFont && identity.headingFont !== 'Inter') {
            customFonts.push(identity.headingFont);
        }
        if (identity.bodyFont && identity.bodyFont !== 'Inter' && identity.bodyFont !== identity.headingFont) {
            customFonts.push(identity.bodyFont);
        }

        if (customFonts.length > 0) {
            // Build Google Fonts links for custom fonts
            const fontLinks = customFonts.map(font => {
                const fontParam = font.replace(/\s+/g, '+');
                return `    <link href="https://fonts.googleapis.com/css2?family=${fontParam}:wght@300;400;600;700&display=swap" rel="stylesheet">`;
            }).join('\n');

            // Insert after the last preconnect or existing Google Fonts link
            const interFontLinkRegex = /<link[^>]*fonts\.googleapis\.com\/css2\?family=Inter[^>]*>/i;
            const interMatch = html.match(interFontLinkRegex);
            if (interMatch) {
                // Insert after the Inter font link
                const insertPos = html.indexOf(interMatch[0]) + interMatch[0].length;
                html = html.substring(0, insertPos) + '\n' + fontLinks + html.substring(insertPos);
            } else {
                // Insert before </head>
                const headClose = html.indexOf('</head>');
                if (headClose !== -1) {
                    html = html.substring(0, headClose) + fontLinks + '\n' + html.substring(headClose);
                }
            }
        }
    }

    // Apply layout patterns to <main> if present
    if (identity && identity.layouts && identity.layouts.length > 0) {
        const layoutResult = buildLayoutContent(identity.layouts);
        if (layoutResult) {
            const mainRegex = /<main([^>]*)>([\s\S]*?)<\/main>/i;
            const mainMatch = html.match(mainRegex);
            if (mainMatch) {
                // Preserve existing attributes but add/update class
                let attrs = mainMatch[1] || '';
                const classRegex = /class="([^"]*)"/;
                const existingClass = attrs.match(classRegex);
                if (existingClass) {
                    attrs = attrs.replace(classRegex, `class="${existingClass[1]} ${layoutResult.mainClasses}"`);
                } else {
                    attrs += ` class="${layoutResult.mainClasses}"`;
                }
                html = html.replace(mainRegex, `<main${attrs}>\n${layoutResult.mainContent}\n    </main>`);
            }
        }
    }

    return html;
}
