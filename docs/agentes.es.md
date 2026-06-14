# Agentes

Cada agente de Mira es una skill de Claude: invócala con su `/nombre`, o simplemente describe lo que quieres y el agente se acciona solo. Esta página describe cada uno. Para cómo se conectan, mira el [Pipeline de agentes](pipeline.md).

## Agentes principales

### `/mira-new`
La puerta de entrada de un nuevo deck. Recolecta los requisitos de una presentación de forma conversacional (nombre del tema, plantilla del deck, tema base, color principal y referencias) y monta la carpeta `decks/<tema>/` lista para que el pipeline la rellene. **No** genera slides — prepara el terreno y, al final, ofrece accionar el pipeline.

### `/mira-references`
Crea y organiza la carpeta de referencias por tema, `references/`, dentro del tema del deck, e incluye automáticamente el material que ya esté ahí. Es la forma de informar la fuente de contenido de una presentación específica — siempre por tema, local al tema. Úsala antes de crear un slide cuando el tema aún no tenga carpeta de referencias.

### `/mira-animator`
Crea slides de concepto con animaciones creativas y **bucle interno obligatorio**. La regla madre de Mira vive aquí: *ninguna animación es estática — toda animación entra con coreografía y después continúa en bucle interno.* Estampa cada animación con un marcador `<!-- @MIRA:SIZE 3/10 -->` para que `mira-size-animator` la escale después. También maneja *"convierte esta imagen en un slide animado."*

### `/mira-animated-metaphor`
Convierte la animación de un slide (o de todos) en una **metáfora visual** animada. A partir del concepto del slide, inventa una analogía concreta de la vida diaria y la anima al estilo de `mira-animator` (bucle interno obligatorio), reemplazando la animación en el lugar y manteniendo título, subtítulo y píldoras.

### `/mira-img-animator`
Anima una imagen existente — le da vida a una figura estática al estilo del deck.

### `/mira-size-animator`
Ajusta la percepción de tamaño de las animaciones de un deck en una escala de 1 a 10, donde **3/10** es lo que `mira-animator` genera por defecto. Lee el marcador `@MIRA:SIZE` de cada animación, reporta el nivel actual, y escala la composición (radios, longitudes, espaciados, fuentes internas y glow dentro del SVG) para llenar más o menos el escenario — sin cambiar la altura del escenario ni romper el bucle interno. *"Pon las animaciones en 6/10," "este slide en 2/10."*

!!! note "Tamaño y distancia"
    En el formato vertical (9:16), aumentar los elementos también encoge las distancias entre ellos. En el formato horizontal (16:9), solo aumentan los elementos — las distancias quedan como están.

### `/mira-image`
Coloca una imagen que ya tienes (un archivo local o una URL) dentro de un slide, en un card limpio donde queda grande y bien encuadrada. Copia la imagen a la carpeta `assets/` del deck y la referencia por una ruta relativa, así que el deck se mantiene autosuficiente y se abre directo desde `file://` sin servidor (una `<img>` común no sufre el bloqueo de CORS que afecta al `.glb`). Mismo card limpio que `mira-3d` y `mira-qrcode`: solo el título y la imagen maximizada, sin leyenda debajo. La imagen queda estática (`object-fit: contain` por defecto, así que no se recorta nada); el bucle interno vive en el marco (un glow que respira), sin distorsionar nunca la imagen. Para **generar** una imagen nueva usa `mira-visuals`; para **animar** una imagen existente usa `mira-img-animator`; esta solo **coloca** una imagen lista.

### `/mira-get-videos`
Descarga los videos de fondo de Mira a `mira-templates/videos_header/`. Úsala cuando un encabezado se vea vacío, o justo después de instalar si quieres los fondos en video.

## Agentes útiles

### `/mira-extract`
El extractor de contexto. Lee una fuente vinculada en `mira.config.json` (carpeta de proyecto, PDF, LaTeX o texto) y produce un briefing estructurado que alimenta al planner. Primer eslabón de la cadena.

### `/mira-planner`
Planificador de contenido. Analiza el contenido de un capítulo (LaTeX, PDF o texto) y produce un plan de slides detallado **antes** de cualquier montaje visual — cuántos slides, qué cubre cada uno, la estructura — y espera aprobación.

### `/mira-copywriter`
Refina el texto de los slides y especifica imágenes, bajando el texto a la altura de slide (corto, directo, presentable) en vez de la altura de párrafo.

### `/mira-validator`
Analiza el HTML generado y valida conformidad visual, estructural y de assets — un reporte final de calidad. Ejecútalo después de un montaje, o para diagnosticar un deck existente.

## Visuales y datos

### `/mira-visuals`
Imágenes estáticas para slides: paneles, diagramas, gráficos e infografías — cuando un concepto queda mejor como un visual fijo y denso que como movimiento.

### `/mira-chart`
Convierte datos en gráficos con impacto: a partir de un CSV/JSON, de una imagen de gráfico, o de un boceto a mano — y recomienda el mejor tipo de gráfico a partir de una galería.

### `/mira-image-template`
Crea una **nueva plantilla de deck a partir de imagen(es)**. Envías capturas de pantallas/slides y/o el logo, y el agente reconoce todo el design system (colores, fondo, tipografía, esquinas, sombras, glassmorphism, glows) y, cuando hay captura, la **disposición de los elementos**, y monta una plantilla completa: el esqueleto `mira-templates/decks/<nombre>/index.html` con la identidad incrustada, más el tema `mira-templates/themes/<nombre>.css`. Al final pide un **nombre** y guarda. La plantilla pasa a ser ofrecida por `/mira-new` junto con las existentes, y su tema del mismo nombre se vuelve el predeterminado natural. La captura manda en el layout; el logo manda en la paleta.

### `/mira-qrcode`
Inserta un **código QR** grande, centrado y escaneable en un slide, generado a partir de un enlace o texto que provees. El QR se genera **localmente** en el momento del montaje (el paquete npm `qrcode`) y se incrusta como un SVG inline, sin dependencia en tiempo de ejecución, sin API externa y sin CDN, así que el slide funciona incluso desde `file://`. Card limpio, mismo patrón que `mira-3d`: solo el título del slide y el QR grande, sin leyenda con el enlace debajo. La escaneabilidad guía el estilo: módulos oscuros sobre un card blanco, zona de silencio preservada, naranja solo en el marco y el título. El QR queda estático: el bucle interno vive en el marco (pulso de glow, esquinas que respiran), nunca sobre los módulos.

### `/mira-3d`
Añade un **elemento 3D real** al canvas de un slide (profundidad real, auto-rotación continua e interacción de arrastrar para rotar / zoom) en un card limpio donde el elemento queda maximizado. Elige una de tres capas según tu pedido: CSS 3D puro (formas simples), Three.js procedural (formas abstractas como esferas de partículas y redes de nodos, u objetos low-poly construidos a partir de primitivas), o glTF (cuando provees un `.glb`, o aceptas una búsqueda de un modelo gratuito y licenciado en la web). Hereda la regla madre: el 3D nunca entra en estático, así que la auto-rotación se pausa al arrastrar y vuelve a continuar.

!!! warning "La capa glTF necesita un servidor"
    Un slide que carga un `.glb` local **no** se abre desde `file://` (el navegador bloquea la carga del modelo), solo por HTTP. En ese caso el agente arranca un servidor local, te entrega el enlace `http://localhost` y escribe un lanzador de doble clic (`abrir-slide.cmd`) para que puedas presentar después. Esta capa necesita **Node.js** instalado. Las capas CSS 3D y procedural no usan ningún asset local y se abren directo desde `file://`, sin servidor.

## Agentes responsivos

### `/mira-squared`
Genera una versión **cuadrada** (1:1, 1080×1080) de un deck a partir del original 16:9, o crea slides cuadrados desde cero. Escribe un nuevo `index-1x1.html` al lado del original (centrado por defecto, opcionalmente alineado a la izquierda/derecha). Para feed de Instagram, LinkedIn, etc.

### `/mira-vertical`
Genera una versión **vertical** (9:16). Cada slide de contenido queda solo con el título principal arriba y una animación en un canvas alto y estandarizado debajo; el título se encoge solo para caber en máximo 2 líneas, y el eje de cada animación se reformula para el retrato (flujo horizontal pasa a vertical, comparación lado a lado pasa a apilada). Escribe `index-9x16.html`. Para Reels, Shorts, TikTok, Stories.

### `/mira-thirds`
Reencuadra un deck en la **regla de los tercios** sin cambiar la proporción. Empuja el contenido de cada slide a las columnas 1 y 2 de una grilla 3×3 (los dos tercios de la izquierda) y deja la columna de la derecha libre — para que superpongas texto, lower-third o el video del presentador en la edición. Funciona sobre 16:9, 1:1 o 9:16. Escribe un archivo `-thirds`. El lado libre es la derecha por defecto; puede invertirse.

## Transiciones

### `/mira-transition-dissolve`
Aplica una transición **disolvencia** (crossfade real, estilo Canva/Keynote) a la navegación entre slides usando la View Transitions API (same-document), que funciona en `file://` sin servidor. Escribe `index-dissolve.html` al lado del original. Los navegadores sin la API navegan normalmente.
