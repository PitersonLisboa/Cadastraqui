-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'INSTITUICAO', 'CANDIDATO', 'ASSISTENTE_SOCIAL', 'ADVOGADO');

-- CreateEnum
CREATE TYPE "UF" AS ENUM ('AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO');

-- CreateEnum
CREATE TYPE "StatusCandidatura" AS ENUM ('PENDENTE', 'EM_ANALISE', 'DOCUMENTACAO_PENDENTE', 'APROVADO', 'REPROVADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusDocumento" AS ENUM ('PENDENTE', 'ENVIADO', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('INFO', 'SUCESSO', 'ALERTA', 'ERRO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "nome" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CANDIDATO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "primeiroAcesso" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_recuperacao_senha" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    CONSTRAINT "tokens_recuperacao_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidatos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "telefone" TEXT NOT NULL,
    "celular" TEXT,
    "cep" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" "UF" NOT NULL,
    "estadoCivil" TEXT,
    "profissao" TEXT,
    "rendaFamiliar" DECIMAL(65,30),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "responsavelId" TEXT,
    CONSTRAINT "candidatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros_familia" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "parentesco" TEXT NOT NULL,
    "renda" DECIMAL(65,30),
    "ocupacao" TEXT,
    "candidatoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "membros_familia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsaveis_legais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "telefone" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" "UF" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    CONSTRAINT "responsaveis_legais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instituicoes" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "cep" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" "UF" NOT NULL,
    "codigoMEC" TEXT,
    "tipoInstituicao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    CONSTRAINT "instituicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_instituicao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'OUTRO',
    "tamanho" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "instituicaoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "documentos_instituicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_instituicao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "cep" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" "UF" NOT NULL,
    "instituicaoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "unidades_instituicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistentes_sociais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cress" TEXT NOT NULL,
    "telefone" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "instituicaoId" TEXT NOT NULL,
    CONSTRAINT "assistentes_sociais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pareceres_sociais" (
    "id" TEXT NOT NULL,
    "parecer" TEXT NOT NULL,
    "recomendacao" TEXT,
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assistenteId" TEXT NOT NULL,
    "candidaturaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pareceres_sociais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advogados" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "oab" TEXT NOT NULL,
    "oabUf" "UF" NOT NULL,
    "telefone" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "instituicaoId" TEXT NOT NULL,
    CONSTRAINT "advogados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pareceres_juridicos" (
    "id" TEXT NOT NULL,
    "parecer" TEXT NOT NULL,
    "fundamentacao" TEXT,
    "recomendacao" TEXT,
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "advogadoId" TEXT NOT NULL,
    "candidaturaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pareceres_juridicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editais" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "anoLetivo" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "vagasDisponiveis" INTEGER NOT NULL,
    "requisitos" TEXT,
    "documentosExigidos" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "instituicaoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "editais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidaturas" (
    "id" TEXT NOT NULL,
    "status" "StatusCandidatura" NOT NULL DEFAULT 'PENDENTE',
    "dataInscricao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT,
    "candidatoId" TEXT NOT NULL,
    "editalId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "candidaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_candidatura" (
    "id" TEXT NOT NULL,
    "status" "StatusCandidatura" NOT NULL,
    "observacao" TEXT,
    "candidaturaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "historico_candidatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tamanho" INTEGER,
    "mimeType" TEXT,
    "status" "StatusDocumento" NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "candidatoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_candidatura" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "StatusDocumento" NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "candidaturaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "documentos_candidatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "duracao" INTEGER NOT NULL DEFAULT 30,
    "local" TEXT,
    "linkOnline" TEXT,
    "realizado" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "candidaturaId" TEXT NOT NULL,
    "assistenteId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL DEFAULT 'INFO',
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_atividade" (
    "id" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "detalhes" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "logs_atividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros_equipe" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cargo" TEXT,
    "role" "Role" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "instituicaoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "membros_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convites_equipe" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "Role" NOT NULL,
    "email" TEXT,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "usadoPor" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "instituicaoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "convites_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE UNIQUE INDEX "sessoes_token_key" ON "sessoes"("token");
CREATE UNIQUE INDEX "tokens_recuperacao_senha_token_key" ON "tokens_recuperacao_senha"("token");
CREATE UNIQUE INDEX "candidatos_cpf_key" ON "candidatos"("cpf");
CREATE UNIQUE INDEX "candidatos_usuarioId_key" ON "candidatos"("usuarioId");
CREATE UNIQUE INDEX "responsaveis_legais_cpf_key" ON "responsaveis_legais"("cpf");
CREATE UNIQUE INDEX "responsaveis_legais_usuarioId_key" ON "responsaveis_legais"("usuarioId");
CREATE UNIQUE INDEX "instituicoes_cnpj_key" ON "instituicoes"("cnpj");
CREATE UNIQUE INDEX "instituicoes_usuarioId_key" ON "instituicoes"("usuarioId");
CREATE UNIQUE INDEX "assistentes_sociais_usuarioId_key" ON "assistentes_sociais"("usuarioId");
CREATE UNIQUE INDEX "pareceres_sociais_candidaturaId_key" ON "pareceres_sociais"("candidaturaId");
CREATE UNIQUE INDEX "advogados_usuarioId_key" ON "advogados"("usuarioId");
CREATE UNIQUE INDEX "pareceres_juridicos_candidaturaId_key" ON "pareceres_juridicos"("candidaturaId");
CREATE UNIQUE INDEX "candidaturas_candidatoId_editalId_key" ON "candidaturas"("candidatoId", "editalId");
CREATE UNIQUE INDEX "membros_equipe_usuarioId_key" ON "membros_equipe"("usuarioId");
CREATE UNIQUE INDEX "convites_equipe_codigo_key" ON "convites_equipe"("codigo");
CREATE UNIQUE INDEX "configuracoes_chave_key" ON "configuracoes"("chave");

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tokens_recuperacao_senha" ADD CONSTRAINT "tokens_recuperacao_senha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidatos" ADD CONSTRAINT "candidatos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidatos" ADD CONSTRAINT "candidatos_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "responsaveis_legais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "membros_familia" ADD CONSTRAINT "membros_familia_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "candidatos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "responsaveis_legais" ADD CONSTRAINT "responsaveis_legais_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instituicoes" ADD CONSTRAINT "instituicoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documentos_instituicao" ADD CONSTRAINT "documentos_instituicao_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unidades_instituicao" ADD CONSTRAINT "unidades_instituicao_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistentes_sociais" ADD CONSTRAINT "assistentes_sociais_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistentes_sociais" ADD CONSTRAINT "assistentes_sociais_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pareceres_sociais" ADD CONSTRAINT "pareceres_sociais_assistenteId_fkey" FOREIGN KEY ("assistenteId") REFERENCES "assistentes_sociais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pareceres_sociais" ADD CONSTRAINT "pareceres_sociais_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "candidaturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "advogados" ADD CONSTRAINT "advogados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "advogados" ADD CONSTRAINT "advogados_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pareceres_juridicos" ADD CONSTRAINT "pareceres_juridicos_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pareceres_juridicos" ADD CONSTRAINT "pareceres_juridicos_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "candidaturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "editais" ADD CONSTRAINT "editais_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "candidatos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_editalId_fkey" FOREIGN KEY ("editalId") REFERENCES "editais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "historico_candidatura" ADD CONSTRAINT "historico_candidatura_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "candidaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "historico_candidatura" ADD CONSTRAINT "historico_candidatura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "candidatos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documentos_candidatura" ADD CONSTRAINT "documentos_candidatura_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "candidaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "candidaturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_assistenteId_fkey" FOREIGN KEY ("assistenteId") REFERENCES "assistentes_sociais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logs_atividade" ADD CONSTRAINT "logs_atividade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membros_equipe" ADD CONSTRAINT "membros_equipe_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membros_equipe" ADD CONSTRAINT "membros_equipe_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "convites_equipe" ADD CONSTRAINT "convites_equipe_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
