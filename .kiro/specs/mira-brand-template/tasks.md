# Implementation Plan: mira-brand-template

## Overview

Implement a brand identity ingestion pipeline for Mira that extracts visual identity from corporate assets (PPTX, PDF, CSS, HTML, CSV, URL, ZIP, SVG, images) and generates a registered Mira theme + deck template pair. The feature exposes a CLI command (`brand`) and an agent skill (`/mira-brand-template`), both sharing the same core pipeline.

## Tasks

- [x] 1. Set up project infrastructure and testing framework
  - [x] 1.1 Create the feature branch and install dev/runtime dependencies
    - Create git branch `feature/mira-brand-template`
    - Add `vitest` and `fast-check` as devDependencies in `package.json`
    - Add `pdf-parse`, `unzipper`, `sharp`, `quantize` as dependencies in `package.json`
    - Add vitest config (`vitest.config.js`) with ESM support
    - Add test scripts to `package.json`: `"test": "vitest --run"`, `"test:watch": "vitest"`
    - _Requirements: 9.3, 9.10_

  - [x] 1.2 Create directory structure and core interfaces
    - Create `lib/brand/` directory with placeholder modules
    - Create `lib/brand/parsers/` directory
    - Create `tests/unit/`, `tests/unit/parsers/`, `tests/property/`, `tests/integration/` directories
    - Define JSDoc interfaces in `lib/brand/types.js` (BrandIdentity, RawExtraction, ParseResult, LayoutPattern, AssetFile, RegistryResult)
    - _Requirements: 9.10_

- [x] 2. Implement color utilities and name validation
  - [x] 2.1 Implement `lib/brand/color-utils.js`
    - Implement `parseColor(color)` for hex, rgb, rgba, hsl, hsla, named colors → `{r, g, b}`
    - Implement `luminance(r, g, b)` with WCAG linearized sRGB formula
    - Implement `lighten(hex, ratio)` with formula `round(C + (255-C)*ratio)` per component
    - Implement `isValidTemplateName(name)` with pattern `^[a-z][a-z0-9-]{1,48}[a-z0-9]$`
    - Implement `RESERVED_NAMES` constant array
    - _Requirements: 2.3, 3.4, 3.7, 6.2, 10.6_

  - [x] 2.2 Write property test for name validation
    - **Property 8: Template name validation**
    - **Validates: Requirements 6.2, 10.6**

  - [x] 2.3 Write property test for light/dark classification
    - **Property 3: Light/dark classification correctness**
    - **Validates: Requirements 2.3, 3.4**

  - [x] 2.4 Write unit tests for `color-utils.js`
    - Test `parseColor` with hex, rgb, rgba, hsl, hsla, named colors
    - Test `luminance` edge cases (pure black → 0, pure white → 1)
    - Test `lighten` with known values
    - _Requirements: 2.3, 3.7_

- [x] 3. Implement format parsers
  - [x] 3.1 Implement CSS parser (`lib/brand/parsers/css.js`)
    - Regex scan for hex (#RGB, #RRGGBB), rgb(), rgba(), hsl(), hsla(), named colors
    - Extract font-family declarations
    - Return ParseResult with colors (up to 12), fonts (up to 5)
    - _Requirements: 1.3_

  - [x] 3.2 Implement HTML parser (`lib/brand/parsers/html.js`)
    - Parse inline styles and `<style>` blocks
    - Delegate CSS extraction to css.js parser
    - Extract structural layout patterns from DOM elements
    - _Requirements: 1.4_

  - [x] 3.3 Implement SVG parser (`lib/brand/parsers/svg.js`)
    - Parse XML, extract `fill`, `stroke` colors
    - Extract `font-family`, `font-size` attributes
    - _Requirements: 1.8_

  - [x] 3.4 Implement CSV parser (`lib/brand/parsers/csv.js`)
    - Parse rows matching color patterns (hex/rgb/hsl) and font name columns
    - _Requirements: 1.5_

  - [x] 3.5 Implement Image parser (`lib/brand/parsers/image.js`)
    - Load pixel data via `sharp`
    - Run median-cut quantization with `quantize` library
    - Return up to 12 dominant colors ranked by pixel frequency
    - _Requirements: 1.9_

  - [x] 3.6 Implement PDF parser (`lib/brand/parsers/pdf.js`)
    - Use `pdf-parse` for text/metadata extraction
    - Extract embedded colors from content streams
    - Extract font information from metadata
    - _Requirements: 1.2_

  - [x] 3.7 Implement PPTX parser (`lib/brand/parsers/pptx.js`)
    - Unzip PPTX with `unzipper`
    - Parse `ppt/theme/theme1.xml` for color scheme + fonts
    - Extract slide layout patterns
    - _Requirements: 1.1_

  - [x] 3.8 Implement URL parser (`lib/brand/parsers/url.js`)
    - Fetch URL with 30s timeout using native `fetch`
    - Extract `<style>` blocks and inline styles
    - Delegate to CSS/HTML parsers
    - _Requirements: 1.6_

  - [x] 3.9 Implement ZIP parser (`lib/brand/parsers/zip.js`)
    - Decompress with `unzipper`, filter eligible files (max 50, no nested ZIPs)
    - Delegate to appropriate parsers per file type
    - Merge results: union of colors (up to 12), union of fonts (up to 5)
    - _Requirements: 1.7_

  - [x] 3.10 Write property test for text-format extraction completeness
    - **Property 1: Text-format color and font extraction completeness**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.8**

  - [x] 3.11 Write property test for multi-source merge
    - **Property 2: Multi-source merge preserves union with caps**
    - **Validates: Requirements 1.7**

  - [x] 3.12 Write unit tests for parsers
    - Test each parser with representative sample inputs
    - Test edge cases: empty files, missing fonts, single-color sources
    - Test error conditions: corrupted files, oversized files
    - _Requirements: 9.4_

- [x] 4. Checkpoint - Ensure all parser tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Brand Extractor
  - [x] 5.1 Implement `lib/brand/extractor.js`
    - Detect source type (path vs URL, file extension)
    - Validate file size against per-format limits
    - Delegate to appropriate parser based on detected format
    - Determine primary/secondary colors by frequency ranking (min 5% for primary, 3% for secondary)
    - Classify light/dark mode via WCAG luminance formula
    - Handle font defaults when no font metadata found (set `fontsDefaulted: true`)
    - Return normalized BrandIdentity or throw descriptive errors
    - _Requirements: 1.1–1.13, 2.1–2.8, 10.1–10.5_

  - [x] 5.2 Write property test for unsupported format error
    - **Property 11: Unsupported format error lists all supported formats**
    - **Validates: Requirements 1.10**

  - [x] 5.3 Write property test for error messages context
    - **Property 10: Error messages include contextual information**
    - **Validates: Requirements 10.1, 10.3**

- [x] 6. Implement Theme Generator
  - [x] 6.1 Implement `lib/brand/theme-generator.js`
    - Accept BrandIdentity and template name
    - Generate `:root` block with all 15 `--mira-*` variables using derivation formulas
    - Add CSS comment header: `/* MIRA THEME: <name> (source: <format>) */`
    - Append `body { font-family: ... }` rule for custom fonts (non-"Inter")
    - Return error if primary or background color is missing
    - _Requirements: 3.1–3.11_

  - [x] 6.2 Write property test for theme CSS variable contract completeness
    - **Property 4: Theme CSS variable contract completeness**
    - **Validates: Requirements 3.1, 8.2**

  - [x] 6.3 Write property test for theme variable derivation correctness
    - **Property 5: Theme variable derivation correctness**
    - **Validates: Requirements 3.2, 3.3, 3.5, 3.6, 3.7, 3.8**

  - [x] 6.4 Write property test for conditional font rule inclusion
    - **Property 9: Conditional font rule inclusion**
    - **Validates: Requirements 3.10, 4.10**

- [x] 7. Implement Deck Generator
  - [x] 7.1 Implement `lib/brand/deck-generator.js`
    - Read base skeleton from `aula-capitulo/index.html`
    - Inject theme CSS + base.css between `@MIRA:THEME` markers
    - Update `<title>` to `Mira — Template: <Name>` (capitalized)
    - Apply layout patterns to `<main>` if present
    - Add Google Fonts `<link>` for custom fonts
    - Preserve all CDN references (Tailwind, AOS, Lucide, D3)
    - _Requirements: 4.1–4.11_

  - [x] 7.2 Write property test for deck template structural integrity
    - **Property 6: Deck template structural integrity**
    - **Validates: Requirements 4.3, 4.9, 8.1, 8.3**

- [x] 8. Implement Template Registry
  - [x] 8.1 Implement `lib/brand/registry.js`
    - Write theme file to `mira-templates/themes/<name>.css`
    - Write deck template to `mira-templates/decks/<name>/index.html`
    - Write asset files to `mira-templates/decks/<name>/assets/`
    - Create directories if they don't exist
    - Return RegistryResult with all paths
    - _Requirements: 5.1–5.5_

  - [x] 8.2 Write property test for output path and naming consistency
    - **Property 7: Output path and naming consistency**
    - **Validates: Requirements 5.4, 7.6**

- [x] 9. Checkpoint - Ensure all core pipeline tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement CLI command and agent skill
  - [x] 10.1 Implement `lib/commands/brand.js`
    - Parse args: `<template-name>` and `--source=<path-or-url>`
    - Validate template name with `isValidTemplateName()` and reserved names check
    - Validate source exists (local path or URL reachable within 10s)
    - Check for existing template and prompt for overwrite
    - Call pipeline: extract → generate theme → generate deck → register
    - Print summary: theme path, deck path, primary color, mode
    - Handle errors with exit code 1 and descriptive messages
    - _Requirements: 6.1–6.8, 10.6_

  - [x] 10.2 Register the `brand` command in `bin/mira.js`
    - Add `brand` entry to the `commands` object
    - Update help text to include brand command synopsis
    - _Requirements: 6.6, 9.9_

  - [x] 10.3 Create agent skill `agents/mira-brand-template/SKILL.md`
    - Define YAML frontmatter with name, description, trigger phrases
    - Document the conversational workflow: accept source → extract → present summary → accept overrides → generate → display result
    - Follow the standard Mira skill format (as in `mira-image-template`)
    - _Requirements: 7.1–7.6_

  - [x] 10.4 Write integration tests for CLI brand command
    - Test arg parsing and validation
    - Test error output for missing source, reserved names
    - Test successful end-to-end flow with mock source
    - _Requirements: 9.5, 9.6_

- [x] 11. Integration, documentation, and wiring
  - [x] 11.1 Update `mira-new` discovery to include `mira-templates/`
    - Ensure `mira-new` scans `mira-templates/decks/` for directories and `mira-templates/themes/` for `.css` files (excluding `base.css`)
    - Include discovered templates alongside built-in entries
    - _Requirements: 5.3_

  - [x] 11.2 Update `package.json` files array
    - Add `agents/mira-brand-template` to the `files[]` array
    - _Requirements: 9.8_

  - [x] 11.3 Create documentation (`docs/brand-template.md` and `docs/brand-template.es.md`)
    - English docs: usage, supported formats, end-to-end example
    - Spanish docs: equivalent content translated
    - _Requirements: 9.1, 9.2_

  - [x] 11.4 Create `TESTING.md` with manual testing instructions
    - Step-by-step manual testing guide
    - Installation in fresh workspace instructions
    - _Requirements: 9.7_

  - [x] 11.5 Write integration tests for full pipeline
    - Test end-to-end: source file → theme + deck output
    - Verify theme has all 15 `--mira-*` variables
    - Verify deck has `@MIRA:THEME` markers and CDN references
    - Verify `mira-new` discovers generated templates
    - _Requirements: 9.5, 9.6_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design specifies JavaScript (Node.js ES modules) for all implementation
- Runtime dependencies (`pdf-parse`, `unzipper`, `sharp`, `quantize`) are lazy-imported only when the `brand` command is invoked
- All output goes exclusively to `mira-templates/` directory

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "3.1", "3.3", "3.4"] },
    { "id": 4, "tasks": ["3.2", "3.5", "3.6", "3.7", "3.8"] },
    { "id": 5, "tasks": ["3.9", "3.10", "3.11", "3.12"] },
    { "id": 6, "tasks": ["5.1"] },
    { "id": 7, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 8, "tasks": ["6.2", "6.3", "6.4", "7.1"] },
    { "id": 9, "tasks": ["7.2", "8.1"] },
    { "id": 10, "tasks": ["8.2", "10.1"] },
    { "id": 11, "tasks": ["10.2", "10.3", "10.4"] },
    { "id": 12, "tasks": ["11.1", "11.2", "11.3", "11.4"] },
    { "id": 13, "tasks": ["11.5"] }
  ]
}
```
