-- =====================================================
-- GRUPO FAMILIAR: Expansão de campos em membros_familia
-- RODAR MANUALMENTE via psql ANTES de atualizar o schema Prisma
-- =====================================================
-- LIÇÃO: Nunca altere o Prisma schema sem confirmar que
-- o SQL já rodou no banco!
-- =====================================================

-- Step 2 - Dados Pessoais (novos campos)
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS rg TEXT;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS "rgEstado" TEXT;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS "rgOrgao" TEXT;

-- Step 3 - Informações Adicionais
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS "nomeSocial" TEXT;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS sexo TEXT;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS profissao TEXT;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS nacionalidade TEXT;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS naturalidade TEXT;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS estado TEXT;

-- Step 4 - Estado Civil
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS "estadoCivil" TEXT;

-- Step 5 - Informações Pessoais
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS "corRaca" TEXT;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS escolaridade TEXT;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS religiao TEXT;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS "necessidadesEspeciais" BOOLEAN DEFAULT false;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS "tipoNecessidadesEspeciais" TEXT;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS "descricaoNecessidadesEspeciais" TEXT;

-- Step 8 - Benefícios e Programas
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS "cadastroUnico" BOOLEAN DEFAULT false;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS "escolaPublica" BOOLEAN DEFAULT false;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS "bolsaCebasBasica" BOOLEAN DEFAULT false;
ALTER TABLE membros_familia ADD COLUMN IF NOT EXISTS "bolsaCebasProfissional" BOOLEAN DEFAULT false;

-- =====================================================
-- VERIFICAÇÃO: Após rodar, confirme com:
-- \d membros_familia
-- =====================================================
