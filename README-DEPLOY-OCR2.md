# OCR Finalização 2 — Migração para OCR.space + Ajustes RG
## Instruções de Deploy

### MUDANÇA PRINCIPAL: Google Vision → OCR.space
A API de OCR foi substituída pelo OCR.space, que oferece melhor reconhecimento
de documentos brasileiros com Engine 2 + português + scale + isTable.

---

### ORDEM DE DEPLOY:

#### 1️⃣ Instalar dependência `sharp` (redimensionamento de imagem)

```powershell
cd api
npm install sharp
npm install -D @types/sharp
```

> O `sharp` é usado para redimensionar fotos grandes de celular antes de enviar
> ao OCR.space (limite free: 1MB). A imagem ORIGINAL é salva no servidor,
> só a cópia para OCR é reduzida.

#### 2️⃣ Variável de ambiente no Railway

```
OCR_SPACE_API_KEY = sua-chave-aqui
```

> Railway → serviço API → Variables → New Variable
> A variável `GOOGLE_VISION_API_KEY` pode ser removida ou mantida (não é mais usada).

#### 3️⃣ Backend — Adicionar 1 arquivo novo + substituir 2

```
api/src/config/ocr-space.ts              ← NOVO (adicionar)
api/src/services/rg-parser.ts            ← substituir
api/src/controllers/ocr.controller.ts    ← substituir
```

> O arquivo `api/src/config/google-vision.ts` pode ser mantido (não atrapalha)
> ou removido futuramente.

#### 4️⃣ Frontend — Substituir 1 arquivo

```
web/src/pages/Candidato/CadastroCandidato/CadastroCandidato.tsx  ← substituir
```

#### 5️⃣ Deploy no Railway

```powershell
cd api; npm run build; railway up
cd web; npm run build; railway up
```

---

### Resumo das alterações:

**1. OCR.space API (`api/src/config/ocr-space.ts`)** — NOVO
- Integração completa com OCR.space (`POST https://api.ocr.space/parse/image`)
- Parâmetros otimizados: `OCREngine=2` + `language=por` + `scale=true` + `isTable=true`
- API key via header (seguro)
- Retorna texto completo + palavras com posição (Left/Top/Width/Height)

**2. Parser RG v3 (`api/src/services/rg-parser.ts`)** — ATUALIZADO
- Compatível com formato OCR.space (Left/Top/Width/Height por palavra)
- 3 estratégias de extração de nome em cascata:
  1. Por **posição** das palavras (localiza rótulo "NOME" e coleta palavras à direita/abaixo)
  2. Por **linhas** estruturadas (OCR.space Lines)
  3. Por **texto** puro (fallback)
- Evita capturar nome do diretor do Instituto de Identificação

**3. Controller OCR (`api/src/controllers/ocr.controller.ts`)** — ATUALIZADO
- Usa `ocr-space` em vez de `google-vision`
- Redimensiona imagens grandes via `sharp` (fotos de celular podem exceder 1MB)
- Salva imagem ORIGINAL no servidor (redução é só para o OCR)
- Permite até 2 documentos RG (frente + verso)
- Retorna `qualLado: 'frente' | 'verso'`

**4. Frontend (`CadastroCandidato.tsx`)** — ATUALIZADO
- Visualizar documento: `<a target="_blank">` em vez de `window.open` (evita bloqueio popup no mobile)
- Scan RG: botão dinâmico "Escanear RG (Frente)" → "Escanear RG (Verso)"
- Upload manual: permite 2 arquivos RG (frente + verso)
- Merge inteligente: segundo scan NÃO sobrescreve campos já preenchidos

---

### Arquivos NÃO alterados:
- `api/src/routes/ocr.routes.ts` — sem mudança (mesma rota `POST /ocr/rg`)
- `api/src/controllers/documento.controller.ts` — sem mudança
- `api/src/config/upload.ts` — sem mudança
- `api/prisma/schema.prisma` — sem mudança
- `familia.controller.ts` — sem mudança
- Nenhuma alteração de SQL necessária

---

### OCR.space — Planos e limites:

| | Free | PRO ($30/mês) |
|---|---|---|
| Requests/mês | 25.000 | 300.000 |
| Tamanho máximo | 1 MB | 5 MB |
| Uptime | — | 100% garantido |

Com o `sharp` redimensionando, fotos de celular (3-5MB) são comprimidas
para ~500KB antes de enviar. Funciona perfeitamente no plano free.
