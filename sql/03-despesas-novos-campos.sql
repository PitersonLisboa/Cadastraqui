-- ============================================================
-- Tabela: despesas_mensais — adicionar campos para o novo layout
-- IMPORTANTE: colunas em camelCase (padrão Prisma sem @map)
-- ============================================================

ALTER TABLE despesas_mensais ADD COLUMN IF NOT EXISTS "naoSeAplica" BOOLEAN DEFAULT false;
ALTER TABLE despesas_mensais ADD COLUMN IF NOT EXISTS justificativa TEXT;
