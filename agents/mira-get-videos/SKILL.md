---
name: mira-get-videos
description: Baixa os vídeos de fundo do Mira a partir do Google Drive para mira-templates/videos_header/. Use esta skill SEMPRE que o usuário digitar "/mira-get-videos", "baixar vídeos", "instalar vídeos do mira", "quero os backgrounds de vídeo" ou "os vídeos não estão aparecendo".
---

# Skill: Download de Vídeos de Fundo (Mira)

## Objetivo

Baixar os 18 vídeos `.mp4` do repositório oficial do Mira no Google Drive e salvá-los em `mira-templates/videos_header/` na pasta de trabalho atual. Os vídeos são usados pelo `/mira-builder` como backgrounds de cards animados.

## Fluxo de Execução

### Passo 1: Localizar o manifesto

Use `Glob` com o padrão `**\/mira-get-videos\/manifest.json` para encontrar o manifesto instalado (estará em `.claude/skills/mira-get-videos/` ou `.agents/skills/mira-get-videos/`). Leia o arquivo e parse o JSON.

Se não encontrar, informe:
> "Manifesto não encontrado. Verifique se o Mira está instalado nesta pasta (`npx mira-animator install`)."

Se algum `drive_id` ainda for `"PLACEHOLDER"`, informe:
> "Os IDs do Drive ainda não foram preenchidos nesta instalação. Execute `npx mira-animator update` para obter a versão mais recente do manifesto."
E pare.

### Passo 2: Verificar vídeos já existentes

Verifique quais arquivos já existem em `mira-templates/videos_header/`. Liste somente os que faltam. Se todos os 18 existirem, informe que os vídeos já estão instalados e pare.

### Passo 3: Criar pasta de destino

```bash
mkdir -p mira-templates/videos_header
```

No Windows use:
```powershell
New-Item -ItemType Directory -Force mira-templates\videos_header
```

### Passo 4: Baixar os vídeos faltantes

Para cada vídeo ausente, execute o download usando `curl`. O comando funciona em Linux, macOS e Windows 10+:

```bash
curl -L "https://drive.usercontent.google.com/download?id=DRIVE_ID&export=download&confirm=t" \
  -o "mira-templates/videos_header/ARQUIVO.mp4" \
  --progress-bar
```

Substitua `DRIVE_ID` pelo `drive_id` do manifesto e `ARQUIVO.mp4` pelo `file`.

Baixe um vídeo de cada vez e informe o progresso ao usuário:
> "Baixando 3/18: 3.mp4 — Interface HUD circular..."

### Passo 5: Confirmar

Após todos os downloads, verifique quantos arquivos existem em `mira-templates/videos_header/`. Informe:

> "✔ 18 vídeos instalados em mira-templates/videos_header/. Já pode usar o `/mira-builder` com backgrounds de vídeo."

Se algum falhou, liste os que faltaram e sugira rodar `/mira-get-videos` novamente.

## Notas

- Os downloads não são versionados pelo git por padrão (a pasta `mira-templates/` pode estar no `.gitignore`).
- O manifesto em `manifest.json` (na mesma pasta que este arquivo) contém a lista completa com `drive_id` e descrição de cada vídeo.
- Cada vídeo pesa entre 4 MB e 29 MB. O download completo é de aproximadamente 182 MB.
