-- ============================================================
-- MIGRAÇÃO: Redesign Renda Familiar — Cadastraqui 2.x
-- Rodar ANTES de atualizar Prisma e backend
-- ============================================================

-- 1. CRIAR TABELA fontes_renda
CREATE TABLE IF NOT EXISTS fontes_renda (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  candidato_id            TEXT REFERENCES candidatos(id) ON DELETE CASCADE,
  membro_id               TEXT REFERENCES membros_familia(id) ON DELETE CASCADE,
  tipo                    VARCHAR(60) NOT NULL,
  documento_empregador    VARCHAR(20),
  nome_fonte_pagadora     VARCHAR(200),
  telefone_fonte          VARCHAR(20),
  atividade_exercida      VARCHAR(200),
  data_inicio             DATE,
  descricao_beneficio     VARCHAR(200),
  numero_beneficio        VARCHAR(50),
  instituicao_ensino      VARCHAR(200),
  curso_serie             VARCHAR(200),
  comprovante_matricula_url   TEXT,
  comprovante_matricula_nome  VARCHAR(200),
  criado_em               TIMESTAMP DEFAULT NOW(),
  atualizado_em           TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_fonte_vinculo CHECK (
    (candidato_id IS NOT NULL AND membro_id IS NULL) OR
    (candidato_id IS NULL AND membro_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_fontes_renda_candidato ON fontes_renda(candidato_id);
CREATE INDEX IF NOT EXISTS idx_fontes_renda_membro ON fontes_renda(membro_id);

-- 2. EXPANDIR tabela rendas_mensais (novos campos)
ALTER TABLE rendas_mensais ADD COLUMN IF NOT EXISTS fonte_renda_id TEXT REFERENCES fontes_renda(id) ON DELETE CASCADE;
ALTER TABLE rendas_mensais ADD COLUMN IF NOT EXISTS candidato_id TEXT REFERENCES candidatos(id) ON DELETE CASCADE;
ALTER TABLE rendas_mensais ADD COLUMN IF NOT EXISTS renda_bruta DECIMAL(12,2) DEFAULT 0;
ALTER TABLE rendas_mensais ADD COLUMN IF NOT EXISTS auxilio_alimentacao DECIMAL(12,2) DEFAULT 0;
ALTER TABLE rendas_mensais ADD COLUMN IF NOT EXISTS auxilio_transporte DECIMAL(12,2) DEFAULT 0;
ALTER TABLE rendas_mensais ADD COLUMN IF NOT EXISTS adiantamentos DECIMAL(12,2) DEFAULT 0;
ALTER TABLE rendas_mensais ADD COLUMN IF NOT EXISTS indenizacoes DECIMAL(12,2) DEFAULT 0;
ALTER TABLE rendas_mensais ADD COLUMN IF NOT EXISTS estornos_compensacoes DECIMAL(12,2) DEFAULT 0;
ALTER TABLE rendas_mensais ADD COLUMN IF NOT EXISTS pensao_alimenticia_paga DECIMAL(12,2) DEFAULT 0;
ALTER TABLE rendas_mensais ADD COLUMN IF NOT EXISTS comprovante_url TEXT;
ALTER TABLE rendas_mensais ADD COLUMN IF NOT EXISTS comprovante_nome VARCHAR(200);

-- 3. MIGRAR dados existentes: valor → renda_bruta
UPDATE rendas_mensais SET renda_bruta = valor WHERE (renda_bruta IS NULL OR renda_bruta = 0) AND valor > 0;

-- 4. Tornar membroId nullable (renda pode ser do candidato via candidato_id)
ALTER TABLE rendas_mensais ALTER COLUMN "membroId" DROP NOT NULL;

-- 5. Dropar unique antigo [membroId, mes, ano]
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rendas_mensais_membroId_mes_ano_key') THEN
    ALTER TABLE rendas_mensais DROP CONSTRAINT "rendas_mensais_membroId_mes_ano_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rendas_mensais_membro_id_mes_ano_key') THEN
    ALTER TABLE rendas_mensais DROP CONSTRAINT "rendas_mensais_membro_id_mes_ano_key";
  END IF;
END $$;

DROP INDEX IF EXISTS "rendas_mensais_membroId_mes_ano_key";
DROP INDEX IF EXISTS "rendas_mensais_membro_id_mes_ano_key";

-- 6. Criar novo unique + índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_rendas_fonte_mes_ano ON rendas_mensais(fonte_renda_id, mes, ano) WHERE fonte_renda_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rendas_candidato ON rendas_mensais(candidato_id);
CREATE INDEX IF NOT EXISTS idx_rendas_fonte ON rendas_mensais(fonte_renda_id);
