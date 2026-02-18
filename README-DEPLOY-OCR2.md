# OCR Finalização 2 — Migração para OCR.space + Ajustes RG
## Instruções de Deploy

### MUDANÇA PRINCIPAL: Google Vision → OCR.space
A API de OCR foi substituída pelo OCR.space, que oferece melhor reconhecimento
de documentos brasileiros com Engine 2 + português + scale + isTable.

---

### ORDEM DE DEPLOY:

#### 1️⃣ (Opcional) Instalar `sharp` para compressão automática de imagens

```powershell
cd api
npm install sharp
```

> O `sharp` redimensiona fotos grandes de celular (~3-5MB) para caber no
> limite de 1MB do plano free do OCR.space. Se não estiver instalado,
> o sistema funciona normalmente — apenas envia a imagem no tamanho original.
> Para o plano PRO (5MB), sharp não é necessário.

#### 2️⃣ Variável de ambiente no Railway

```
OCR_SPACE_API_KEY = sua-chave-aqui
```

> Railway → serviço API → Variables → New Variable.
> A variável `GOOGLE_VISION_API_KEY` pode ser removida (não é mais usada).

#### 3️⃣ Backend — Adicionar 1 arquivo novo + substituir 2

```
api/src/config/ocr-space.ts              ← NOVO (adicionar)
api/src/services/rg-parser.ts            ← substituir
api/src/controllers/ocr.controller.ts    ← substituir
```

> O arquivo `api/src/config/google-vision.ts` pode ser mantido ou removido.

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
- Integração via `FormData` (multipart/form-data) — formato recomendado pelo OCR.space
- Parâmetros: `OCREngine=2` + `language=por` + `scale=true` + `isTable=true`
- API key via header (seguro)
- Logs detalhados: tempo de resposta, exit codes, texto extraído
- Tratamento robusto de erros (rede, HTTP, JSON, parse)

**2. Parser RG v3 (`api/src/services/rg-parser.ts`)** — ATUALIZADO
- Compatível com OCR.space (Left/Top/Width/Height por palavra)
- 3 estratégias de extração de nome em cascata:
  1. Por **posição** das palavras (rótulo "NOME" → palavras à direita/abaixo)
  2. Por **linhas** estruturadas (OCR.space Lines)
  3. Por **texto** puro (fallback)

**3. Controller OCR (`api/src/controllers/ocr.controller.ts`)** — ATUALIZADO
- Usa `ocr-space` em vez de `google-vision`
- `sharp` é importado dinamicamente (não quebra se não estiver instalado)
- Permite até 2 documentos RG (frente + verso)

**4. Frontend (`CadastroCandidato.tsx`)** — ATUALIZADO
- Visualizar documento: evita bloqueio de popup no mobile
- Scan RG: botão "Escanear RG (Frente)" → "Escanear RG (Verso)"
- Upload manual: permite 2 arquivos RG
- Merge inteligente: segundo scan não sobrescreve campos preenchidos

---

### Arquivos NÃO alterados:
- `api/src/routes/ocr.routes.ts` — sem mudança (mesma rota `POST /ocr/rg`)
- `api/src/controllers/documento.controller.ts` — sem mudança
- `api/src/config/upload.ts` — sem mudança
- `api/prisma/schema.prisma` — sem mudança
- Nenhuma alteração de SQL necessária

---

### Troubleshooting:

**Se aparecer "Erro ao processar imagem com OCR":**
1. Verificar nos logs do Railway se `OCR_SPACE_API_KEY` está configurada
2. O log mostra `❌ OCR.space HTTP XXX:` com o erro exato
3. Se for "Not a valid base64 image" → provavelmente a imagem excede 1MB
   - Solução: instalar `sharp` (passo 1) para compressão automática

**Se o build falhar:**
- O `sharp` NÃO é import estático — se não estiver instalado, o build compila normalmente
- O sharp só é usado em runtime, com fallback se falhar
