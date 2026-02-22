# Cadastraqui - Módulo de Declarações CEBAS (Integrado)

## Visão Geral

Módulo completo de **22 declarações** exigidas pela Lei Complementar nº 187/2021 para processo seletivo CEBAS.
Inclui wizard multi-step, upload de arquivos, geração de PDF (PDFKit) e download local.

## O que foi integrado

### Backend (`api/`)
- `src/controllers/declaracao.controller.ts` — CRUD + upload + PDF + email (placeholder)
- `src/routes/declaracao.routes.ts` — Rotas REST (usa `verificarJWT`)
- `src/services/declaracao-pdf.service.ts` — Geração de PDF com PDFKit
- `src/routes/index.ts` — ✅ Já patchado com `declaracaoRoutes`

### Frontend (`web/`)
- `src/pages/Candidato/Declaracoes/Declaracoes.tsx` — Wizard 22 steps
- `src/pages/Candidato/Declaracoes/Declaracoes.module.scss` — Estilos
- `src/routes.tsx` — ✅ Já patchado com rota `/declaracoes`
- `src/services/api.ts` — ✅ Já patchado com `declaracaoService`
- `src/pages/Candidato/CadastroCandidato/CadastroCandidato.tsx` — Seção "Declarações" agora redireciona para o wizard

### SQL
- `sql/05-declaracoes.sql` — Migração da tabela `declaracoes`

## Passo a Passo de Deploy

### 1. Banco de Dados (psql)

```bash
# Conectar ao banco Railway e executar:
psql $DATABASE_URL < sql/05-declaracoes.sql
```

Ou copie e cole o conteúdo de `sql/05-declaracoes.sql` direto no psql.

### 2. Backend

O `pdfkit` e `@types/pdfkit` **já estão no package.json** — nenhuma instalação extra necessária.

```bash
cd api
npm install          # caso não tenha rodado ainda
npx tsc              # compilar
# Deploy Railway: node dist/server.js
```

**Variável de ambiente (opcional):**
```
UPLOADS_DIR=/app/uploads/declaracoes
```
Se não definida, usa `{cwd}/uploads/declaracoes/` automaticamente.

### 3. Frontend

Nenhuma dependência extra. Basta fazer build:

```bash
cd web
npm install
npm run build
```

### 4. Acesso

A rota do wizard:
```
/:slug/candidato/declaracoes
```

A seção "Declarações" no sidebar do cadastro agora abre o botão "Preencher Declarações" que leva ao wizard.

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------| 
| GET | /declaracoes | Listar declarações do candidato |
| PUT | /declaracoes | Criar/atualizar declaração |
| POST | /declaracoes/upload/:tipo | Upload de arquivo |
| GET | /declaracoes/membro/:membroId | Listar declarações de membro |
| PUT | /declaracoes/membro | Criar/atualizar declaração de membro |
| POST | /declaracoes/membro/:membroId/upload/:tipo | Upload para membro |
| GET | /declaracoes/:id/download | Download de arquivo |
| GET | /declaracoes/pdf | Gerar PDF completo (download blob) |
| POST | /declaracoes/email | 🚧 Em construção |

## Tipos de Declaração (22)

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | CONFIRMACAO_DADOS | Confirmação dos dados pessoais |
| 2 | PENSAO_ALIMENTICIA | Recebimento de pensão (A/B/C) |
| 3 | COMPROVANTE_ENDERECO | Comprovante de endereço em nome |
| 4 | CARTEIRA_TRABALHO | Possui carteira de trabalho |
| 5 | CTPS_DIGITAL | Upload relatório CTPS digital |
| 6 | CNIS | Extrato CNIS (link Gov.br + upload) |
| 7 | UNIAO_ESTAVEL | União estável |
| 8 | ESTADO_CIVIL_SOLTEIRO | Solteiro(a) |
| 9 | SEPARACAO_FATO | Separação não judicial |
| 10 | ISENTO_IR | Isenção de IR |
| 11 | AUSENCIA_RENDA | Desempregado/do lar |
| 12 | MEI | Microempreendedor (DAS-SIMEI) |
| 13 | TRABALHADOR_RURAL | Trabalhador rural |
| 14 | AUTONOMO_INFORMAL | Autônomo/renda informal |
| 15 | EMPRESARIO | Sócio de empresa |
| 16 | EMPRESA_INATIVA | Empresa inativa (CNPJ + endereço) |
| 17 | ALUGUEL | Rendimento de aluguel |
| 18 | VEICULO | Propriedade de veículo |
| 19 | CONTA_BANCARIA | Conta corrente/poupança |
| 20 | LGPD | Consentimento LGPD |
| 21 | ALTERACAO_GRUPO | Ciência alteração grupo/renda |
| 22 | RESPONSABILIDADE | Inteira responsabilidade + assinatura |

## Notas Técnicas

- **Storage**: Uploads salvos no filesystem Railway (`UPLOADS_DIR` ou `uploads/declaracoes/`)
- **PDF**: Gerado via PDFKit, retornado como blob para download direto no navegador
- **Auth**: Usa `verificarJWT` (suporta header Authorization + query param `?token=`)
- **Email**: Placeholder com provision for SendGrid/SMTP/Nodemailer (env vars documentadas no controller)
- **Banco**: Tabela única `declaracoes` com JSONB flexível — sem alteração no Prisma schema (usa `$queryRaw`)
- **Unique constraint**: Uma declaração por tipo por pessoa (COALESCE no index)
