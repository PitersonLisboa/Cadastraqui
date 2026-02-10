// ===========================================
// TIPOS DO CADASTRAQUI
// ===========================================

export type Role = 'ADMIN' | 'INSTITUICAO' | 'CANDIDATO' | 'ASSISTENTE_SOCIAL' | 'ADVOGADO'

export type UF =
  | 'AC' | 'AL' | 'AM' | 'AP' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO'
  | 'MA' | 'MG' | 'MS' | 'MT' | 'PA' | 'PB' | 'PE' | 'PI' | 'PR'
  | 'RJ' | 'RN' | 'RO' | 'RR' | 'RS' | 'SC' | 'SE' | 'SP' | 'TO'

export type StatusCandidatura = 
  | 'PENDENTE' 
  | 'EM_ANALISE' 
  | 'DOCUMENTACAO_PENDENTE' 
  | 'APROVADO' 
  | 'REPROVADO' 
  | 'CANCELADO'

export type StatusDocumento = 'PENDENTE' | 'ENVIADO' | 'APROVADO' | 'REJEITADO'

// ===========================================
// INTERFACES
// ===========================================

export interface Usuario {
  id: string
  email: string
  role: Role
  ativo: boolean
  primeiroAcesso: boolean
  instituicaoId: string | null
  criadoEm: string
}

export interface Tenant {
  slug: string
  nome: string
  logoUrl: string | null
  corPrimaria: string
  corSecundaria: string
  instituicaoId: string
  configuracoes: Record<string, any> | null
  instituicao: {
    id: string
    razaoSocial: string
    nomeFantasia: string | null
    email: string
    telefone: string
    cidade: string
    uf: string
  }
}

export interface Candidato {
  id: string
  nome: string
  cpf: string
  dataNascimento: string
  telefone: string
  celular?: string
  cep: string
  endereco: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: UF
  estadoCivil?: string
  profissao?: string
  rendaFamiliar?: number
  usuarioId: string
  usuario?: Usuario
  criadoEm: string
  atualizadoEm: string
}

export interface Instituicao {
  id: string
  razaoSocial: string
  nomeFantasia?: string
  cnpj: string
  telefone: string
  email: string
  cep: string
  endereco: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: UF
  codigoMEC?: string
  tipoInstituicao?: string
  usuarioId: string
  usuario?: Usuario
  criadoEm: string
  atualizadoEm: string
}

export interface Edital {
  id: string
  titulo: string
  descricao?: string
  anoLetivo: number
  dataInicio: string
  dataFim: string
  vagasDisponiveis: number
  requisitos?: string
  documentosExigidos?: string
  ativo: boolean
  instituicaoId: string
  instituicao?: Instituicao
  criadoEm: string
  atualizadoEm: string
  _count?: {
    candidaturas: number
  }
}

export interface Candidatura {
  id: string
  status: StatusCandidatura
  dataInscricao: string
  observacoes?: string
  candidatoId: string
  candidato?: Candidato
  editalId: string
  edital?: Edital
}

export interface AssistenteSocial {
  id: string
  nome: string
  cress: string
  telefone?: string
  usuarioId: string
  instituicaoId: string
  usuario?: Usuario
  instituicao?: Instituicao
}

export interface Advogado {
  id: string
  nome: string
  oab: string
  oabUf: UF
  telefone?: string
  usuarioId: string
  instituicaoId: string
  usuario?: Usuario
  instituicao?: Instituicao
}

// ===========================================
// RESPONSES
// ===========================================

export interface LoginResponse {
  token: string
  usuario: Usuario
}

export interface Paginacao {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
}

export interface ListaResponse<T> {
  data: T[]
  paginacao: Paginacao
}

// ===========================================
// CONFIGURAÇÕES DE ROLES
// ===========================================

export interface RoleConfig {
  nome: string
  cor: string
  corClara: string
  icone: string
  rota: string
}

export const ROLES_CONFIG: Record<Role, RoleConfig> = {
  ADMIN: {
    nome: 'Administrador',
    cor: '#991b1b',      // Vermelho/Bordô
    corClara: '#fef2f2',
    icone: '👤',
    rota: '/admin',
  },
  INSTITUICAO: {
    nome: 'Instituição',
    cor: '#1e40af',      // Azul
    corClara: '#eff6ff',
    icone: '🏢',
    rota: '/instituicao',
  },
  CANDIDATO: {
    nome: 'Candidato',
    cor: '#166534',      // Verde
    corClara: '#f0fdf4',
    icone: '🎓',
    rota: '/candidato',
  },
  ASSISTENTE_SOCIAL: {
    nome: 'Assistente Social',
    cor: '#7c3aed',      // Roxo
    corClara: '#faf5ff',
    icone: '👩‍⚕️',
    rota: '/assistente-social',
  },
  ADVOGADO: {
    nome: 'Advogado',
    cor: '#c2410c',      // Laranja
    corClara: '#fff7ed',
    icone: '⚖️',
    rota: '/advogado',
  },
}

export const UF_OPTIONS: { value: UF; label: string }[] = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'PR', label: 'Paraná' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'TO', label: 'Tocantins' },
]
