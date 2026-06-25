# Guia de Testes Manuais — mira-brand-template

Este documento descreve como testar manualmente a feature `mira-brand-template`, incluindo instalação em workspace limpo, testes automatizados e verificação manual de cada fluxo.

---

## 1. Pré-requisitos

- **Node.js** >= 18.20.2 (verificar com `node --version`)
- **npm** >= 9.x (verificar com `npm --version`)
- **Git** instalado e configurado
- Terminal com suporte UTF-8

---

## 2. Instalação em Workspace Limpo

```bash
# 1. Clonar o repositório
git clone https://github.com/sandeco/mira-animator.git
cd mira-animator

# 2. Alternar para a branch da feature
git checkout feature/mira-brand-template

# 3. Instalar dependências
npm install

# 4. Verificar que o CLI está funcional
npx mira-animator --help
```

Confirme que o comando `brand` aparece na lista de comandos disponíveis.

### 2.1 Preparando um Workspace de Teste

Os comandos `brand`, `new`, `link` e outros esperam que o Mira esteja "instalado"
no diretório de trabalho (presença de `mira.config.json`). Para testar localmente
a versão em desenvolvimento:

```bash
# Criar uma pasta de teste separada
mkdir ~/mira-teste && cd ~/mira-teste

# Instalar o Mira no workspace de teste usando o código local (não o npm registry)
node ~/caminho-para/mira-animator/bin/mira.js install

# Agora testar os comandos usando o código fonte local
node ~/caminho-para/mira-animator/bin/mira.js brand meu-tema --source=./arquivo.css
```

**Alternativa com alias (recomendada para sessões de teste prolongadas):**

```bash
# Criar alias que aponta para o código local
alias mira-animator='node ~/caminho-para/mira-animator/bin/mira.js'

# A partir daqui, o uso é idêntico à documentação
mira-animator install
mira-animator brand meu-tema --source=./arquivo.css
```

> **Nota:** Substitua `~/caminho-para/mira-animator` pelo caminho real do clone.

---

## 3. Executando Testes Automatizados

```bash
# Executar toda a suíte de testes
npm test

# Executar apenas testes unitários
npx vitest --run tests/unit/

# Executar apenas testes de propriedade (property-based)
npx vitest --run tests/property/

# Executar apenas testes de integração
npx vitest --run tests/integration/

# Modo watch (desenvolvimento)
npm run test:watch
```

Todos os testes devem passar com 0 falhas.

---

## 4. Testes Manuais

### 4.1 Testando com arquivo CSS como fonte

Crie um arquivo de teste `teste-brand.css`:

```css
:root {
  --cor-primaria: #E63946;
  --cor-fundo: #1D3557;
}

body {
  font-family: 'Montserrat', sans-serif;
  background-color: #1D3557;
  color: #F1FAEE;
}

h1, h2, h3 {
  color: #E63946;
}

.card {
  background: #457B9D;
  border: 1px solid #A8DADC;
}
```

Execute o comando:

```bash
npx mira-animator brand meu-tema-css --source=./teste-brand.css
```

**Resultado esperado:**
- Mensagem de sucesso com resumo exibindo:
  - Caminho do tema: `mira-templates/themes/meu-tema-css.css`
  - Caminho do deck: `mira-templates/decks/meu-tema-css/index.html`
  - Cor primária detectada (ex: `#E63946`)
  - Modo do tema: `dark` (pois `#1D3557` tem luminância < 0.5)

---

### 4.2 Testando com URL de website como fonte

```bash
npx mira-animator brand marca-web --source=https://example.com
```

**Resultado esperado:**
- O sistema busca a URL (timeout de 30s)
- Extrai cores e fontes da página
- Gera tema e deck template
- Exibe resumo com cores detectadas

**Caso de erro (URL inacessível):**

```bash
npx mira-animator brand marca-web --source=https://dominio-inexistente-xyz.com
```

Deve exibir mensagem de erro indicando falha na conexão, incluindo a URL tentada.

---

### 4.3 Testando com arquivo PPTX como fonte

Se tiver um arquivo PowerPoint disponível:

```bash
npx mira-animator brand marca-pptx --source=./apresentacao.pptx
```

**Resultado esperado:**
- Extração das cores do theme XML do PowerPoint
- Detecção de fontes do tema da apresentação
- Captura de layouts de slides (se aplicável)
- Geração de tema e deck template com as cores extraídas

---

### 4.4 Verificando Arquivos de Saída em `mira-templates/`

Após executar qualquer um dos testes acima, verifique a estrutura de saída:

```bash
# Verificar que o diretório foi criado
ls -la mira-templates/themes/
ls -la mira-templates/decks/

# Verificar o arquivo do tema
cat mira-templates/themes/meu-tema-css.css

# Verificar o deck template
cat mira-templates/decks/meu-tema-css/index.html
```

---

### 4.5 Verificando que o Tema Possui Todas as 15 Variáveis `--mira-*`

O tema gerado DEVE conter exatamente estas 15 variáveis CSS no bloco `:root`:

```bash
# Contar variáveis --mira-* no tema gerado
grep -c '\-\-mira-' mira-templates/themes/meu-tema-css.css
```

O resultado deve ser **15**. As variáveis obrigatórias são:

1. `--mira-primary`
2. `--mira-bg`
3. `--mira-text`
4. `--mira-text-soft`
5. `--mira-text-softer`
6. `--mira-card-bg`
7. `--mira-card-border`
8. `--mira-glow-soft`
9. `--mira-glow-strong`
10. `--mira-icon-bg`
11. `--mira-icon-border`
12. `--mira-pill-bg`
13. `--mira-pill-border`
14. `--mira-stage-glow`
15. `--mira-accent-2`

Verifique cada uma individualmente:

```bash
grep -- '--mira-primary' mira-templates/themes/meu-tema-css.css
grep -- '--mira-bg' mira-templates/themes/meu-tema-css.css
grep -- '--mira-text:' mira-templates/themes/meu-tema-css.css
grep -- '--mira-text-soft:' mira-templates/themes/meu-tema-css.css
grep -- '--mira-text-softer' mira-templates/themes/meu-tema-css.css
grep -- '--mira-card-bg' mira-templates/themes/meu-tema-css.css
grep -- '--mira-card-border' mira-templates/themes/meu-tema-css.css
grep -- '--mira-glow-soft' mira-templates/themes/meu-tema-css.css
grep -- '--mira-glow-strong' mira-templates/themes/meu-tema-css.css
grep -- '--mira-icon-bg' mira-templates/themes/meu-tema-css.css
grep -- '--mira-icon-border' mira-templates/themes/meu-tema-css.css
grep -- '--mira-pill-bg' mira-templates/themes/meu-tema-css.css
grep -- '--mira-pill-border' mira-templates/themes/meu-tema-css.css
grep -- '--mira-stage-glow' mira-templates/themes/meu-tema-css.css
grep -- '--mira-accent-2' mira-templates/themes/meu-tema-css.css
```

---

### 4.6 Verificando que o Deck Possui Referências CDN e Marcadores @MIRA:THEME

```bash
# Verificar marcadores de tema
grep '@MIRA:THEME:START' mira-templates/decks/meu-tema-css/index.html
grep '@MIRA:THEME:END' mira-templates/decks/meu-tema-css/index.html

# Verificar CDN do Tailwind
grep 'cdn.tailwindcss.com' mira-templates/decks/meu-tema-css/index.html

# Verificar CDN do AOS
grep 'unpkg.com/aos' mira-templates/decks/meu-tema-css/index.html

# Verificar CDN do Lucide
grep 'unpkg.com/lucide' mira-templates/decks/meu-tema-css/index.html

# Verificar CDN do D3.js
grep 'd3js.org/d3.v7' mira-templates/decks/meu-tema-css/index.html
```

Todos os comandos acima devem retornar resultados (não vazio).

---

## 5. Usando o Template Gerado com `mira-new`

Após gerar um template com sucesso:

```bash
# Criar um novo deck usando o template gerado
npx mira-animator new

# Na lista interativa, o template "meu-tema-css" deve aparecer
# como opção disponível tanto para deck template quanto para tema
```

**Verificações:**
- O nome do template gerado aparece na lista de deck templates
- O tema gerado aparece na lista de temas disponíveis
- Ao selecionar o template, o deck criado contém o tema correto aplicado

---

## 6. Casos de Erro para Verificação Manual

### 6.1 Arquivo inexistente

```bash
npx mira-animator brand teste-erro --source=./arquivo-que-nao-existe.css
```

**Esperado:** Mensagem de erro contendo o caminho exato do arquivo não encontrado.

### 6.2 Formato não suportado

```bash
# Criar um arquivo com extensão não suportada
echo "dados" > teste.xyz
npx mira-animator brand teste-erro --source=./teste.xyz
```

**Esperado:** Mensagem de erro listando todos os formatos suportados (.ppt, .pptx, .pdf, .css, .html, .csv, .svg, .png, .jpg, .webp, .zip, URL).

### 6.3 Nome reservado

```bash
npx mira-animator brand mira-dark --source=./teste-brand.css
```

**Esperado:** Mensagem de erro indicando que `mira-dark` é um nome reservado, listando todos os nomes reservados (mira-dark, light-minimal, corporate-blue, neon-emerald, aula-capitulo, pitch-projeto, demo-tecnica).

### 6.4 Nome inválido (formato)

```bash
# Nome começando com número
npx mira-animator brand 123abc --source=./teste-brand.css

# Nome com maiúsculas
npx mira-animator brand MeuTema --source=./teste-brand.css

# Nome muito curto
npx mira-animator brand ab --source=./teste-brand.css
```

**Esperado:** Mensagem de erro indicando que o nome deve seguir o padrão kebab-case (3-50 caracteres, começando com letra minúscula).

### 6.5 Template já existente (sobrescrita)

```bash
# Gerar o mesmo template duas vezes
npx mira-animator brand tema-duplicado --source=./teste-brand.css
npx mira-animator brand tema-duplicado --source=./teste-brand.css
```

**Esperado:** Na segunda execução, o CLI pergunta confirmação antes de sobrescrever.

### 6.6 Mira não instalado

```bash
# Em um diretório sem projeto Mira configurado
cd /tmp
npx mira-animator brand teste --source=./algo.css
```

**Esperado:** Mensagem de erro instruindo a executar `npx mira-animator install` primeiro.

---

## 7. Teste do Agent Skill (Fluxo Conversacional)

O agent skill `/mira-brand-template` pode ser testado em qualquer IDE com suporte a agentes (Claude, Kiro, etc.).

### 7.1 Fluxo básico

1. Abra o chat do agente no contexto do projeto Mira
2. Digite: `/mira-brand-template` ou "Crie um template da minha marca"
3. Forneça um arquivo CSS, PPTX ou URL quando solicitado
4. O agente deve apresentar um resumo com:
   - Cor primária detectada (hex)
   - Cor de fundo detectada (hex)
   - Modo do tema (claro/escuro)
   - Fonte detectada
5. Aceite ou ajuste os valores apresentados
6. Forneça um nome para o template quando solicitado
7. O agente deve gerar os arquivos e apresentar os caminhos

### 7.2 Fluxo com ajuste de valores

1. Inicie o fluxo como acima
2. Quando o resumo for apresentado, peça para alterar a cor primária:
   - "Mude a cor primária para #FF6B00"
3. O agente deve aceitar a correção e gerar com o valor atualizado
4. Verifique que o tema usa `#FF6B00` como `--mira-primary`

### 7.3 Fluxo com arquivo anexado

1. Anexe um arquivo CSS/PPTX diretamente no chat
2. Peça: "Gere um template de marca a partir deste arquivo"
3. O agente deve processar o arquivo e seguir o fluxo normal

### 7.4 Verificação pós-geração

Após a geração via agente, o agente deve oferecer:
- Executar `mira-new` com o template gerado
- Exibir caminho do tema e deck gerados

---

## 8. Limpeza Pós-Testes

Após finalizar os testes manuais, limpe os artefatos gerados:

```bash
# Remover templates de teste gerados
rm -rf mira-templates/themes/meu-tema-css.css
rm -rf mira-templates/decks/meu-tema-css/
rm -rf mira-templates/themes/marca-web.css
rm -rf mira-templates/decks/marca-web/
rm -rf mira-templates/themes/marca-pptx.css
rm -rf mira-templates/decks/marca-pptx/
rm -rf mira-templates/themes/tema-duplicado.css
rm -rf mira-templates/decks/tema-duplicado/

# Remover arquivos de teste criados localmente
rm -f teste-brand.css teste.xyz
```

---

## 9. Checklist Resumido

| # | Teste | Status |
|---|-------|--------|
| 1 | Testes automatizados passam (`npm test`) | ☐ |
| 2 | Gerar tema a partir de CSS | ☐ |
| 3 | Gerar tema a partir de URL | ☐ |
| 4 | Gerar tema a partir de PPTX | ☐ |
| 5 | Tema tem 15 variáveis `--mira-*` | ☐ |
| 6 | Deck tem marcadores `@MIRA:THEME` | ☐ |
| 7 | Deck tem CDN refs (Tailwind, AOS, Lucide, D3) | ☐ |
| 8 | Template aparece em `mira-new` | ☐ |
| 9 | Erro: arquivo inexistente | ☐ |
| 10 | Erro: formato não suportado | ☐ |
| 11 | Erro: nome reservado | ☐ |
| 12 | Erro: nome inválido | ☐ |
| 13 | Sobrescrita com confirmação | ☐ |
| 14 | Agent skill: fluxo completo | ☐ |
| 15 | Agent skill: ajuste de valores | ☐ |
