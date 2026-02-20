# Renda 2.x — Instruções de Deploy

## ORDEM OBRIGATÓRIA:
### 1️⃣ SQL primeiro → 2️⃣ Prisma depois → 3️⃣ Backend → 4️⃣ Frontend

---

## Passo 1: Rodar SQL no banco (via psql)

```bash
psql $DATABASE_URL < sql/04-renda-redesign.sql
```

**Verificar que rodou:**
```bash
psql $DATABASE_URL -c "\d fontes_renda"
psql $DATABASE_URL -c "\d rendas_mensais"
```

`fontes_renda` deve existir com ~16 colunas.
`rendas_mensais` deve ter novos campos: `fonte_renda_id`, `candidato_id`, `renda_bruta`, 
`auxilio_alimentacao`, `auxilio_transporte`, `adiantamentos`, `indenizacoes`, 
`estornos_compensacoes`, `pensao_alimenticia_paga`, `comprovante_url`, `comprovante_nome`.

---

## Passo 2: Atualizar schema Prisma

Seguir as instruções em `api/prisma/INSTRUCOES-SCHEMA.md`:

1. **Model `Candidato`** — adicionar 2 relações:
   ```prisma
   fontesRenda       FonteRenda[]
   rendasMensais     RendaMensal[]
   ```

2. **Model `MembroFamilia`** — adicionar relação:
   ```prisma
   fontesRenda     FonteRenda[]
   ```

3. **Model `RendaMensal`** — SUBSTITUIR pelo conteúdo de `RendaMensal-model-SUBSTITUIR.prisma`

4. **Model `FonteRenda`** — ADICIONAR conteúdo de `FonteRenda-model-ADICIONAR.prisma` (após RendaMensal)

5. Gerar client:
   ```bash
   cd api && npx prisma generate
   ```

**NÃO rodar `prisma db push`!**

---

## Passo 3: Atualizar Backend

### 3a. Copiar novos arquivos:
- `api/src/controllers/fonte-renda.controller.ts` → **NOVO**
- `api/src/routes/fonte-renda.routes.ts` → **NOVO**

### 3b. Substituir arquivos existentes:
- `api/src/controllers/renda.controller.ts` → **SUBSTITUIR** (novas funções: salvarRendasBatch, uploadComprovante)
- `api/src/routes/renda.routes.ts` → **SUBSTITUIR** (novas rotas: POST /rendas/batch, POST /rendas/:id/comprovante/:mes/:ano)

### 3c. Registrar rota em `api/src/routes/index.ts`:

Adicionar import:
```typescript
import { fonteRendaRoutes } from './fonte-renda.routes'
```

Adicionar registro (junto aos outros `app.register`):
```typescript
await app.register(fonteRendaRoutes)
```

### 3d. Build e deploy:
```bash
cd api && npm run build && railway up
```

---

## Passo 4: Atualizar Frontend

### 4a. Serviços — `web/src/services/api.ts`:

Adicionar o `fonteRendaService` do arquivo `api-renda-additions.ts`.
SUBSTITUIR o `rendaService` existente pela versão atualizada do mesmo arquivo.

### 4b. Imports — `CadastroCandidato.tsx`:

Linha de import de services — adicionar `fonteRendaService`:
```typescript
import { api, rendaService, fonteRendaService, despesaService, ... } from '@/services/api'
```

Linha de import de masks — adicionar `maskCNPJ`:
```typescript
import { maskCPF, maskCNPJ, maskPhone, maskCEP, unmaskValue, fetchAddressByCEP } from '@/utils/masks'
```

### 4c. Constantes, interfaces, states, handlers:

Seguir o arquivo `RENDA-SECTION-REPLACEMENT.tsx` que contém blocos numerados (1-7)
com instruções de onde inserir cada trecho.

Resumo:
1. **Constantes** → substituir `FONTES_RENDA` por `FONTES_RENDA_2X` + grupos condicionais
2. **Interfaces** → adicionar `FonteRendaItem`, `RendaMensal2Item`, `IntegranteRenda`, etc.
3. **States** → remover states antigos do drawer, adicionar novos do wizard inline
4. **carregarDados()** → substituir bloco de rendas por chamada a `fonteRendaService.listar()`
5. **Handlers** → remover antigos (`abrirRendaDrawer`, etc.), adicionar novos
6. **Imports** → já descrito acima
7. **case 'renda'** → SUBSTITUIR o case inteiro pela versão nova

### 4d. Estilos — `CadastroCandidato.module.scss`:

Adicionar o conteúdo de `RENDA-SCSS-ADDITIONS.scss` ao FINAL do arquivo.

### 4e. Build e deploy:
```bash
cd web && npm run build && railway up
```

---

## Arquivos NÃO alterados (confirmação):

- `familia.controller.ts` — sem mudança
- `familia.routes.ts` — sem mudança
- `despesa.controller.ts` — sem mudança
- `saude.controller.ts` — sem mudança
- `documento.controller.ts` — sem mudança
- `schema.prisma` (exceto models RendaMensal e novo FonteRenda + relações) — sem mudança
- Nenhum componente common (StepperBar, Button, etc.)
- Nenhuma outra seção do CadastroCandidato (candidato, grupo-familiar, moradia, veículo, gastos, saúde, declarações) — intactas

---

## O que mudou — Resumo

| Componente | Mudança |
|-----------|---------|
| SQL | Nova tabela `fontes_renda` + expandir `rendas_mensais` (11 colunas novas) |
| Prisma | Novo model `FonteRenda` + `RendaMensal` atualizado + relações |
| Backend | Novo `fonte-renda.controller.ts` + `renda.controller.ts` reescrito |
| Rotas | Novas: GET/POST/PUT/DELETE `/fontes-renda`, POST `/rendas/batch`, POST upload comprovante |
| Frontend | `case 'renda'` reescrito: wizard inline 3-step, 22 fontes, 6 meses, cards colapsáveis |
| SCSS | ~200 linhas novas para wizard inline e cards |

## Mudanças de Lógica

| Antes (1.x) | Agora (2.x) |
|-------------|-------------|
| 8 fontes genéricas | 22 fontes específicas (padrão CEBAS) |
| 3 meses | 6 meses |
| Drawer lateral | Wizard inline na página |
| 1 valor por membro/mês | Renda bruta + 6 campos de detalhamento + pensão paga |
| Só membros | Candidato + membros |
| 1 fonte por membro | Múltiplas fontes por pessoa |
| Sem dados de empregador | CNPJ/CPF, atividade, fonte pagadora, telefone |
| Sem upload comprovante | Upload comprovante por mês + matrícula para estudante |
| Per capita simples | Per capita = (Σ bruta - Σ pensão) / n° pessoas |
