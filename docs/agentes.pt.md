# Agentes

Todo agente do Mira é uma skill do Claude: invoque com seu `/nome`, ou apenas descreva o que você quer e o agente se aciona sozinho. Esta página descreve cada um. Para como eles se conectam, veja o [Pipeline de agentes](pipeline.md).

## Agentes principais

### `/mira-new`
A porta de entrada de um novo deck. Coleta os requisitos de uma apresentação de forma conversacional (nome do tema, template do deck, tema base, cor principal e referências) e monta a pasta `decks/<tema>/` pronta para o pipeline preencher. **Não** gera slides — prepara o terreno e, ao final, oferece acionar o pipeline.

### `/mira-references`
Cria e organiza a pasta de referências por tema, `references/`, dentro do tema do deck, e inclui automaticamente o material que já estiver lá. É a forma de informar a fonte de conteúdo de uma apresentação específica — sempre por tema, local ao tema. Use antes de criar um slide quando o tema ainda não tiver pasta de referências.

### `/mira-animator`
Cria slides de conceito com animações criativas e **loop interno obrigatório**. A regra-mãe do Mira vive aqui: *nenhuma animação é estática — toda animação entra com coreografia e depois continua em loop interno.* Estampa cada animação com um marcador `<!-- @MIRA:SIZE 3/10 -->` para o `mira-size-animator` escalar depois. Também trata *"transforme essa imagem num slide animado."*

### `/mira-animated-metaphor`
Transforma a animação de um slide (ou de todos) numa **metáfora visual** animada. A partir do conceito do slide, inventa uma analogia concreta do cotidiano e a anima no padrão do `mira-animator` (loop interno obrigatório), substituindo a animação no lugar e mantendo título, subtítulo e pílulas.

### `/mira-img-animator`
Anima uma imagem existente — dá vida a uma figura estática no estilo do deck.

### `/mira-size-animator`
Ajusta a percepção de tamanho das animações de um deck numa escala de 1 a 10, onde **3/10** é o que o `mira-animator` gera por padrão. Lê o marcador `@MIRA:SIZE` de cada animação, reporta o nível atual, e escala a composição (raios, comprimentos, espaçamentos, fontes internas e glow dentro do SVG) para preencher mais ou menos o palco — sem mudar a altura do palco nem quebrar o loop interno. *"Coloca as animações em 6/10," "esse slide em 2/10."*

!!! note "Tamanho e distância"
    No formato vertical (9:16), aumentar os elementos também encolhe as distâncias entre eles. No formato horizontal (16:9), só os elementos aumentam — as distâncias ficam como estão.

### `/mira-image`
Coloca uma imagem que você já tem (um arquivo local ou uma URL) dentro de um slide, num card limpo onde ela fica grande e bem enquadrada. Copia a imagem para a pasta `assets/` do deck e a referencia por caminho relativo, então o deck continua autossuficiente e abre direto de `file://` sem servidor (uma `<img>` comum não sofre o bloqueio de CORS que afeta o `.glb`). Mesmo card limpo do `mira-3d` e do `mira-qrcode`: só o título e a imagem maximizada, sem legenda embaixo. A imagem fica estática (`object-fit: contain` por padrão, então nada é cortado); o loop interno vive na moldura (um brilho respirando), nunca distorcendo a imagem. Para **gerar** uma imagem nova use `mira-visuals`; para **animar** uma imagem existente use `mira-img-animator`; esta aqui só **posiciona** uma imagem pronta.

### `/mira-get-videos`
Baixa os vídeos de fundo do Mira para `mira-templates/videos_header/`. Use quando um cabeçalho parecer vazio, ou logo após instalar se você quiser os fundos em vídeo.

## Agentes úteis

### `/mira-extract`
O extrator de contexto. Lê uma fonte vinculada no `mira.config.json` (pasta de projeto, PDF, LaTeX ou texto) e produz um briefing estruturado que alimenta o planner. Primeiro elo da cadeia.

### `/mira-planner`
Planejador de conteúdo. Analisa o conteúdo de um capítulo (LaTeX, PDF ou texto) e produz um plano de slides detalhado **antes** de qualquer montagem visual — quantos slides, o que cada um cobre, a estrutura — e espera aprovação.

### `/mira-copywriter`
Refina o texto dos slides e especifica imagens, trazendo o texto para a altura de slide (curto, direto, apresentável) em vez da altura de parágrafo.

### `/mira-validator`
Analisa o HTML gerado e valida conformidade visual, estrutural e de assets — um relatório final de qualidade. Rode após uma montagem, ou para diagnosticar um deck existente.

## Visuais e dados

### `/mira-visuals`
Imagens estáticas para slides: painéis, diagramas, gráficos e infográficos — quando um conceito fica melhor como um visual fixo e denso do que como movimento.

### `/mira-chart`
Transforma dados em gráficos com impacto: a partir de um CSV/JSON, de uma imagem de gráfico, ou de um rascunho à mão — e recomenda o melhor tipo de gráfico a partir de uma galeria.

### `/mira-image-template`
Cria um **novo template de deck a partir de imagem(ns)**. Você manda prints de telas/slides e/ou a logomarca, e o agente reconhece todo o design system (cores, fundo, tipografia, cantos, sombras, glassmorphism, glows) e, quando há print, a **disposição dos elementos**, e monta um template completo: o esqueleto `mira-templates/decks/<nome>/index.html` com a identidade embutida, mais o tema `mira-templates/themes/<nome>.css`. Ao final pede um **nome** e salva. O template passa a ser oferecido pelo `/mira-new` junto com os existentes, e seu tema de mesmo nome vira o padrão natural. Print manda no layout; logo manda na paleta.

### `/mira-qrcode`
Insere num slide um **QR code** grande, central e escaneável, gerado a partir de um link ou texto que você fornece. O QR é gerado **localmente** na hora de criar o slide (pacote npm `qrcode`) e embutido como SVG inline, sem dependência de runtime, sem API externa e sem CDN, então o slide funciona até por `file://`. Card limpo, mesmo padrão do `mira-3d`: só o título do slide e o QR grande, sem legenda com o link embaixo. A escaneabilidade manda no estilo: módulos escuros sobre cartão branco, zona de silêncio preservada, laranja só na moldura e no título. O QR fica estático: o loop interno vive na moldura (pulso de brilho, cantos respirando), nunca sobre os módulos.

### `/mira-3d`
Adiciona um **elemento 3D de verdade** ao canvas de um slide (profundidade real, rotação automática contínua e interação de arrastar para girar / dar zoom) num card limpo onde o elemento fica maximizado. Escolhe uma de três camadas a partir do seu pedido: CSS 3D puro (formas simples), Three.js procedural (formas abstratas como esfera de partículas e rede de nós, ou objetos low-poly montados de primitivas), ou glTF (quando você fornece um `.glb`, ou aceita buscar um modelo gratuito e licenciado na web). Herda a regra-mãe: o 3D nunca entra estático, então a rotação automática pausa no arrasto e retoma.

!!! warning "A camada glTF precisa de servidor"
    Um slide que carrega um `.glb` local **não** abre por `file://` (o navegador bloqueia o fetch do modelo), só por HTTP. Nesse caso o agente sobe um servidor local, te entrega o link `http://localhost` e gera um launcher de duplo-clique (`abrir-slide.cmd`) para você apresentar depois. Essa camada precisa do **Node.js** instalado. As camadas CSS 3D e procedural não usam asset local e abrem direto de `file://`, sem servidor.

## Agentes responsivos

### `/mira-squared`
Gera uma versão **quadrada** (1:1, 1080×1080) de um deck a partir do original 16:9, ou cria slides quadrados do zero. Escreve um novo `index-1x1.html` ao lado do original (centralizado por padrão, opcionalmente alinhado à esquerda/direita). Para feed do Instagram, LinkedIn, etc.

### `/mira-vertical`
Gera uma versão **vertical** (9:16). Cada slide de conteúdo fica só com o título principal no topo e uma animação num canvas alto e padronizado abaixo; o título encolhe sozinho para caber em no máximo 2 linhas, e o eixo de cada animação é reformulado para o retrato (fluxo horizontal vira vertical, comparação lado a lado vira empilhada). Escreve `index-9x16.html`. Para Reels, Shorts, TikTok, Stories.

### `/mira-thirds`
Reenquadra um deck na **regra dos terços** sem mudar a proporção. Empurra o conteúdo de cada slide para as colunas 1 e 2 de um grid 3×3 (os dois terços da esquerda) e deixa a coluna da direita livre — para você sobrepor texto, lower-third ou o vídeo do apresentador na edição. Funciona por cima do 16:9, 1:1 ou 9:16. Escreve um arquivo `-thirds`. Lado livre é a direita por padrão; pode ser invertido.

## Transições

### `/mira-transition-dissolve`
Aplica uma transição **dissolve** (crossfade real, estilo Canva/Keynote) à navegação entre slides usando a View Transitions API (same-document), que funciona em `file://` sem servidor. Escreve `index-dissolve.html` ao lado do original. Navegadores sem a API navegam normalmente.
