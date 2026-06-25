# Requirements Document

## Introduction

The **mira-brand-template** feature enables users to generate Mira-compatible themes and deck templates from corporate brand identity files. Rather than manually crafting CSS variables and deck skeletons, users provide brand assets (PowerPoint, PDF, CSS, HTML, website URL, CSV, images, SVGs, or ZIP archives) and the system extracts the visual identity (colors, typography, logos, layout patterns) to produce a registered theme and deck template ready for use with `mira-new`.

This feature operates both as a CLI command (`npx mira-animator brand <name> --source=<path|url>`) and as a conversational agent skill (`/mira-brand-template`), following the dual-interface pattern established by Mira.

## Glossary

- **Brand_Extractor**: The core module responsible for parsing brand identity files and extracting visual identity elements (colors, typography, logos, layout patterns).
- **Theme_Generator**: The module that produces a valid Mira CSS theme file (`:root` block with all `--mira-*` variables) from extracted brand data.
- **Deck_Generator**: The module that produces a deck template skeleton (`index.html`) incorporating the generated theme and any layout patterns found in the source.
- **Template_Registry**: The mechanism by which generated templates and themes are placed in `mira-templates/` so that `mira-new` discovers them dynamically.
- **CLI_Command**: The `brand` subcommand added to `bin/mira.js` that invokes the Brand_Extractor, Theme_Generator, and Deck_Generator programmatically.
- **Agent_Skill**: The `mira-brand-template` agent in `agents/mira-brand-template/SKILL.md` that performs the same workflow conversationally.
- **Source_File**: Any input file or URL provided by the user containing brand identity information.
- **CSS_Variable_Contract**: The set of 15 `--mira-*` CSS custom properties that every Mira theme must define: `--mira-primary`, `--mira-bg`, `--mira-text`, `--mira-text-soft`, `--mira-text-softer`, `--mira-card-bg`, `--mira-card-border`, `--mira-glow-soft`, `--mira-glow-strong`, `--mira-icon-bg`, `--mira-icon-border`, `--mira-pill-bg`, `--mira-pill-border`, `--mira-stage-glow`, `--mira-accent-2`.
- **Card_Template**: A slide layout pattern extracted from presentation sources (PowerPoint, PDF with slides) and saved as an asset image for the deck template.

## Requirements

### Requirement 1: Multi-Format Brand Source Ingestion

**User Story:** As a user, I want to provide brand identity files in multiple formats, so that I can generate a Mira template regardless of how my brand assets are stored.

#### Acceptance Criteria

1. WHEN a PowerPoint file (.ppt or .pptx) of up to 100 MB is provided as source, THE Brand_Extractor SHALL parse the file and extract up to 12 colors for the color palette, up to 5 font families, and slide layout patterns.
2. WHEN a PDF file of up to 100 MB is provided as source, THE Brand_Extractor SHALL parse the file and extract up to 12 colors for the color palette, up to 5 font families, and page layout patterns.
3. WHEN a CSS file of up to 10 MB is provided as source, THE Brand_Extractor SHALL parse declared color values (hex, rgb, rgba, hsl, hsla, named colors), font-family declarations, and spacing/sizing tokens.
4. WHEN an HTML file of up to 10 MB is provided as source, THE Brand_Extractor SHALL parse inline styles, linked stylesheets, and structural layout patterns.
5. WHEN a CSV file with columns for property name and value is provided, THE Brand_Extractor SHALL parse color codes (hex, rgb, hsl) and font names from the rows.
6. WHEN a website URL is provided as source, THE Brand_Extractor SHALL fetch the page within a timeout of 30 seconds, parse its computed styles, and extract up to 12 dominant colors ordered by frequency, the font stack, and layout structure.
7. WHEN a ZIP archive of up to 200 MB containing no more than 50 eligible files and no nested ZIP archives is provided as source, THE Brand_Extractor SHALL decompress it and process each eligible file (PowerPoint, PDF, CSS, HTML, CSV, SVG, image) individually, merging the results by retaining the union of unique colors (up to 12) and unique font families (up to 5) across all files.
8. WHEN an SVG file is provided as source, THE Brand_Extractor SHALL extract fill and stroke colors, font attributes, and shape patterns.
9. WHEN an image file (PNG, JPG, WEBP) of up to 50 MB is provided as source, THE Brand_Extractor SHALL extract up to 12 dominant colors ranked by pixel frequency using color quantization.
10. IF an unsupported file format is provided, THEN THE Brand_Extractor SHALL return an error message listing the supported formats: PowerPoint (.ppt, .pptx), PDF, CSS, HTML, CSV, SVG, PNG, JPG, WEBP, ZIP, and URL.
11. IF a provided file exceeds the maximum allowed size for its format, THEN THE Brand_Extractor SHALL reject the file and return an error message indicating the maximum size allowed for that format.
12. IF a website URL fetch fails due to timeout, unreachable host, or HTTP error status, THEN THE Brand_Extractor SHALL return an error message indicating the fetch failure reason.
13. IF a provided file is in a supported format but contains no extractable brand data (no colors, no fonts, no layout patterns), THEN THE Brand_Extractor SHALL return a warning message indicating that no brand attributes were found in the file.

### Requirement 2: Visual Identity Extraction

**User Story:** As a user, I want the system to automatically identify my brand's visual identity elements, so that the generated template accurately reflects my brand.

#### Acceptance Criteria

1. THE Brand_Extractor SHALL extract a primary color (hex code) representing the dominant brand accent, defined as the non-white, non-black color occupying the largest pixel area (minimum 5% coverage) in the source material.
2. THE Brand_Extractor SHALL extract a secondary color (hex code) when a second distinct non-white, non-black color occupying at least 3% coverage is present in the source material.
3. THE Brand_Extractor SHALL extract a background color and classify the brand identity as light-themed (background relative luminance >= 0.5 per WCAG luminance formula) or dark-themed (background relative luminance < 0.5).
4. THE Brand_Extractor SHALL extract font family names for headings and body text when font metadata is present in the source material (embedded fonts in PDF, theme fonts in PowerPoint, or CSS font declarations in HTML).
5. WHEN logo images (PNG, SVG, or vector-embedded) are found in the source, THE Brand_Extractor SHALL copy them to the deck template assets directory.
6. WHEN presentation slides are found in the source (PowerPoint or multi-page PDF), THE Brand_Extractor SHALL capture representative slide layouts as card template images in the assets directory.
7. IF the source material contains insufficient data to determine a required element (primary color or background color), THEN THE Brand_Extractor SHALL prompt the user by presenting the name of the missing element and accepting a hex color code value as input before proceeding.
8. IF the source material contains no extractable font metadata, THEN THE Brand_Extractor SHALL apply a default system font pair (sans-serif for headings, sans-serif for body) and include in the extraction output a flag indicating fonts were defaulted.

### Requirement 3: Mira Theme Generation

**User Story:** As a user, I want the system to generate a valid Mira CSS theme from my brand identity, so that it integrates with the existing theme system.

#### Acceptance Criteria

1. THE Theme_Generator SHALL produce a CSS file at `mira-templates/themes/<template-name>.css` containing a `:root` block with all 15 CSS_Variable_Contract variables: `--mira-primary`, `--mira-bg`, `--mira-text`, `--mira-text-soft`, `--mira-text-softer`, `--mira-card-bg`, `--mira-card-border`, `--mira-glow-soft`, `--mira-glow-strong`, `--mira-icon-bg`, `--mira-icon-border`, `--mira-pill-bg`, `--mira-pill-border`, `--mira-stage-glow`, `--mira-accent-2`.
2. THE Theme_Generator SHALL derive `--mira-primary` from the extracted primary color as a hex value (`#RRGGBB`).
3. THE Theme_Generator SHALL derive `--mira-bg` from the extracted background color as a hex value (`#RRGGBB`).
4. IF the background color relative luminance (calculated as `0.2126*R + 0.7152*G + 0.0722*B` on linearized sRGB components, where 0.0 is black and 1.0 is white) is below 0.5, THEN THE Theme_Generator SHALL set `--mira-text` to `#ffffff`; otherwise THE Theme_Generator SHALL set `--mira-text` to `#1a1a1a`.
5. THE Theme_Generator SHALL derive `--mira-glow-soft` as the primary color at 15% opacity using `rgba(R, G, B, 0.15)` where R, G, B are the primary color components.
6. THE Theme_Generator SHALL derive `--mira-glow-strong` as the primary color at 25% opacity using `rgba(R, G, B, 0.25)`.
7. THE Theme_Generator SHALL derive `--mira-accent-2` by lightening the primary color using the formula `new_component = round(C + (255 - C) * 0.35)` for each RGB component, output as hex (`#RRGGBB`).
8. THE Theme_Generator SHALL derive all remaining `--mira-*` variables from the text color (Tr, Tg, Tb) and primary color (R, G, B) as follows: `--mira-text-soft` as `rgba(Tr, Tg, Tb, 0.70)`, `--mira-text-softer` as `rgba(Tr, Tg, Tb, 0.50)`, `--mira-card-bg` as `rgba(Tr, Tg, Tb, 0.05)`, `--mira-card-border` as `rgba(Tr, Tg, Tb, 0.10)`, `--mira-pill-bg` as `rgba(Tr, Tg, Tb, 0.04)`, `--mira-pill-border` as `rgba(Tr, Tg, Tb, 0.08)`, `--mira-icon-bg` as `rgba(R, G, B, 0.15)`, `--mira-icon-border` as `rgba(R, G, B, 0.30)`, `--mira-stage-glow` as `rgba(R, G, B, 0.06)`.
9. THE Theme_Generator SHALL include a CSS comment header as the first line of the file in the format `/* MIRA THEME: <template-name> (source: <format>) */` where `<format>` is one of the supported Brand_Extractor input types (e.g., "pptx", "pdf", "css", "html", "url", "csv", "svg", "image", "zip").
10. WHEN a custom font family (any font other than "Inter") was extracted by the Brand_Extractor, THE Theme_Generator SHALL append a `body { font-family: '<Font>', sans-serif; }` rule after the closing `}` of the `:root` block.
11. IF the Brand_Extractor provides no extracted primary color or no extracted background color, THEN THE Theme_Generator SHALL not produce the CSS file and SHALL return an error message indicating which required color is missing.

### Requirement 4: Deck Template Generation

**User Story:** As a user, I want the system to generate a deck template skeleton, so that I can immediately use it to create new decks with `mira-new`.

#### Acceptance Criteria

1. THE Deck_Generator SHALL produce an `index.html` file at `mira-templates/decks/<template-name>/index.html`.
2. THE Deck_Generator SHALL base the skeleton on the built-in `aula-capitulo` deck template by default, preserving its HTML document structure (DOCTYPE, lang attribute, meta tags, head/body separation) and script initialization calls (AOS.init, lucide.createIcons, setupFullScreenWrappers).
3. THE Deck_Generator SHALL embed the generated theme CSS and `base.css` between `/* @MIRA:THEME:START */` and `/* @MIRA:THEME:END */` markers within a single `<style>` block in the `<head>` section.
4. WHEN layout patterns were extracted from the source (slide structure, grid proportions), THE Deck_Generator SHALL apply those patterns to the skeleton's `<main>` content area while preserving Mira's three required structural elements: `<header>` (full-screen hero section), `<main>` (card container with flex column layout), and `<footer>` (closing section with copyright).
5. IF no layout patterns were extracted from the source, THEN THE Deck_Generator SHALL use the default `aula-capitulo` layout structure unchanged.
6. WHEN logo files were extracted, THE Deck_Generator SHALL place them in `mira-templates/decks/<template-name>/assets/` and reference the first extracted logo file (alphabetically by filename) in the deck header's `<img>` element.
7. WHEN card template images were extracted from slides, THE Deck_Generator SHALL place them in `mira-templates/decks/<template-name>/assets/`.
8. THE Deck_Generator SHALL set the HTML `<title>` element to the exact string `Mira — Template: <Template Name>` where `<Template Name>` is the user-provided template name with the first letter of each word capitalized.
9. THE Deck_Generator SHALL preserve the following CDN links in the `<head>` section: Tailwind CSS (`cdn.tailwindcss.com`), AOS animation library (`unpkg.com/aos@2.3.1`), Lucide icons (`unpkg.com/lucide@latest`), and D3.js (`d3js.org/d3.v7.min.js`).
10. WHEN a custom font family was extracted, THE Deck_Generator SHALL include the appropriate Google Fonts `<link>` element in the `<head>` and replace the default font-family declaration in the body style.
11. IF no custom font family was extracted, THEN THE Deck_Generator SHALL retain the default `Inter` font family with the existing Google Fonts `<link>` for Inter.

### Requirement 5: Template Registration and Discovery

**User Story:** As a user, I want generated templates to appear automatically in `mira-new` template and theme lists, so that I can use them immediately without manual configuration.

#### Acceptance Criteria

1. THE Template_Registry SHALL place the theme file in `mira-templates/themes/<template-name>.css` where the `mira-new` agent scans for available themes.
2. THE Template_Registry SHALL place the deck skeleton in `mira-templates/decks/<template-name>/index.html` where the `mira-new` agent scans for available deck templates.
3. WHEN a user invokes `mira-new` after template generation, THE `mira-new` command SHALL dynamically discover all directories under `mira-templates/decks/` and all `.css` files under `mira-templates/themes/` (excluding `base.css`) and include them in the deck template list and theme list respectively, alongside the built-in entries.
4. THE Template_Registry SHALL use a matching slug for the theme file name and the deck template directory name, so that `mira-new` auto-selects the theme as default for the template.
5. IF the `mira-templates/themes/` or `mira-templates/decks/` directory does not exist at the time of registration, THEN THE Template_Registry SHALL create the missing directory before writing the file.

### Requirement 6: CLI Command Interface

**User Story:** As a user, I want to generate brand templates via a CLI command, so that I can automate template creation in scripts and CI pipelines.

#### Acceptance Criteria

1. THE CLI_Command SHALL be invoked as `npx mira-animator brand <template-name> --source=<path-or-url>`.
2. THE CLI_Command SHALL validate that `<template-name>` is a valid kebab-case slug matching the pattern `^[a-z][a-z0-9-]{1,48}[a-z0-9]$` (lowercase alphanumeric and hyphens only, 3 to 50 characters, must start with a letter and end with a letter or digit).
3. THE CLI_Command SHALL validate that the `--source` value is either a local file path that exists on disk, or a URL (starting with `http://` or `https://`) that responds with an HTTP status in the 200-299 range within 10 seconds.
4. IF a template with the same name already exists (a file at `mira-templates/themes/<name>.css` or a directory at `mira-templates/decks/<name>/`), THEN THE CLI_Command SHALL prompt the user for confirmation before overwriting.
5. WHEN execution completes successfully, THE CLI_Command SHALL print a summary showing the generated theme path, deck template path, extracted primary color as a hex value, and detected theme mode (light or dark).
6. THE CLI_Command SHALL register itself in `bin/mira.js` alongside existing commands (install, link, sources, new, status, update, uninstall) by adding a `brand` entry to the `commands` object.
7. IF Mira is not installed in the current directory (no valid config returned by `loadConfig()`), THEN THE CLI_Command SHALL exit with code 1 and print an error message instructing the user to run `npx mira-animator install` first.
8. IF the `--source` value is a URL and the network request fails or times out after 10 seconds, THEN THE CLI_Command SHALL exit with code 1 and print an error message describing the connection failure.

### Requirement 7: Agent Skill Interface

**User Story:** As a user, I want to generate brand templates conversationally through an AI agent, so that I can interactively refine the extraction and provide guidance.

#### Acceptance Criteria

1. THE Agent_Skill SHALL be defined in `agents/mira-brand-template/SKILL.md` following the standard Mira skill format (YAML frontmatter with `name`, `description`, and trigger phrases as used in existing skills such as `mira-image-template`).
2. THE Agent_Skill SHALL accept source files via conversation (attached files or file paths provided in text).
3. WHEN extraction is complete, THE Agent_Skill SHALL present a summary listing: primary color (hex), background color (hex), theme mode (light/dark), and detected font family, then ask the user for a template name.
4. THE Agent_Skill SHALL allow the user to override or adjust extracted values (primary color, background color, font family) before generating the output, by accepting corrections in the same conversation turn.
5. WHEN generation is complete, THE Agent_Skill SHALL display a summary showing the theme file path and deck template path written, and offer to invoke `mira-new` with the generated template.
6. THE Agent_Skill SHALL write output only within `mira-templates/` (theme file at `mira-templates/themes/<name>.css` and deck template at `mira-templates/decks/<name>/index.html`), following the same scope rule as `mira-image-template`.

### Requirement 8: Integration with Existing Mira Agents

**User Story:** As a user, I want the generated template to work seamlessly with other Mira agents, so that the full pipeline functions with my brand identity.

#### Acceptance Criteria

1. WHEN a deck is created from the generated template via `mira-new`, THE deck SHALL contain the brand theme CSS followed by `base.css` content embedded between `/* @MIRA:THEME:START */` and `/* @MIRA:THEME:END */` markers, compatible with the pipeline agents (mira-builder, mira-animator, mira-validator).
2. THE generated theme SHALL define all 15 standard `--mira-*` CSS custom properties so that `mira-builder` card templates render correctly.
3. THE generated deck template SHALL include the CDN script/link references (Tailwind, AOS, Lucide, D3, Inter font) and preserve the structural HTML sections that `mira-animator` requires for animation injection.
4. WHEN `mira-new` applies a custom primary color override on a deck using the generated theme, THE override SHALL replace only the `--mira-primary` value and its derived variables within the `@MIRA:THEME` block, functioning identically to how it works with built-in themes.

### Requirement 9: Contribution and Documentation

**User Story:** As a contributor, I want the feature to include complete documentation and follow repository conventions, so that it can be submitted as a Pull Request.

#### Acceptance Criteria

1. THE feature SHALL include documentation in English (`docs/brand-template.md`) covering usage, supported input formats, and at least one end-to-end example.
2. THE feature SHALL include documentation in Spanish (`docs/brand-template.es.md`) with equivalent content to the English version.
3. THE feature SHALL include a dedicated git branch named `feature/mira-brand-template` for the Pull Request.
4. THE feature SHALL include unit tests for the Brand_Extractor covering each supported input format (CSS/HTML files, PDF, PowerPoint, website URL, and ZIP archive containing eligible files).
5. THE feature SHALL include integration tests verifying that a generated theme defines all 15 `--mira-*` CSS custom properties listed in the CSS_Variable_Contract.
6. THE feature SHALL include integration tests verifying that a generated deck template contains `/* @MIRA:THEME:START */` and `/* @MIRA:THEME:END */` markers, the required CDN references (Tailwind, AOS, Lucide, D3), and pipeline-compatible structural HTML.
7. THE feature SHALL include a `TESTING.md` file with step-by-step instructions for manual testing and installation in a fresh workspace.
8. THE feature SHALL be listed in `package.json` `files[]` array (the `agents/mira-brand-template` entry) so it is included in npm distribution.
9. THE feature SHALL update the CLI help text in `bin/mira.js` to include the `brand` command with its synopsis and options.
10. THE feature SHALL follow the existing code style: ES modules, Node.js 18.20.2+ compatible, no new runtime dependencies beyond what file parsing requires.

### Requirement 10: Error Handling and Edge Cases

**User Story:** As a user, I want clear error messages and graceful handling of problematic inputs, so that I can fix issues without confusion.

#### Acceptance Criteria

1. IF the source file does not exist at the specified local path, THEN THE Brand_Extractor SHALL return an error message containing the exact path that was not found.
2. IF the source URL is unreachable (network error, DNS failure, or HTTP response status outside 200-299), THEN THE Brand_Extractor SHALL return an error message describing the connection failure including the URL attempted and the failure reason (timeout, status code, or network error type).
3. IF a ZIP archive contains no files with supported extensions (`.css`, `.html`, `.pdf`, `.pptx`, `.png`, `.jpg`, `.svg`), THEN THE Brand_Extractor SHALL return an error listing the file names found inside the archive and the supported format extensions.
4. IF color extraction yields fewer than one identifiable color from the source, THEN THE Brand_Extractor SHALL prompt the user to provide a primary color manually as a hex value.
5. IF the PowerPoint or PDF parsing library encounters a file it cannot parse (corrupted or unsupported internal format), THEN THE Brand_Extractor SHALL return an error indicating the file could not be parsed, including the file name, and suggesting the user verify file integrity.
6. IF the template name conflicts with a built-in template or theme name (mira-dark, light-minimal, corporate-blue, neon-emerald, aula-capitulo, pitch-projeto, demo-tecnica), THEN THE CLI_Command SHALL reject the name with an error message listing all reserved names.
