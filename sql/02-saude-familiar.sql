-- ============================================================
-- Tabela: saude_familiar
-- Armazena dados de saúde (doença + medicação) por pessoa
-- Pode referenciar o candidato OU um membro da família
-- ============================================================

CREATE TABLE IF NOT EXISTS saude_familiar (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Vínculo: candidato OU membro (um dos dois deve ser preenchido)
    candidato_id        TEXT REFERENCES candidatos(id) ON DELETE CASCADE,
    membro_familia_id   TEXT REFERENCES membros_familia(id) ON DELETE CASCADE,

    -- Step 1: Doença
    possui_doenca           BOOLEAN DEFAULT false,
    doenca                  TEXT,           -- valor da doença selecionada
    possui_relatorio_medico BOOLEAN DEFAULT false,
    laudo_url               TEXT,           -- caminho do arquivo de laudo
    laudo_nome              TEXT,           -- nome original do arquivo
    laudo_tamanho           INTEGER,        -- tamanho em bytes
    laudo_mime_type         TEXT,           -- mime type

    -- Step 2: Medicação
    toma_medicamento_controlado  BOOLEAN DEFAULT false,
    nome_medicamento             TEXT,
    obtem_rede_publica           BOOLEAN DEFAULT false,
    especifique_rede_publica     TEXT,
    receita_url                  TEXT,       -- caminho do arquivo de receita
    receita_nome                 TEXT,
    receita_tamanho              INTEGER,
    receita_mime_type            TEXT,

    criado_em           TIMESTAMP DEFAULT now(),
    atualizado_em       TIMESTAMP DEFAULT now(),

    -- Constraint: deve ter candidato OU membro, não ambos
    CONSTRAINT chk_saude_pessoa CHECK (
        (candidato_id IS NOT NULL AND membro_familia_id IS NULL) OR
        (candidato_id IS NULL AND membro_familia_id IS NOT NULL)
    )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_saude_familiar_candidato ON saude_familiar(candidato_id);
CREATE INDEX IF NOT EXISTS idx_saude_familiar_membro ON saude_familiar(membro_familia_id);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION atualizar_saude_familiar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_saude_familiar_update ON saude_familiar;
CREATE TRIGGER trg_saude_familiar_update
    BEFORE UPDATE ON saude_familiar
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_saude_familiar_timestamp();
