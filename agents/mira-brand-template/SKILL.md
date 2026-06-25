---
name: mira-brand-template
description: Gera um tema Mira + template de deck a partir de arquivos de identidade visual corporativa (PowerPoint, PDF, CSS, HTML, CSV, URL, ZIP, SVG, imagens). O agente extrai cores, tipografia, logos e padrões de layout automaticamente, apresenta o resumo ao usuário, permite ajustes e produz o template registrado pronto para o /mira-new. Use SEMPRE que o usuário disser "/mira-brand-template", "brand template", "gerar template de marca", "template de marca", "identidade visual", "gerar tema da marca", "extrair identidade visual", "template a partir do brand guide", "tema corporativo", "criar template da empresa", ou fornecer arquivos de marca pedindo para gerar um template.
---

# Skill: Template a partir de Identidade Visual (Mira)

## Objetivo

Transformar **arquivos de identidade visual corporativa** em um **tema Mira + template de deck reutilizável**. A partir de fontes como PowerPoint, PDF, CSS, HTML, CSV, URL, SVG ou imagens, o pipeline `Brand_Extractor` reconhece automaticamente cores, tipografia, logos e padrões de layout, e produz um par tema/template nomeado que passa a ser oferecido pelo `/mira-new`.

Pertence ao grupo **Agentes visuais e dados** (ao lado de `/mira-image-template`, `/mira-visuals`, `/mira-chart`).

## Regra de ouro (escopo de escrita)

Tudo o que esta skill cria vive **dentro de `mira-templates/`**:

- O tema (design system) em `mira-templates/themes/<nome>.css`
- O esqueleto do deck em `mira-templates/decks/<nome>/index.html`
- Assets extraídos em `mira-templates/decks/<nome>/assets/`

Nunca escreva fora de `mira-templates/`. Esta skill **não cria decks** (isso é o `/mira-new`); ela cria o **template** que o `/mira-new` vai usar.

## Formatos de Fonte Aceitos

| Formato | Extensões / Tipo |
|---------|-----------------|
| PowerPoint | `.ppt`, `.pptx` (até 100 MB) |
| PDF | `.pdf` (até 100 MB) |
| CSS | `.css` (até 10 MB) |
| HTML | `.html` (até 10 MB) |
| CSV | `.csv` (até 10 MB) |
| SVG | `.svg` (até 10 MB) |
| Imagem | `.png`, `.jpg`, `.webp` (até 50 MB) |
| ZIP | `.zip` (até 200 MB, máx. 50 arquivos elegíveis, sem ZIPs aninhados) |
| URL | `http://` ou `https://` (timeout 30s) |

## Fluxo de Execução

### Passo 1: Receber a fonte de identidade visual

O usuário pode fornecer:

- **Arquivo anexado** na conversa (arrastar/colar)
- **Caminho de arquivo** no texto (ex.: `./brand/identidade.pptx`)
- **URL de website** (ex.: `https://empresa.com.br`)

Aceite qualquer um dos formatos listados acima. Se o formato não for suportado, informe os formatos aceitos e peça outro arquivo.

### Passo 2: Extrair a identidade visual

Invoque o pipeline `Brand_Extractor` (`lib/brand/extractor.js`) sobre a fonte fornecida. O extrator:

1. Detecta o tipo de arquivo (extensão ou URL)
2. Delega ao parser específico do formato
3. Extrai até 12 cores, até 5 famílias tipográficas, logos e padrões de layout
4. Determina a cor primária (acento dominante), cor de fundo e modo (claro/escuro)
5. Retorna um objeto `BrandIdentity` normalizado

Se a extração não conseguir determinar a cor primária ou o fundo, peça ao usuário que informe manualmente um valor hexadecimal.

### Passo 3: Apresentar resumo ao usuário

Mostre um resumo curto do que foi extraído:

```
Identidade visual extraída:
  Cor primária: #XXXXXX
  Fundo: #XXXXXX (tema <claro|escuro>)
  Tipografia: <Inter | nome da fonte detectada>
  Fontes padrão: <sim|não>
  Layout: <descrição curta dos padrões encontrados, ou "nenhum padrão específico">

Qual nome deseja dar a este template?
```

### Passo 4: Receber o nome do template

O usuário fornece um nome. Gere um **slug** em kebab-case, minúsculo, sem acento (ex.: "Empresa Nova" → `empresa-nova`).

Validação do nome:
- Padrão: `^[a-z][a-z0-9-]{1,48}[a-z0-9]$` (3 a 50 caracteres)
- Não pode ser um nome reservado: `mira-dark`, `light-minimal`, `corporate-blue`, `neon-emerald`, `aula-capitulo`, `pitch-projeto`, `demo-tecnica`

Se já existir `mira-templates/decks/<slug>/` ou `mira-templates/themes/<slug>.css`, avise e peça confirmação para sobrescrever ou outro nome.

### Passo 5: Permitir ajustes (overrides)

Antes de gerar, pergunte:

> "Deseja ajustar algum valor antes de gerar? Pode informar: cor primária, cor de fundo, família tipográfica."

Se o usuário fornecer correções (ex.: "use #FF6600 como primária", "fonte Montserrat"), aplique-as ao `BrandIdentity` antes de prosseguir. Se o usuário confirmar sem alterações, siga direto.

### Passo 6: Gerar tema + template de deck

Com o `BrandIdentity` (possivelmente ajustado) e o nome, execute:

1. **Theme_Generator** (`lib/brand/theme-generator.js`): produz o CSS com todas as 15 variáveis `--mira-*` do contrato Mira
2. **Deck_Generator** (`lib/brand/deck-generator.js`): produz o `index.html` baseado no esqueleto `aula-capitulo`, com tema embutido entre marcadores `@MIRA:THEME`
3. **Template_Registry** (`lib/brand/registry.js`): salva os arquivos nos caminhos corretos dentro de `mira-templates/`

O tema gerado define **todas** as variáveis do contrato:

| Variável | Derivação |
|----------|-----------|
| `--mira-primary` | cor primária `#RRGGBB` |
| `--mira-bg` | cor de fundo `#RRGGBB` |
| `--mira-text` | luminância(fundo) < 0.5 ? `#ffffff` : `#1a1a1a` |
| `--mira-text-soft` | `rgba(Tr, Tg, Tb, 0.70)` |
| `--mira-text-softer` | `rgba(Tr, Tg, Tb, 0.50)` |
| `--mira-card-bg` | `rgba(Tr, Tg, Tb, 0.05)` |
| `--mira-card-border` | `rgba(Tr, Tg, Tb, 0.10)` |
| `--mira-glow-soft` | `rgba(R, G, B, 0.15)` |
| `--mira-glow-strong` | `rgba(R, G, B, 0.25)` |
| `--mira-icon-bg` | `rgba(R, G, B, 0.15)` |
| `--mira-icon-border` | `rgba(R, G, B, 0.30)` |
| `--mira-pill-bg` | `rgba(Tr, Tg, Tb, 0.04)` |
| `--mira-pill-border` | `rgba(Tr, Tg, Tb, 0.08)` |
| `--mira-stage-glow` | `rgba(R, G, B, 0.06)` |
| `--mira-accent-2` | `round(C + (255-C) * 0.35)` por componente, hex |

Se a fonte tipográfica detectada for diferente de "Inter", o tema inclui um override `body { font-family: '<Fonte>', sans-serif; }` e o deck recebe o `<link>` Google Fonts correspondente.

### Passo 7: Exibir resultado e oferecer próximo passo

Mostre o resumo do que foi salvo:

```
Template criado: <nome>
  Tema: mira-templates/themes/<nome>.css
  Deck: mira-templates/decks/<nome>/index.html

Já disponível no /mira-new, junto com os templates existentes.
O tema "<nome>" é o padrão natural deste template (a identidade extraída da marca).
```

Depois ofereça o próximo passo (não execute sem confirmar):

> "Pronto. Quer criar um deck agora com esse template? Posso acionar o /mira-new."

## Regras Inegociáveis

- Escreva **apenas** dentro de `mira-templates/` (`themes/<nome>.css`, `decks/<nome>/index.html` e `decks/<nome>/assets/`). Esta skill cria template, não cria deck.
- O tema gerado define **todas** as 15 variáveis `--mira-*` do contrato; o `base.css` é embutido sem alteração estrutural.
- O `<nome>` do tema e do deck é o **mesmo slug**, para o `/mira-new` casar template e design system automaticamente.
- Nunca gere sem apresentar o resumo e permitir ajustes do usuário.
- Se a extração não encontrar cor primária ou fundo, peça manualmente ao usuário antes de prosseguir.
- Texto visível em português brasileiro com acentuação correta. Proibido travessão (—); use vírgula ou dois-pontos.
- Regra de idioma do projeto: ver `agents/_shared/idioma.md`.
