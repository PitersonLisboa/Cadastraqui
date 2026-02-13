import { Role } from '@prisma/client'

// ===========================================
// MAPA DE PERMISSÕES POR ROLE
// ===========================================
// Baseado na tabela de requisitos PUC:
//
// ADMIN          → Acesso total
// INSTITUICAO    → Editais, equipe, relatórios, configurações
// SUPERVISAO     → Mesmas funções do AS, mas NÃO defere/indefere
// CONTROLE       → Visualização e encaminhamentos, sem decisão
// OPERACIONAL    → Analisa docs, faz solicitações, NÃO finaliza parecer
// ASSISTENTE_SOCIAL → Análise completa, parecer, deferimento
// ADVOGADO       → APENAS documentos de certificação institucional
// ===========================================

// Roles que pertencem à equipe interna da instituição
export const ROLES_EQUIPE_INSTITUICAO: Role[] = [
  'INSTITUICAO',
  'SUPERVISAO',
  'CONTROLE',
  'OPERACIONAL',
  'ASSISTENTE_SOCIAL',
  'ADVOGADO',
]

// Roles que podem visualizar candidaturas (leitura)
export const ROLES_VISUALIZAR_CANDIDATURAS: Role[] = [
  'ADMIN',
  'INSTITUICAO',
  'SUPERVISAO',
  'CONTROLE',
  'OPERACIONAL',
  'ASSISTENTE_SOCIAL',
]

// Roles que podem analisar candidaturas (escrever observações, solicitar docs)
export const ROLES_ANALISAR_CANDIDATURAS: Role[] = [
  'ADMIN',
  'INSTITUICAO',
  'SUPERVISAO',
  'OPERACIONAL',
  'ASSISTENTE_SOCIAL',
]

// Roles que podem emitir parecer social (deferir/indeferir)
export const ROLES_EMITIR_PARECER_SOCIAL: Role[] = [
  'ASSISTENTE_SOCIAL',
]

// Roles que podem emitir parecer jurídico
// (ADVOGADO limitado a docs institucionais, não candidaturas)
export const ROLES_EMITIR_PARECER_JURIDICO: Role[] = [
  'ADVOGADO',
]

// Roles que podem alterar status de candidatura
export const ROLES_ALTERAR_STATUS_CANDIDATURA: Role[] = [
  'ADMIN',
  'INSTITUICAO',
  'ASSISTENTE_SOCIAL',
]

// Roles que podem gerenciar editais
export const ROLES_GERENCIAR_EDITAIS: Role[] = [
  'ADMIN',
  'INSTITUICAO',
]

// Roles que podem ver relatórios da instituição
export const ROLES_RELATORIOS_INSTITUICAO: Role[] = [
  'ADMIN',
  'INSTITUICAO',
  'SUPERVISAO',
  'CONTROLE',
]

// Roles que podem ver/gerenciar documentos de candidatos
export const ROLES_DOCUMENTOS_CANDIDATOS: Role[] = [
  'ADMIN',
  'INSTITUICAO',
  'SUPERVISAO',
  'OPERACIONAL',
  'ASSISTENTE_SOCIAL',
  'CANDIDATO',
]

// Roles que podem ver/gerenciar documentos INSTITUCIONAIS (certificação CEBAS)
export const ROLES_DOCUMENTOS_INSTITUCIONAIS: Role[] = [
  'ADMIN',
  'INSTITUICAO',
  'ADVOGADO',
]

// Roles que podem gerenciar equipe
export const ROLES_GERENCIAR_EQUIPE: Role[] = [
  'ADMIN',
  'INSTITUICAO',
]

// Roles que podem gerenciar agendamentos
export const ROLES_GERENCIAR_AGENDAMENTOS: Role[] = [
  'ADMIN',
  'ASSISTENTE_SOCIAL',
  'SUPERVISAO',
  'OPERACIONAL',
]

// Roles que podem ver dados de família do candidato
export const ROLES_VER_FAMILIA: Role[] = [
  'ADMIN',
  'INSTITUICAO',
  'SUPERVISAO',
  'OPERACIONAL',
  'ASSISTENTE_SOCIAL',
]

// Roles que podem exportar dados
export const ROLES_EXPORTAR: Role[] = [
  'ADMIN',
  'INSTITUICAO',
  'SUPERVISAO',
]

// Roles que são convidados por código (vinculados a uma instituição)
export const ROLES_CONVIDADOS: Role[] = [
  'ASSISTENTE_SOCIAL',
  'ADVOGADO',
  'SUPERVISAO',
  'CONTROLE',
  'OPERACIONAL',
]
