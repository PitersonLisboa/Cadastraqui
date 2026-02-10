-- ===========================================
-- MIGRATION: Multi-Tenant Support
-- ===========================================
-- Adiciona suporte multi-tenant ao CADASTRAQUI
-- Preserva todos os dados existentes
-- ===========================================

-- PASSO 1: Criar tabela de tenants
CREATE TABLE IF NOT EXISTS "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "logoUrl" TEXT,
    "corPrimaria" TEXT DEFAULT '#1e40af',
    "corSecundaria" TEXT DEFAULT '#3b82f6',
    "dominio" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "configuracoes" JSONB,
    "instituicaoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_key" ON "tenants"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_instituicaoId_key" ON "tenants"("instituicaoId");

ALTER TABLE "tenants" ADD CONSTRAINT "tenants_instituicaoId_fkey"
    FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PASSO 2: Adicionar colunas nullable (sem quebrar dados existentes)

-- Usuario: instituicaoId (nullable para ADMIN)
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "instituicaoId" TEXT;

-- Candidato: instituicaoId (nullable temporariamente)
ALTER TABLE "candidatos" ADD COLUMN IF NOT EXISTS "instituicaoId" TEXT;

-- Notificacao: instituicaoId
ALTER TABLE "notificacoes" ADD COLUMN IF NOT EXISTS "instituicaoId" TEXT;

-- LogAtividade: instituicaoId
ALTER TABLE "logs_atividade" ADD COLUMN IF NOT EXISTS "instituicaoId" TEXT;

-- Configuracao: instituicaoId + ajustar unique constraint
ALTER TABLE "configuracoes" ADD COLUMN IF NOT EXISTS "instituicaoId" TEXT;

-- Remover unique constraint antiga de configuracoes (chave unique simples)
ALTER TABLE "configuracoes" DROP CONSTRAINT IF EXISTS "configuracoes_chave_key";

-- Criar unique composto (chave + instituicaoId)
CREATE UNIQUE INDEX IF NOT EXISTS "configuracoes_chave_instituicaoId_key" ON "configuracoes"("chave", "instituicaoId");

-- PASSO 3: Preencher dados existentes
-- Vincular todos os usuários não-ADMIN à primeira instituição encontrada
UPDATE "usuarios" u
SET "instituicaoId" = (SELECT id FROM "instituicoes" LIMIT 1)
WHERE u.role != 'ADMIN'
  AND u."instituicaoId" IS NULL
  AND EXISTS (SELECT 1 FROM "instituicoes");

-- Vincular candidatos à instituição via seus editais (quando possível)
UPDATE "candidatos" c
SET "instituicaoId" = sub."instituicaoId"
FROM (
    SELECT DISTINCT ON (ca."candidatoId") ca."candidatoId", e."instituicaoId"
    FROM "candidaturas" ca
    JOIN "editais" e ON ca."editalId" = e.id
) sub
WHERE c.id = sub."candidatoId"
  AND c."instituicaoId" IS NULL;

-- Candidatos sem candidatura: vincular à instituição padrão
UPDATE "candidatos"
SET "instituicaoId" = (SELECT id FROM "instituicoes" LIMIT 1)
WHERE "instituicaoId" IS NULL
  AND EXISTS (SELECT 1 FROM "instituicoes");

-- Preencher instituicaoId nas notificações via usuário
UPDATE "notificacoes" n
SET "instituicaoId" = u."instituicaoId"
FROM "usuarios" u
WHERE n."usuarioId" = u.id
  AND n."instituicaoId" IS NULL
  AND u."instituicaoId" IS NOT NULL;

-- Preencher instituicaoId nos logs via usuário
UPDATE "logs_atividade" l
SET "instituicaoId" = u."instituicaoId"
FROM "usuarios" u
WHERE l."usuarioId" = u.id
  AND l."instituicaoId" IS NULL
  AND u."instituicaoId" IS NOT NULL;

-- PASSO 4: Adicionar foreign keys
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_instituicaoId_fkey"
    FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "candidatos" ADD CONSTRAINT "candidatos_instituicaoId_fkey"
    FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_instituicaoId_fkey"
    FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "logs_atividade" ADD CONSTRAINT "logs_atividade_instituicaoId_fkey"
    FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_instituicaoId_fkey"
    FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PASSO 5: Tornar NOT NULL onde necessário (apenas após preenchimento)
-- Candidato DEVE ter instituição
ALTER TABLE "candidatos" ALTER COLUMN "instituicaoId" SET NOT NULL;

-- PASSO 6: Criar tenant padrão para a instituição existente
INSERT INTO "tenants" ("id", "slug", "nome", "instituicaoId", "atualizadoEm")
SELECT 
    gen_random_uuid(),
    'default',
    i."razaoSocial",
    i.id,
    NOW()
FROM "instituicoes" i
WHERE NOT EXISTS (SELECT 1 FROM "tenants" t WHERE t."instituicaoId" = i.id)
LIMIT 1;
