# Pipeline de agentes

Mira es un **equipo de agentes**. Cada uno hace un único trabajo y pasa al siguiente. El orquestador pausa entre las etapas para que tú estés en control.

```mermaid
flowchart TD
    S[mira-new<br/>monta el deck] --> E[mira-extract<br/>lee la fuente]
    E --> P[mira-planner<br/>planifica los slides]
    P --> C[mira-copywriter<br/>refina texto e imágenes]
    C --> B[mira-builder<br/>monta el HTML]
    B --> A[mira-animator<br/>coreografía las animaciones]
    A --> V[mira-validator<br/>reporte de conformidad]
```

## La línea principal

| Etapa | Agente | Qué hace |
|---|---|---|
| 0 | **mira-new** | Puerta de entrada conversacional. Monta `decks/<tema>/` (nombre, plantilla de deck, tema base, color, referencias). No genera slides — prepara el terreno. |
| 1 | **mira-extract** | Lee una fuente vinculada (proyecto, PDF, LaTeX o texto) y produce un **briefing** estructurado. Primer eslabón de la cadena. |
| 2 | **mira-planner** | Analiza el briefing y propone un **plan de slides** detallado, y espera tu aprobación antes de montar nada. |
| 3 | **mira-copywriter** | Refina el texto a la altura de slide y especifica imágenes. |
| 4 | **mira-builder** | El motor de montaje. Monta HTML/Tailwind interactivo a partir de cards glassmorphism modulares con navegación card por card. |
| 5 | **mira-animator** | Añade el movimiento. Cada slide de concepto recibe una animación creativa con **bucle interno obligatorio** — entra con coreografía y después entra en bucle. Estampa cada animación con el marcador `<!-- @MIRA:SIZE 3/10 -->`. |
| 6 | **mira-validator** | Analiza el HTML generado y produce un reporte de conformidad: chequeos visuales, estructurales y de assets. |

## Agentes de ajuste de movimiento

Estos corren sobre un deck existente.

| Agente | Qué hace |
|---|---|
| **mira-size-animator** | Lee el marcador `@MIRA:SIZE N/10` y escala la percepción de tamaño de las animaciones (radios, longitudes, espaciados, fuentes internas, glow) en una escala de 1 a 10, sin cambiar la altura del escenario ni romper el bucle. *"Pon las animaciones en 6/10."* |
| **mira-animated-metaphor** | Convierte la animación de un slide en una **metáfora visual** animada — una analogía concreta de la vida diaria para el concepto — manteniendo título, subtítulo y píldoras. |

## Agentes visuales / de imagen

| Agente | Qué hace |
|---|---|
| **mira-visuals** | Imágenes estáticas para slides: paneles, diagramas, gráficos e infografías. |
| **mira-img-animator** | Anima una imagen existente. |
| **mira-chart** | Convierte datos en gráficos — a partir de CSV/JSON, de una imagen, o de un boceto a mano — y recomienda el mejor tipo de gráfico. |
| **mira-image-template** | Crea una nueva plantilla de deck a partir de imagen(es) — capturas de pantalla y/o un logo — reconociendo el design system y la disposición de los elementos, y la registra para que `mira-new` la use. |

## Agentes de elementos en el slide

Estos colocan un elemento específico dentro de un slide.

| Agente | Qué hace |
|---|---|
| **mira-3d** | Añade un elemento 3D real (profundidad real, auto-rotación, arrastrar/zoom) en un card limpio, eligiendo CSS 3D, Three.js procedural o un `.glb` glTF. Un slide con `.glb` necesita un servidor HTTP local (el agente arranca uno y escribe un lanzador `abrir-slide.cmd`; necesita Node.js); CSS 3D y procedural se abren desde `file://`. |
| **mira-qrcode** | Inserta un código QR grande, centrado y escaneable a partir de un enlace o texto, generado localmente e incrustado como SVG inline, así que funciona desde `file://` sin dependencia en tiempo de ejecución. |
| **mira-image** | Coloca una imagen que ya tienes (archivo local o URL) en un slide, copiada a `assets/` y referenciada por una ruta relativa. Card limpio, imagen estática con el bucle en el marco. Funciona desde `file://` sin servidor. Para generar una imagen ver `mira-visuals`; para animar una ver `mira-img-animator`. |

## Agentes de apoyo

| Agente | Qué hace |
|---|---|
| **mira-references** | Crea y organiza la carpeta `references/` por tema; incluye automáticamente el material que dejes ahí. |
| **mira-get-videos** | Descarga los videos de fondo a `mira-templates/videos_header/`. |

## Agentes de formato

Estos producen archivos extra al lado de tu deck sin tocar el original. Mira [Formatos de vídeo](formatos.md).

| Agente | Salida | Formato |
|---|---|---|
| **mira-squared** | `index-1x1.html` | cuadrado 1:1 |
| **mira-vertical** | `index-9x16.html` | vertical 9:16 |
| **mira-thirds** | `index-thirds.html` | regla de los tercios |
| **mira-transition-dissolve** | `index-dissolve.html` | transición disolvencia |

Para la descripción completa de cada agente, mira [Agentes](agentes.md).
