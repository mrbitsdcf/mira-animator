# Brand Template Generator

Generate Mira-compatible themes and deck templates from your corporate brand identity files. Instead of manually crafting CSS variables and deck skeletons, provide brand assets and the system extracts colors, typography, logos, and layout patterns to produce a registered template ready for `mira-new`.

## CLI Usage

```bash
npx mira-animator brand <template-name> --source=<path-or-url>
```

| Argument | Description |
|---|---|
| `<template-name>` | Kebab-case slug for the template (e.g., `my-company`). |
| `--source=<path>` | Local file path or URL with brand assets. |

### Example

```bash
npx mira-animator brand acme-corp --source=./brand/style-guide.css
```

On success, the command prints:

```
✓ Brand template generated:
  Theme:   mira-templates/themes/acme-corp.css
  Deck:    mira-templates/decks/acme-corp/index.html
  Primary: #E63946
  Mode:    dark
```

## Supported Formats

| Format | Extensions | Max Size |
|---|---|---|
| PowerPoint | `.ppt`, `.pptx` | 100 MB |
| PDF | `.pdf` | 100 MB |
| CSS | `.css` | 10 MB |
| HTML | `.html` | 10 MB |
| CSV | `.csv` | 10 MB |
| SVG | `.svg` | 10 MB |
| Image | `.png`, `.jpg`, `.webp` | 50 MB |
| ZIP | `.zip` | 200 MB (max 50 files, no nested ZIPs) |
| URL | `http://` or `https://` | 30s timeout |

## Template Name Rules

Names must match the pattern `^[a-z][a-z0-9-]{1,48}[a-z0-9]$`:

- 3 to 50 characters
- Starts with a lowercase letter
- Ends with a letter or digit
- Only lowercase alphanumeric and hyphens

**Reserved names** (cannot be used): `mira-dark`, `light-minimal`, `corporate-blue`, `neon-emerald`, `aula-capitulo`, `pitch-projeto`, `demo-tecnica`.

## Output Structure

```
mira-templates/
├── themes/
│   └── <name>.css          # CSS theme with 15 --mira-* variables
└── decks/
    └── <name>/
        ├── index.html      # Deck template skeleton
        └── assets/         # Logos, card templates
```

The generated theme defines all 15 `--mira-*` CSS custom properties. The deck template is based on `aula-capitulo` and includes CDN references (Tailwind, AOS, Lucide, D3) plus the theme CSS embedded between `/* @MIRA:THEME:START */` and `/* @MIRA:THEME:END */` markers.

## End-to-End Example

Starting from a CSS brand file:

```css
/* brand/colors.css */
:root {
  --brand-primary: #2563eb;
  --brand-dark: #1e293b;
  --brand-accent: #f59e0b;
}
body {
  font-family: 'Poppins', sans-serif;
}
```

Run:

```bash
npx mira-animator brand my-startup --source=./brand/colors.css
```

This extracts `#2563eb` as primary, `#1e293b` as background (dark mode), and `Poppins` as the font. The output:

- `mira-templates/themes/my-startup.css` — full Mira theme
- `mira-templates/decks/my-startup/index.html` — deck template with Poppins font loaded via Google Fonts

Now create a deck from it:

```text
/mira-new create a presentation called 'product-launch' with the my-startup template
```

## Agent Skill Usage

The feature is also available as an agent skill for conversational use.

**Trigger phrases:**

- `/mira-brand-template`
- "generate brand template"
- "create template from brand"
- "extract brand identity"

**Workflow:**

1. Provide a source file (attach or paste a path/URL)
2. The agent extracts colors, fonts, and layouts
3. A summary is presented (primary color, background, mode, fonts)
4. You can override any value before confirming
5. Provide a template name
6. Theme and deck are generated and registered

The agent writes output only within `mira-templates/`, following the same scope as other Mira skills.
