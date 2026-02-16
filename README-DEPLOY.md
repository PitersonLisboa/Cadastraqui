# Grupo Familiar — 8-Step Wizard
## Instruções de Deploy

### ORDEM OBRIGATÓRIA (lição aprendida!):
### 1️⃣ SQL primeiro → 2️⃣ Prisma depois → 3️⃣ Backend → 4️⃣ Frontend

---

## Passo 1: Rodar SQL no banco (via psql)

```bash
psql $DATABASE_URL < sql/01-membros-familia-expandir.sql
```

**Verificar que rodou:**
```bash
psql $DATABASE_URL -c "\d membros_familia"
```
Deve mostrar as 23 colunas novas (telefone, email, rg, etc.)

---

## Passo 2: Atualizar schema Prisma

No arquivo `api/prisma/schema.prisma`, **substituir** o model `MembroFamilia` 
pelo conteúdo de `api/prisma/MembroFamilia-model-SUBSTITUIR.prisma`.

**NÃO rodar `prisma db push`!** O SQL já criou as colunas.

Depois, gerar o client:
```bash
cd api && npx prisma generate
```

---

## Passo 3: Substituir familia.controller.ts

Copiar `api/src/controllers/familia.controller.ts` para o repositório.

**O que mudou:**
- `criarMembroSchema` agora aceita todos os 23+ campos novos
- `atualizarMembroSchema` idem (partial)
- `adicionarMembro` salva todos os campos
- `buscarMembro` retorna `membro` direto (sem wrapper desnecessário)
- `composicaoFamiliar` trata `dataNascimento` null safety

**O que NÃO mudou:**
- Rotas (`familia.routes.ts`) — zero alteração
- Modelo `Documento` — NENHUMA alteração (lição aprendida)

---

## Passo 4: Substituir CadastroCandidato.tsx

Copiar `web/src/pages/Candidato/CadastroCandidato/CadastroCandidato.tsx` para o repositório.

**O que mudou:**
- Interface `Membro` expandida (todos os campos dos 8 steps)
- Constantes: `PARENTESCO_MEMBRO_OPTIONS`, `ESTADO_CIVIL_MEMBRO_OPTIONS`, 
  `RELIGIAO_MEMBRO_OPTIONS`, `MEMBRO_SUB_STEP_LABELS`, `EMPTY_MEMBRO`
- States: `subStepMembro`, `editingMembroId`, `savingMembro`, `desejaDocAdicionalMembro`
- `handleAddMembro` agora envia todos os campos e suporta edição (PUT)
- `handleEditMembro` carrega dados do membro no wizard
- `handleCancelMembro` limpa form e volta à lista
- `case 'grupo-familiar'` reescrito: lista + wizard 8-step

**O que NÃO mudou:**
- `case 'candidato'` — intacto
- `case 'moradia'` — intacto
- `case 'veiculo'` — intacto
- `case 'renda'` — intacto
- `case 'gastos'` — intacto
- `case 'saude'` — intacto
- `case 'declaracoes'` — intacto
- Todos os states e handlers das outras seções — intactos

---

## Deploy no Railway

```bash
cd api && npm run build && railway up
cd web && npm run build && railway up
```

Ou pelo auto-deploy do GitHub se estiver configurado.

---

## Arquivos NÃO alterados (confirmação):
- `familia.routes.ts` — sem mudança
- `documento.controller.ts` — sem mudança
- `schema.prisma` (exceto o model MembroFamilia) — sem mudança
- `MembroDetalhe.tsx` — sem mudança
- `MembrosFamilia.tsx` — sem mudança (tela antiga, pode ser removida futuramente)
- Nenhum componente common (StepperBar, Button, etc.)

## Notas sobre Steps 6 e 7 (Upload de Documentos):
- Steps 6 e 7 mostram os campos de RG/estado/órgão e pergunta se quer doc adicional
- O upload real de arquivo (Documento de identificação / Anexar arquivo) foi 
  deixado como placeholder "será implementado em fase futura"
- Isso porque o upload de documentos do membro requer mudanças no modelo Documento 
  (adicionar membroFamiliaId), que é exatamente o que quebrou o sistema antes
- Quando for implementar o upload, fazer SQL primeiro, testar, e só depois alterar Prisma
