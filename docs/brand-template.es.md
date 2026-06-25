# Generador de Plantillas de Marca

Genera temas y plantillas de presentación compatibles con Mira a partir de archivos de identidad corporativa. En lugar de crear manualmente variables CSS y esqueletos de decks, proporciona los assets de tu marca y el sistema extrae colores, tipografía, logos y patrones de layout para producir una plantilla registrada lista para `mira-new`.

## Uso del CLI

```bash
npx mira-animator brand <nombre-plantilla> --source=<ruta-o-url>
```

| Argumento | Descripción |
|---|---|
| `<nombre-plantilla>` | Slug en kebab-case para la plantilla (ej. `mi-empresa`). |
| `--source=<ruta>` | Ruta local o URL con los assets de marca. |

### Ejemplo

```bash
npx mira-animator brand acme-corp --source=./brand/style-guide.css
```

Al completarse exitosamente, el comando imprime:

```
✓ Brand template generated:
  Theme:   mira-templates/themes/acme-corp.css
  Deck:    mira-templates/decks/acme-corp/index.html
  Primary: #E63946
  Mode:    dark
```

## Formatos Soportados

| Formato | Extensiones | Tamaño Máximo |
|---|---|---|
| PowerPoint | `.ppt`, `.pptx` | 100 MB |
| PDF | `.pdf` | 100 MB |
| CSS | `.css` | 10 MB |
| HTML | `.html` | 10 MB |
| CSV | `.csv` | 10 MB |
| SVG | `.svg` | 10 MB |
| Imagen | `.png`, `.jpg`, `.webp` | 50 MB |
| ZIP | `.zip` | 200 MB (máx. 50 archivos, sin ZIPs anidados) |
| URL | `http://` o `https://` | Timeout de 30s |

## Reglas de Nombres de Plantilla

Los nombres deben cumplir el patrón `^[a-z][a-z0-9-]{1,48}[a-z0-9]$`:

- 3 a 50 caracteres
- Empieza con letra minúscula
- Termina con letra o dígito
- Solo alfanuméricos en minúscula y guiones

**Nombres reservados** (no se pueden usar): `mira-dark`, `light-minimal`, `corporate-blue`, `neon-emerald`, `aula-capitulo`, `pitch-projeto`, `demo-tecnica`.

## Estructura de Salida

```
mira-templates/
├── themes/
│   └── <nombre>.css        # Tema CSS con 15 variables --mira-*
└── decks/
    └── <nombre>/
        ├── index.html      # Esqueleto de la plantilla del deck
        └── assets/         # Logos, plantillas de cards
```

El tema generado define las 15 propiedades CSS `--mira-*`. La plantilla del deck se basa en `aula-capitulo` e incluye referencias a CDNs (Tailwind, AOS, Lucide, D3) además del CSS del tema embebido entre los marcadores `/* @MIRA:THEME:START */` y `/* @MIRA:THEME:END */`.

## Ejemplo Completo

Partiendo de un archivo CSS de marca:

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

Ejecuta:

```bash
npx mira-animator brand my-startup --source=./brand/colors.css
```

Esto extrae `#2563eb` como color primario, `#1e293b` como fondo (modo oscuro), y `Poppins` como fuente. La salida:

- `mira-templates/themes/my-startup.css` — tema completo de Mira
- `mira-templates/decks/my-startup/index.html` — plantilla de deck con la fuente Poppins cargada via Google Fonts

Ahora crea un deck a partir de ella:

```text
/mira-new crea una presentación llamada 'product-launch' con la plantilla my-startup
```

## Uso como Skill del Agente

La funcionalidad también está disponible como skill del agente para uso conversacional.

**Frases de activación:**

- `/mira-brand-template`
- "generar plantilla de marca"
- "crear plantilla desde la marca"
- "extraer identidad de marca"

**Flujo de trabajo:**

1. Proporciona un archivo fuente (adjunta o pega una ruta/URL)
2. El agente extrae colores, fuentes y layouts
3. Se presenta un resumen (color primario, fondo, modo, fuentes)
4. Puedes modificar cualquier valor antes de confirmar
5. Proporciona un nombre para la plantilla
6. Se generan y registran el tema y el deck

El agente escribe la salida únicamente dentro de `mira-templates/`, siguiendo la misma regla de alcance que las otras skills de Mira.
