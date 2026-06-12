# Comparação: /mira-vertical atual vs. versão que fizemos

> Companheiro da `mira-vertical-9x16-spec.md`. Mostra, elemento por elemento, o que muda entre a versão vertical que a skill gera hoje e a versão nova validada em `decks/reversa/index-9x16.html`. Serve para gerar novas versões com o mesmo padrão.

## Visão geral

| | Versão ATUAL (skill /mira-vertical) | Versão NOVA (a que fizemos) |
|---|---|---|
| Quadro | Coluna `100vw/3` × `100vh`, centralizada | Igual |
| Fundo fora da coluna | Fundo do tema (preto) | **#333333** |
| Alinhamento do conteúdo na seção | `justify-center` (centro vertical) | **`flex-start` (topo)** |
| O que aparece no slide de conteúdo | Título + subtítulo + header do card + animação + base de pílulas | **Só título + animação** |
| Palco da animação (`.anim-stage`) | `aspect-ratio: 4/5` (≈0,80) | **`aspect-ratio: 128/203` (≈0,63, mais alto)** |
| viewBox da animação | Retrato 4:5 (ex.: H de 540 vira 1200) | **Esticado em altura: `H = W*203/128`** |
| Eixo da animação | Reflowado para vertical | Igual (mantido) |
| Tamanho do título | Fixo, dividindo espaço com o resto | **Proeminente (7/10) + auto-ajuste a 2 linhas** |
| Ampliar uma animação | Não previsto | **Zoom por slide (X%) no viewBox** |
| Esticar canvas p/ baixo (miolo vazio) | Não previsto | **Ferramenta por slide** |

---

## 1. EXCLUÍDOS (existem na versão atual, somem na nova)

Tudo escopado aos slides de conteúdo (seção que tem `.glass-card`). Capa e encerramento não são afetados.

| # | Elemento | Onde fica (markup) | Como sai |
|---|---|---|---|
| E-1 | **Subtítulo** (frase italic abaixo do título) | `<p>` dentro de `.text-center` | `body > section:has(.glass-card) .text-center > p { display:none }` |
| E-2 | **Header do card**: ícone 40x40 + título bold (ex.: "Legado em produção") + sublinha italic + botão **Replay** | 1º filho `<div>` do `.glass-card` | `body > section .glass-card > div:first-child { display:none }` |
| E-3 | **Base do card**: legenda uppercase (ex.: "O problema clássico") + **grade de pílulas** (2 a 4 pílulas com ícone + texto) | último filho `<div>` do `.glass-card` (o `.border-t`) | `body > section .glass-card > div:last-child { display:none }` |
| E-4 | **Chrome do card**: fundo glass, borda, sombra, `backdrop-filter`, padding | `.glass-card` | zerados, para a animação ir de ponta a ponta |

Resultado: do `.glass-card` sobra só o filho do meio, o `.anim-stage`.

---

## 2. AUMENTADOS (ficam maiores na nova)

| # | Elemento | Atual | Nova | Como |
|---|---|---|---|---|
| A-1 | **Canvas da animação** (`.anim-stage`) | 4:5 (≈0,80) | **128/203 (≈0,63, bem mais alto)** | muda o `aspect-ratio` global do palco; preenche a coluna abaixo do título |
| A-2 | **Área útil da animação** | reduzida pelo padding do card e pelo chrome | **largura cheia da coluna** | card perde padding/borda; palco de ponta a ponta |
| A-3 | **Título** | tamanho fixo, competindo com subtítulo/header | **destaque no topo, ~7/10** (`clamp(35px, 5.6vh, 52px)`), só encolhe se passar de 2 linhas | é o único texto do slide |
| A-4 | **Animação específica (por slide)** | sem esse passo | **zoom de X%** (ex.: Contratos +20%): `newW=W/k`, `newH=H/k`, recentrado, mantendo 128/203 | ferramenta por slide |

> O viewBox esticado (A-1) **não** aumenta a geometria desenhada: o conteúdo renderiza no mesmo tamanho, e o canvas cresce para baixo. Quem aumenta de fato a animação é o zoom (A-4) ou o reflow/size por slide.

---

## 3. REPOSICIONADOS (mudam de lugar)

| # | Elemento | Atual | Nova |
|---|---|---|---|
| R-1 | **Título** | centralizado verticalmente (meio do slide) | **colado no topo** (faixa de título) |
| R-2 | **Alinhamento da seção** | `justify-content: center` | **`justify-content: flex-start`** + padding de topo (`2.2vh`) |
| R-3 | **Conteúdo da animação** | centralizado no palco 4:5 | fica no terço/metade de cima do canvas alto, com a **área nova embaixo**; nos casos de miolo vazio, o conteúdo é **espalhado para baixo** (elemento de cima maior no topo, elemento de baixo no rodapé) |
| R-4 | **Eixo de espalhamento da animação** | horizontal vira vertical (reflow) | **mantido** (já era assim na skill atual) |

---

## 4. ADICIONADOS / NOVAS REGRAS (não existem na atual)

| # | Regra | O que é |
|---|---|---|
| N-1 | **Fundo fora da coluna = #333333** | `html, body { background:#333333 }`; a coluna do slide segue no fundo do tema. Vira moldura/contraste na pré-visualização (some ao recortar a coluna). |
| N-2 | **Auto-ajuste de título** | Script JS mede a altura real do `h2` e reduz a fonte 1px por vez (piso 18px) até caber em **2 linhas**. Roda no `load`, no `fonts.ready` e no `resize`. Pega palavras longas (ex.: "documentação"). |
| N-3 | **Canvas padrão 128/203** | Tamanho fixo do palco para todos os slides (na atual era 4:5), com o `viewBox` casando por `H = W*203/128`. |
| N-4 | **Esticar canvas para baixo (por slide)** | Para miolo vazio: override de `aspect-ratio` no `#st-<slug>` + viewBox casando, sem mexer na geometria. |

---

## 5. O que NÃO mudou (continua igual)

- Quadro generalista (coluna = `100vw/3` × `100vh`), centralizado via flex.
- Reflow do eixo das animações para o retrato (playbook por metáfora).
- Original 16:9 (`index.html`) intacto; saída em `index-9x16.html`.
- Texto, cores, easing, durações, loop interno, generation counter e navegação (barra de progresso, botão de próximo, teclado).
- Capa e encerramento com layout próprio (campos de partículas em tela cheia).

---

## 6. Roteiro de geração de uma nova versão vertical (resumo aplicável)

1. Copiar `index.html` → `index-9x16.html`.
2. Injetar o `<style id="mira-formato-9x16">`: quadro 9:16, **fundo #333333 fora da coluna**, **composição só título + animação** (E-1 a E-4), **seção no topo** (R-1, R-2), **título 7/10** (A-3), **canvas 128/203** (A-1).
3. Injetar o **script de auto-ajuste de título** (N-2).
4. Por animação: **reflow vertical** (R-4) + **esticar o viewBox em altura** `H = W*203/128` (N-3).
5. Caso a caso: **esticar canvas para baixo** (N-4) e **ampliar X%** (A-4) onde fizer sentido.
6. Reportar e revisar com a borda de debug (opcional) ligada.
