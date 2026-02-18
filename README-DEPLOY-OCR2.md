# OCR Finalização 2 — Ajustes RG (Frente + Verso)
## Instruções de Deploy

### O que mudou:

**1. Visualizar Documento no Mobile (popup → nova aba)**
- `CadastroCandidato.tsx`: Todas as funções de visualização (`handleViewDoc`, `handleViewDocMembro`, `handleViewSaudeArquivo`) agora usam `<a target="_blank">` em vez de `window.open()`
- Isso evita bloqueio de popup em navegadores mobile (Chrome Android, Safari iOS)
- Helper centralizado: `abrirBlobNovaAba(blob)` cria um `<a>` temporário e dispara click programático

**2. OCR: Extração de Nome por Posição (bounding box)**
- `rg-parser.ts`: Nova função `extrairNomeComPosicao()` que usa as coordenadas dos blocos do Google Vision
- Localiza o rótulo "NOME" no documento e coleta palavras que estão à direita ou abaixo dele
- Isso evita capturar o nome do diretor do Instituto de Identificação (que aparece no cabeçalho)
- Fallback: se não encontrar por posição, usa a extração por texto (estratégia anterior, melhorada)
- `ocr.controller.ts`: Agora passa os `blocos` (textAnnotations com boundingPoly) para o parser

**3. Upload de 2 Documentos RG (Frente + Verso)**
- `ocr.controller.ts`: Permite até 2 documentos tipo 'RG' (antes era 1)
- `CadastroCandidato.tsx`: Botão de scan aparece até ter 2 RG enviados
  - Label dinâmico: "Escanear RG (Frente)" → "Escanear RG (Verso)"
  - Upload manual também permite até 2 arquivos
  - Merge inteligente: segundo scan NÃO sobrescreve campos já preenchidos pelo primeiro

---

### ORDEM DE DEPLOY (sem SQL nesta rodada):

#### 1️⃣ Backend — Substituir 2 arquivos

```
api/src/services/rg-parser.ts        ← substituir
api/src/controllers/ocr.controller.ts ← substituir
```

#### 2️⃣ Frontend — Substituir 1 arquivo

```
web/src/pages/Candidato/CadastroCandidato/CadastroCandidato.tsx  ← substituir
```

#### 3️⃣ Deploy no Railway

```powershell
cd api; npm run build; railway up
cd web; npm run build; railway up
```

---

### Arquivos NÃO alterados (confirmação):
- `api/src/config/google-vision.ts` — sem mudança (já retornava `blocos` com posição)
- `api/src/config/upload.ts` — sem mudança (tipo 'RG' já existia)
- `api/src/routes/ocr.routes.ts` — sem mudança
- `api/src/controllers/documento.controller.ts` — sem mudança
- `api/prisma/schema.prisma` — sem mudança
- `familia.controller.ts` — sem mudança
- Nenhuma alteração de SQL necessária

---

### Notas técnicas:

**Nome por posição (como funciona):**
- Google Vision retorna `textAnnotations[]` onde cada item tem `description` (texto) e `boundingPoly.vertices` (4 cantos x,y)
- O parser localiza o bloco com description="NOME" e calcula a posição Y dele
- Palavras à direita (mesma linha) ou abaixo (próxima linha, dentro de ~1.8x a altura) são coletadas como candidatas ao nome
- Para quando encontra outro rótulo de campo (FILIAÇÃO, NATURALIDADE, etc.)
- Se essa estratégia falha, cai no fallback por texto (agora melhorado: ignora as 3 primeiras linhas que geralmente são cabeçalho)

**Merge inteligente no 2º scan:**
- Ao escanear o verso, o `handleScanRG` verifica cada campo: só preenche se o campo atual está vazio
- Exemplo: frente preencheu nome + RG + data nascimento → verso preenche CPF (sem apagar os outros)
- A API retorna `qualLado: 'frente' | 'verso'` para feedback visual ao usuário
