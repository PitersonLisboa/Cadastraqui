-- ============================================================
-- TABELA NOVA: documentos_membros
-- Completamente isolada de "documentos" (candidato)
-- Executar via psql ANTES do deploy
-- ============================================================

-- 1. Criar tabela documentos_membros
CREATE TABLE IF NOT EXISTS documentos_membros (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo            VARCHAR(100) NOT NULL,
    nome            VARCHAR(500) NOT NULL,
    url             VARCHAR(1000) NOT NULL,
    tamanho         INTEGER,
    "mimeType"      VARCHAR(100),
    status          "StatusDocumento" NOT NULL DEFAULT 'PENDENTE',
    observacao      TEXT,

    "membroFamiliaId" UUID NOT NULL,
    "criadoEm"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_doc_membro_familia
        FOREIGN KEY ("membroFamiliaId")
        REFERENCES membros_familia(id)
        ON DELETE CASCADE
);

-- 2. Índice para busca rápida por membro
CREATE INDEX IF NOT EXISTS idx_doc_membros_membro_id ON documentos_membros("membroFamiliaId");

-- 3. Índice para busca por tipo
CREATE INDEX IF NOT EXISTS idx_doc_membros_tipo ON documentos_membros(tipo);

-- Verificação
SELECT 'Tabela documentos_membros criada com sucesso!' AS resultado;
