-- =============================================
-- CADASTRAQUI - Migração: Declarações CEBAS
-- Executar via psql no SQL Shell
-- =============================================

-- Tabela principal de declarações
CREATE TABLE IF NOT EXISTS declaracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vínculo dual: candidato OU membro familiar
  -- (TEXT porque Prisma gera id como TEXT nas tabelas referenciadas)
  candidato_id TEXT REFERENCES candidatos(id) ON DELETE CASCADE,
  membro_id    TEXT REFERENCES membros_familia(id) ON DELETE CASCADE,

  -- Tipo da declaração (enum textual)
  tipo VARCHAR(80) NOT NULL,

  -- Resposta principal (Sim/Não) — NULL = não respondido
  resposta BOOLEAN,

  -- Dados específicos da declaração (flexível por tipo)
  dados JSONB DEFAULT '{}',

  -- Se o candidato confirmou o texto da declaração
  confirmado BOOLEAN DEFAULT false,

  -- Arquivo anexo (CTPS digital, CNIS, DAS-SIMEI, declaração assinada etc.)
  arquivo_url       TEXT,
  arquivo_nome      TEXT,
  arquivo_tamanho   INTEGER,
  arquivo_mime_type TEXT,

  criado_em     TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_declaracoes_candidato ON declaracoes(candidato_id);
CREATE INDEX IF NOT EXISTS idx_declaracoes_membro    ON declaracoes(membro_id);
CREATE INDEX IF NOT EXISTS idx_declaracoes_tipo      ON declaracoes(tipo);

-- Unique: um tipo por pessoa (candidato ou membro)
-- Usamos COALESCE com string vazia para lidar com NULLs (campos TEXT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_declaracoes_unique
  ON declaracoes (COALESCE(candidato_id, ''),
                  COALESCE(membro_id, ''),
                  tipo);

COMMENT ON TABLE declaracoes IS 'Declarações CEBAS para processo seletivo - candidato e membros familiares';
