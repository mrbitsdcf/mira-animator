# Gerador de Template de Marca

Gere temas e templates de deck compatíveis com o Mira a partir de arquivos de identidade visual corporativa. Em vez de criar manualmente variáveis CSS e esqueletos de deck, forneça os assets da sua marca e o sistema extrai cores, tipografia, logos e padrões de layout para produzir um template registrado pronto para o `mira-new`.

## Uso via CLI

```bash
npx mira-animator brand <nome-do-template> --source=<caminho-ou-url>
```

| Argumento | Descrição |
|---|---|
| `<nome-do-template>` | Slug em kebab-case para o template (ex.: `minha-empresa`). |
| `--source=<caminho>` | Caminho local de arquivo ou URL com os assets da marca. |

### Exemplo

```bash
npx mira-animator brand acme-corp --source=./brand/style-guide.css
```

Ao completar com sucesso, o comando imprime:

```
✓ Template gerado com sucesso!
  Tema:    mira-templates/themes/acme-corp.css
  Deck:    mira-templates/decks/acme-corp/index.html
  Cor:     #E63946
  Modo:    dark
```

## Formatos Suportados

| Formato | Extensões | Tamanho Máximo |
|---|---|---|
| PowerPoint | `.ppt`, `.pptx` | 100 MB |
| PDF | `.pdf` | 100 MB |
| CSS | `.css` | 10 MB |
| HTML | `.html` | 10 MB |
| CSV | `.csv` | 10 MB |
| SVG | `.svg` | 10 MB |
| Imagem | `.png`, `.jpg`, `.webp` | 50 MB |
| ZIP | `.zip` | 200 MB (máx. 50 arquivos, sem ZIPs aninhados) |
| URL | `http://` ou `https://` | Timeout de 30s |

## Regras de Nome do Template

Nomes devem seguir o padrão `^[a-z][a-z0-9-]{1,48}[a-z0-9]$`:

- 3 a 50 caracteres
- Começa com letra minúscula
- Termina com letra ou dígito
- Apenas alfanuméricos minúsculos e hífens

**Nomes reservados** (não podem ser usados): `mira-dark`, `light-minimal`, `corporate-blue`, `neon-emerald`, `aula-capitulo`, `pitch-projeto`, `demo-tecnica`.

## Estrutura de Saída

```
mira-templates/
├── themes/
│   └── <nome>.css          # Tema CSS com 15 variáveis --mira-*
└── decks/
    └── <nome>/
        ├── index.html      # Esqueleto do template de deck
        └── assets/         # Logos, templates de cards
```

O tema gerado define todas as 15 propriedades CSS `--mira-*`. O template de deck é baseado no `aula-capitulo` e inclui referências CDN (Tailwind, AOS, Lucide, D3) além do CSS do tema embutido entre os marcadores `/* @MIRA:THEME:START */` e `/* @MIRA:THEME:END */`.

## Exemplo Completo (Ponta a Ponta)

Partindo de um arquivo CSS de marca:

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

Execute:

```bash
npx mira-animator brand my-startup --source=./brand/colors.css
```

Isso extrai `#2563eb` como cor primária, `#1e293b` como fundo (modo escuro), e `Poppins` como fonte. A saída:

- `mira-templates/themes/my-startup.css` — tema Mira completo
- `mira-templates/decks/my-startup/index.html` — template de deck com fonte Poppins carregada via Google Fonts

Agora crie um deck a partir dele:

```text
/mira-new crie uma apresentação chamada 'lancamento-produto' com o template my-startup
```

## Uso como Skill do Agente

A funcionalidade também está disponível como skill do agente para uso conversacional.

**Frases de ativação:**

- `/mira-brand-template`
- "gerar template de marca"
- "criar template a partir da marca"
- "extrair identidade visual"
- "template de marca"
- "identidade visual"

**Fluxo de trabalho:**

1. Forneça um arquivo fonte (anexe ou cole um caminho/URL)
2. O agente extrai cores, fontes e layouts
3. Um resumo é apresentado (cor primária, fundo, modo, fontes)
4. Você pode alterar qualquer valor antes de confirmar
5. Forneça um nome para o template
6. Tema e deck são gerados e registrados

O agente escreve a saída apenas dentro de `mira-templates/`, seguindo a mesma regra de escopo das outras skills do Mira.

## Variáveis do Tema

O tema gerado define todas as 15 variáveis do contrato Mira:

| Variável | Derivação |
|---|---|
| `--mira-primary` | Cor primária extraída |
| `--mira-bg` | Cor de fundo extraída |
| `--mira-text` | `#ffffff` (fundo escuro) ou `#1a1a1a` (fundo claro) |
| `--mira-text-soft` | Cor do texto com 70% de opacidade |
| `--mira-text-softer` | Cor do texto com 50% de opacidade |
| `--mira-card-bg` | Cor do texto com 5% de opacidade |
| `--mira-card-border` | Cor do texto com 10% de opacidade |
| `--mira-glow-soft` | Cor primária com 15% de opacidade |
| `--mira-glow-strong` | Cor primária com 25% de opacidade |
| `--mira-icon-bg` | Cor primária com 15% de opacidade |
| `--mira-icon-border` | Cor primária com 30% de opacidade |
| `--mira-pill-bg` | Cor do texto com 4% de opacidade |
| `--mira-pill-border` | Cor do texto com 8% de opacidade |
| `--mira-stage-glow` | Cor primária com 6% de opacidade |
| `--mira-accent-2` | Cor primária clareada em 35% |

## Tratamento de Erros

| Situação | Comportamento |
|---|---|
| Arquivo não encontrado | Erro com o caminho exato |
| Formato não suportado | Erro listando todos os formatos aceitos |
| Arquivo muito grande | Erro indicando o tamanho máximo do formato |
| URL inacessível | Erro com URL e motivo da falha |
| Nome reservado | Erro listando todos os nomes reservados |
| Template já existe | Pede confirmação antes de sobrescrever |
| Nenhuma cor encontrada | Pede ao usuário para informar manualmente |
