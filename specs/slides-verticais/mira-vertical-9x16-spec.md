# Spec: Skill /mira-vertical, formato vertical "título + animação em canvas alto"

**Versão:** 1.0
**Status:** Em Revisão
**Autor:** sandeco (via sessão Claude Code)
**Data:** 2026-06-12
**Reviewers:** sessão responsável por atualizar a skill /mira-vertical

---

## 1. Resumo

Atualizar a skill `/mira-vertical` para que ela gere uma versão vertical (9:16) de um deck Mira em que **cada slide de conteúdo é composto só pelo título principal no topo e pela animação ocupando um canvas alto e padronizado imediatamente abaixo**. Subtítulo, header do card e a base (legenda + pílulas) saem; o título encolhe sozinho até caber em 2 linhas; e o canvas de cada animação tem altura padrão (proporção 128/203), com o `viewBox` esticado em altura para casar, sem mexer na geometria do conteúdo. Tudo isso foi validado no deck `decks/reversa/index-9x16.html` e esta spec é a fonte da verdade para reproduzir o mesmo resultado.

---

## 2. Contexto e Motivação

**Problema:**
A versão anterior da `/mira-vertical` só reformulava a geometria das animações para o retrato, mas mantinha a composição cheia do slide 16:9 (título, subtítulo, header do card com ícone/label/Replay, e uma base com legenda + pílulas). No quadro vertical estreito e alto isso resultava em: conteúdo centralizado verticalmente (muita área vaga em cima e embaixo), título competindo com a animação, títulos longos quebrando o slide em 3 ou 4 linhas, e animações pequenas no meio de um palco que não preenchia a coluna. O objetivo do vídeo vertical (Reels, Shorts, TikTok) é a animação dominar a tela, com um título curto de apoio.

**Evidências:**
Iteração visual conduzida no deck `decks/reversa/index-9x16.html`. Casos concretos observados e corrigidos:
- Título "Contratos operacionais, não documentação para ler" quebrava em 4 linhas e empurrava o canvas.
- Animações como o relógio (slide "Problema") ocupavam ~45% da largura, com sobra preta em cima e embaixo.
- Slides de "miolo vazio" (ex.: "Uma spec é uma planta": planta no topo, sistema embaixo) tinham um vão grande no meio e área preta abaixo do palco.

**Por que agora:**
O resultado final foi aprovado pelo sandeco no deck de referência. Outra sessão vai aplicar essas regras na skill `/mira-vertical` para que todo deck vertical gerado já saia nesse padrão. Esta spec congela as regras exatas.

---

## 3. Goals (Objetivos)

- [ ] G-01: A skill `/mira-vertical` gera `index-9x16.html` em que todo slide de conteúdo mostra **apenas** o título principal (topo) + a animação (canvas alto), sem subtítulo, header do card ou base de pílulas.
- [ ] G-02: Nenhum título quebra o slide: todo título cabe em no máximo 2 linhas, encolhendo automaticamente quando necessário (inclusive com palavras longas).
- [ ] G-03: Todas as animações usam um canvas de proporção padrão alta (128/203), preenchendo a coluna abaixo do título, com o `viewBox` casando (sem letterbox e sem distorção).
- [ ] G-04: O arquivo original 16:9 (`index.html`) permanece intacto; toda mudança vive em `index-9x16.html`.
- [ ] G-05: A skill oferece ferramentas por slide para (a) esticar o canvas para baixo em casos de miolo vazio e (b) ampliar uma animação específica em X%, sem mexer na geometria do conteúdo.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---|---|---|---|
| Slides de conteúdo com título + animação apenas | 0% (mostra chrome completo) | 100% | na atualização da skill |
| Títulos que quebram além de 2 linhas | ocorre nos longos | 0 | na atualização da skill |
| Animações no canvas padrão 128/203 | 0% | 100% | na atualização da skill |
| Reprodução fiel do deck de referência | n/a | idêntico ao `decks/reversa/index-9x16.html` aprovado | na atualização da skill |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: Não alterar o deck original 16:9 (`index.html`) nem a skill `mira-animator` ou os temas. A `/mira-vertical` só lê o 16:9 e escreve o `index-9x16.html`.
- NG-02: Não reescrever a coreografia/lógica das animações. Texto, cores, easing, durações, loop interno e o generation counter continuam intocados. Só geometria, viewBox, posição de título e tamanho de canvas mudam.
- NG-03: Não automatizar 100% o preenchimento do "miolo vazio". A skill aplica o canvas alto padrão em todos os slides; o ajuste fino de espalhar o conteúdo (esticar para baixo) e a ampliação por slide são ferramentas acionadas caso a caso, não um passo obrigatório do pipeline.
- NG-04: Não incluir o fundo azul de debug do canvas no resultado final. Ele é só um auxílio de desenvolvimento, opcional e removível.
- NG-05: Não tratar a capa e o slide de encerramento como slides de conteúdo (eles não têm `.glass-card`; ficam fora das regras de composição).

---

## 5. Usuários e Personas

**Usuário primário:** sandeco e operadores do Mira que rodam `/mira-vertical` para gerar vídeos verticais. Nível técnico alto, mas esperam que o comando entregue o padrão pronto.
**Usuário secundário:** a sessão/dev que vai editar a skill `/mira-vertical` a partir desta spec.

**Jornada atual (sem a feature):**
1. Roda `/mira-vertical`, recebe `index-9x16.html` com o slide cheio (título, subtítulo, header, pílulas) e a animação pequena no meio.
2. Tem que ajustar manualmente cada slide para o vídeo ficar bom.

**Jornada futura (com a feature):**
1. Roda `/mira-vertical`.
2. Recebe `index-9x16.html` já no padrão: título no topo (sempre 2 linhas no máximo) + animação grande no canvas alto, margens fora da coluna em #333333.
3. Opcionalmente, pede por slide: "estica o canvas para baixo nesse" ou "aumenta essa animação em X%".

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | A skill deve copiar `index.html` para `index-9x16.html` na mesma pasta e nunca editar o original. | Must | `index.html` tem hash idêntico antes e depois; existe `index-9x16.html` ao lado. |
| RF-02 | A skill deve injetar, antes de `</head>`, um bloco `<style id="mira-formato-9x16">` que define o quadro: `--fmt-w: calc(100vw / 3)`, `--fmt-h: 100vh`; `body` em flex column com `align-items: center`; `body > section` com `width: var(--fmt-w)`, `height: var(--fmt-h)`, `overflow: hidden` e `background: var(--mira-bg)`. | Must | Cada `body > section` ocupa 1/3 da largura da tela por 100vh, centralizado; a coluna do slide fica no fundo do tema. |
| RF-03 | A área FORA da coluna (html e body background) deve ser `#333333`. | Must | As margens laterais renderizam cinza #333333; a coluna do slide permanece escura. |
| RF-04 | Em cada slide de conteúdo (seção que contém `.glass-card`), a skill deve exibir SOMENTE o título principal (h2) e o palco da animação (`.anim-stage`). | Must | Subtítulo, header do card e base não aparecem (ver RF-05 a RF-07). |
| RF-05 | A skill deve ocultar o subtítulo: o `<p>` dentro de `.text-center` dos slides de conteúdo. | Must | `body > section:has(.glass-card) .text-center > p { display: none }` aplicado; subtítulo invisível nos slides de conteúdo, e capa/encerramento não afetados. |
| RF-06 | A skill deve ocultar o header do card (primeiro filho de `.glass-card`: ícone + label + botão Replay) e a base do card (último filho: legenda + grade de pílulas). | Must | `body > section .glass-card > div:first-child, body > section .glass-card > div:last-child { display: none }`; só o `.anim-stage` (filho do meio) fica visível. |
| RF-07 | A skill deve remover o chrome do card: `.glass-card` sem background, border, box-shadow, backdrop-filter e padding, para a animação ir de ponta a ponta. | Must | `.glass-card` renderiza transparente, sem borda/sombra; o `.anim-stage` ocupa a largura cheia da coluna. |
| RF-08 | A seção do slide de conteúdo deve colar o conteúdo no TOPO (não centralizar verticalmente). | Must | `body > section:has(.glass-card) { justify-content: flex-start; padding: 2.2vh 6px 1.4vh 6px }`; o título fica no topo e a animação imediatamente abaixo. |
| RF-09 | O título deve ter tamanho proeminente base de ~7/10 da escala mira-size: `clamp(35px, 5.6vh, 52px)` em `body > section h2`. | Must | Em títulos curtos, o h2 renderiza nesse tamanho. |
| RF-10 | A skill deve injetar uma regra JS de auto-ajuste de título: para cada `body > section h2`, mede a altura renderizada e, enquanto passar de 2 linhas, reduz a `font-size` em 1px por vez (piso 18px) até caber em 2 linhas. Executa no `load`, no `document.fonts.ready` e no `resize` (debounced). | Must | "Contratos operacionais, não documentação para ler" renderiza em exatamente 2 linhas; títulos curtos permanecem no tamanho cheio; comportamento correto após resize. |
| RF-11 | O canvas padrão de toda animação deve ser alto: `.anim-stage { height: auto; aspect-ratio: 128 / 203 }`. | Must | Todo `.anim-stage` de conteúdo tem proporção 128/203 (≈0,6305) e preenche a coluna abaixo do título. |
| RF-12 | Para cada animação, a skill deve esticar a ALTURA do `viewBox` para casar com 128/203, mantendo `minX`, `minY` e a largura `W`, com nova altura `H = W * 203/128`. A geometria desenhada (coordenadas dos elementos) NÃO muda. | Must | Cada `<svg id="sv-...">` tem `viewBox` com `H = W * 203/128` (mesmo aspecto do palco); `preserveAspectRatio="xMidYMid meet"`; sem letterbox; o conteúdo renderiza no mesmo tamanho/posição de antes, com a área nova do canvas embaixo. |
| RF-13 | A skill deve continuar fazendo o reflow de cada animação para o retrato (viewBox portrait, conteúdo centrado em (cx, cy) = (640, 800) na base, e o eixo dominante girado: fluxo horizontal vira vertical, elipse larga vira alta, comparação lado a lado vira empilhada), conforme o playbook por metáfora já existente na skill. | Must | Nenhuma animação fica como faixa fina horizontal; o eixo de espalhamento está vertical; o loop interno roda. |
| RF-14 | A skill deve oferecer uma ferramenta "esticar o canvas para baixo" por slide, para casos de miolo vazio: aumentar a altura do palco daquele slide (override `aspect-ratio` no `#st-<slug>`) e do `viewBox` casando, sem mexer na geometria; e, quando pedido, espalhar o conteúdo (elemento de cima maior no topo, elemento de baixo maior no rodapé). | Should | Em um slide de duas pontas (ex.: planta + sistema), o canvas cresce para baixo em incrementos de ~N px e os elementos podem ser reposicionados/aumentados para ocupar a área. |
| RF-15 | A skill deve oferecer uma ferramenta "ampliar animação em X%" por slide: aplica zoom de fator `k = 1 + X/100` no `viewBox` daquele slide (`newW = W/k`, `newH = H/k`), recentrado no centro do conteúdo, mantendo o aspecto 128/203. A geometria do conteúdo não muda; ele só renderiza X% maior. | Should | Pedir "aumente 20%" gera `viewBox` com W e H divididos por 1,2 e centro preservado; a animação renderiza 20% maior sem distorcer nem vazar. |
| RF-16 | Tudo que a skill cria/edita deve ficar dentro do `index-9x16.html`; texto visível em português brasileiro correto; proibido travessão (—). | Must | Revisão do arquivo não acha travessão; acentuação correta. |

### 6.2 Fluxo Principal (Happy Path)

1. O usuário roda `/mira-vertical` apontando para um deck (`decks/<deck>/index.html`).
2. A skill copia `index.html` para `index-9x16.html` na mesma pasta (RF-01).
3. A skill injeta o bloco `<style id="mira-formato-9x16">` com: quadro 9:16 generalista (RF-02), fundo #333333 fora da coluna (RF-03), composição "só título + animação" (RF-04 a RF-08), título base 7/10 (RF-09) e canvas padrão 128/203 (RF-11).
4. A skill injeta o script de auto-ajuste de título (RF-10) no bloco de scripts.
5. Para cada animação no JS: aplica o reflow para retrato (RF-13) e estica a altura do `viewBox` para casar com 128/203 (RF-12).
6. A skill reporta o caminho `index-9x16.html` e o que foi reformulado por slide.
7. Resultado: deck vertical com título no topo (sempre 2 linhas no máximo) e animação grande no canvas alto, margens em #333333.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Esticar canvas para baixo (miolo vazio):**
1. Usuário aponta um slide de miolo vazio (ex.: "Uma spec é uma planta").
2. A skill aumenta a altura do palco daquele slide (override de `aspect-ratio` em `#st-<slug>`) e o `viewBox` casando (RF-14).
3. Opcionalmente, espalha o conteúdo: elemento de cima maior no topo, elemento de baixo maior no rodapé.

**Fluxo Alternativo B — Ampliar uma animação:**
1. Usuário pede "aumente a animação do slide X em 20%".
2. A skill aplica zoom de 1,2x no `viewBox` daquele slide, recentrado, mantendo 128/203 (RF-15).

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Responsividade ("generalista para a tela") | Quadro escala com a tela (vw/vh), não pixels fixos | Numa tela 1080p a coluna dá 640x1080; em outras telas, escala junto. |
| RNF-02 | Não distorção das animações | `viewBox` aspect == stage aspect (128/203) sempre | `preserveAspectRatio="xMidYMid meet"`; nunca usar valores que gerem letterbox/distorção. |
| RNF-03 | Robustez do auto-ajuste de título | Mede render real; piso 18px; guarda de iteração (máx ~90 passos) | Funciona com qualquer título, qualquer fonte, qualquer largura de coluna; reexecuta no resize. |
| RNF-04 | Preservação de comportamento | Loop interno, gatilhos (IntersectionObserver), generation counter e navegação seguem funcionando | Só geometria/viewBox/composição mudam. |
| RNF-05 | Idioma e estilo | pt-br correto, sem travessão | Segue `agents/_shared/idioma.md`. |

---

## 8. Design e Interface

**Componentes afetados:** `index-9x16.html` (cópia do deck): bloco `<style id="mira-formato-9x16">` no `<head>`; o JS de cada animação (viewBox + reflow); um novo IIFE de auto-ajuste de título no bloco de scripts.

**Comportamento esperado:** ao abrir o `index-9x16.html` em tela cheia, cada slide de conteúdo mostra o título no topo (1 ou 2 linhas) e a animação grande imediatamente abaixo, ocupando a coluna central (1/3 da largura da tela), com cinza #333333 nas laterais. Capa e encerramento mantêm seu layout próprio.

**Trechos canônicos (a skill deve gerar exatamente isto):**

CSS injetado (`<style id="mira-formato-9x16">`), parte nova/alterada relevante:

```css
:root { --fmt-w: calc(100vw / 3); --fmt-h: 100vh; }  /* 9:16 cravado: calc(100vh * 9 / 16) */
html { background: #333333; }
body { background: #333333; display: flex; flex-direction: column; align-items: center; }
body > section {
  width: var(--fmt-w) !important; height: var(--fmt-h) !important; min-height: var(--fmt-h) !important;
  overflow: hidden; background: var(--mira-bg, #000) !important;
}
/* Canvas padrao alto de TODOS os slides */
.anim-stage { height: auto !important; aspect-ratio: 128 / 203 !important; }
/* Titulo proeminente (base 7/10) */
body > section h2 { font-size: clamp(35px, 5.6vh, 52px) !important; line-height: 1.1 !important; }
/* Composicao: so titulo + animacao (escopo: slides com .glass-card) */
body > section:has(.glass-card) { justify-content: flex-start !important; padding: 2.2vh 6px 1.4vh 6px !important; }
body > section:has(.glass-card) .text-center { margin-bottom: 10px !important; padding: 0 10px !important; }
body > section:has(.glass-card) .text-center > p { display: none !important; }            /* subtitulo */
body > section .glass-card { background: none !important; border: none !important; box-shadow: none !important; backdrop-filter: none !important; padding: 0 !important; }
body > section .glass-card > div:first-child,                                              /* header do card */
body > section .glass-card > div:last-child { display: none !important; }                  /* base (pilulas) */
```

JS injetado (regra de auto-ajuste de título, IIFE no bloco de scripts):

```js
(function () {
  const MAX_LINES = 2, MIN_FONT = 18;
  function fitTitles() {
    document.querySelectorAll('body > section h2').forEach(h2 => {
      h2.style.removeProperty('font-size');
      let font = parseFloat(getComputedStyle(h2).fontSize), guard = 0;
      while (h2.scrollHeight > parseFloat(getComputedStyle(h2).lineHeight) * MAX_LINES + 2 && font > MIN_FONT && guard < 90) {
        font -= 1; h2.style.setProperty('font-size', font + 'px', 'important'); guard++;
      }
    });
  }
  window.addEventListener('load', fitTitles);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitles);
  window.addEventListener('resize', () => { clearTimeout(window.__fitT); window.__fitT = setTimeout(fitTitles, 150); });
})();
```

Regra do viewBox padrão (por animação): manter `minX`, `minY`, `W`; setar `H = W * 203 / 128`.
Ex.: viewBox `140 175 1000 1250` vira `140 175 1000 1585.94`.

Zoom por slide (ampliar X%): `k = 1 + X/100`; `newW = W/k`, `newH = H/k`; recentrar no centro do conteúdo (default 640, 800): `newMinX = cx - newW/2`, `newMinY = cy - newH/2`. Mantém o aspecto 128/203.

**Estados da UI:**
- Estado padrão: título no topo + animação grande no canvas alto.
- Título curto: fonte cheia (até 52px). Título longo: fonte reduzida o suficiente para 2 linhas.
- Capa/encerramento: layout próprio (campos de partículas em tela cheia), fora das regras de composição.

---

## 9. Modelo de Dados

> Não aplicável. A feature gera um arquivo HTML estático (`index-9x16.html`); não há dados persistidos nem migrações.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| Deck 16:9 de origem (`index.html` do Mira, com `.glass-card`, `.anim-stage`, `<svg id="sv-...">`) | Obrigatória | Sem ele não há o que converter; a skill deve abortar com mensagem clara. |
| CSS `:has()` no navegador de visualização/gravação | Obrigatória | Necessário para escopar a composição aos slides de conteúdo; navegadores Chromium modernos (Edge/Chrome) suportam. |
| `document.fonts.ready` (Font Loading API) | Opcional | Sem ela, o auto-ajuste roda no `load`/`resize`; com ela, reajusta após a fonte carregar. |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Título muito longo / palavra grande | Ex.: "Contratos operacionais, não documentação para ler" | O auto-ajuste reduz a fonte até caber em 2 linhas (mede o render, então pega palavra longa como "documentação"). |
| EC-02: Título cabe em 1 linha | Título curto | Permanece no tamanho cheio (até 52px), sem encolher. |
| EC-03: Animação radial (relógio, radar) num canvas alto | Conteúdo circular | Fica centrado e preenche a largura; sobra vertical é inerente ao formato redondo. A ampliação por slide (RF-15) pode aumentar até o limite da largura. |
| EC-04: Animação de fluxo vertical (pipeline) já preenche a altura | Conteúdo alto | NÃO aplicar zoom global que corte as pontas. O canvas alto a acomoda; ampliar só corta. Tratar caso a caso. |
| EC-05: Slide de miolo vazio (duas pontas) | Ex.: planta (topo) + sistema (base) | Esticar o canvas para baixo (RF-14) e espalhar os elementos; o token/scan cruzando o meio é o respiro. |
| EC-06: Slide sem `.glass-card` (capa, encerramento, slide-régua) | Seção fora do padrão de conteúdo | As regras com `:has(.glass-card)` não se aplicam; layout próprio preservado. |
| EC-07: Canvas alto excede a altura da coluna numa tela mais larga | Coluna larga (tela widescreen) | O excedente é cortado pelo `overflow: hidden` da seção; o corte cai na área vazia inferior do canvas, não no conteúdo. Ajuste fino por slide se necessário. |
| EC-08: `flip cards` (slide tipo exemplos) | Stage é HTML, não SVG com viewBox | Não tem `viewBox` para esticar; manter o empilhamento em coluna; o canvas 128/203 vale como caixa. |
| EC-09: Deck de origem ausente ou malformado | `index.html` não existe, ou não tem `.glass-card` / `.anim-stage` / `<svg id="sv-...">` | A skill deve abortar com mensagem clara informando o que faltou, sem criar `index-9x16.html` parcial. |
| EC-10: Navegador de visualização sem suporte a `:has()` | Engine antiga | A composição "só título + animação" depende de `:has(.glass-card)`. A skill deve avisar que a gravação precisa de um Chromium moderno (Edge/Chrome atual). |
| EC-11: Múltiplos decks e o usuário não disse qual | Mais de uma pasta em `decks/` | A skill deve perguntar qual deck antes de gerar. |

---

## 12. Segurança e Privacidade

> Não aplicável em termos de dados. A skill só gera HTML estático local. Observação operacional: nunca sobrescrever o `index.html` original (RF-01) e nunca tocar nas fontes vinculadas (regra do Mira).

---

## 13. Plano de Rollout

- **Estratégia:** atualizar o `SKILL.md` da `/mira-vertical` (e referências) com estas regras; passa a valer para todo novo deck vertical gerado. Decks já gerados podem ser regerados.
- **Como reverter (rollback):** a skill é versionada; reverter o `SKILL.md` para a versão anterior. Os `index-9x16.html` já gerados não são afetados (são cópias).
- **Monitoramento pós-deploy:** gerar a versão vertical de 1 ou 2 decks e conferir: título sempre <= 2 linhas, canvas 128/203 em todos os slides, margens #333333, original intacto, sem travessão.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | A proporção 128/203 deve ser fixa, ou parametrizável por deck/tela? Hoje é fixa (validada no deck de referência). | Médio | sandeco | antes de fechar a skill |
| OQ-02 | O reposicionamento do conteúdo nos casos de miolo vazio (RF-14) deve ser manual (caso a caso) ou a skill deve tentar heurística automática por metáfora? Hoje é caso a caso. | Médio | sandeco | versão futura |
| OQ-03 | Manter um modo de debug (pintar o fundo do canvas) acessível por flag na skill? Foi útil na iteração. | Baixo | sandeco | opcional |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Canvas padrão alto 128/203 com `viewBox` esticado em altura (sem mexer na geometria) | (a) Manter 4:5; (b) usar `slice` (corta laterais); (c) re-reflow completo por slide | Casar `viewBox` ao palco evita letterbox/distorção; esticar só a altura preserva a geometria e o tamanho/posição do conteúdo, deixando o canvas crescer para baixo. |
| Auto-ajuste de título medindo o render (encolher até 2 linhas) | (a) Tiers por contagem de caracteres; (b) limitar só por nº de palavras | Medir o render captura palavras longas e quebras reais; é robusto a qualquer título e largura. A regra de "máx 6 palavras" vira só boa prática de conteúdo. |
| Ocultar subtítulo/header/base via CSS escopado com `:has(.glass-card)` | Remover os elementos do HTML em todos os slides | CSS é cirúrgico, reversível e não toca o markup; o escopo `:has(.glass-card)` preserva capa/encerramento/slide-régua. |
| Zoom por slide no `viewBox` para ampliar X% | Reescalar coordenadas da animação no JS | Mexer só no `viewBox` (em torno do centro, mantendo o aspecto) amplia sem editar a geometria nem arriscar quebrar o loop. |
| NÃO aplicar zoom global em todas as animações | Um fator único para "maximizar tudo" | Animações de fluxo já preenchem a altura; zoom global corta as pontas (ex.: pipeline perdeu fases 1 e 5). Maximização é por slide. |

---

## Apêndice

### Referências
- Deck de referência aprovado: `decks/reversa/index-9x16.html`.
- Skill atual: `.claude/skills/mira-vertical/SKILL.md` (playbook de reflow por metáfora a ser mantido).
- Convenção de idioma: `agents/_shared/idioma.md`.

### Histórico de Revisões
| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 1.0 | 2026-06-12 | sandeco (via sessão Claude Code) | Criação inicial, congelando as regras validadas no deck de referência. |

### Relatório de Avaliação (spec_scorer)

```
SCORE TOTAL: 92.0/100  —  Excelente, Pronta para implementação

Dimensão        Score   Peso   Contribuição
Completude      100%    30%    30.0
Testabilidade   100%    25%    25.0
Clareza          70%    20%    14.0
Escopo          100%    15%    15.0
Edge Cases       80%    10%     8.0
```

Avaliado em 2026-06-12 com `scripts/spec_scorer.py` da skill sdd-spec.
