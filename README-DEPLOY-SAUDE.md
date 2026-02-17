# Saúde Familiar — Wizard 2-Step + Fix DateInput Mobile
## Instruções de Deploy

### ORDEM OBRIGATÓRIA:
### 1️⃣ SQL primeiro → 2️⃣ Prisma schema → 3️⃣ Prisma generate → 4️⃣ Backend → 5️⃣ Frontend

---

## Passo 1: Rodar SQL no banco (SQL Shell psql, já logado no Railway)

```sql
-- Copie e cole o conteúdo de sql/02-saude-familiar.sql
-- Ou se tiver acesso ao arquivo:
\i sql/02-saude-familiar.sql
```

**Verificar que rodou:**
```sql
\d saude_familiar
```
Deve mostrar colunas: id, candidato_id, membro_familia_id, possui_doenca, doenca, 
possui_relatorio_medico, laudo_url, laudo_nome, etc.

---

## Passo 2: Substituir schema.prisma

Copiar `api/prisma/schema.prisma` para o repositório.

**O que mudou:**
- Novo model `SaudeFamiliar` (entre MembroFamilia e Documento)
- Adicionado `saude SaudeFamiliar[]` no model `Candidato`
- Adicionado `saude SaudeFamiliar[]` no model `MembroFamilia`

**NÃO rodar `prisma db push`!** O SQL já criou a tabela.

Gerar o client:
```bash
cd api && npx prisma generate
```

---

## Passo 3: Adicionar novos arquivos ao backend

- `api/src/controllers/saude.controller.ts` — **NOVO** (CRUD de saúde + upload laudo/receita)
- `api/src/routes/saude.routes.ts` — **NOVO** (rotas de saúde)
- `api/src/routes/index.ts` — **ATUALIZADO** (registra saudeRoutes)

---

## Passo 4: Substituir arquivos do frontend

- `web/src/services/api.ts` — **ATUALIZADO** (adicionado `saudeService`)
- `web/src/pages/Candidato/CadastroCandidato/CadastroCandidato.tsx` — **ATUALIZADO** (seção saúde reescrita + DateInput)
- `web/src/components/common/DateInput/DateInput.tsx` — **NOVO** (componente de data)
- `web/src/components/common/DateInput/index.ts` — **NOVO** (barrel export)

---

## Deploy no Railway

```bash
cd api && npm run build && railway up
cd web && npm run build && railway up
```

---

## O que mudou — Resumo:

### Seção Saúde (REESCRITA):
- Tela principal lista candidato + todos os membros familiares
- Clique em "Visualizar" ou "Cadastrar" abre wizard 2-step:
  - **Step 1 — Doença**: Sim/Não → Dropdown com 19 doenças → Tem laudo? → Upload laudo
  - **Step 2 — Medicação**: Toma medicamento? → Nome → Rede pública? → Especifique → Upload receita
- Dados salvos no banco em `saude_familiar`
- Upload de laudo e receita com limite 10MB
- Suporta PDF, JPG, PNG
- Visualizar e excluir arquivos

### Fix DateInput Mobile (BÔNUS):
- Campos de data de nascimento agora usam input de texto com máscara dd/mm/aaaa
- Funciona igual em desktop e mobile (sem calendário nativo problemático)

## Arquivos NÃO alterados:
- `familia.controller.ts` — sem mudança
- `familia.routes.ts` — sem mudança
- `documento.controller.ts` — sem mudança
- Nenhuma outra seção do CadastroCandidato foi alterada
- Nenhum componente comum foi alterado
