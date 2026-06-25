import { join } from 'path';
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { MIRA_ROOT, PROJECT_ROOT, loadConfig, saveConfig } from '../utils/paths.js';

const BUILTIN_DECKS = ['aula-capitulo', 'pitch-projeto', 'demo-tecnica'];
const BUILTIN_THEMES = ['mira-dark', 'light-minimal', 'corporate-blue', 'neon-emerald'];

/**
 * Discover custom deck templates from mira-templates/decks/.
 * Each subdirectory containing an index.html is a valid deck template.
 * @returns {string[]} Array of discovered deck template names
 */
function discoverCustomDecks() {
  const customDecksDir = join(PROJECT_ROOT, 'mira-templates', 'decks');
  if (!existsSync(customDecksDir)) return [];
  try {
    return readdirSync(customDecksDir).filter(entry => {
      const entryPath = join(customDecksDir, entry);
      return statSync(entryPath).isDirectory() &&
        existsSync(join(entryPath, 'index.html'));
    });
  } catch {
    return [];
  }
}

/**
 * Discover custom themes from mira-templates/themes/.
 * Each .css file (excluding base.css) is a valid theme.
 * @returns {string[]} Array of discovered theme names (without .css extension)
 */
function discoverCustomThemes() {
  const customThemesDir = join(PROJECT_ROOT, 'mira-templates', 'themes');
  if (!existsSync(customThemesDir)) return [];
  try {
    return readdirSync(customThemesDir)
      .filter(file => file.endsWith('.css') && file !== 'base.css')
      .map(file => file.replace(/\.css$/, ''));
  } catch {
    return [];
  }
}

// Combine built-in and custom templates
const DECKS = [...BUILTIN_DECKS, ...discoverCustomDecks()];
const THEMES = [...BUILTIN_THEMES, ...discoverCustomThemes()];

// Export for testing and reuse by other modules
export { discoverCustomDecks, discoverCustomThemes, BUILTIN_DECKS, BUILTIN_THEMES };

export default async function newDeck(args) {
  const config = loadConfig();
  if (!config) {
    console.error('\n  Mira não está instalado nesta pasta. Execute "npx mira-animator install" primeiro.\n');
    process.exit(1);
  }

  const positional = args.filter(a => !a.startsWith('--'));
  const flags = Object.fromEntries(
    args.filter(a => a.startsWith('--')).map(a => {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? true];
    })
  );

  const name = positional[0];
  if (!name) {
    console.error('\n  Uso: npx mira-animator new <nome> [--deck=...] [--theme=...]\n');
    console.error(`  Decks:  ${DECKS.join(', ')}`);
    console.error(`  Themes: ${THEMES.join(', ')}\n`);
    process.exit(1);
  }

  const deck = flags.deck ?? 'aula-capitulo';
  const theme = flags.theme ?? config.defaultTheme ?? 'mira-dark';

  if (!DECKS.includes(deck)) {
    console.error(`\n  Deck desconhecido: "${deck}". Opções: ${DECKS.join(', ')}\n`);
    process.exit(1);
  }
  if (!THEMES.includes(theme)) {
    console.error(`\n  Tema desconhecido: "${theme}". Opções: ${THEMES.join(', ')}\n`);
    process.exit(1);
  }

  const dest = join(PROJECT_ROOT, 'decks', name);
  if (existsSync(dest)) {
    console.error(`\n  O deck "${name}" já existe em decks/${name}.\n`);
    process.exit(1);
  }

  mkdirSync(dest, { recursive: true });

  // 1. Copia o esqueleto do deck (built-in or custom from mira-templates/)
  const builtinDeckSrc = join(MIRA_ROOT, 'templates', 'decks', deck, 'index.html');
  const customDeckSrc = join(PROJECT_ROOT, 'mira-templates', 'decks', deck, 'index.html');
  const deckSrc = existsSync(customDeckSrc) ? customDeckSrc : builtinDeckSrc;
  let html = readFileSync(deckSrc, 'utf8');

  // 2. Injeta o tema escolhido (inline, para o deck ser auto-contido)
  const builtinThemePath = join(MIRA_ROOT, 'templates', 'themes', `${theme}.css`);
  const customThemePath = join(PROJECT_ROOT, 'mira-templates', 'themes', `${theme}.css`);
  const themeCss = readFileSync(existsSync(customThemePath) ? customThemePath : builtinThemePath, 'utf8');
  const builtinBaseCss = join(MIRA_ROOT, 'templates', 'themes', 'base.css');
  const customBaseCss = join(PROJECT_ROOT, 'mira-templates', 'themes', 'base.css');
  const baseCss = readFileSync(existsSync(customBaseCss) ? customBaseCss : builtinBaseCss, 'utf8');
  html = html.replace(
    /\/\* @MIRA:THEME:START \*\/[\s\S]*?\/\* @MIRA:THEME:END \*\//,
    '/* @MIRA:THEME:START */\n' + themeCss + '\n\n' + baseCss + '\n/* @MIRA:THEME:END */'
  );

  writeFileSync(join(dest, 'index.html'), html, 'utf8');

  // 3. Registra no config
  config.decks = config.decks ?? [];
  config.decks.push({ name, template: deck, theme, createdAt: new Date().toISOString() });
  saveConfig(config);

  console.log(`\n  Deck "${name}" criado em decks/${name}/index.html`);
  console.log(`  Template: ${deck} | Tema: ${theme}`);
  console.log('  Abra no navegador ou peça ao agente para preencher com uma fonte vinculada.\n');
}
