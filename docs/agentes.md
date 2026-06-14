# Agents

Every Mira agent is a Claude skill: invoke it with its `/name`, or just describe what you want and the agent triggers itself. This page describes each one. For how they connect, see the [Agent pipeline](pipeline.md).

## Main agents

### `/mira-new`
The front door for a new deck. Collects the requirements of a presentation conversationally (theme name, deck template, base theme, primary color and references) and assembles the `decks/<theme>/` folder ready for the pipeline to fill. It does **not** generate slides — it prepares the ground and, at the end, offers to trigger the pipeline.

### `/mira-references`
Creates and organizes the per-theme references folder, `references/`, inside the deck's theme, and automatically includes whatever material is already there. This is how you tell Mira the content source for a specific presentation — always per theme, local to the theme. Use it before creating a slide when the theme has no references folder yet.

### `/mira-animator`
Creates concept slides with creative animations and a **mandatory internal loop**. Mira's mother-rule lives here: *no animation is static — every animation enters with choreography and then continues in an internal loop.* It stamps each animation with a `<!-- @MIRA:SIZE 3/10 -->` marker so `mira-size-animator` can scale it later. Also handles *"turn this image into an animated slide."*

### `/mira-animated-metaphor`
Turns a slide's animation (or all of them) into an animated **visual metaphor**. From the slide's concept, it invents a concrete everyday analogy and animates it in the `mira-animator` style (internal loop required), replacing the animation in place while keeping the title, subtitle and pills.

### `/mira-img-animator`
Animates an existing image — bringing a static figure to life in the deck's style.

### `/mira-size-animator`
Adjusts the perceived size of a deck's animations on a 1–10 scale, where **3/10** is what `mira-animator` generates by default. It reads the `@MIRA:SIZE` marker of each animation, reports the current level, and scales the composition (radii, lengths, spacing, internal fonts and glow inside the SVG) to fill more or less of the stage — without changing the stage height or breaking the internal loop. *"Put the animations at 6/10," "this slide at 2/10."*

!!! note "Size and distance"
    On the vertical (9:16) format, growing the elements also shrinks the distances between them. On the horizontal (16:9) format, only the elements grow — the distances stay as they are.

### `/mira-image`
Places an image you already have (a local file or a URL) into a slide, in a clean card where it sits large and well-framed. It copies the image into the deck's `assets/` folder and references it by a relative path, so the deck stays self-contained and opens straight from `file://` with no server (a plain `<img>` is not subject to the CORS block that affects `.glb`). Same clean card as `mira-3d` and `mira-qrcode`: just the title and the maximized image, with no caption underneath. The image stays static (`object-fit: contain` by default, so nothing is cropped); the internal loop lives in the frame (a breathing glow), never distorting the image. To **generate** a new image use `mira-visuals`; to **animate** an existing image use `mira-img-animator`; this one only **places** a ready image.

### `/mira-get-videos`
Downloads Mira's background videos into `mira-templates/videos_header/`. Use it when a header looks empty, or right after install if you want the video backgrounds.

## Utility agents

### `/mira-extract`
The context extractor. Reads a linked source from `mira.config.json` (project folder, PDF, LaTeX or text) and produces a structured briefing that feeds the planner. First link in the chain.

### `/mira-planner`
Content planner. Analyzes a chapter's content (LaTeX, PDF or text) and produces a detailed slide plan **before** any visual assembly — how many slides, what each one covers, the structure — and waits for approval.

### `/mira-copywriter`
Refines slide copy and specifies images, bringing the text down to slide altitude (short, punchy, presentable) rather than paragraph altitude.

### `/mira-validator`
Analyzes the generated HTML and validates visual, structural and asset conformance — a final quality report. Run it after a build, or to diagnose an existing deck.

## Visuals & data

### `/mira-visuals`
Static images for slides: panels, diagrams, charts and infographics — when a concept is better shown as a fixed, dense visual than as motion.

### `/mira-chart`
Turns data into charts with impact: from a CSV/JSON, from an image of a chart, or from a hand-drawn sketch — and recommends the best chart type from a gallery.

### `/mira-image-template`
Creates a **new deck template from image(s)**. You send screenshots of screens/slides and/or the logo, and the agent recognizes the whole design system (colors, background, typography, corners, shadows, glassmorphism, glows) and, when a screenshot is given, the **arrangement of the elements**, then builds a complete template: the skeleton `mira-templates/decks/<name>/index.html` with the identity embedded, plus the theme `mira-templates/themes/<name>.css`. At the end it asks for a **name** and saves. The template is then offered by `/mira-new` alongside the existing ones, and its same-name theme becomes the natural default. The screenshot drives the layout; the logo drives the palette.

### `/mira-qrcode`
Inserts a large, centered, scannable **QR code** into a slide, generated from a link or text you provide. The QR is generated **locally** at build time (the `qrcode` npm package) and embedded as an inline SVG, with no runtime dependency, no external API and no CDN, so the slide works even from `file://`. Clean card, same pattern as `mira-3d`: just the slide title and the big QR, with no link caption underneath. Scannability drives the style: dark modules on a white card, quiet zone preserved, orange only on the frame and title. The QR stays static: the internal loop lives in the frame (glow pulse, breathing corners), never over the modules.

### `/mira-3d`
Adds a **true 3D element** to a slide's canvas (real depth, continuous auto-rotation and drag-to-rotate / zoom interaction) in a clean card where the element is maximized. It picks one of three layers from your request: pure CSS 3D (simple shapes), procedural Three.js (abstract forms like particle spheres and node networks, or low-poly objects built from primitives), or glTF (when you provide a `.glb`, or accept a search for a free, licensed model on the web). It inherits the mother-rule: the 3D never enters static, so auto-rotate pauses on drag and resumes.

!!! warning "The glTF layer needs a server"
    A slide that loads a local `.glb` does **not** open from `file://` (the browser blocks the model fetch), only over HTTP. In that case the agent starts a local server, hands you the `http://localhost` link, and writes a double-click launcher (`abrir-slide.cmd`) so you can present later. This layer needs **Node.js** installed. The CSS 3D and procedural layers use no local asset and open straight from `file://`, with no server.

## Responsive agents

### `/mira-squared`
Generates a **square** (1:1, 1080×1080) version of a deck from the 16:9 original, or creates square slides from scratch. Writes a new `index-1x1.html` next to the original (centered by default, optionally left/right aligned). For Instagram feed, LinkedIn, etc.

### `/mira-vertical`
Generates a **vertical** (9:16) version. Each content slide keeps only the main title at the top and a tall, standardized animation canvas below; the title auto-shrinks to fit at most two lines, and each animation's axis is reworked for portrait (horizontal flow becomes vertical, side-by-side comparison becomes stacked). Writes `index-9x16.html`. For Reels, Shorts, TikTok, Stories.

### `/mira-thirds`
Reframes a deck on the **rule of thirds** without changing the aspect ratio. Pushes each slide's content into columns 1 and 2 of a 3×3 grid (the left two-thirds) and leaves the right column free — for you to overlay text, a lower-third or the presenter's video in editing. Works on top of 16:9, 1:1 or 9:16. Writes a `-thirds` file. Free side is the right by default; can be flipped.

## Transitions

### `/mira-transition-dissolve`
Applies a **dissolve** transition (a real crossfade, Canva/Keynote style) to slide navigation using the View Transitions API (same-document), which works on `file://` with no server. Writes `index-dissolve.html` next to the original. Browsers without the API navigate normally.
