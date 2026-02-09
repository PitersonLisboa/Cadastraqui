-- Adicionar novos valores ao enum Role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPERVISAO';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CONTROLE';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OPERACIONAL';

-- Criar tabela de supervisores
CREATE TABLE IF NOT EXISTS "supervisores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "registro" TEXT,
    "telefone" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "instituicaoId" TEXT NOT NULL,
    CONSTRAINT "supervisores_pkey" PRIMARY KEY ("id")
);

-- Criar tabela de membros de controle
CREATE TABLE IF NOT EXISTS "membros_controle" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "telefone" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "instituicaoId" TEXT NOT NULL,
    CONSTRAINT "membros_controle_pkey" PRIMARY KEY ("id")
);

-- Criar tabela de membros operacionais
CREATE TABLE IF NOT EXISTS "membros_operacional" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "telefone" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "instituicaoId" TEXT NOT NULL,
    CONSTRAINT "membros_operacional_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "supervisores_usuarioId_key" ON "supervisores"("usuarioId");
CREATE UNIQUE INDEX IF NOT EXISTS "membros_controle_usuarioId_key" ON "membros_controle"("usuarioId");
CREATE UNIQUE INDEX IF NOT EXISTS "membros_operacional_usuarioId_key" ON "membros_operacional"("usuarioId");

-- Foreign keys
ALTER TABLE "supervisores" ADD CONSTRAINT "supervisores_usuarioId_fkey" 
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supervisores" ADD CONSTRAINT "supervisores_instituicaoId_fkey" 
    FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "membros_controle" ADD CONSTRAINT "membros_controle_usuarioId_fkey" 
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membros_controle" ADD CONSTRAINT "membros_controle_instituicaoId_fkey" 
    FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "membros_operacional" ADD CONSTRAINT "membros_operacional_usuarioId_fkey" 
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membros_operacional" ADD CONSTRAINT "membros_operacional_instituicaoId_fkey" 
    FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
