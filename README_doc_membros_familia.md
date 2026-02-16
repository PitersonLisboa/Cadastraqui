# Documentos de Membros Familiares — Tabela Nova

## O que muda

Nova tabela `documentos_membros` — completamente isolada da tabela `documentos` (candidato).  
A tabela `documentos` **NÃO É TOCADA** — zero risco de quebrar uploads do candidato.

## Arquivos incluídos

### SQL (executar primeiro!)
- `sql/criar-documentos-membros.sql` — Cria tabela `documentos_membros` com FK para `membros_familia`

### Backend
- `api/prisma/schema.prisma` — Model `DocumentoMembro` adicionado + relação em `MembroFamilia`
- `api/src/controllers/documento-membro.controller.ts` — **NOVO** — CRUD completo para docs de membros
- `api/src/controllers/familia.controller.ts` — `buscarMembro` agora inclui `documentos` na query
- `api/src/routes/documento-membro.routes.ts` — **NOVO** — Rotas REST para docs de membros

### Frontend
- `web/src/pages/Candidato/CadastroCandidato/CadastroCandidato.tsx` — Steps 6 e 7 agora com upload real
- (MembroDetalhe.tsx e SCSS inalterados — incluídos por referência)

## Deploy — Ordem obrigatória

```bash
# 1. SQL primeiro (via psql)
psql $DATABASE_URL -f sql/criar-documentos-membros.sql

# 2. Copiar arquivos para o repositório
#    - schema.prisma → api/prisma/
#    - documento-membro.controller.ts → api/src/controllers/
#    - documento-membro.routes.ts → api/src/routes/
#    - familia.controller.ts → api/src/controllers/
#    - CadastroCandidato.tsx → web/src/pages/Candidato/CadastroCandidato/

# 3. Registrar as novas rotas no server.ts (ou onde registra as rotas):
#    import { documentoMembroRoutes } from './routes/documento-membro.routes'
#    app.register(documentoMembroRoutes)

# 4. Prisma generate (para o client reconhecer o novo model)
cd api && npx prisma generate

# 5. Build e deploy
npm run build
git add . && git commit -m "feat: documentos membros - tabela nova" && git push
```

## Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/familia/membros/:membroId/documentos` | Listar docs do membro |
| POST | `/familia/membros/:membroId/documentos` | Upload (multipart: `tipo` + `file`) |
| GET | `/familia/membros/:membroId/documentos/:docId/download` | Download/visualizar |
| DELETE | `/familia/membros/:membroId/documentos/:docId` | Excluir doc |

## Limites de upload
- 1 documento por tipo (exceto "Outros" que aceita até 5)
- Tamanho máximo: 10MB por arquivo
- Arquivos salvos em `uploads/membros/{membroId}/`
