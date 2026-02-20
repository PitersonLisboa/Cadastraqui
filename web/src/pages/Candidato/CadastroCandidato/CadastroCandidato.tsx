import { useState, useEffect, useRef } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { toast } from 'react-toastify'
import { FiArrowRight, FiArrowLeft, FiTrash2, FiEye, FiPlus, FiX, FiDollarSign, FiChevronDown, FiChevronUp, FiFileText, FiUpload, FiCheck, FiCamera } from 'react-icons/fi'
import { sidebarModeState } from '@/atoms'
import { StepperBar } from '@/components/common/StepperBar/StepperBar'
import { api, rendaService, despesaService, moradiaService, veiculoService, saudeService, ocrService, ocrMembroService, getAuthToken, getApiBaseUrl } from '@/services/api'
import { maskCPF, maskPhone, maskCEP, unmaskValue, fetchAddressByCEP } from '@/utils/masks'
import { DateInput } from '@/components/common/DateInput/DateInput'
import { MembroDetalhe } from './MembroDetalhe'
import styles from './CadastroCandidato.module.scss'

// ===========================================
// CONSTANTES
// ===========================================

const SECTION_IDS = [
  'candidato', 'grupo-familiar', 'moradia', 'veiculo',
  'renda', 'gastos', 'saude', 'declaracoes',
]

const SUB_STEP_LABELS = [
  'Dados Pessoais', 'Endereço e Comprovante',
  'Estado Civil', 'Informações Pessoais',
  'Documento Adicional', 'Benefícios e Programas',
]

const ESTADOS_EMISSOR = [
  { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' }, { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' }, { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' }, { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' }, { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' }, { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' }, { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' }, { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' }, { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' }, { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' }, { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' }, { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
]

const SEXO_OPTIONS = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMININO', label: 'Feminino' },
  { value: 'OUTRO', label: 'Outro' },
]

const ESTADO_CIVIL_OPTIONS = [
  { value: 'SOLTEIRO', label: 'Solteiro(a)' },
  { value: 'CASADO', label: 'Casado(a)' },
  { value: 'DIVORCIADO', label: 'Divorciado(a)' },
  { value: 'VIUVO', label: 'Viúvo(a)' },
  { value: 'UNIAO_ESTAVEL', label: 'União Estável' },
]

const COR_RACA_OPTIONS = [
  { value: 'BRANCA', label: 'Branca' },
  { value: 'PRETA', label: 'Preta' },
  { value: 'PARDA', label: 'Parda' },
  { value: 'AMARELA', label: 'Amarela' },
  { value: 'INDIGENA', label: 'Indígena' },
]

const ESCOLARIDADE_OPTIONS = [
  { value: 'FUNDAMENTAL_INCOMPLETO', label: 'Ensino Fundamental Incompleto' },
  { value: 'FUNDAMENTAL_COMPLETO', label: 'Ensino Fundamental Completo' },
  { value: 'MEDIO_INCOMPLETO', label: 'Ensino Médio Incompleto' },
  { value: 'MEDIO_COMPLETO', label: 'Ensino Médio' },
  { value: 'SUPERIOR_INCOMPLETO', label: 'Superior Incompleto' },
  { value: 'SUPERIOR_COMPLETO', label: 'Superior Completo' },
  { value: 'POS_GRADUACAO', label: 'Pós-graduação' },
]

const RELIGIAO_OPTIONS = [
  { value: 'CATOLICA', label: 'Católica' },
  { value: 'EVANGELICA', label: 'Evangélica' },
  { value: 'ESPIRITA', label: 'Espírita' },
  { value: 'OUTRA', label: 'Outra' },
  { value: 'SEM_RELIGIAO', label: 'Sem religião' },
]

const PARENTESCO_MEMBRO_OPTIONS = [
  { value: 'ESPOSA', label: 'Esposa' },
  { value: 'MARIDO', label: 'Marido' },
  { value: 'PAI', label: 'Pai' },
  { value: 'MAE', label: 'Mãe' },
  { value: 'PADRASTO', label: 'Padrasto' },
  { value: 'MADRASTA', label: 'Madrasta' },
  { value: 'IRMAO', label: 'Irmão/Irmã' },
  { value: 'AVO', label: 'Avô/Avó' },
  { value: 'FILHO', label: 'Filho(a)' },
  { value: 'NETO', label: 'Neto(a)' },
  { value: 'TIO', label: 'Tio(a)' },
  { value: 'SOBRINHO', label: 'Sobrinho(a)' },
  { value: 'PRIMO', label: 'Primo(a)' },
  { value: 'SOGRO', label: 'Sogro(a)' },
  { value: 'CUNHADO', label: 'Cunhado(a)' },
  { value: 'ENTEADO', label: 'Enteado(a)' },
  { value: 'COMPANHEIRO', label: 'Companheiro(a)' },
  { value: 'OUTRO', label: 'Outro' },
]

const ESTADO_CIVIL_MEMBRO_OPTIONS = [
  { value: 'SOLTEIRO', label: 'Solteiro(a)' },
  { value: 'CASADO', label: 'Casado(a)' },
  { value: 'SEPARADO', label: 'Separado(a)' },
  { value: 'DIVORCIADO', label: 'Divorciado(a)' },
  { value: 'VIUVO', label: 'Viúvo(a)' },
  { value: 'UNIAO_ESTAVEL', label: 'União Estável' },
]

const RELIGIAO_MEMBRO_OPTIONS = [
  { value: 'CATOLICA', label: 'Católica' },
  { value: 'EVANGELICA', label: 'Evangélica' },
  { value: 'ESPIRITA', label: 'Espírita' },
  { value: 'ATEIA', label: 'Ateia' },
  { value: 'OUTRA', label: 'Outra' },
  { value: 'NAO_DECLARADA', label: 'Não Declarada' },
]

const MEMBRO_SUB_STEP_LABELS = [
  'Dados Pessoais', 'Estado Civil',
  'Informações Pessoais', 'Documento Adicional', 'Benefícios e Programas',
]

const EMPTY_MEMBRO: Membro = {
  nome: '', cpf: '', parentesco: '',
  dataNascimento: '', telefone: '', email: '',
  rg: '', rgEstado: '', rgOrgao: '',
  nomeSocial: '', sexo: '', profissao: '',
  nacionalidade: '', naturalidade: '', estado: '',
  estadoCivil: '',
  corRaca: '', escolaridade: '', religiao: '',
  necessidadesEspeciais: false,
  tipoNecessidadesEspeciais: '', descricaoNecessidadesEspeciais: '',
  cadastroUnico: false, escolaPublica: false,
  bolsaCebasBasica: false, bolsaCebasProfissional: false,
}

const STATUS_MORADIA = [
  { value: 'PROPRIA_QUITADA', label: 'Própria e quitada' },
  { value: 'PROPRIA_FINANCIADA', label: 'Própria financiada' },
  { value: 'ALUGADA', label: 'Alugada' },
  { value: 'CEDIDA', label: 'Cedida' },
  { value: 'OUTROS', label: 'Outros' },
]

const TIPO_MORADIA = [
  { value: 'CASA', label: 'Casa' },
  { value: 'APARTAMENTO', label: 'Apartamento' },
  { value: 'KITNET', label: 'Kitnet' },
  { value: 'QUARTO', label: 'Quarto' },
  { value: 'OUTROS', label: 'Outros' },
]

const TEMPO_MORADIA = [
  { value: 'MENOS_1', label: 'Menos de 1 ano' },
  { value: '1_A_5', label: 'De 1 a 5 anos' },
  { value: '5_A_10', label: 'De 5 a 10 anos' },
  { value: '10_A_20', label: 'De 10 a 20 anos' },
  { value: 'MAIS_20', label: 'Mais de 20 anos' },
]

const QTD_COMODOS = [
  { value: '1', label: 'Um' }, { value: '2', label: 'Dois' },
  { value: '3', label: 'Três' }, { value: '4', label: 'Quatro' },
  { value: '5', label: 'Cinco' }, { value: '6', label: 'Seis' },
  { value: '7', label: 'Sete' }, { value: '8', label: 'Oito' },
  { value: '9', label: 'Nove' }, { value: '10+', label: 'Dez ou mais' },
]

const MESES_LABEL: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
}

// ===========================================
// TIPOS
// ===========================================

interface DadosPessoais {
  nome: string; cpf: string; dataNascimento: string; telefone: string
  email: string; rg: string; rgEstado: string; rgOrgao: string
}
interface DadosEndereco {
  cep: string; rua: string; numero: string; bairro: string
  cidade: string; complemento: string; uf: string
}
interface DadosAdicionais {
  nomeSocial: string; sexo: string; profissao: string
  nacionalidade: string; naturalidade: string; estado: string
}
interface DadosPessoaisExtra {
  corRaca: string; escolaridade: string; religiao: string
  necessidadesEspeciais: boolean
  tipoNecessidadesEspeciais: string; descricaoNecessidadesEspeciais: string
}
interface DadosBeneficios {
  cadastroUnico: boolean; escolaPublica: boolean
  bolsaCebasBasica: boolean; bolsaCebasProfissional: boolean
}

interface Membro {
  id?: string
  nome: string; cpf: string; parentesco: string
  dataNascimento?: string; telefone?: string; email?: string
  rg?: string; rgEstado?: string; rgOrgao?: string
  nomeSocial?: string; sexo?: string; profissao?: string
  nacionalidade?: string; naturalidade?: string; estado?: string
  estadoCivil?: string
  corRaca?: string; escolaridade?: string; religiao?: string
  necessidadesEspeciais?: boolean
  tipoNecessidadesEspeciais?: string; descricaoNecessidadesEspeciais?: string
  cadastroUnico?: boolean; escolaPublica?: boolean
  bolsaCebasBasica?: boolean; bolsaCebasProfissional?: boolean
  renda?: number; ocupacao?: string; fonteRenda?: string
}
interface Veiculo { id?: string; modelo: string; placa: string; ano: string }
interface RendaMensalItem { id: string; mes: number; ano: number; valor: number; fonte?: string; descricao?: string }
interface DespesaItem { id: string; mes: number; ano: number; categoria: string; descricao?: string; valor: number; naoSeAplica?: boolean; justificativa?: string }

interface DespesaLinha {
  categoria: string
  label: string
  valor: string       // formatado como "0,00"
  naoSeAplica: boolean
  justificativa: string
  existenteId?: string // id do registro existente no banco
}
interface DocumentoItem { id: string; tipo: string; nome: string; url: string; status: string; criadoEm: string }
interface DocumentoMembroItem { id: string; tipo: string; nome: string; status: string; criadoEm: string }

const TIPOS_DOCUMENTO = [
  { value: 'CARTEIRA_MOTORISTA', label: 'Carteira de Motorista' },
  { value: 'CARTEIRA_FUNCIONAL', label: 'Carteira Funcional' },
  { value: 'IDENTIDADE_MILITAR', label: 'Identidade Militar' },
  { value: 'PASSAPORTE', label: 'Passaporte' },
  { value: 'CARTEIRA_TRABALHO', label: 'Carteira de Trabalho' },
  { value: 'OUTROS_EDITAL', label: 'Outro(s) - Conforme Edital' },
]

const TIPOS_DOCUMENTO_MEMBRO = [
  { value: 'RG_MEMBRO', label: 'RG / RNE' },
  { value: 'CARTEIRA_MOTORISTA', label: 'Carteira de Motorista' },
  { value: 'CARTEIRA_TRABALHO', label: 'Carteira de Trabalho' },
  { value: 'CERTIDAO_NASCIMENTO', label: 'Certidão de Nascimento' },
  { value: 'CERTIDAO_CASAMENTO', label: 'Certidão de Casamento' },
  { value: 'COMPROVANTE_MATRICULA', label: 'Comprovante de Matrícula' },
  { value: 'OUTROS', label: 'Outro(s)' },
]

const CATEGORIAS_DESPESA = [
  { value: 'AGUA_ESGOTO', label: 'Água e esgoto' },
  { value: 'ENERGIA_ELETRICA', label: 'Energia Elétrica' },
  { value: 'TELEFONE', label: 'Telefone fixo e celular' },
  { value: 'ALIMENTACAO', label: 'Alimentação' },
  { value: 'ALUGUEL', label: 'Aluguel, aluguel de garagem' },
  { value: 'CONDOMINIO', label: 'Condomínio' },
  { value: 'TV_CABO', label: 'TV a cabo' },
  { value: 'STREAMING', label: 'Serviços de streaming (Disney+, Netflix, Globoplay, etc)' },
  { value: 'COMBUSTIVEL', label: 'Combustível' },
  { value: 'IPVA', label: 'IPVA' },
  { value: 'IPTU_ITR', label: 'IPTU e/ou ITR' },
  { value: 'FINANCIAMENTOS', label: 'Financiamentos: veículos, imóvel' },
  { value: 'IMPOSTO_RENDA', label: 'Imposto de Renda' },
  { value: 'TRANSPORTE', label: 'Transporte coletivo e escolar' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'INTERNET', label: 'Internet' },
  { value: 'CURSOS', label: 'Cursos' },
  { value: 'PLANO_SAUDE', label: 'Plano de saúde e/ou odontológico' },
  { value: 'MEDICAMENTOS', label: 'Despesa com medicamentos' },
]

const FONTES_RENDA = [
  { value: 'CLT', label: 'CLT (carteira assinada)' },
  { value: 'AUTONOMO', label: 'Trabalho autônomo' },
  { value: 'APOSENTADORIA', label: 'Aposentadoria' },
  { value: 'PENSAO', label: 'Pensão' },
  { value: 'ALUGUEL', label: 'Renda de aluguel' },
  { value: 'BENEFICIO', label: 'Benefício social' },
  { value: 'INFORMAL', label: 'Trabalho informal' },
  { value: 'OUTRO', label: 'Outra fonte' },
]

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const DOENCAS_OPTIONS = [
  'Alienação Mental',
  'Cardiopatia Grave',
  'Cegueira',
  'Contaminação por Radiação',
  'Doença de Parkinson',
  'Espondilite Anquilosante',
  'Doença de Paget',
  'Hanseníase (Lepra)',
  'Hepatopatia Grave',
  'Nefropatia Grave',
  'Paralisia',
  'Tuberculose Ativa',
  'HIV/AIDS',
  'Neoplasma Maligno (Câncer)',
  'Estágio Terminal',
  'Microcefalia',
  'Transtorno do Espectro Autista',
  'Doença Rara',
  'Outra Doença de Alto Custo',
]

const SAUDE_STEP_LABELS = ['Doença', 'Medicação']

interface SaudeData {
  id?: string
  possuiDoenca: boolean
  doenca: string
  possuiRelatorioMedico: boolean
  laudoNome?: string | null
  tomaMedicamentoControlado: boolean
  nomeMedicamento: string
  obtemRedePublica: boolean
  especifiqueRedePublica: string
  receitaNome?: string | null
}

const EMPTY_SAUDE: SaudeData = {
  possuiDoenca: false,
  doenca: '',
  possuiRelatorioMedico: false,
  laudoNome: null,
  tomaMedicamentoControlado: false,
  nomeMedicamento: '',
  obtemRedePublica: false,
  especifiqueRedePublica: '',
  receitaNome: null,
}

interface PessoaSaude {
  id: string
  nome: string
  tipo: 'candidato' | 'membro'
  saude: SaudeData | null
}

// ===========================================
// COMPONENTE
// ===========================================

export function CadastroCandidato() {
  const sidebarMode = useRecoilValue(sidebarModeState)
  const setSidebarMode = useSetRecoilState(sidebarModeState)
  const activeSection = sidebarMode.activeSection

  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Sub-step dentro da seção Candidato (0-7)
  const [subStep, setSubStep] = useState(0)

  // --- Dados Pessoais (step 1) ---
  const [dados, setDados] = useState<DadosPessoais>({
    nome: '', cpf: '', dataNascimento: '', telefone: '',
    email: '', rg: '', rgEstado: '', rgOrgao: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [docFile, setDocFile] = useState<File | null>(null)

  // --- Endereço (step 2) ---
  const [endereco, setEndereco] = useState<DadosEndereco>({
    cep: '', rua: '', numero: '', bairro: '', cidade: '', complemento: '', uf: '',
  })

  // --- Comprovante endereço (step 3) ---
  const [possuiComprovante, setPossuiComprovante] = useState(true)
  const comprovanteRef = useRef<HTMLInputElement>(null)
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null)

  // --- Info Adicionais (step 4) ---
  const [adicionais, setAdicionais] = useState<DadosAdicionais>({
    nomeSocial: '', sexo: '', profissao: '', nacionalidade: '', naturalidade: '', estado: '',
  })

  // --- Estado Civil (step 5) ---
  const [estadoCivil, setEstadoCivil] = useState('')
  const certidaoRef = useRef<HTMLInputElement>(null)
  const [certidaoFile, setCertidaoFile] = useState<File | null>(null)

  // --- Info Pessoais (step 6) ---
  const [pessoaisExtra, setPessoaisExtra] = useState<DadosPessoaisExtra>({
    corRaca: '', escolaridade: '', religiao: '', necessidadesEspeciais: false,
    tipoNecessidadesEspeciais: '', descricaoNecessidadesEspeciais: '',
  })

  // --- Documento Adicional (step 7) ---
  const [desejaDocAdicional, setDesejaDocAdicional] = useState(false)
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([])
  const [docTipo, setDocTipo] = useState('')
  const [docArquivo, setDocArquivo] = useState<File | null>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const scanInputRef = useRef<HTMLInputElement>(null)
  const anexarOcrRef = useRef<HTMLInputElement>(null)
  const scanComprovanteRef = useRef<HTMLInputElement>(null)
  const anexarComprovanteRef = useRef<HTMLInputElement>(null)
  const scanCertidaoRef = useRef<HTMLInputElement>(null)
  const anexarCertidaoRef = useRef<HTMLInputElement>(null)
  const [scanningRG, setScanningRG] = useState(false)
  const [ocrCamposPreenchidos, setOcrCamposPreenchidos] = useState<string[]>([])
  const [scanningComprovante, setScanningComprovante] = useState(false)
  const [ocrCamposEndPreenchidos, setOcrCamposEndPreenchidos] = useState<string[]>([])
  const [scanningCertidao, setScanningCertidao] = useState(false)
  const [ocrCamposCertPreenchidos, setOcrCamposCertPreenchidos] = useState<string[]>([])
  const [outrosQtd, setOutrosQtd] = useState(1)
  const [outrosArquivos, setOutrosArquivos] = useState<(File | null)[]>([null])
  const outrosRefs = useRef<(HTMLInputElement | null)[]>([])

  // --- Benefícios (step 8) ---
  const [beneficios, setBeneficios] = useState<DadosBeneficios>({
    cadastroUnico: false, escolaPublica: false,
    bolsaCebasBasica: false, bolsaCebasProfissional: false,
  })

  // --- Grupo Familiar ---
  const [membros, setMembros] = useState<Membro[]>([])
  const [showAddMembro, setShowAddMembro] = useState(false)
  const [novoMembro, setNovoMembro] = useState<Membro>({ ...EMPTY_MEMBRO })
  const [subStepMembro, setSubStepMembro] = useState(0)
  const [editingMembroId, setEditingMembroId] = useState<string | null>(null)
  const [savingMembro, setSavingMembro] = useState(false)
  const [desejaDocAdicionalMembro, setDesejaDocAdicionalMembro] = useState(false)

  // --- Documentos do Membro (tabela separada documentos_membros) ---
  const [docsMembro, setDocsMembro] = useState<DocumentoMembroItem[]>([])
  const [uploadingDocMembro, setUploadingDocMembro] = useState(false)
  const membroDocRgRef = useRef<HTMLInputElement>(null)
  const [membroDocRgFile, setMembroDocRgFile] = useState<File | null>(null)
  const [membroDocTipo, setMembroDocTipo] = useState('')
  const [membroDocFile, setMembroDocFile] = useState<File | null>(null)
  const membroDocInputRef = useRef<HTMLInputElement>(null)
  const [membroOutrosQtd, setMembroOutrosQtd] = useState(1)
  const [membroOutrosArquivos, setMembroOutrosArquivos] = useState<(File | null)[]>([null])
  const membroOutrosRefs = useRef<(HTMLInputElement | null)[]>([])

  // --- OCR para Membro ---
  const scanMembroRgRef = useRef<HTMLInputElement>(null)
  const anexarMembroRgRef = useRef<HTMLInputElement>(null)
  const scanMembroCertidaoRef = useRef<HTMLInputElement>(null)
  const anexarMembroCertidaoRef = useRef<HTMLInputElement>(null)
  const [scanningMembroRG, setScanningMembroRG] = useState(false)
  const [ocrCamposMembroPreenchidos, setOcrCamposMembroPreenchidos] = useState<string[]>([])
  const [scanningMembroCertidao, setScanningMembroCertidao] = useState(false)
  const [ocrCamposMembroCertPreenchidos, setOcrCamposMembroCertPreenchidos] = useState<string[]>([])

  // --- Moradia ---
  const [subStepMoradia, setSubStepMoradia] = useState(0)
  const [statusMoradia, setStatusMoradia] = useState('')
  const [tipoMoradia, setTipoMoradia] = useState('')
  const [tempoMoradia, setTempoMoradia] = useState('')
  const [qtdComodos, setQtdComodos] = useState('')
  const [qtdDormitorios, setQtdDormitorios] = useState('')

  // --- Veículo ---
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [showAddVeiculo, setShowAddVeiculo] = useState(false)
  const [novoVeiculo, setNovoVeiculo] = useState<Veiculo>({ modelo: '', placa: '', ano: '' })

  // --- Renda / Gastos ---
  const [rendaMedia, setRendaMedia] = useState('0,00')
  const [rendaPerCapita, setRendaPerCapita] = useState('0,00')
  const [membrosRenda, setMembrosRenda] = useState<any[]>([])
  const [rendaDrawerMembro, setRendaDrawerMembro] = useState<string | null>(null)
  const [rendaDrawerData, setRendaDrawerData] = useState<{ membro: any; rendas: RendaMensalItem[]; resumo: any } | null>(null)
  const [rendaDrawerLoading, setRendaDrawerLoading] = useState(false)
  const [showRendaForm, setShowRendaForm] = useState<string | null>(null) // mesKey  
  const [novaRenda, setNovaRenda] = useState({ valor: '', fonte: '', descricao: '' })
  const [savingRenda, setSavingRenda] = useState(false)

  // Gastos
  const [gastoUltimoMes, setGastoUltimoMes] = useState(0)
  const [gastoMediaTrimestre, setGastoMediaTrimestre] = useState(0)
  const [despesasPorMes, setDespesasPorMes] = useState<Record<string, { total: number; despesas: DespesaItem[] }>>({})
  const [despesaDrawerMes, setDespesaDrawerMes] = useState<{ mes: number; ano: number } | null>(null)
  const [despesaDrawerData, setDespesaDrawerData] = useState<DespesaItem[]>([])
  const [despesaDrawerTotal, setDespesaDrawerTotal] = useState(0)
  const [despesaDrawerLoading, setDespesaDrawerLoading] = useState(false)
  const [showDespesaForm, setShowDespesaForm] = useState(false)
  const [novaDespesa, setNovaDespesa] = useState({ categoria: '', descricao: '', valor: '' })
  const [savingDespesa, setSavingDespesa] = useState(false)
  // Novo layout tabular de despesas
  const [despesaLinhas, setDespesaLinhas] = useState<DespesaLinha[]>([])
  const [despesasExtras, setDespesasExtras] = useState<DespesaLinha[]>([])
  const [despesaMesAtual, setDespesaMesAtual] = useState(() => {
    const now = new Date()
    return { mes: now.getMonth() + 1, ano: now.getFullYear() }
  })
  const [despesaCarregada, setDespesaCarregada] = useState(false)

  // Membro selecionado para visualizar no drawer
  const [membroAberto, setMembroAberto] = useState<string | null>(null)

  // ── Saúde ──
  const [pessoasSaude, setPessoasSaude] = useState<PessoaSaude[]>([])
  const [saudePessoaAberta, setSaudePessoaAberta] = useState<PessoaSaude | null>(null)
  const [saudeSubStep, setSaudeSubStep] = useState(0) // 0 = Doença, 1 = Medicação
  const [saudeForm, setSaudeForm] = useState<SaudeData>({ ...EMPTY_SAUDE })
  const [savingSaude, setSavingSaude] = useState(false)
  const laudoInputRef = useRef<HTMLInputElement>(null)
  const receitaInputRef = useRef<HTMLInputElement>(null)

  // Ativar modo cadastro ao montar
  useEffect(() => {
    setSidebarMode((prev) => ({ ...prev, mode: 'cadastro' }))
    carregarDados()
    return () => { setSidebarMode({ mode: 'menu', activeSection: 'candidato' }) }
  }, [])

  const carregarDados = async () => {
    try {
      const res = await api.get('/candidatos/me')
      const c = res.data
      if (c) {
        setDados({
          nome: c.nome || '', cpf: c.cpf ? maskCPF(c.cpf) : '',
          dataNascimento: c.dataNascimento ? c.dataNascimento.split('T')[0] : '',
          telefone: c.telefone ? maskPhone(c.telefone) : '',
          email: c.usuario?.email || '', rg: c.rg || '',
          rgEstado: c.rgEstado || '', rgOrgao: c.rgOrgao || '',
        })
        if (c.cep || c.endereco) setEndereco({
          cep: c.cep ? maskCEP(c.cep) : '', rua: c.endereco || '', numero: c.numero || '',
          bairro: c.bairro || '', cidade: c.cidade || '',
          complemento: c.complemento || '', uf: c.uf || '',
        })
        if (c.possuiComprovante !== null && c.possuiComprovante !== undefined) setPossuiComprovante(c.possuiComprovante)
        setAdicionais({
          nomeSocial: c.nomeSocial || '', sexo: c.sexo || '',
          profissao: c.profissao || '', nacionalidade: c.nacionalidade || '',
          naturalidade: c.naturalidade || '', estado: c.naturalidadeEstado || '',
        })
        if (c.estadoCivil) setEstadoCivil(c.estadoCivil)
        setPessoaisExtra({
          corRaca: c.corRaca || '', escolaridade: c.escolaridade || '',
          religiao: c.religiao || '', necessidadesEspeciais: c.necessidadesEspeciais || false,
          tipoNecessidadesEspeciais: c.tipoNecessidadesEspeciais || '', descricaoNecessidadesEspeciais: c.descricaoNecessidadesEspeciais || '',
        })
        console.log('📋 Necessidades carregadas:', { necessidadesEspeciais: c.necessidadesEspeciais, tipo: c.tipoNecessidadesEspeciais, descricao: c.descricaoNecessidadesEspeciais })
        setBeneficios({
          cadastroUnico: c.cadastroUnico || false, escolaPublica: c.escolaPublica || false,
          bolsaCebasBasica: c.bolsaCebasBasica || false, bolsaCebasProfissional: c.bolsaCebasProfissional || false,
        })
        setRendaMedia(c.rendaFamiliar ? Number(c.rendaFamiliar).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00')
      } else {
        // Candidato novo — ativar modo edição automaticamente
        setEditMode(true)
      }
      try { const m = await api.get('/familia/membros'); setMembros(m.data.membros || []) } catch {}
      // Carregar rendas
      try {
        const r = await rendaService.listar()
        setMembrosRenda(r.membros || [])
        setRendaMedia(formatCurrency(r.resumo?.rendaMediaMensal || 0))
        setRendaPerCapita(formatCurrency(r.resumo?.rendaPerCapita || 0))
      } catch {}
      // Carregar despesas
      try {
        const d = await despesaService.listar()
        setGastoUltimoMes(d.resumo?.ultimoMes || 0)
        setGastoMediaTrimestre(d.resumo?.mediaTrimestre || 0)
        // Montar mapa por mês
        const porMes: Record<string, { total: number; despesas: DespesaItem[] }> = {}
        if (d.resumo?.porMes) {
          Object.entries(d.resumo.porMes).forEach(([chave, val]: [string, any]) => {
            porMes[chave] = { total: val.total, despesas: val.despesas }
          })
        }
        setDespesasPorMes(porMes)
      } catch {}
      // Carregar moradia
      try {
        const mor = await moradiaService.buscar()
        if (mor) {
          setStatusMoradia(mor.statusMoradia || '')
          setTipoMoradia(mor.tipoMoradia || '')
          setTempoMoradia(mor.tempoMoradia || '')
          setQtdComodos(mor.qtdComodos || '')
          setQtdDormitorios(mor.qtdDormitorios?.toString() || '')
        }
      } catch {}
      // Carregar veículos
      try {
        const v = await veiculoService.listar()
        setVeiculos((v.veiculos || []).map((ve: any) => ({ id: ve.id, modelo: ve.modelo, placa: ve.placa || '', ano: ve.ano || '' })))
      } catch {}
      // Carregar documentos
      try {
        const docs = await api.get('/documentos')
        const lista = docs.data.documentos || docs.data || []
        console.log('📄 Documentos carregados:', lista.length, lista.map((d: any) => d.tipo))
        setDocumentos(Array.isArray(lista) ? lista : [])
      } catch (docErr: any) {
        console.warn('Erro ao carregar documentos:', docErr.response?.status, docErr.response?.data?.message || docErr.message)
      }
      // Carregar saúde
      try { await carregarSaude() } catch {}
    } catch {}
    finally { setLoading(false) }
  }

  const handleSaveDados = async () => {
    if (!dados.nome || !dados.cpf) return toast.error('Nome e CPF são obrigatórios')
    if (pessoaisExtra.necessidadesEspeciais && !pessoaisExtra.tipoNecessidadesEspeciais) return toast.error('Informe o tipo de necessidade especial')
    if (pessoaisExtra.necessidadesEspeciais && !pessoaisExtra.descricaoNecessidadesEspeciais) return toast.error('Informe a descrição da necessidade especial')
    setSaving(true)
    try {
      // Montar payload removendo campos vazios
      const payload: any = {}
      // Dados pessoais (sempre enviados)
      payload.nome = dados.nome
      payload.cpf = unmaskValue(dados.cpf)
      if (dados.dataNascimento) payload.dataNascimento = dados.dataNascimento
      if (unmaskValue(dados.telefone)) payload.telefone = unmaskValue(dados.telefone)
      if (dados.rg) payload.rg = dados.rg
      if (dados.rgEstado) payload.rgEstado = dados.rgEstado
      if (dados.rgOrgao) payload.rgOrgao = dados.rgOrgao
      if (possuiComprovante !== undefined) payload.possuiComprovante = possuiComprovante
      // Endereço
      if (unmaskValue(endereco.cep)) payload.cep = unmaskValue(endereco.cep)
      if (endereco.rua) payload.endereco = endereco.rua
      if (endereco.numero) payload.numero = endereco.numero
      if (endereco.bairro) payload.bairro = endereco.bairro
      if (endereco.cidade) payload.cidade = endereco.cidade
      if (endereco.complemento) payload.complemento = endereco.complemento
      if (endereco.uf) payload.uf = endereco.uf
      // Dados adicionais
      if (adicionais.nomeSocial) payload.nomeSocial = adicionais.nomeSocial
      if (adicionais.sexo) payload.sexo = adicionais.sexo
      if (adicionais.profissao) payload.profissao = adicionais.profissao
      if (adicionais.nacionalidade) payload.nacionalidade = adicionais.nacionalidade
      if (adicionais.naturalidade) payload.naturalidade = adicionais.naturalidade
      if (adicionais.estado) payload.naturalidadeEstado = adicionais.estado
      // Estado civil
      if (estadoCivil) payload.estadoCivil = estadoCivil
      // Pessoais extra
      if (pessoaisExtra.corRaca) payload.corRaca = pessoaisExtra.corRaca
      if (pessoaisExtra.escolaridade) payload.escolaridade = pessoaisExtra.escolaridade
      if (pessoaisExtra.religiao) payload.religiao = pessoaisExtra.religiao
      if (pessoaisExtra.necessidadesEspeciais !== undefined) payload.necessidadesEspeciais = pessoaisExtra.necessidadesEspeciais
      if (pessoaisExtra.tipoNecessidadesEspeciais) payload.tipoNecessidadesEspeciais = pessoaisExtra.tipoNecessidadesEspeciais
      if (pessoaisExtra.descricaoNecessidadesEspeciais) payload.descricaoNecessidadesEspeciais = pessoaisExtra.descricaoNecessidadesEspeciais
      console.log('💾 Payload necessidades:', { necessidadesEspeciais: payload.necessidadesEspeciais, tipo: payload.tipoNecessidadesEspeciais, descricao: payload.descricaoNecessidadesEspeciais })
      // Benefícios
      if (beneficios.cadastroUnico !== undefined) payload.cadastroUnico = beneficios.cadastroUnico
      if (beneficios.escolaPublica !== undefined) payload.escolaPublica = beneficios.escolaPublica
      if (beneficios.bolsaCebasBasica !== undefined) payload.bolsaCebasBasica = beneficios.bolsaCebasBasica
      if (beneficios.bolsaCebasProfissional !== undefined) payload.bolsaCebasProfissional = beneficios.bolsaCebasProfissional

      await api.put('/candidatos/me', payload)
      toast.success('Dados salvos!')
      setEditMode(false)
      carregarDados()
    } catch (error: any) {
      const msg = error.response?.data?.errors?.join(', ') || error.response?.data?.message || 'Erro ao salvar'
      toast.error(msg)
    }
    finally { setSaving(false) }
  }

  const handleSaveMoradia = async () => {
    try {
      await moradiaService.salvar({
        statusMoradia, tipoMoradia, tempoMoradia, qtdComodos,
        qtdDormitorios: qtdDormitorios ? parseInt(qtdDormitorios) : undefined,
      })
      toast.success('Moradia salva!')
    } catch { toast.error('Erro ao salvar moradia') }
  }

  const handleAddVeiculo = async () => {
    if (!novoVeiculo.modelo) return toast.error('Informe o modelo')
    try {
      await veiculoService.criar({ modelo: novoVeiculo.modelo, placa: novoVeiculo.placa, ano: novoVeiculo.ano })
      toast.success('Veículo adicionado!')
      setNovoVeiculo({ modelo: '', placa: '', ano: '' })
      setShowAddVeiculo(false)
      carregarDados()
    } catch (error: any) { toast.error(error.response?.data?.message || 'Erro') }
  }

  const handleRemoveVeiculo = async (id: string) => {
    if (!confirm('Excluir este veículo?')) return
    try { await veiculoService.excluir(id); toast.success('Removido'); carregarDados() }
    catch { toast.error('Erro ao remover') }
  }

  const handleCEPChange = async (cep: string) => {
    const clean = unmaskValue(cep)
    if (clean.length === 8) {
      const addr = await fetchAddressByCEP(clean)
      if (addr) {
        setEndereco(prev => ({ ...prev, rua: addr.logradouro, bairro: addr.bairro, cidade: addr.localidade, uf: addr.uf }))
        toast.success('Endereço encontrado!')
      }
    }
  }

  const handleSaveMembroInternal = async (returnToList: boolean) => {
    if (!novoMembro.parentesco) return toast.error('Selecione o parentesco')
    if (subStepMembro >= 1 && !novoMembro.nome) return toast.error('Preencha o nome')
    setSavingMembro(true)
    try {
      const payload: any = {
        nome: novoMembro.nome || 'Novo Membro',
        parentesco: novoMembro.parentesco,
        cpf: novoMembro.cpf ? unmaskValue(novoMembro.cpf) : undefined,
        dataNascimento: novoMembro.dataNascimento || undefined,
        telefone: novoMembro.telefone ? unmaskValue(novoMembro.telefone) : undefined,
        email: novoMembro.email || undefined,
        rg: novoMembro.rg || undefined,
        rgEstado: novoMembro.rgEstado || undefined,
        rgOrgao: novoMembro.rgOrgao || undefined,
        nomeSocial: novoMembro.nomeSocial || undefined,
        sexo: novoMembro.sexo || undefined,
        profissao: novoMembro.profissao || undefined,
        nacionalidade: novoMembro.nacionalidade || undefined,
        naturalidade: novoMembro.naturalidade || undefined,
        estado: novoMembro.estado || undefined,
        estadoCivil: novoMembro.estadoCivil || undefined,
        corRaca: novoMembro.corRaca || undefined,
        escolaridade: novoMembro.escolaridade || undefined,
        religiao: novoMembro.religiao || undefined,
        necessidadesEspeciais: novoMembro.necessidadesEspeciais ?? false,
        tipoNecessidadesEspeciais: novoMembro.tipoNecessidadesEspeciais || undefined,
        descricaoNecessidadesEspeciais: novoMembro.descricaoNecessidadesEspeciais || undefined,
        cadastroUnico: novoMembro.cadastroUnico ?? false,
        escolaPublica: novoMembro.escolaPublica ?? false,
        bolsaCebasBasica: novoMembro.bolsaCebasBasica ?? false,
        bolsaCebasProfissional: novoMembro.bolsaCebasProfissional ?? false,
      }
      if (editingMembroId) {
        await api.put(`/familia/membros/${editingMembroId}`, payload)
        toast.success('Dados salvos!')
      } else {
        const res = await api.post('/familia/membros', payload)
        toast.success('Membro criado!')
        // Após criar, pegar o ID para poder continuar editando nos próximos steps
        if (res.data?.membro?.id) {
          setEditingMembroId(res.data.membro.id)
          carregarDocsMembro(res.data.membro.id)
        }
      }
      if (returnToList) {
        setNovoMembro({ ...EMPTY_MEMBRO })
        setShowAddMembro(false)
        setEditingMembroId(null)
        setSubStepMembro(0)
      }
      carregarDados()
    } catch (error: any) { toast.error(error.response?.data?.message || 'Erro ao salvar membro') }
    finally { setSavingMembro(false) }
  }

  const handleSaveMembroStep = () => handleSaveMembroInternal(false)
  const handleConcluirMembro = () => handleSaveMembroInternal(true)

  const handleEditMembro = (m: Membro) => {
    setEditingMembroId(m.id || null)
    setNovoMembro({
      ...m,
      cpf: m.cpf ? maskCPF(m.cpf) : '',
      telefone: m.telefone ? maskPhone(m.telefone) : '',
      dataNascimento: m.dataNascimento ? m.dataNascimento.split('T')[0] : '',
    })
    setSubStepMembro(0)
    setShowAddMembro(true)
    if (m.id) carregarDocsMembro(m.id)
  }

  const handleCancelMembro = () => {
    setNovoMembro({ ...EMPTY_MEMBRO })
    setShowAddMembro(false)
    setEditingMembroId(null)
    setSubStepMembro(0)
    setDocsMembro([])
    setMembroDocRgFile(null)
    setMembroDocFile(null)
    setMembroDocTipo('')
    setMembroOutrosArquivos([null])
    setOcrCamposMembroPreenchidos([])
    setOcrCamposMembroCertPreenchidos([])
  }

  // ── Documentos do Membro (tabela documentos_membros) ──

  const carregarDocsMembro = async (membroId: string) => {
    try {
      const res = await api.get(`/familia/membros/${membroId}/documentos`)
      setDocsMembro(res.data.documentos || [])
    } catch { setDocsMembro([]) }
  }

  const handleUploadDocMembro = async (file: File, tipo: string) => {
    if (!editingMembroId) return toast.error('Salve o membro antes de enviar documentos')
    setUploadingDocMembro(true)
    try {
      const formData = new FormData()
      formData.append('tipo', tipo)
      formData.append('file', file)
      await api.post(`/familia/membros/${editingMembroId}/documentos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Documento enviado!')
      carregarDocsMembro(editingMembroId)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao enviar documento')
    } finally { setUploadingDocMembro(false) }
  }

  const handleUploadDocMembroOutros = async () => {
    if (!editingMembroId) return toast.error('Salve o membro antes de enviar documentos')
    const arquivosValidos = membroOutrosArquivos.filter(f => f !== null) as File[]
    if (arquivosValidos.length === 0) return toast.error('Selecione ao menos um arquivo')
    const jaEnviados = docsMembro.filter(d => d.tipo === 'OUTROS').length
    if (jaEnviados + arquivosValidos.length > 5) {
      return toast.error(`Limite de 5 documentos "Outros". Já enviados: ${jaEnviados}.`)
    }
    setUploadingDocMembro(true)
    let enviados = 0
    for (const arquivo of arquivosValidos) {
      try {
        const formData = new FormData()
        formData.append('tipo', 'OUTROS')
        formData.append('file', arquivo)
        await api.post(`/familia/membros/${editingMembroId}/documentos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        enviados++
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Erro ao enviar')
      }
    }
    if (enviados > 0) {
      toast.success(`${enviados} documento(s) enviado(s)!`)
      setMembroOutrosArquivos(Array(membroOutrosQtd).fill(null))
      membroOutrosRefs.current.forEach(ref => { if (ref) ref.value = '' })
      carregarDocsMembro(editingMembroId)
    }
    setUploadingDocMembro(false)
  }

  const handleViewDocMembro = (membroId: string, docId: string) => {
    const token = getAuthToken()
    if (!token) return toast.error('Sessão expirada. Faça login novamente.')
    window.open(`${getApiBaseUrl()}/familia/membros/${membroId}/documentos/${docId}/download?token=${encodeURIComponent(token)}`, '_blank')
  }

  const handleExcluirDocMembro = async (membroId: string, docId: string) => {
    if (!confirm('Excluir este documento?')) return
    try {
      await api.delete(`/familia/membros/${membroId}/documentos/${docId}`)
      toast.success('Documento removido')
      carregarDocsMembro(membroId)
    } catch { toast.error('Erro ao remover documento') }
  }

  const handleRemoveMembro = async (id: string) => {
    if (!confirm('Excluir este membro?')) return
    try { await api.delete(`/familia/membros/${id}`); toast.success('Removido'); carregarDados() }
    catch { toast.error('Erro ao remover') }
  }

  // ── OCR Membro: Escanear RG ──
  const handleScanMembroRG = async (file: File) => {
    if (!editingMembroId) return toast.error('Salve o membro antes de escanear')
    setScanningMembroRG(true)
    setOcrCamposMembroPreenchidos([])

    try {
      const res = await ocrMembroService.escanearRG(editingMembroId, file)
      const d = res.dados
      const preenchidos: string[] = []

      setNovoMembro(prev => {
        const updated = { ...prev }
        if (d.nome && !prev.nome?.trim()) { updated.nome = d.nome; preenchidos.push('nome') }
        if (d.cpf && !prev.cpf?.trim()) { updated.cpf = maskCPF(d.cpf); preenchidos.push('cpf') }
        if (d.dataNascimento && !prev.dataNascimento?.trim()) { updated.dataNascimento = d.dataNascimento; preenchidos.push('dataNascimento') }
        if (d.rg && !prev.rg?.trim()) { updated.rg = d.rg; preenchidos.push('rg') }
        if (d.orgaoEmissor && !prev.rgOrgao?.trim()) { updated.rgOrgao = d.orgaoEmissor; preenchidos.push('rgOrgao') }
        if (d.estadoEmissor && !prev.rgEstado?.trim()) { updated.rgEstado = d.estadoEmissor; preenchidos.push('rgEstado') }
        if (d.nacionalidade && !prev.nacionalidade?.trim()) { updated.nacionalidade = d.nacionalidade; preenchidos.push('nacionalidade') }
        if (d.naturalidade && !prev.naturalidade?.trim()) { updated.naturalidade = d.naturalidade; preenchidos.push('naturalidade') }
        if (d.naturalidadeEstado && !prev.estado?.trim()) { updated.estado = d.naturalidadeEstado; preenchidos.push('estado') }
        return updated
      })

      setOcrCamposMembroPreenchidos(preenchidos)

      const lado = res.qualLado === 'verso' ? ' (verso)' : res.qualLado === 'frente' ? ' (frente)' : ''
      if (preenchidos.length > 0) {
        toast.success(`${preenchidos.length} campo(s) preenchido(s) automaticamente${lado}! Revise e salve.`)
      } else {
        toast.warn(`Não foi possível extrair novos dados da imagem${lado}. Campos já preenchidos foram mantidos.`)
      }

      if (res.documentoSalvo) {
        carregarDocsMembro(editingMembroId)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao escanear documento')
    } finally {
      setScanningMembroRG(false)
    }
  }

  // ── OCR Membro: Escanear Certidão ──
  const handleScanMembroCertidao = async (file: File) => {
    if (!editingMembroId) return toast.error('Salve o membro antes de escanear')
    setScanningMembroCertidao(true)
    setOcrCamposMembroCertPreenchidos([])

    try {
      const res = await ocrMembroService.escanearCertidao(editingMembroId, file)
      const d = res.dados
      const preenchidos: string[] = []

      if (d.estadoCivil && !novoMembro.estadoCivil?.trim()) {
        setNovoMembro(prev => ({ ...prev, estadoCivil: d.estadoCivil }))
        preenchidos.push('estadoCivil')
      }

      setOcrCamposMembroCertPreenchidos(preenchidos)

      if (preenchidos.length > 0) {
        toast.success('Estado civil preenchido automaticamente! Revise e salve.')
      } else if (d.estadoCivil && novoMembro.estadoCivil?.trim()) {
        toast.info('Certidão processada. O campo estado civil já estava preenchido.')
      } else {
        toast.warn('Não foi possível detectar o estado civil na imagem. Preencha manualmente.')
      }

      if (res.documentoSalvo) {
        carregarDocsMembro(editingMembroId)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao processar certidão')
    } finally {
      setScanningMembroCertidao(false)
    }
  }

  const sectionIndex = SECTION_IDS.indexOf(activeSection)
  const goToNextSection = () => {
    if (sectionIndex < SECTION_IDS.length - 1) setSidebarMode({ mode: 'cadastro', activeSection: SECTION_IDS[sectionIndex + 1] })
  }
  const goToSection = (i: number) => {
    if (i >= 0 && i < SECTION_IDS.length) setSidebarMode({ mode: 'cadastro', activeSection: SECTION_IDS[i] })
  }

  // ── Renda Drawer ──
  const abrirRendaDrawer = async (membroId: string) => {
    setRendaDrawerMembro(membroId)
    setRendaDrawerLoading(true)
    try {
      const res = await rendaService.doMembro(membroId)
      setRendaDrawerData({
        membro: res.membro,
        rendas: res.rendas || [],
        resumo: res.resumo,
      })
    } catch { toast.error('Erro ao carregar rendas') }
    finally { setRendaDrawerLoading(false) }
  }

  const handleSalvarRenda = async (membroId: string, mes: number, ano: number) => {
    const valor = parseFloat(novaRenda.valor.replace(/\./g, '').replace(',', '.'))
    if (isNaN(valor) || valor < 0) return toast.error('Informe um valor válido')
    setSavingRenda(true)
    try {
      await rendaService.salvar({
        membroId, mes, ano, valor,
        fonte: novaRenda.fonte || undefined,
        descricao: novaRenda.descricao || undefined,
      })
      toast.success('Renda salva!')
      setNovaRenda({ valor: '', fonte: '', descricao: '' })
      setShowRendaForm(null)
      abrirRendaDrawer(membroId)
      carregarDados()
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erro ao salvar') }
    finally { setSavingRenda(false) }
  }

  const handleExcluirRenda = async (rendaId: string, membroId: string) => {
    if (!confirm('Excluir este registro de renda?')) return
    try {
      await rendaService.excluir(rendaId)
      toast.success('Removido')
      abrirRendaDrawer(membroId)
      carregarDados()
    } catch { toast.error('Erro ao remover') }
  }

  // ── Despesa Drawer ──
  const abrirDespesaDrawer = async (mes: number, ano: number) => {
    setDespesaDrawerMes({ mes, ano })
    setDespesaDrawerLoading(true)
    try {
      const res = await despesaService.resumoMes(ano, mes)
      setDespesaDrawerData(res.despesas || [])
      setDespesaDrawerTotal(res.total || 0)
    } catch { toast.error('Erro ao carregar despesas') }
    finally { setDespesaDrawerLoading(false) }
  }

  const handleSalvarDespesa = async () => {
    if (!despesaDrawerMes) return
    const valor = parseFloat(novaDespesa.valor.replace(/\./g, '').replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return toast.error('Informe um valor válido')
    if (!novaDespesa.categoria) return toast.error('Selecione uma categoria')
    setSavingDespesa(true)
    try {
      await despesaService.criar({
        mes: despesaDrawerMes.mes,
        ano: despesaDrawerMes.ano,
        categoria: novaDespesa.categoria,
        descricao: novaDespesa.descricao || undefined,
        valor,
      })
      toast.success('Despesa adicionada!')
      setNovaDespesa({ categoria: '', descricao: '', valor: '' })
      setShowDespesaForm(false)
      abrirDespesaDrawer(despesaDrawerMes.mes, despesaDrawerMes.ano)
      carregarDados()
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erro ao salvar') }
    finally { setSavingDespesa(false) }
  }

  const handleExcluirDespesa = async (despesaId: string) => {
    if (!despesaDrawerMes || !confirm('Excluir esta despesa?')) return
    try {
      await despesaService.excluir(despesaId)
      toast.success('Removida')
      abrirDespesaDrawer(despesaDrawerMes.mes, despesaDrawerMes.ano)
      carregarDados()
    } catch { toast.error('Erro ao remover') }
  }

  // --- Documento handlers ---
  // ── Handler Escanear RG ──
  const handleScanRG = async (file: File) => {
    setScanningRG(true)
    setOcrCamposPreenchidos([])

    // Ativar modo edição ANTES do scan
    setEditMode(true)

    try {
      const res = await ocrService.escanearRG(file)
      const d = res.dados
      const preenchidos: string[] = []

      // Merge inteligente: só preenche campos que estão VAZIOS
      // (segundo scan do verso não sobrescreve dados da frente)
      setDados(prev => {
        const updated = { ...prev }
        if (d.nome && !prev.nome?.trim()) { updated.nome = d.nome; preenchidos.push('nome') }
        if (d.cpf && !prev.cpf?.trim()) { updated.cpf = maskCPF(d.cpf); preenchidos.push('cpf') }
        if (d.dataNascimento && !prev.dataNascimento?.trim()) { updated.dataNascimento = d.dataNascimento; preenchidos.push('dataNascimento') }
        if (d.rg && !prev.rg?.trim()) { updated.rg = d.rg; preenchidos.push('rg') }
        if (d.orgaoEmissor && !prev.rgOrgao?.trim()) { updated.rgOrgao = d.orgaoEmissor; preenchidos.push('rgOrgao') }
        if (d.estadoEmissor && !prev.rgEstado?.trim()) { updated.rgEstado = d.estadoEmissor; preenchidos.push('rgEstado') }
        return updated
      })

      // Merge de campos adicionais (nacionalidade, naturalidade, estado)
      setAdicionais(prev => {
        const updated = { ...prev }
        if (d.nacionalidade && !prev.nacionalidade?.trim()) { updated.nacionalidade = d.nacionalidade; preenchidos.push('nacionalidade') }
        if (d.naturalidade && !prev.naturalidade?.trim()) { updated.naturalidade = d.naturalidade; preenchidos.push('naturalidade') }
        if (d.naturalidadeEstado && !prev.estado?.trim()) { updated.estado = d.naturalidadeEstado; preenchidos.push('estado') }
        return updated
      })

      setOcrCamposPreenchidos(preenchidos)

      const lado = res.qualLado === 'verso' ? ' (verso)' : res.qualLado === 'frente' ? ' (frente)' : ''
      if (preenchidos.length > 0) {
        toast.success(`${preenchidos.length} campo(s) preenchido(s) automaticamente${lado}! Revise e salve.`)
      } else {
        toast.warn(`Não foi possível extrair novos dados da imagem${lado}. Campos já preenchidos foram mantidos.`)
      }

      if (res.documentoSalvo) {
        // Recarregar documentos (sem recarregar dados que acabamos de preencher)
        try {
          const docs = await api.get('/documentos')
          const lista = docs.data.documentos || docs.data || []
          setDocumentos(Array.isArray(lista) ? lista : [])
        } catch {}
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao escanear documento'
      toast.error(msg)
    } finally {
      setScanningRG(false)
    }
  }

  // ── Handler Escanear Comprovante de Endereço ──
  const handleScanComprovante = async (file: File) => {
    setScanningComprovante(true)
    setOcrCamposEndPreenchidos([])
    setEditMode(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/ocr/comprovante', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const d = res.data.dados
      const preenchidos: string[] = []

      setEndereco(prev => {
        const updated = { ...prev }
        if (d.cep && !prev.cep?.trim()) { updated.cep = d.cep; preenchidos.push('cep') }
        if (d.rua && !prev.rua?.trim()) { updated.rua = d.rua; preenchidos.push('rua') }
        if (d.numero && !prev.numero?.trim()) { updated.numero = d.numero; preenchidos.push('numero') }
        if (d.bairro && !prev.bairro?.trim()) { updated.bairro = d.bairro; preenchidos.push('bairro') }
        if (d.cidade && !prev.cidade?.trim()) { updated.cidade = d.cidade; preenchidos.push('cidade') }
        if (d.uf && !prev.uf?.trim()) { updated.uf = d.uf; preenchidos.push('uf') }
        if (d.complemento && !prev.complemento?.trim()) { updated.complemento = d.complemento; preenchidos.push('complemento') }
        return updated
      })

      setOcrCamposEndPreenchidos(preenchidos)

      if (preenchidos.length > 0) {
        toast.success(`${preenchidos.length} campo(s) de endereço preenchido(s) automaticamente! Revise e salve.`)
      } else {
        toast.warn('Não foi possível extrair dados de endereço da imagem. Campos já preenchidos foram mantidos.')
      }

      if (res.data.documentoSalvo) {
        try {
          const docs = await api.get('/documentos')
          const lista = docs.data.documentos || docs.data || []
          setDocumentos(Array.isArray(lista) ? lista : [])
        } catch {}
        setPossuiComprovante(true)
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao processar comprovante'
      toast.error(msg)
    } finally {
      setScanningComprovante(false)
    }
  }

  // ── Handler Escanear Certidão (Estado Civil) ──
  const handleScanCertidao = async (file: File) => {
    setScanningCertidao(true)
    setOcrCamposCertPreenchidos([])
    setEditMode(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/ocr/certidao', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const d = res.data.dados
      const preenchidos: string[] = []

      if (d.estadoCivil && !estadoCivil?.trim()) {
        setEstadoCivil(d.estadoCivil)
        preenchidos.push('estadoCivil')
      }

      setOcrCamposCertPreenchidos(preenchidos)

      if (preenchidos.length > 0) {
        toast.success('Estado civil preenchido automaticamente! Revise e salve.')
      } else if (d.estadoCivil && estadoCivil?.trim()) {
        toast.info('Certidão processada. O campo estado civil já estava preenchido.')
      } else {
        toast.warn('Não foi possível detectar o estado civil na imagem. Preencha manualmente.')
      }

      if (res.data.documentoSalvo) {
        try {
          const docs = await api.get('/documentos')
          const lista = docs.data.documentos || docs.data || []
          setDocumentos(Array.isArray(lista) ? lista : [])
        } catch {}
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao processar certidão'
      toast.error(msg)
    } finally {
      setScanningCertidao(false)
    }
  }

  // ── Handlers Despesa Tabular ──
  const carregarDespesasMes = async (mes: number, ano: number) => {
    try {
      const res = await despesaService.resumoMes(ano, mes)
      const existentes: DespesaItem[] = res.despesas || []

      // Montar linhas fixas
      const linhas: DespesaLinha[] = CATEGORIAS_DESPESA.map(cat => {
        const encontrada = existentes.find(e => e.categoria === cat.value)
        return {
          categoria: cat.value,
          label: cat.label,
          valor: encontrada ? Number(encontrada.valor).toFixed(2).replace('.', ',') : '0,00',
          naoSeAplica: encontrada?.naoSeAplica || false,
          justificativa: encontrada?.justificativa || '',
          existenteId: encontrada?.id,
        }
      })
      setDespesaLinhas(linhas)

      // Despesas extras (categorias que não estão na lista fixa)
      const categoriasFixas = CATEGORIAS_DESPESA.map(c => c.value)
      const extras = existentes
        .filter(e => !categoriasFixas.includes(e.categoria))
        .map(e => ({
          categoria: e.categoria,
          label: e.descricao || e.categoria,
          valor: Number(e.valor).toFixed(2).replace('.', ','),
          naoSeAplica: e.naoSeAplica || false,
          justificativa: e.justificativa || '',
          existenteId: e.id,
        }))
      setDespesasExtras(extras)
      setDespesaCarregada(true)
    } catch {
      toast.error('Erro ao carregar despesas')
    }
  }

  const handleDespesaValorChange = (index: number, rawValue: string, isExtra = false) => {
    // Aceitar apenas dígitos e vírgula
    const sanitized = rawValue.replace(/[^0-9,]/g, '')
    if (isExtra) {
      setDespesasExtras(prev => prev.map((l, i) => i === index ? { ...l, valor: sanitized } : l))
    } else {
      setDespesaLinhas(prev => prev.map((l, i) => i === index ? { ...l, valor: sanitized } : l))
    }
  }

  const handleDespesaNaoAplicaChange = (index: number, checked: boolean, isExtra = false) => {
    if (isExtra) {
      setDespesasExtras(prev => prev.map((l, i) => i === index ? { ...l, naoSeAplica: checked, valor: checked ? '0,00' : l.valor } : l))
    } else {
      setDespesaLinhas(prev => prev.map((l, i) => i === index ? { ...l, naoSeAplica: checked, valor: checked ? '0,00' : l.valor } : l))
    }
  }

  const handleDespesaJustificativaChange = (index: number, val: string, isExtra = false) => {
    if (isExtra) {
      setDespesasExtras(prev => prev.map((l, i) => i === index ? { ...l, justificativa: val } : l))
    } else {
      setDespesaLinhas(prev => prev.map((l, i) => i === index ? { ...l, justificativa: val } : l))
    }
  }

  const handleAdicionarDespesaExtra = () => {
    setDespesasExtras(prev => [...prev, {
      categoria: `EXTRA_${Date.now()}`,
      label: '',
      valor: '0,00',
      naoSeAplica: false,
      justificativa: '',
    }])
  }

  const handleRemoverDespesaExtra = async (index: number) => {
    const extra = despesasExtras[index]
    if (extra.existenteId) {
      try {
        await despesaService.excluir(extra.existenteId)
      } catch { /* ignora */ }
    }
    setDespesasExtras(prev => prev.filter((_, i) => i !== index))
  }

  const handleSalvarDespesasTabela = async () => {
    setSavingDespesa(true)
    try {
      const todasLinhas = [...despesaLinhas, ...despesasExtras]
      const despesasPayload = todasLinhas.map(l => {
        const valorNum = parseFloat(l.valor.replace(/\./g, '').replace(',', '.')) || 0
        return {
          categoria: l.categoria,
          descricao: CATEGORIAS_DESPESA.find(c => c.value === l.categoria)?.label || l.label || l.categoria,
          valor: l.naoSeAplica ? 0 : valorNum,
          naoSeAplica: l.naoSeAplica,
          justificativa: l.justificativa || undefined,
        }
      })

      await despesaService.salvarLote({
        mes: despesaMesAtual.mes,
        ano: despesaMesAtual.ano,
        despesas: despesasPayload,
      })
      toast.success('Despesas salvas!')
      carregarDados()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao salvar despesas')
    } finally {
      setSavingDespesa(false)
    }
  }

  const handleUploadDoc = async () => {
    if (!docTipo) return toast.error('Selecione o tipo de documento')
    if (docTipo === 'OUTROS_EDITAL') return // handled separately
    if (!docArquivo) return toast.error('Selecione um arquivo')
    if (documentos.some(d => d.tipo === docTipo)) {
      return toast.error('Já existe um documento deste tipo. Exclua o atual para enviar outro.')
    }
    setUploadingDoc(true)
    try {
      const formData = new FormData()
      formData.append('tipo', docTipo)
      formData.append('file', docArquivo)
      await api.post('/documentos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Documento enviado!')
      setDocTipo('')
      setDocArquivo(null)
      if (docInputRef.current) docInputRef.current.value = ''
      carregarDados()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao enviar documento')
    } finally { setUploadingDoc(false) }
  }

  const handleUploadOutros = async () => {
    const arquivosValidos = outrosArquivos.filter(f => f !== null) as File[]
    if (arquivosValidos.length === 0) return toast.error('Selecione ao menos um arquivo')
    const jaEnviados = documentos.filter(d => d.tipo === 'OUTROS_EDITAL').length
    if (jaEnviados + arquivosValidos.length > 5) {
      return toast.error(`Limite de 5 documentos. Já enviados: ${jaEnviados}, tentando enviar: ${arquivosValidos.length}.`)
    }
    setUploadingDoc(true)
    let enviados = 0
    for (let i = 0; i < outrosArquivos.length; i++) {
      const arquivo = outrosArquivos[i]
      if (!arquivo) continue
      try {
        const formData = new FormData()
        formData.append('tipo', 'OUTROS_EDITAL')
        formData.append('file', arquivo)
        await api.post('/documentos', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        enviados++
      } catch (err: any) {
        toast.error(`Erro no arquivo ${i + 1}: ${err.response?.data?.message || 'Erro'}`)
      }
    }
    if (enviados > 0) {
      toast.success(`${enviados} documento(s) enviado(s)!`)
      setOutrosArquivos(Array(outrosQtd).fill(null))
      outrosRefs.current.forEach(ref => { if (ref) ref.value = '' })
      carregarDados()
    }
    setUploadingDoc(false)
  }

  const handleExcluirDoc = async (docId: string) => {
    if (!confirm('Excluir este documento?')) return
    try {
      await api.delete(`/documentos/${docId}`)
      toast.success('Documento removido')
      carregarDados()
    } catch { toast.error('Erro ao remover documento') }
  }

  const handleViewDoc = (docId: string) => {
    const token = getAuthToken()
    if (!token) return toast.error('Sessão expirada. Faça login novamente.')
    window.open(`${getApiBaseUrl()}/documentos/${docId}/download?token=${encodeURIComponent(token)}`, '_blank')
  }

  // ── Handlers Saúde ──

  const carregarSaude = async () => {
    try {
      const res = await saudeService.listar()
      const lista: PessoaSaude[] = []
      if (res.candidato) {
        lista.push({
          id: res.candidato.id,
          nome: res.candidato.nome || 'Candidato',
          tipo: 'candidato',
          saude: res.candidato.saude || null,
        })
      }
      if (res.membros) {
        for (const m of res.membros) {
          lista.push({
            id: m.id,
            nome: m.nome,
            tipo: 'membro',
            saude: m.saude || null,
          })
        }
      }
      setPessoasSaude(lista)
    } catch {
      // silencioso - lista será montada com dados do candidato+membros
    }
  }

  const handleAbrirSaude = (pessoa: PessoaSaude) => {
    setSaudePessoaAberta(pessoa)
    setSaudeSubStep(0)
    if (pessoa.saude) {
      setSaudeForm({
        id: pessoa.saude.id,
        possuiDoenca: pessoa.saude.possuiDoenca || false,
        doenca: pessoa.saude.doenca || '',
        possuiRelatorioMedico: pessoa.saude.possuiRelatorioMedico || false,
        laudoNome: pessoa.saude.laudoNome || null,
        tomaMedicamentoControlado: pessoa.saude.tomaMedicamentoControlado || false,
        nomeMedicamento: pessoa.saude.nomeMedicamento || '',
        obtemRedePublica: pessoa.saude.obtemRedePublica || false,
        especifiqueRedePublica: pessoa.saude.especifiqueRedePublica || '',
        receitaNome: pessoa.saude.receitaNome || null,
      })
    } else {
      setSaudeForm({ ...EMPTY_SAUDE })
    }
  }

  const handleVoltarListaSaude = () => {
    setSaudePessoaAberta(null)
    setSaudeSubStep(0)
    setSaudeForm({ ...EMPTY_SAUDE })
    carregarSaude()
  }

  const handleSalvarSaude = async () => {
    if (!saudePessoaAberta) return
    setSavingSaude(true)
    try {
      const payload = {
        possuiDoenca: saudeForm.possuiDoenca,
        doenca: saudeForm.possuiDoenca ? saudeForm.doenca : null,
        possuiRelatorioMedico: saudeForm.possuiDoenca ? saudeForm.possuiRelatorioMedico : false,
        tomaMedicamentoControlado: saudeForm.tomaMedicamentoControlado,
        nomeMedicamento: saudeForm.tomaMedicamentoControlado ? saudeForm.nomeMedicamento : null,
        obtemRedePublica: saudeForm.tomaMedicamentoControlado ? saudeForm.obtemRedePublica : false,
        especifiqueRedePublica: (saudeForm.tomaMedicamentoControlado && saudeForm.obtemRedePublica) ? saudeForm.especifiqueRedePublica : null,
      }

      let res
      if (saudePessoaAberta.tipo === 'candidato') {
        res = await saudeService.salvarCandidato(payload)
      } else {
        res = await saudeService.salvarMembro(saudePessoaAberta.id, payload)
      }
      if (res.saude) {
        setSaudeForm(prev => ({ ...prev, id: res.saude.id }))
      }
      toast.success('Dados de saúde salvos!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar dados de saúde')
    } finally {
      setSavingSaude(false)
    }
  }

  const handleUploadLaudo = async (file: File) => {
    if (!saudePessoaAberta) return
    try {
      let res
      if (saudePessoaAberta.tipo === 'candidato') {
        res = await saudeService.uploadLaudoCandidato(file)
      } else {
        res = await saudeService.uploadLaudoMembro(saudePessoaAberta.id, file)
      }
      if (res.saude) {
        setSaudeForm(prev => ({ ...prev, id: res.saude.id, laudoNome: res.saude.laudoNome }))
      }
      toast.success('Laudo enviado!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao enviar laudo')
    }
  }

  const handleUploadReceita = async (file: File) => {
    if (!saudePessoaAberta) return
    try {
      let res
      if (saudePessoaAberta.tipo === 'candidato') {
        res = await saudeService.uploadReceitaCandidato(file)
      } else {
        res = await saudeService.uploadReceitaMembro(saudePessoaAberta.id, file)
      }
      if (res.saude) {
        setSaudeForm(prev => ({ ...prev, id: res.saude.id, receitaNome: res.saude.receitaNome }))
      }
      toast.success('Receita enviada!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao enviar receita')
    }
  }

  const handleViewSaudeArquivo = (tipo: 'laudo' | 'receita') => {
    if (!saudeForm.id) return
    const token = getAuthToken()
    if (!token) return toast.error('Sessão expirada. Faça login novamente.')
    window.open(`${getApiBaseUrl()}/saude/${saudeForm.id}/download/${tipo}?token=${encodeURIComponent(token)}`, '_blank')
  }

  const handleExcluirSaudeArquivo = async (tipo: 'laudo' | 'receita') => {
    if (!saudeForm.id) return
    if (!window.confirm(`Excluir ${tipo === 'laudo' ? 'laudo médico' : 'receita'}?`)) return
    try {
      await saudeService.excluirArquivo(saudeForm.id, tipo)
      if (tipo === 'laudo') {
        setSaudeForm(prev => ({ ...prev, laudoNome: null }))
      } else {
        setSaudeForm(prev => ({ ...prev, receitaNome: null }))
      }
      toast.success('Arquivo excluído')
    } catch {
      toast.error('Erro ao excluir arquivo')
    }
  }

  const getUltimosMeses = () => {
    const now = new Date()
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      return { month: d.getMonth() + 1, year: d.getFullYear() }
    })
  }

  if (loading) return <div className={styles.loadingContainer}><div className={styles.spinner} /><p>Carregando dados...</p></div>

  // ===========================================
  // HELPERS DE RENDER
  // ===========================================

  /** Rodapé padrão com ← Editar → */
  const FooterNav = ({ onPrev, onNext, isLast }: { onPrev?: () => void; onNext?: () => void; isLast?: boolean }) => (
      <div className={styles.footerSplit}>
        {onPrev ? <button className={styles.btnArrow} onClick={onPrev}><FiArrowLeft size={20} /></button> : <div />}
        <button className={styles.btnOutline} onClick={() => editMode ? handleSaveDados() : setEditMode(true)} disabled={saving}>
          {editMode ? (saving ? 'Salvando...' : 'Salvar') : 'Editar'}
        </button>
        {onNext ? (
          isLast
            ? <button className={styles.btnOutlineArrow} onClick={onNext}>Próxima Etapa <FiArrowRight size={16} /></button>
            : <button className={styles.btnArrow} onClick={onNext}><FiArrowRight size={20} /></button>
        ) : <div />}
      </div>
  )

  /** Radio Sim/Não */
  const RadioSimNao = ({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) => (
    <div className={styles.radioGroup}>
      <span className={styles.radioLabel}>{label}</span>
      <label style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : {}}><input type="radio" checked={value === true} disabled={disabled} onChange={() => onChange(true)} /> Sim</label>
      <label style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : {}}><input type="radio" checked={value === false} disabled={disabled} onChange={() => onChange(false)} /> Não</label>
    </div>
  )

  /** Bloco de documentos enviados para uma seção */
  const DocListBlock = ({ tipos, titulo }: { tipos: string[]; titulo?: string }) => {
    const docs = documentos.filter(d => tipos.includes(d.tipo))
    return (
      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', color: '#334155' }}>
          {titulo || 'Documentos enviados'}
        </p>
        {docs.length > 0 ? docs.map(doc => (
          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', borderBottom: '1px solid #e2e8f0' }}>
            <button type="button" className={styles.btnPrimary} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }} onClick={() => handleViewDoc(doc.id)}>
              Visualizar Documento
            </button>
            {doc.status !== 'APROVADO' && (
              <button className={styles.btnSmallDanger} onClick={() => handleExcluirDoc(doc.id)}><FiTrash2 size={14} /></button>
            )}
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{doc.nome}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: doc.status === 'APROVADO' ? '#16a34a' : doc.status === 'REJEITADO' ? '#dc2626' : '#ca8a04' }}>
              {doc.status}
            </span>
          </div>
        )) : (
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Nenhum documento enviado</p>
        )}
      </div>
    )
  }

  // ===========================================
  // RENDER SEÇÕES
  // ===========================================

  const renderSection = () => {
    switch (activeSection) {

      // ════════════════════════════════════════
      // CANDIDATO — 8 sub-steps
      // ════════════════════════════════════════
      case 'candidato': {
        const stepContent = () => {
          switch (subStep) {

            // ─── 1. Dados Pessoais ───
            case 0: return (
              <>
                <h2 className={styles.sectionTitle}>Dados Pessoais</h2>
                {dados.nome && <p className={styles.sectionName}>{dados.nome}</p>}

                {/* ── Auxílio ao preenchimento ── */}
                {documentos.filter(d => d.tipo === 'RG').length < 2 && (
                  <div style={{ margin: '0.5rem 0 1rem', padding: '0.75rem 1rem', background: '#f0f7ff', borderRadius: 'var(--radius)', border: '1px solid #d0e3f7' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Auxílio ao preenchimento</label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {/* Botão 1: Escanear com câmera */}
                      <div
                        onClick={() => !scanningRG && scanInputRef.current?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.55rem 1rem', borderRadius: 'var(--radius)',
                          border: '2px solid var(--color-primary)', color: 'var(--color-primary)',
                          cursor: scanningRG ? 'wait' : 'pointer', fontWeight: 500, fontSize: '0.9rem',
                          background: 'var(--color-white)', flex: '1', justifyContent: 'center', minWidth: '180px',
                        }}
                      >
                        {scanningRG
                          ? <><div className={styles.spinnerSmall} /> Processando...</>
                          : <><FiCamera size={17} /> Escanear RG ({documentos.filter(d => d.tipo === 'RG').length === 0 ? 'Frente' : 'Verso'})</>
                        }
                      </div>
                      {/* Botão 2: Anexar arquivo */}
                      <div
                        onClick={() => !scanningRG && anexarOcrRef.current?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.55rem 1rem', borderRadius: 'var(--radius)',
                          border: '2px solid #64748b', color: '#475569',
                          cursor: scanningRG ? 'wait' : 'pointer', fontWeight: 500, fontSize: '0.9rem',
                          background: 'var(--color-white)', flex: '1', justifyContent: 'center', minWidth: '180px',
                        }}
                      >
                        <FiPlus size={17} /> Anexar arquivo
                      </div>
                    </div>
                    <input ref={scanInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleScanRG(e.target.files[0]); e.target.value = '' }} />
                    <input ref={anexarOcrRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleScanRG(e.target.files[0]); e.target.value = '' }} />
                    <small style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.78rem', color: '#64748b' }}>
                      Tire uma foto ou anexe a imagem do RG. Alguns campos serão preenchidos automaticamente. Se necessário, incluir ou corrigir em seguida. (máx. 2: frente e verso)
                    </small>
                  </div>
                )}
                {ocrCamposPreenchidos.length > 0 && (
                  <p style={{ fontSize: '0.85rem', color: '#16a34a', textAlign: 'center', marginBottom: '0.75rem' }}>
                    <FiCheck size={14} style={{ verticalAlign: 'middle' }} /> {ocrCamposPreenchidos.length} campo(s) preenchido(s) pelo scan. Revise e clique em Salvar.
                  </p>
                )}

                <div className={styles.formGrid}>
                  <div className={styles.field}><label>Nome completo</label><input value={dados.nome} disabled={!editMode} onChange={e => setDados({ ...dados, nome: e.target.value })} style={ocrCamposPreenchidos.includes('nome') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} /></div>
                  <div className={styles.field}><label>CPF</label><input value={dados.cpf} disabled={!editMode} onChange={e => setDados({ ...dados, cpf: maskCPF(e.target.value) })} style={ocrCamposPreenchidos.includes('cpf') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} /></div>
                  <div className={styles.field}><label>Data de nascimento</label><DateInput value={dados.dataNascimento} disabled={!editMode} onChange={v => setDados({ ...dados, dataNascimento: v })} /></div>
                  <div className={styles.field}><label>Telefone</label><input value={dados.telefone} disabled={!editMode} onChange={e => setDados({ ...dados, telefone: maskPhone(e.target.value) })} /></div>
                  <div className={styles.field}><label>RG/RNE</label><input value={dados.rg} disabled={!editMode} onChange={e => setDados({ ...dados, rg: e.target.value })} style={ocrCamposPreenchidos.includes('rg') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} /></div>
                  <div className={styles.field}><label>Estado emissor do RG/RNE</label>
                    <select value={dados.rgEstado} disabled={!editMode} onChange={e => setDados({ ...dados, rgEstado: e.target.value })} style={ocrCamposPreenchidos.includes('rgEstado') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined}>
                      <option value="">Selecione...</option>{ESTADOS_EMISSOR.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}><label>Órgão emissor do RG/RNE</label><input value={dados.rgOrgao} disabled={!editMode} placeholder="SSP" onChange={e => setDados({ ...dados, rgOrgao: e.target.value })} style={ocrCamposPreenchidos.includes('rgOrgao') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} /></div>
                  <div className={`${styles.field} ${styles.fieldFull}`}><label>Nome social (quando houver)</label><input value={adicionais.nomeSocial} disabled={!editMode} onChange={e => setAdicionais({ ...adicionais, nomeSocial: e.target.value })} /></div>
                  <div className={styles.field}><label>Sexo</label>
                    <select value={adicionais.sexo} disabled={!editMode} onChange={e => setAdicionais({ ...adicionais, sexo: e.target.value })}>
                      <option value="">Selecione...</option>{SEXO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}><label>Profissão</label><input value={adicionais.profissao} disabled={!editMode} onChange={e => setAdicionais({ ...adicionais, profissao: e.target.value })} /></div>
                  <div className={styles.field}><label>Nacionalidade</label><input value={adicionais.nacionalidade} disabled={!editMode} onChange={e => setAdicionais({ ...adicionais, nacionalidade: e.target.value })} style={ocrCamposPreenchidos.includes('nacionalidade') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} /></div>
                  <div className={styles.field}><label>Naturalidade</label><input value={adicionais.naturalidade} disabled={!editMode} onChange={e => setAdicionais({ ...adicionais, naturalidade: e.target.value })} style={ocrCamposPreenchidos.includes('naturalidade') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} /></div>
                  <div className={styles.field}><label>Estado</label>
                    <select value={adicionais.estado} disabled={!editMode} onChange={e => setAdicionais({ ...adicionais, estado: e.target.value })} style={ocrCamposPreenchidos.includes('estado') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined}>
                      <option value="">Selecione...</option>{ESTADOS_EMISSOR.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                </div>
                {documentos.filter(d => d.tipo === 'RG').length >= 2 && (
                  <p style={{ fontSize: '0.85rem', color: '#16a34a', textAlign: 'center', margin: '0.5rem 0' }}>
                    <FiCheck size={14} style={{ verticalAlign: 'middle' }} /> Frente e verso enviados (2/2). Exclua um para enviar outro.
                  </p>
                )}
                <DocListBlock tipos={['RG']} titulo="Documento(s) RG enviado(s)" />
              </>
            )

            // ─── 2. Endereço e Comprovante ───
            case 1: return (
              <>
                <h2 className={styles.sectionTitle}>Endereço e Comprovante</h2>
                {dados.nome && <p className={styles.sectionName}>{dados.nome}</p>}

                <RadioSimNao label="Possui comprovante de residência?" value={possuiComprovante} onChange={setPossuiComprovante} disabled={!editMode} />

                {possuiComprovante && documentos.filter(d => d.tipo === 'COMPROVANTE_RESIDENCIA').length === 0 && (
                  <div style={{ margin: '0.5rem 0 1rem', padding: '0.75rem 1rem', background: '#f0f7ff', borderRadius: 'var(--radius)', border: '1px solid #d0e3f7' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Auxílio ao preenchimento</label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div
                        onClick={() => !scanningComprovante && scanComprovanteRef.current?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.55rem 1rem', borderRadius: 'var(--radius)',
                          border: '2px solid var(--color-primary)', color: 'var(--color-primary)',
                          cursor: scanningComprovante ? 'wait' : 'pointer', fontWeight: 500, fontSize: '0.9rem',
                          background: 'var(--color-white)', flex: '1', justifyContent: 'center', minWidth: '180px',
                        }}
                      >
                        {scanningComprovante
                          ? <><div className={styles.spinnerSmall} /> Processando...</>
                          : <><FiCamera size={17} /> Escanear Comprovante</>
                        }
                      </div>
                      <div
                        onClick={() => !scanningComprovante && anexarComprovanteRef.current?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.55rem 1rem', borderRadius: 'var(--radius)',
                          border: '2px solid #64748b', color: '#475569',
                          cursor: scanningComprovante ? 'wait' : 'pointer', fontWeight: 500, fontSize: '0.9rem',
                          background: 'var(--color-white)', flex: '1', justifyContent: 'center', minWidth: '180px',
                        }}
                      >
                        <FiPlus size={17} /> Anexar arquivo
                      </div>
                    </div>
                    <input ref={scanComprovanteRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleScanComprovante(e.target.files[0]); e.target.value = '' }} />
                    <input ref={anexarComprovanteRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleScanComprovante(e.target.files[0]); e.target.value = '' }} />
                    <small style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.78rem', color: '#64748b' }}>
                      Tire uma foto ou anexe o comprovante de endereço (conta de luz, água, gás). Os campos de endereço serão preenchidos automaticamente.
                    </small>
                  </div>
                )}

                {ocrCamposEndPreenchidos.length > 0 && (
                  <p style={{ fontSize: '0.85rem', color: '#16a34a', textAlign: 'center', marginBottom: '0.75rem' }}>
                    <FiCheck size={14} style={{ verticalAlign: 'middle' }} /> {ocrCamposEndPreenchidos.length} campo(s) de endereço preenchido(s) pelo scan. Revise e clique em Salvar.
                  </p>
                )}

                <div className={styles.formGrid}>
                  <div className={styles.field}><label>CEP</label><input value={endereco.cep} disabled={!editMode} onChange={e => { const v = maskCEP(e.target.value); setEndereco({ ...endereco, cep: v }); handleCEPChange(v) }} style={ocrCamposEndPreenchidos.includes('cep') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} /></div>
                  <div className={styles.field}><label>Rua</label><input value={endereco.rua} disabled={!editMode} onChange={e => setEndereco({ ...endereco, rua: e.target.value })} style={ocrCamposEndPreenchidos.includes('rua') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} /></div>
                  <div className={styles.field}><label>Número</label><input value={endereco.numero} disabled={!editMode} onChange={e => setEndereco({ ...endereco, numero: e.target.value })} style={ocrCamposEndPreenchidos.includes('numero') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} /></div>
                  <div className={styles.field}><label>Bairro</label><input value={endereco.bairro} disabled={!editMode} onChange={e => setEndereco({ ...endereco, bairro: e.target.value })} style={ocrCamposEndPreenchidos.includes('bairro') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} /></div>
                  <div className={styles.field}><label>Cidade</label><input value={endereco.cidade} disabled={!editMode} onChange={e => setEndereco({ ...endereco, cidade: e.target.value })} style={ocrCamposEndPreenchidos.includes('cidade') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} /></div>
                  <div className={styles.field}><label>Complemento</label><input value={endereco.complemento} disabled={!editMode} onChange={e => setEndereco({ ...endereco, complemento: e.target.value })} style={ocrCamposEndPreenchidos.includes('complemento') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} /></div>
                  <div className={styles.field}><label>Unidade federativa</label>
                    <select value={endereco.uf} disabled={!editMode} onChange={e => setEndereco({ ...endereco, uf: e.target.value })} style={ocrCamposEndPreenchidos.includes('uf') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined}>
                      <option value="">Selecione...</option>{ESTADOS_EMISSOR.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                </div>

                {possuiComprovante && documentos.filter(d => d.tipo === 'COMPROVANTE_RESIDENCIA').length > 0 && (
                  <p style={{ fontSize: '0.85rem', color: '#16a34a', textAlign: 'center', margin: '0.5rem 0' }}>
                    <FiCheck size={14} style={{ verticalAlign: 'middle' }} /> Comprovante enviado.
                  </p>
                )}
                <DocListBlock tipos={['COMPROVANTE_RESIDENCIA']} titulo="Comprovante(s) enviado(s)" />
              </>
            )

            // ─── 3. Estado Civil ───
            case 2: return (
              <>
                <h2 className={styles.sectionTitle}>Estado Civil</h2>
                {dados.nome && <p className={styles.sectionName}>{dados.nome}</p>}

                {documentos.filter(d => d.tipo === 'CERTIDAO_CASAMENTO').length === 0 && (
                  <div style={{ margin: '0.5rem 0 1rem', padding: '0.75rem 1rem', background: '#f0f7ff', borderRadius: 'var(--radius)', border: '1px solid #d0e3f7' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Auxílio ao preenchimento</label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div
                        onClick={() => !scanningCertidao && scanCertidaoRef.current?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.55rem 1rem', borderRadius: 'var(--radius)',
                          border: '2px solid var(--color-primary)', color: 'var(--color-primary)',
                          cursor: scanningCertidao ? 'wait' : 'pointer', fontWeight: 500, fontSize: '0.9rem',
                          background: 'var(--color-white)', flex: '1', justifyContent: 'center', minWidth: '180px',
                        }}
                      >
                        {scanningCertidao
                          ? <><div className={styles.spinnerSmall} /> Processando...</>
                          : <><FiCamera size={17} /> Escanear Certidão</>
                        }
                      </div>
                      <div
                        onClick={() => !scanningCertidao && anexarCertidaoRef.current?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.55rem 1rem', borderRadius: 'var(--radius)',
                          border: '2px solid #64748b', color: '#475569',
                          cursor: scanningCertidao ? 'wait' : 'pointer', fontWeight: 500, fontSize: '0.9rem',
                          background: 'var(--color-white)', flex: '1', justifyContent: 'center', minWidth: '180px',
                        }}
                      >
                        <FiPlus size={17} /> Anexar arquivo
                      </div>
                    </div>
                    <input ref={scanCertidaoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleScanCertidao(e.target.files[0]); e.target.value = '' }} />
                    <input ref={anexarCertidaoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleScanCertidao(e.target.files[0]); e.target.value = '' }} />
                    <small style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.78rem', color: '#64748b' }}>
                      Tire uma foto ou anexe a certidão (casamento, nascimento, divórcio, união estável). O estado civil será preenchido automaticamente.
                    </small>
                  </div>
                )}

                {ocrCamposCertPreenchidos.length > 0 && (
                  <p style={{ fontSize: '0.85rem', color: '#16a34a', textAlign: 'center', marginBottom: '0.75rem' }}>
                    <FiCheck size={14} style={{ verticalAlign: 'middle' }} /> Estado civil preenchido pelo scan. Revise e clique em Salvar.
                  </p>
                )}

                <div className={styles.formGridSingle}>
                  <div className={styles.field}><label>Estado civil</label>
                    <select value={estadoCivil} disabled={!editMode} onChange={e => setEstadoCivil(e.target.value)} style={ocrCamposCertPreenchidos.includes('estadoCivil') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined}>
                      <option value="">Selecione...</option>{ESTADO_CIVIL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                {documentos.filter(d => d.tipo === 'CERTIDAO_CASAMENTO').length > 0 && (
                  <p style={{ fontSize: '0.85rem', color: '#16a34a', textAlign: 'center', margin: '0.5rem 0' }}>
                    <FiCheck size={14} style={{ verticalAlign: 'middle' }} /> Certidão enviada.
                  </p>
                )}
                <DocListBlock tipos={['CERTIDAO_CASAMENTO']} titulo="Certidão(ões) enviada(s)" />
              </>
            )

            // ─── 4. Informações Pessoais ───
            case 3: return (
              <>
                <h2 className={styles.sectionTitle}>Informações Pessoais</h2>
                {dados.nome && <p className={styles.sectionName}>{dados.nome}</p>}
                <div className={styles.formGrid}>
                  <div className={styles.field}><label>Cor e raça</label>
                    <select value={pessoaisExtra.corRaca} disabled={!editMode} onChange={e => setPessoaisExtra({ ...pessoaisExtra, corRaca: e.target.value })}>
                      <option value="">Selecione...</option>{COR_RACA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}><label>Escolaridade</label>
                    <select value={pessoaisExtra.escolaridade} disabled={!editMode} onChange={e => setPessoaisExtra({ ...pessoaisExtra, escolaridade: e.target.value })}>
                      <option value="">Selecione...</option>{ESCOLARIDADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}><label>Religião</label>
                    <select value={pessoaisExtra.religiao} disabled={!editMode} onChange={e => setPessoaisExtra({ ...pessoaisExtra, religiao: e.target.value })}>
                      <option value="">Selecione...</option>{RELIGIAO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <RadioSimNao label="Necessidades especiais" value={pessoaisExtra.necessidadesEspeciais} onChange={v => setPessoaisExtra({ ...pessoaisExtra, necessidadesEspeciais: v })} disabled={!editMode} />
                {pessoaisExtra.necessidadesEspeciais && (
                  <div className={styles.formGridSingle} style={{ marginTop: '0.75rem' }}>
                    <div className={styles.field}>
                      <label>Tipo de necessidades especiais</label>
                      {editMode ? (
                        <input value={pessoaisExtra.tipoNecessidadesEspeciais} placeholder="Ex: Visual, Auditiva, Motora..." onChange={e => setPessoaisExtra({ ...pessoaisExtra, tipoNecessidadesEspeciais: e.target.value })} />
                      ) : (
                        <p style={{ padding: '0.5rem 0.75rem', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.9rem', color: pessoaisExtra.tipoNecessidadesEspeciais ? '#1e293b' : '#94a3b8', minHeight: '2.25rem' }}>
                          {pessoaisExtra.tipoNecessidadesEspeciais || 'Não informado'}
                        </p>
                      )}
                    </div>
                    <div className={styles.field}>
                      <label>Descrição das necessidades especiais</label>
                      {editMode ? (
                        <input value={pessoaisExtra.descricaoNecessidadesEspeciais} placeholder="Descreva brevemente" onChange={e => setPessoaisExtra({ ...pessoaisExtra, descricaoNecessidadesEspeciais: e.target.value })} />
                      ) : (
                        <p style={{ padding: '0.5rem 0.75rem', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.9rem', color: pessoaisExtra.descricaoNecessidadesEspeciais ? '#1e293b' : '#94a3b8', minHeight: '2.25rem' }}>
                          {pessoaisExtra.descricaoNecessidadesEspeciais || 'Não informado'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )

            // ─── 5. Documento Adicional ───
            case 4: {
              const outrosEnviados = documentos.filter(d => d.tipo === 'OUTROS_EDITAL').length
              const outrosRestantes = Math.max(0, 5 - outrosEnviados)
              return (
              <>
                <h2 className={styles.sectionTitle}>Documento Adicional</h2>
                {dados.nome && <p className={styles.sectionName}>{dados.nome}</p>}
                <RadioSimNao label="Deseja adicionar outro documento?" value={desejaDocAdicional} onChange={setDesejaDocAdicional} />
                {desejaDocAdicional && (
                  <div className={styles.inlineForm}>
                    <div className={styles.formGrid}>
                      <div className={styles.field}>
                        <label>Tipo de documento</label>
                        <select value={docTipo} onChange={e => {
                          setDocTipo(e.target.value)
                          if (e.target.value !== 'OUTROS_EDITAL') {
                            setOutrosQtd(1)
                            setOutrosArquivos([null])
                          } else {
                            const qtdInicial = Math.min(1, outrosRestantes)
                            setOutrosQtd(qtdInicial)
                            setOutrosArquivos(Array(qtdInicial).fill(null))
                          }
                        }}>
                          <option value="">Selecione</option>
                          {TIPOS_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      {docTipo === 'OUTROS_EDITAL' && outrosRestantes > 0 && (
                        <div className={styles.field}>
                          <label>Quantidade de documentos ({outrosEnviados}/5 já enviados)</label>
                          <select value={outrosQtd} onChange={e => {
                            const qtd = Number(e.target.value)
                            setOutrosQtd(qtd)
                            setOutrosArquivos(Array(qtd).fill(null))
                          }}>
                            {Array.from({ length: outrosRestantes }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      )}
                      {docTipo === 'OUTROS_EDITAL' && outrosRestantes === 0 && (
                        <div className={styles.field}>
                          <p style={{ color: '#dc2626', fontSize: '0.9rem', fontWeight: 500, padding: '0.5rem 0' }}>
                            Limite de 5 documentos atingido.
                          </p>
                        </div>
                      )}
                    </div>

                    {docTipo && docTipo !== 'OUTROS_EDITAL' && (
                      <>
                        <div className={styles.field} style={{ marginTop: '0.75rem' }}>
                          <label>Arquivo (PDF, JPG, PNG — máx 10MB)</label>
                          <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => { if (e.target.files?.[0]) setDocArquivo(e.target.files[0]) }} />
                        </div>
                        {docArquivo && <p style={{ fontSize: '0.85rem', color: '#666', margin: '0.5rem 0' }}>Arquivo: {docArquivo.name} ({(docArquivo.size / 1024 / 1024).toFixed(2)} MB)</p>}
                        <div className={styles.inlineActions}>
                          <button className={styles.btnPrimary} onClick={handleUploadDoc} disabled={uploadingDoc}>
                            {uploadingDoc ? 'Enviando...' : 'Enviar Documento'}
                          </button>
                        </div>
                      </>
                    )}

                    {docTipo === 'OUTROS_EDITAL' && outrosRestantes > 0 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        {Array.from({ length: outrosQtd }, (_, i) => (
                          <div key={i} className={styles.field} style={{ marginBottom: '0.5rem' }}>
                            <label>Documento {i + 1}</label>
                            <input
                              ref={el => { outrosRefs.current[i] = el }}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              onChange={e => {
                                const newArr = [...outrosArquivos]
                                newArr[i] = e.target.files?.[0] || null
                                setOutrosArquivos(newArr)
                              }}
                            />
                          </div>
                        ))}
                        <div className={styles.inlineActions}>
                          <button className={styles.btnPrimary} onClick={handleUploadOutros} disabled={uploadingDoc}>
                            {uploadingDoc ? 'Enviando...' : `Enviar ${outrosArquivos.filter(f => f).length} Documento(s)`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <DocListBlock tipos={['CARTEIRA_MOTORISTA', 'CARTEIRA_FUNCIONAL', 'IDENTIDADE_MILITAR', 'PASSAPORTE', 'CARTEIRA_TRABALHO', 'OUTROS_EDITAL']} titulo="Documentos adicionais enviados" />
              </>
            )}

            // ─── 6. Benefícios e Programas ───
            case 5: return (
              <>
                <h2 className={styles.sectionTitle}>Benefícios e Programas</h2>
                {dados.nome && <p className={styles.sectionName}>{dados.nome}</p>}
                <RadioSimNao label="Inscrito no cadastro único?" value={beneficios.cadastroUnico} onChange={v => setBeneficios({ ...beneficios, cadastroUnico: v })} disabled={!editMode} />
                <RadioSimNao label="Estudou em escola pública?" value={beneficios.escolaPublica} onChange={v => setBeneficios({ ...beneficios, escolaPublica: v })} disabled={!editMode} />
                <RadioSimNao label="Já recebeu bolsa CEBAS para educação básica?" value={beneficios.bolsaCebasBasica} onChange={v => setBeneficios({ ...beneficios, bolsaCebasBasica: v })} disabled={!editMode} />
                <RadioSimNao label="Já recebeu bolsa CEBAS para educação profissional?" value={beneficios.bolsaCebasProfissional} onChange={v => setBeneficios({ ...beneficios, bolsaCebasProfissional: v })} disabled={!editMode} />
              </>
            )
            default: return null
          }
        }

        return (
          <>
            <StepperBar totalSteps={6} currentStep={subStep} onStepClick={setSubStep} />
            {stepContent()}
            <FooterNav
              onPrev={subStep > 0 ? () => setSubStep(s => s - 1) : undefined}
              onNext={subStep < 5 ? () => setSubStep(s => s + 1) : () => goToNextSection()}
              isLast={subStep === 5}
            />
          </>
        )
      }

      // ════════════════════════════════════════
      // GRUPO FAMILIAR — 6 sub-steps wizard
      // ════════════════════════════════════════
      case 'grupo-familiar': {
        // Se NÃO está no wizard de cadastro, mostra a lista de membros
        if (!showAddMembro) {
          return (
            <>
              <h2 className={styles.sectionTitle}>Integrantes do Grupo Familiar</h2>
              <p className={styles.sectionSub}>Selecione um parente ou cadastre um novo</p>
              <div className={styles.centeredActions}>
                <button className={styles.btnOutline} onClick={() => { setNovoMembro({ ...EMPTY_MEMBRO }); setEditingMembroId(null); setSubStepMembro(0); setDocsMembro([]); setOcrCamposMembroPreenchidos([]); setOcrCamposMembroCertPreenchidos([]); setShowAddMembro(true) }}>
                  <FiPlus size={16} /> Adicionar Membro
                </button>
              </div>
              <div className={styles.listItems}>
                {membros.map(m => (
                  <div key={m.id} className={styles.listRow}>
                    <span className={styles.listName}>{m.nome}</span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{PARENTESCO_MEMBRO_OPTIONS.find(p => p.value === m.parentesco)?.label || m.parentesco}</span>
                    <button className={styles.btnSmallOutline} onClick={() => handleEditMembro(m)}><FiEye size={14} /> Editar</button>
                    <button className={styles.btnSmallDanger} onClick={() => handleRemoveMembro(m.id!)}><FiTrash2 size={14} /> Excluir</button>
                  </div>
                ))}
                {membros.length === 0 && <p className={styles.emptyMsg}>Nenhum membro cadastrado ainda.</p>}
              </div>
              <div className={styles.footerCenter}><button className={styles.btnOutlineArrow} onClick={goToNextSection}>Próxima Etapa <FiArrowRight size={16} /></button></div>
            </>
          )
        }

        // ── WIZARD 6-STEP DE CADASTRO/EDIÇÃO ──
        const membroStepContent = () => {
          switch (subStepMembro) {

            // ─── Step 1: Dados Pessoais (Parentesco + Dados + Info Adicionais + OCR RG) ───
            case 0: return (
              <>
                <h2 className={styles.sectionTitle}>Dados Pessoais</h2>

                {/* OCR RG scan — replicando lógica do candidato */}
                {editingMembroId && docsMembro.filter(d => d.tipo === 'RG_MEMBRO').length < 2 && (
                  <div style={{ margin: '0.5rem 0 1rem', padding: '0.75rem 1rem', background: '#f0f7ff', borderRadius: 'var(--radius)', border: '1px solid #d0e3f7' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Auxílio ao preenchimento</label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div
                        onClick={() => !scanningMembroRG && scanMembroRgRef.current?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.55rem 1rem', borderRadius: 'var(--radius)',
                          border: '2px solid var(--color-primary)', color: 'var(--color-primary)',
                          cursor: scanningMembroRG ? 'wait' : 'pointer', fontWeight: 500, fontSize: '0.9rem',
                          background: 'var(--color-white)', flex: '1', justifyContent: 'center', minWidth: '180px',
                        }}
                      >
                        {scanningMembroRG
                          ? <><div className={styles.spinnerSmall} /> Processando...</>
                          : <><FiCamera size={17} /> Escanear RG ({docsMembro.filter(d => d.tipo === 'RG_MEMBRO').length === 0 ? 'Frente' : 'Verso'})</>
                        }
                      </div>
                      <div
                        onClick={() => !scanningMembroRG && anexarMembroRgRef.current?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.55rem 1rem', borderRadius: 'var(--radius)',
                          border: '2px solid #64748b', color: '#475569',
                          cursor: scanningMembroRG ? 'wait' : 'pointer', fontWeight: 500, fontSize: '0.9rem',
                          background: 'var(--color-white)', flex: '1', justifyContent: 'center', minWidth: '180px',
                        }}
                      >
                        <FiPlus size={17} /> Anexar arquivo
                      </div>
                    </div>
                    <input ref={scanMembroRgRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleScanMembroRG(e.target.files[0]); e.target.value = '' }} />
                    <input ref={anexarMembroRgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleScanMembroRG(e.target.files[0]); e.target.value = '' }} />
                    <small style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.78rem', color: '#64748b' }}>
                      Tire uma foto ou anexe a imagem do RG. Alguns campos serão preenchidos automaticamente. (máx. 2: frente e verso)
                    </small>
                  </div>
                )}
                {!editingMembroId && (
                  <p style={{ fontSize: '0.85rem', color: '#f59e0b', marginBottom: '0.75rem' }}>
                    Preencha o parentesco e nome, depois salve para habilitar o escaneamento de RG.
                  </p>
                )}
                {ocrCamposMembroPreenchidos.length > 0 && (
                  <p style={{ fontSize: '0.85rem', color: '#16a34a', textAlign: 'center', marginBottom: '0.75rem' }}>
                    <FiCheck size={14} style={{ verticalAlign: 'middle' }} /> {ocrCamposMembroPreenchidos.length} campo(s) preenchido(s) pelo scan. Revise e clique em Salvar.
                  </p>
                )}
                {docsMembro.filter(d => d.tipo === 'RG_MEMBRO').length >= 2 && (
                  <p style={{ fontSize: '0.85rem', color: '#16a34a', textAlign: 'center', margin: '0.5rem 0' }}>
                    <FiCheck size={14} style={{ verticalAlign: 'middle' }} /> Frente e verso enviados (2/2). Exclua um para enviar outro.
                  </p>
                )}

                <div className={styles.formGrid}>
                  <div className={styles.field}><label>Parentesco</label>
                    <select value={novoMembro.parentesco} onChange={e => setNovoMembro({ ...novoMembro, parentesco: e.target.value })}>
                      <option value="">Selecione</option>
                      {PARENTESCO_MEMBRO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}><label>Nome completo</label>
                    <input value={novoMembro.nome} onChange={e => setNovoMembro({ ...novoMembro, nome: e.target.value })} style={ocrCamposMembroPreenchidos.includes('nome') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} />
                  </div>
                  <div className={styles.field}><label>CPF</label>
                    <input value={novoMembro.cpf} onChange={e => setNovoMembro({ ...novoMembro, cpf: maskCPF(e.target.value) })} style={ocrCamposMembroPreenchidos.includes('cpf') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} />
                  </div>
                  <div className={styles.field}><label>Data de nascimento</label>
                    <DateInput value={novoMembro.dataNascimento || ''} onChange={v => setNovoMembro({ ...novoMembro, dataNascimento: v })} />
                  </div>
                  <div className={styles.field}><label>Telefone</label>
                    <input value={novoMembro.telefone || ''} onChange={e => setNovoMembro({ ...novoMembro, telefone: maskPhone(e.target.value) })} />
                  </div>
                  <div className={styles.field}><label>Email</label>
                    <input type="email" value={novoMembro.email || ''} onChange={e => setNovoMembro({ ...novoMembro, email: e.target.value })} />
                  </div>
                  <div className={styles.field}><label>RG/RNE</label>
                    <input value={novoMembro.rg || ''} onChange={e => setNovoMembro({ ...novoMembro, rg: e.target.value })} style={ocrCamposMembroPreenchidos.includes('rg') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} />
                  </div>
                  <div className={styles.field}><label>Estado emissor do RG/RNE</label>
                    <select value={novoMembro.rgEstado || ''} onChange={e => setNovoMembro({ ...novoMembro, rgEstado: e.target.value })} style={ocrCamposMembroPreenchidos.includes('rgEstado') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined}>
                      <option value="">Selecione o estado</option>
                      {ESTADOS_EMISSOR.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}><label>Órgão emissor do RG/RNE</label>
                    <input value={novoMembro.rgOrgao || ''} onChange={e => setNovoMembro({ ...novoMembro, rgOrgao: e.target.value })} style={ocrCamposMembroPreenchidos.includes('rgOrgao') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} />
                  </div>
                  <div className={`${styles.field} ${styles.fieldFull}`}><label>Nome social (quando houver)</label>
                    <input value={novoMembro.nomeSocial || ''} onChange={e => setNovoMembro({ ...novoMembro, nomeSocial: e.target.value })} />
                  </div>
                  <div className={styles.field}><label>Sexo</label>
                    <select value={novoMembro.sexo || ''} onChange={e => setNovoMembro({ ...novoMembro, sexo: e.target.value })}>
                      <option value="">Selecione</option>
                      {SEXO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className={`${styles.field} ${styles.fieldFull}`}><label>Profissão</label>
                    <input value={novoMembro.profissao || ''} onChange={e => setNovoMembro({ ...novoMembro, profissao: e.target.value })} />
                  </div>
                  <div className={`${styles.field} ${styles.fieldFull}`}><label>Nacionalidade</label>
                    <input value={novoMembro.nacionalidade || ''} onChange={e => setNovoMembro({ ...novoMembro, nacionalidade: e.target.value })} placeholder="Brasileira" style={ocrCamposMembroPreenchidos.includes('nacionalidade') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} />
                  </div>
                  <div className={`${styles.field} ${styles.fieldFull}`}><label>Naturalidade</label>
                    <input value={novoMembro.naturalidade || ''} onChange={e => setNovoMembro({ ...novoMembro, naturalidade: e.target.value })} style={ocrCamposMembroPreenchidos.includes('naturalidade') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined} />
                  </div>
                  <div className={styles.field}><label>Estado</label>
                    <select value={novoMembro.estado || ''} onChange={e => setNovoMembro({ ...novoMembro, estado: e.target.value })} style={ocrCamposMembroPreenchidos.includes('estado') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined}>
                      <option value="">Selecione o estado</option>
                      {ESTADOS_EMISSOR.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Lista de documentos RG enviados (scan + manual) com Visualizar / Excluir */}
                {docsMembro.filter(d => d.tipo === 'RG_MEMBRO').length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', color: '#334155' }}>
                      Documento(s) RG enviado(s)
                    </p>
                    {docsMembro.filter(d => d.tipo === 'RG_MEMBRO').map((doc, idx) => (
                      <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', borderBottom: '1px solid #e2e8f0' }}>
                        <button type="button" className={styles.btnPrimary} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
                          onClick={() => handleViewDocMembro(editingMembroId!, doc.id)}>Visualizar</button>
                        <button className={styles.btnSmallDanger} onClick={() => handleExcluirDocMembro(editingMembroId!, doc.id)}><FiTrash2 size={14} /></button>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{doc.nome || `RG ${idx === 0 ? '(Frente)' : '(Verso)'}`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )

            // ─── Step 2: Estado Civil + OCR Certidão ───
            case 1: return (
              <>
                <h2 className={styles.sectionTitle}>Estado Civil</h2>
                {novoMembro.nome && <p className={styles.sectionName}>{novoMembro.nome}</p>}

                {/* OCR Certidão scan */}
                {editingMembroId && docsMembro.filter(d => d.tipo === 'CERTIDAO_CASAMENTO').length === 0 && (
                  <div style={{ margin: '0.5rem 0 1rem', padding: '0.75rem 1rem', background: '#f0f7ff', borderRadius: 'var(--radius)', border: '1px solid #d0e3f7' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Auxílio ao preenchimento</label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div
                        onClick={() => !scanningMembroCertidao && scanMembroCertidaoRef.current?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.55rem 1rem', borderRadius: 'var(--radius)',
                          border: '2px solid var(--color-primary)', color: 'var(--color-primary)',
                          cursor: scanningMembroCertidao ? 'wait' : 'pointer', fontWeight: 500, fontSize: '0.9rem',
                          background: 'var(--color-white)', flex: '1', justifyContent: 'center', minWidth: '180px',
                        }}
                      >
                        {scanningMembroCertidao
                          ? <><div className={styles.spinnerSmall} /> Processando...</>
                          : <><FiCamera size={17} /> Escanear Certidão</>
                        }
                      </div>
                      <div
                        onClick={() => !scanningMembroCertidao && anexarMembroCertidaoRef.current?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.55rem 1rem', borderRadius: 'var(--radius)',
                          border: '2px solid #64748b', color: '#475569',
                          cursor: scanningMembroCertidao ? 'wait' : 'pointer', fontWeight: 500, fontSize: '0.9rem',
                          background: 'var(--color-white)', flex: '1', justifyContent: 'center', minWidth: '180px',
                        }}
                      >
                        <FiPlus size={17} /> Anexar arquivo
                      </div>
                    </div>
                    <input ref={scanMembroCertidaoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleScanMembroCertidao(e.target.files[0]); e.target.value = '' }} />
                    <input ref={anexarMembroCertidaoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleScanMembroCertidao(e.target.files[0]); e.target.value = '' }} />
                    <small style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.78rem', color: '#64748b' }}>
                      Tire uma foto ou anexe a certidão (casamento, nascimento, divórcio, união estável). O estado civil será preenchido automaticamente.
                    </small>
                  </div>
                )}

                {ocrCamposMembroCertPreenchidos.length > 0 && (
                  <p style={{ fontSize: '0.85rem', color: '#16a34a', textAlign: 'center', marginBottom: '0.75rem' }}>
                    <FiCheck size={14} style={{ verticalAlign: 'middle' }} /> Estado civil preenchido pelo scan. Revise e clique em Salvar.
                  </p>
                )}

                <div className={styles.formGrid}>
                  <div className={styles.field}><label>Estado civil</label>
                    <select value={novoMembro.estadoCivil || ''} onChange={e => setNovoMembro({ ...novoMembro, estadoCivil: e.target.value })} style={ocrCamposMembroCertPreenchidos.includes('estadoCivil') ? { borderColor: '#16a34a', boxShadow: '0 0 0 1px #16a34a' } : undefined}>
                      <option value="">Selecione</option>
                      {ESTADO_CIVIL_MEMBRO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                {docsMembro.filter(d => d.tipo === 'CERTIDAO_CASAMENTO').length > 0 && (
                  <p style={{ fontSize: '0.85rem', color: '#16a34a', textAlign: 'center', margin: '0.5rem 0' }}>
                    <FiCheck size={14} style={{ verticalAlign: 'middle' }} /> Certidão enviada.
                  </p>
                )}
                {/* Lista de certidões enviadas */}
                {docsMembro.filter(d => d.tipo === 'CERTIDAO_CASAMENTO').length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', color: '#334155' }}>Certidão enviada</p>
                    {docsMembro.filter(d => d.tipo === 'CERTIDAO_CASAMENTO').map(doc => (
                      <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0' }}>
                        <button type="button" className={styles.btnPrimary} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
                          onClick={() => handleViewDocMembro(editingMembroId!, doc.id)}>Visualizar</button>
                        <button className={styles.btnSmallDanger} onClick={() => handleExcluirDocMembro(editingMembroId!, doc.id)}><FiTrash2 size={14} /></button>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{doc.nome}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )

            // ─── Step 3: Informações Pessoais ───
            case 2: return (
              <>
                <h2 className={styles.sectionTitle}>Informações Pessoais</h2>
                {novoMembro.nome && <p className={styles.sectionName}>{novoMembro.nome}</p>}
                <div className={styles.formGrid}>
                  <div className={styles.field}><label>Cor e raça</label>
                    <select value={novoMembro.corRaca || ''} onChange={e => setNovoMembro({ ...novoMembro, corRaca: e.target.value })}>
                      <option value="">Selecione</option>
                      {COR_RACA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}><label>Escolaridade</label>
                    <select value={novoMembro.escolaridade || ''} onChange={e => setNovoMembro({ ...novoMembro, escolaridade: e.target.value })}>
                      <option value="">Selecione</option>
                      {ESCOLARIDADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}><label>Religião</label>
                    <select value={novoMembro.religiao || ''} onChange={e => setNovoMembro({ ...novoMembro, religiao: e.target.value })}>
                      <option value="">Selecione</option>
                      {RELIGIAO_MEMBRO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <RadioSimNao
                  label="Necessidades especiais"
                  value={novoMembro.necessidadesEspeciais ?? false}
                  onChange={v => setNovoMembro({ ...novoMembro, necessidadesEspeciais: v })}
                />
                {novoMembro.necessidadesEspeciais && (
                  <div className={styles.formGrid}>
                    <div className={`${styles.field} ${styles.fieldFull}`}><label>Tipo de necessidades especiais</label>
                      <input value={novoMembro.tipoNecessidadesEspeciais || ''} onChange={e => setNovoMembro({ ...novoMembro, tipoNecessidadesEspeciais: e.target.value })} />
                    </div>
                    <div className={`${styles.field} ${styles.fieldFull}`}><label>Descrição das necessidades especiais</label>
                      <input value={novoMembro.descricaoNecessidadesEspeciais || ''} onChange={e => setNovoMembro({ ...novoMembro, descricaoNecessidadesEspeciais: e.target.value })} />
                    </div>
                  </div>
                )}
              </>
            )

            // ─── Step 4: Documento Adicional ───
            case 3: {
              const docsAdicionaisMembro = docsMembro.filter(d => d.tipo !== 'RG_MEMBRO' && d.tipo !== 'CERTIDAO_CASAMENTO')
              const outrosRestantesMembro = 5 - docsMembro.filter(d => d.tipo === 'OUTROS').length
              return (
                <>
                  <h2 className={styles.sectionTitle}>Documento Adicional</h2>
                  {novoMembro.nome && <p className={styles.sectionName}>{novoMembro.nome}</p>}

                  {!editingMembroId ? (
                    <p style={{ fontSize: '0.85rem', color: '#f59e0b' }}>Salve o membro primeiro para poder enviar documentos.</p>
                  ) : (
                    <>
                      <RadioSimNao
                        label="Deseja adicionar outro documento?"
                        value={desejaDocAdicionalMembro}
                        onChange={v => setDesejaDocAdicionalMembro(v)}
                      />

                      {desejaDocAdicionalMembro && (
                        <div style={{ marginTop: '1rem' }}>
                          <div className={styles.field}>
                            <label>Tipo de documento</label>
                            <select value={membroDocTipo} onChange={e => setMembroDocTipo(e.target.value)}>
                              <option value="">Selecione o tipo</option>
                              {TIPOS_DOCUMENTO_MEMBRO.filter(t => t.value !== 'RG_MEMBRO').map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>

                          {membroDocTipo && membroDocTipo !== 'OUTROS' && (
                            <>
                              {docsMembro.some(d => d.tipo === membroDocTipo) ? (
                                <p style={{ fontSize: '0.85rem', color: '#16a34a', margin: '0.5rem 0' }}>
                                  Documento já enviado. Exclua o atual para enviar outro.
                                </p>
                              ) : (
                                <div className={styles.field}>
                                  <label>Arquivo</label>
                                  <input ref={membroDocInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    onChange={e => { if (e.target.files?.[0]) setMembroDocFile(e.target.files[0]) }} />
                                  {membroDocFile && (
                                    <div className={styles.inlineActions} style={{ marginTop: '0.5rem' }}>
                                      <button className={styles.btnPrimary} disabled={uploadingDocMembro}
                                        onClick={async () => {
                                          await handleUploadDocMembro(membroDocFile!, membroDocTipo)
                                          setMembroDocFile(null)
                                          setMembroDocTipo('')
                                          if (membroDocInputRef.current) membroDocInputRef.current.value = ''
                                        }}>
                                        {uploadingDocMembro ? 'Enviando...' : 'Enviar Documento'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}

                          {membroDocTipo === 'OUTROS' && outrosRestantesMembro > 0 && (
                            <div style={{ marginTop: '0.75rem' }}>
                              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                Restam {outrosRestantesMembro} documento(s) disponível(is)
                              </p>
                              {Array.from({ length: membroOutrosQtd }, (_, i) => (
                                <div key={i} className={styles.field} style={{ marginBottom: '0.5rem' }}>
                                  <label>Documento {i + 1}</label>
                                  <input
                                    ref={el => { membroOutrosRefs.current[i] = el }}
                                    type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    onChange={e => {
                                      const newArr = [...membroOutrosArquivos]
                                      newArr[i] = e.target.files?.[0] || null
                                      setMembroOutrosArquivos(newArr)
                                    }}
                                  />
                                </div>
                              ))}
                              {membroOutrosQtd < outrosRestantesMembro && (
                                <button className={styles.btnGhost} style={{ fontSize: '0.8rem' }}
                                  onClick={() => { setMembroOutrosQtd(q => q + 1); setMembroOutrosArquivos(a => [...a, null]) }}>
                                  <FiPlus size={12} /> Mais um campo
                                </button>
                              )}
                              <div className={styles.inlineActions} style={{ marginTop: '0.5rem' }}>
                                <button className={styles.btnPrimary} disabled={uploadingDocMembro} onClick={handleUploadDocMembroOutros}>
                                  {uploadingDocMembro ? 'Enviando...' : `Enviar ${membroOutrosArquivos.filter(f => f).length} Documento(s)`}
                                </button>
                              </div>
                            </div>
                          )}
                          {membroDocTipo === 'OUTROS' && outrosRestantesMembro <= 0 && (
                            <p style={{ fontSize: '0.85rem', color: '#dc2626', margin: '0.5rem 0' }}>Limite de 5 documentos "Outros" atingido.</p>
                          )}
                        </div>
                      )}

                      {/* Lista de docs enviados */}
                      {docsAdicionaisMembro.length > 0 && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', color: '#334155' }}>Documentos enviados</p>
                          {docsAdicionaisMembro.map(doc => (
                            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', borderBottom: '1px solid #e2e8f0' }}>
                              <button type="button" className={styles.btnPrimary} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
                                onClick={() => handleViewDocMembro(editingMembroId!, doc.id)}>Visualizar</button>
                              <button className={styles.btnSmallDanger} onClick={() => handleExcluirDocMembro(editingMembroId!, doc.id)}><FiTrash2 size={14} /></button>
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{doc.nome}</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#ca8a04' }}>{doc.tipo.replace(/_/g, ' ')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )
            }

            // ─── Step 5: Benefícios e Programas ───
            case 4: return (
              <>
                <h2 className={styles.sectionTitle}>Benefícios e Programas</h2>
                {novoMembro.nome && <p className={styles.sectionName}>{novoMembro.nome}</p>}
                <RadioSimNao
                  label="Inscrito no cadastro único?"
                  value={novoMembro.cadastroUnico ?? false}
                  onChange={v => setNovoMembro({ ...novoMembro, cadastroUnico: v })}
                />
                <RadioSimNao
                  label="Estudou em escola pública?"
                  value={novoMembro.escolaPublica ?? false}
                  onChange={v => setNovoMembro({ ...novoMembro, escolaPublica: v })}
                />
                <RadioSimNao
                  label="Já recebeu bolsa CEBAS para educação básica?"
                  value={novoMembro.bolsaCebasBasica ?? false}
                  onChange={v => setNovoMembro({ ...novoMembro, bolsaCebasBasica: v })}
                />
                <RadioSimNao
                  label="Já recebeu bolsa CEBAS para educação profissional?"
                  value={novoMembro.bolsaCebasProfissional ?? false}
                  onChange={v => setNovoMembro({ ...novoMembro, bolsaCebasProfissional: v })}
                />
              </>
            )

            default: return null
          }
        }

        return (
          <>
            <StepperBar totalSteps={5} currentStep={subStepMembro} onStepClick={setSubStepMembro} />
            {membroStepContent()}
            <div className={styles.footerSplit}>
              {subStepMembro > 0
                ? <button className={styles.btnArrow} onClick={() => setSubStepMembro(s => s - 1)}><FiArrowLeft size={20} /></button>
                : <button className={styles.btnGhost} onClick={handleCancelMembro}>Voltar à lista</button>
              }
              <button className={styles.btnOutline} onClick={handleSaveMembroStep} disabled={savingMembro}>
                {savingMembro ? 'Salvando...' : 'Salvar'}
              </button>
              {subStepMembro < 4
                ? <button className={styles.btnArrow} onClick={() => setSubStepMembro(s => s + 1)}><FiArrowRight size={20} /></button>
                : <button className={styles.btnOutlineArrow} onClick={handleConcluirMembro} disabled={savingMembro}>
                    {savingMembro ? 'Salvando...' : 'Concluir'} <FiArrowRight size={16} />
                  </button>
              }
            </div>
          </>
        )
      }

      // ════════════════════════════════════════
      // MORADIA
      // ════════════════════════════════════════
      case 'moradia':
        return (
          <>
            <StepperBar totalSteps={2} currentStep={subStepMoradia} onStepClick={setSubStepMoradia} />
            <h2 className={styles.sectionTitle}>Status da Propriedade</h2>

            {subStepMoradia === 0 ? (
              /* ─── Step 1: Status da propriedade ─── */
              <div className={styles.formGridSingle}>
                <div className={styles.field}><label>Status</label>
                  <select value={statusMoradia} onChange={e => setStatusMoradia(e.target.value)}>
                    <option value="">Selecione...</option>{STATUS_MORADIA.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              /* ─── Step 2: Detalhes da moradia ─── */
              <div className={styles.formGridSingle}>
                <div className={styles.field}><label>Status</label>
                  <select value={tipoMoradia} onChange={e => setTipoMoradia(e.target.value)}>
                    <option value="">Selecione...</option>{TIPO_MORADIA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className={styles.field}><label>Tempo vivendo na propriedade</label>
                  <select value={tempoMoradia} onChange={e => setTempoMoradia(e.target.value)}>
                    <option value="">Selecione...</option>{TEMPO_MORADIA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className={styles.field}><label>Quantidade de cômodos</label>
                  <select value={qtdComodos} onChange={e => setQtdComodos(e.target.value)}>
                    <option value="">Selecione...</option>{QTD_COMODOS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                  </select>
                </div>
                <div className={styles.field}><label>Quantos cômodos estão servindo permanentemente como dormitórios?</label>
                  <input type="number" min="0" value={qtdDormitorios} onChange={e => setQtdDormitorios(e.target.value)} placeholder="0" />
                </div>
              </div>
            )}

            <div className={styles.footerSplit}>
              {subStepMoradia > 0
                ? <button className={styles.btnArrow} onClick={() => setSubStepMoradia(0)}><FiArrowLeft size={20} /></button>
                : <div />}
              <button className={styles.btnOutline} onClick={handleSaveMoradia}>Salvar</button>
              {subStepMoradia < 1
                ? <button className={styles.btnArrow} onClick={() => setSubStepMoradia(1)}><FiArrowRight size={20} /></button>
                : <button className={styles.btnArrow} onClick={goToNextSection}><FiArrowRight size={20} /></button>}
            </div>
          </>
        )

      // ════════════════════════════════════════
      // VEÍCULO
      // ════════════════════════════════════════
      case 'veiculo':
        return (
          <>
            <h2 className={styles.sectionTitle}>Veículos</h2>
            <div className={styles.listItems}>
              {veiculos.map((v, i) => (
                <div key={v.id || i} className={styles.listRow}>
                  <span className={styles.listName}>{v.modelo}{v.placa ? ` · ${v.placa}` : ''}{v.ano ? ` · ${v.ano}` : ''}</span>
                  <button className={styles.btnSmallDanger} onClick={() => v.id ? handleRemoveVeiculo(v.id) : setVeiculos(veiculos.filter((_, j) => j !== i))}><FiTrash2 size={14} /> Excluir</button>
                </div>
              ))}
            </div>
            <div className={styles.centeredActions}><button className={styles.btnOutline} onClick={() => setShowAddVeiculo(!showAddVeiculo)}>Novo veículo</button></div>
            {showAddVeiculo && (
              <div className={styles.inlineForm}>
                <div className={styles.formGrid}>
                  <div className={styles.field}><label>Modelo</label><input value={novoVeiculo.modelo} onChange={e => setNovoVeiculo({ ...novoVeiculo, modelo: e.target.value })} placeholder="Fiat Palio" /></div>
                  <div className={styles.field}><label>Placa</label><input value={novoVeiculo.placa} onChange={e => setNovoVeiculo({ ...novoVeiculo, placa: e.target.value })} /></div>
                  <div className={styles.field}><label>Ano</label><input value={novoVeiculo.ano} onChange={e => setNovoVeiculo({ ...novoVeiculo, ano: e.target.value })} /></div>
                </div>
                <div className={styles.inlineActions}>
                  <button className={styles.btnPrimary} onClick={handleAddVeiculo}>Salvar</button>
                  <button className={styles.btnGhost} onClick={() => setShowAddVeiculo(false)}>Cancelar</button>
                </div>
              </div>
            )}
            <div className={styles.footerCenter}><button className={styles.btnOutlineArrow} onClick={goToNextSection}>Próxima Etapa <FiArrowRight size={16} /></button></div>
          </>
        )

      // ════════════════════════════════════════
      // RENDA
      // ════════════════════════════════════════
      case 'renda':
        return (
          <>
            <h2 className={styles.sectionTitle}>Renda Familiar</h2>
            <div className={styles.rendaCards}>
              <div className={styles.rendaCard}>
                <span className={styles.rendaCardLabel}>Renda média mensal</span>
                <span className={styles.rendaCardValue}>R$ {rendaMedia}</span>
              </div>
              <div className={styles.rendaCard}>
                <span className={styles.rendaCardLabel}>Renda per capita</span>
                <span className={styles.rendaCardValue}>R$ {rendaPerCapita}</span>
              </div>
            </div>

            <p className={styles.sectionSub}>
              {membrosRenda.length > 0
                ? 'Clique em cada membro para registrar a renda mensal dos últimos 3 meses.'
                : ''}
            </p>

            <div className={styles.listItems}>
              {membrosRenda.map((m: any) => {
                const ultimaRenda = m.rendaMensal?.[0]
                return (
                  <div key={m.id} className={styles.membroRendaRow} onClick={() => abrirRendaDrawer(m.id)} style={{ cursor: 'pointer' }}>
                    <FiDollarSign size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <div className={styles.membroInfo}>
                      <span className={styles.membroNome}>{m.nome}</span>
                      <span className={styles.membroMeta}>{m.parentesco}{m.ocupacao ? ` · ${m.ocupacao}` : ''}</span>
                    </div>
                    <span className={styles.membroRenda}>
                      {ultimaRenda ? `R$ ${formatCurrency(Number(ultimaRenda.valor))}` : 'Sem registro'}
                    </span>
                    <div className={styles.indicators}>
                      <span className={m.rendaMensal?.length > 0 ? styles.indicatorGreen : styles.indicatorYellow} />
                    </div>
                  </div>
                )
              })}
              {membrosRenda.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <p className={styles.emptyMsg}>Nenhum membro do grupo familiar cadastrado ainda.</p>
                  <p className={styles.emptyMsg} style={{ marginTop: '0.5rem' }}>
                    Para registrar renda, primeiro cadastre os membros na seção{' '}
                    <button className={styles.linkBtn} onClick={() => goToSection(1)}>Grupo Familiar</button>.
                  </p>
                </div>
              )}
            </div>
            <div className={styles.footerCenter}>
              <button className={styles.btnOutlineArrow} onClick={goToNextSection}>Próxima Etapa <FiArrowRight size={16} /></button>
            </div>

            {/* Drawer de Renda por Membro */}
            {rendaDrawerMembro && (
              <div className={styles.rendaDrawerOverlay} onClick={() => { setRendaDrawerMembro(null); setRendaDrawerData(null) }}>
                <div className={styles.rendaDrawer} onClick={e => e.stopPropagation()}>
                  <div className={styles.rendaDrawerHeader}>
                    <h3>{rendaDrawerData?.membro?.nome || 'Renda'}</h3>
                    <button className={styles.btnGhost} onClick={() => { setRendaDrawerMembro(null); setRendaDrawerData(null) }}><FiX size={20} /></button>
                  </div>

                  <div className={styles.rendaDrawerBody}>
                    {rendaDrawerLoading ? (
                      <div className={styles.loadingContainer}><div className={styles.spinner} /></div>
                    ) : (
                      <>
                        {rendaDrawerData?.resumo && (
                          <div className={styles.rendaBadge} style={{ marginBottom: '1.25rem' }}>
                            <span>Média mensal:</span>
                            <div className={styles.rendaValue}>R$ {formatCurrency(rendaDrawerData.resumo.mediaRenda)}</div>
                          </div>
                        )}

                        {getUltimosMeses().map(({ month, year }) => {
                          const mesKey = `${year}-${month}`
                          const rendaExistente = rendaDrawerData?.rendas?.find(r => r.mes === month && r.ano === year)
                          const expanded = showRendaForm === mesKey

                          return (
                            <div key={mesKey} className={styles.rendaMesCard}>
                              <div className={styles.rendaMesHeader} onClick={() => setShowRendaForm(expanded ? null : mesKey)}>
                                <span>{MESES_LABEL[month]} de {year}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {rendaExistente && (
                                    <span className={styles.rendaMesValor}>R$ {formatCurrency(Number(rendaExistente.valor))}</span>
                                  )}
                                  {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                                </div>
                              </div>

                              {expanded && (
                                <div className={styles.rendaMesBody}>
                                  {rendaExistente && (
                                    <div style={{ marginBottom: '0.75rem' }}>
                                      <div className={styles.despesaItem}>
                                        <div className={styles.despesaItemInfo}>
                                          <span className={styles.despesaItemDesc}>{rendaExistente.fonte || 'Sem fonte especificada'}</span>
                                          {rendaExistente.descricao && <span className={styles.membroMeta}>{rendaExistente.descricao}</span>}
                                        </div>
                                        <span className={styles.despesaItemValor}>R$ {formatCurrency(Number(rendaExistente.valor))}</span>
                                        <button className={styles.btnSmallDanger} onClick={() => handleExcluirRenda(rendaExistente.id, rendaDrawerMembro!)}><FiTrash2 size={12} /></button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className={styles.rendaInlineForm}>
                                    <div className={styles.rendaInlineRow}>
                                      <div className={styles.field}>
                                        <label>Valor (R$)</label>
                                        <input value={novaRenda.valor} placeholder="0,00" onChange={e => setNovaRenda({ ...novaRenda, valor: e.target.value })} />
                                      </div>
                                      <div className={styles.field}>
                                        <label>Fonte de renda</label>
                                        <select value={novaRenda.fonte} onChange={e => setNovaRenda({ ...novaRenda, fonte: e.target.value })}>
                                          <option value="">Selecione...</option>
                                          {FONTES_RENDA.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                    <div className={styles.field}>
                                      <label>Descrição (opcional)</label>
                                      <input value={novaRenda.descricao} placeholder="Ex: Salário empresa X" onChange={e => setNovaRenda({ ...novaRenda, descricao: e.target.value })} />
                                    </div>
                                    <div className={styles.inlineActions}>
                                      <button className={styles.btnPrimary} disabled={savingRenda} onClick={() => handleSalvarRenda(rendaDrawerMembro!, month, year)}>
                                        {savingRenda ? 'Salvando...' : rendaExistente ? 'Atualizar' : 'Salvar'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>

                  <div className={styles.rendaDrawerFooter}>
                    <button className={styles.btnGhost} onClick={() => { setRendaDrawerMembro(null); setRendaDrawerData(null) }}>Fechar</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )

      // ════════════════════════════════════════
      // GASTOS
      // ════════════════════════════════════════
      case 'gastos': {
        // Carregar dados da tabela de despesas quando abrir a seção
        if (!despesaCarregada) {
          carregarDespesasMes(despesaMesAtual.mes, despesaMesAtual.ano)
        }
        return (
          <>
            <h2 className={styles.sectionTitle}>Despesas Mensais</h2>
            <div className={styles.gastosCards}>
              <div className={styles.gastoCard}><span className={styles.gastoLabel}>Último mês</span><span className={styles.gastoValor}>R$ {formatCurrency(gastoUltimoMes)}</span></div>
              <div className={styles.gastoCard}><span className={styles.gastoLabel}>Média do trimestre</span><span className={styles.gastoValor}>R$ {formatCurrency(gastoMediaTrimestre)}</span></div>
            </div>
            <p className={styles.sectionSub} style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-primary)', fontSize: '1.1rem' }}>
              {MESES_LABEL[despesaMesAtual.mes]} de {despesaMesAtual.ano}
            </p>

            {/* Seletor de mês */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '0.5rem 0 1rem' }}>
              {getUltimosMeses().reverse().map(({ month, year }) => (
                <button
                  key={`${year}-${month}`}
                  className={despesaMesAtual.mes === month && despesaMesAtual.ano === year ? styles.btnPrimary : styles.btnSmallOutline}
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                  onClick={() => {
                    setDespesaMesAtual({ mes: month, ano: year })
                    setDespesaCarregada(false)
                    carregarDespesasMes(month, year)
                  }}
                >
                  {MESES_LABEL[month]?.substring(0, 3)}/{year}
                </button>
              ))}
            </div>

            {/* Tabela de despesas */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-gray-300)' }}>
                    <th style={{ textAlign: 'center', padding: '0.6rem 0.5rem', fontWeight: 600, color: 'var(--color-gray-700)' }}>Descrição</th>
                    <th style={{ textAlign: 'center', padding: '0.6rem 0.5rem', fontWeight: 600, color: 'var(--color-gray-700)', width: '140px' }}>Valor</th>
                    <th style={{ textAlign: 'center', padding: '0.6rem 0.5rem', fontWeight: 600, color: 'var(--color-gray-700)', width: '80px' }}>Não se aplica</th>
                    <th style={{ textAlign: 'center', padding: '0.6rem 0.5rem', fontWeight: 600, color: 'var(--color-gray-700)', width: '140px' }}>Justificativa</th>
                  </tr>
                </thead>
                <tbody>
                  {despesaLinhas.map((linha, i) => (
                    <tr key={linha.categoria} style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
                      <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 500 }}>{linha.label}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <input
                          style={{ width: '120px', padding: '0.35rem 0.5rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius)', textAlign: 'right', fontSize: '0.9rem', fontFamily: 'inherit' }}
                          value={linha.naoSeAplica ? 'R$ 0,00' : `R$ ${linha.valor}`}
                          disabled={linha.naoSeAplica}
                          onChange={e => {
                            const raw = e.target.value.replace('R$ ', '').replace('R$', '')
                            handleDespesaValorChange(i, raw)
                          }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <input type="checkbox" checked={linha.naoSeAplica} onChange={e => handleDespesaNaoAplicaChange(i, e.target.checked)} />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <input
                          style={{ width: '120px', padding: '0.35rem 0.5rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius)', fontSize: '0.85rem', fontFamily: 'inherit' }}
                          value={linha.justificativa}
                          placeholder=""
                          onChange={e => handleDespesaJustificativaChange(i, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}

                  {/* Despesas extras */}
                  {despesasExtras.map((extra, i) => (
                    <tr key={`extra-${i}`} style={{ borderBottom: '1px solid var(--color-gray-200)', background: 'var(--color-gray-50)' }}>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <input
                          style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius)', fontSize: '0.9rem', fontFamily: 'inherit' }}
                          value={extra.label}
                          placeholder="Descrição da despesa"
                          onChange={e => setDespesasExtras(prev => prev.map((ex, idx) => idx === i ? { ...ex, label: e.target.value, categoria: `EXTRA_${e.target.value.replace(/\s/g, '_').toUpperCase()}` } : ex))}
                        />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <input
                          style={{ width: '120px', padding: '0.35rem 0.5rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius)', textAlign: 'right', fontSize: '0.9rem', fontFamily: 'inherit' }}
                          value={extra.naoSeAplica ? 'R$ 0,00' : `R$ ${extra.valor}`}
                          disabled={extra.naoSeAplica}
                          onChange={e => {
                            const raw = e.target.value.replace('R$ ', '').replace('R$', '')
                            handleDespesaValorChange(i, raw, true)
                          }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <input type="checkbox" checked={extra.naoSeAplica} onChange={e => handleDespesaNaoAplicaChange(i, e.target.checked, true)} />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}>
                        <input
                          style={{ width: '90px', padding: '0.35rem 0.5rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius)', fontSize: '0.85rem', fontFamily: 'inherit' }}
                          value={extra.justificativa}
                          onChange={e => handleDespesaJustificativaChange(i, e.target.value, true)}
                        />
                        <button className={styles.btnSmallDanger} onClick={() => handleRemoverDespesaExtra(i)} title="Remover"><FiTrash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Nova despesa + Salvar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem' }}>Deseja lançar outra despesa ou empréstimos?</span>
                <button className={styles.btnSmallOutline} onClick={handleAdicionarDespesaExtra}>Nova despesa</button>
              </div>
              <button className={styles.btnOutline} onClick={handleSalvarDespesasTabela} disabled={savingDespesa}>
                {savingDespesa ? 'Salvando...' : 'Salvar'}
              </button>
            </div>

            <div className={styles.footerCenter} style={{ marginTop: '1.5rem' }}>
              <button className={styles.btnOutlineArrow} onClick={goToNextSection}>Próxima Etapa <FiArrowRight size={16} /></button>
            </div>
          </>
        )
      }

      // ════════════════════════════════════════
      // SAÚDE
      // ════════════════════════════════════════
      case 'saude':
        // Se uma pessoa está aberta, mostrar wizard 2-step
        if (saudePessoaAberta) {
          return (
            <>
              <button className={styles.btnArrow} onClick={handleVoltarListaSaude} style={{ alignSelf: 'flex-start', marginBottom: '0.5rem' }}>
                <FiArrowLeft size={16} /> Voltar
              </button>

              <StepperBar totalSteps={SAUDE_STEP_LABELS.length} currentStep={saudeSubStep} />
              <h2 className={styles.sectionTitle}>{SAUDE_STEP_LABELS[saudeSubStep]}</h2>
              {saudePessoaAberta.nome && <p className={styles.sectionName}>{saudePessoaAberta.nome}</p>}

              {saudeSubStep === 0 && (
                <>
                  <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                    <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Possui alguma doença?</p>
                    <label style={{ marginRight: '1.5rem', cursor: 'pointer' }}>
                      <input type="radio" checked={saudeForm.possuiDoenca === true} onChange={() => setSaudeForm({ ...saudeForm, possuiDoenca: true })} /> Sim
                    </label>
                    <label style={{ cursor: 'pointer' }}>
                      <input type="radio" checked={saudeForm.possuiDoenca === false} onChange={() => setSaudeForm({ ...saudeForm, possuiDoenca: false, doenca: '', possuiRelatorioMedico: false })} /> Não
                    </label>
                  </div>

                  {saudeForm.possuiDoenca && (
                    <>
                      <div className={styles.field} style={{ marginTop: '1rem' }}>
                        <label>Doença</label>
                        <select value={saudeForm.doenca} onChange={e => setSaudeForm({ ...saudeForm, doenca: e.target.value })}>
                          <option value="">Selecione</option>
                          {DOENCAS_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>

                      <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                        <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Possui relatório médico?</p>
                        <label style={{ marginRight: '1.5rem', cursor: 'pointer' }}>
                          <input type="radio" checked={saudeForm.possuiRelatorioMedico === true} onChange={() => setSaudeForm({ ...saudeForm, possuiRelatorioMedico: true })} /> Sim
                        </label>
                        <label style={{ cursor: 'pointer' }}>
                          <input type="radio" checked={saudeForm.possuiRelatorioMedico === false} onChange={() => setSaudeForm({ ...saudeForm, possuiRelatorioMedico: false })} /> Não
                        </label>
                      </div>

                      {saudeForm.possuiRelatorioMedico && (
                        <div className={styles.field} style={{ marginTop: '0.5rem' }}>
                          <label>Anexar laudo</label>
                          {saudeForm.laudoNome ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <FiCheck size={16} color="green" />
                              <span style={{ fontSize: '0.85rem' }}>{saudeForm.laudoNome}</span>
                              <button type="button" className={styles.btnSmallOutline} onClick={() => handleViewSaudeArquivo('laudo')}>Visualizar</button>
                              <button type="button" className={styles.btnSmallOutline} onClick={() => handleExcluirSaudeArquivo('laudo')} style={{ color: '#c00' }}><FiTrash2 size={14} /></button>
                            </div>
                          ) : (
                            <>
                              <div
                                onClick={() => laudoInputRef.current?.click()}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius)', background: 'var(--color-white)' }}
                              >
                                <span style={{ color: '#999' }}>Anexar arquivo</span>
                                <FiUpload size={16} style={{ marginLeft: 'auto' }} />
                              </div>
                              <input ref={laudoInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleUploadLaudo(e.target.files[0]); e.target.value = '' }} />
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>*Tamanho máximo de 10Mb</span>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {saudeSubStep === 1 && (
                <>
                  <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                    <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Toma medicamento controlado?</p>
                    <label style={{ marginRight: '1.5rem', cursor: 'pointer' }}>
                      <input type="radio" checked={saudeForm.tomaMedicamentoControlado === true} onChange={() => setSaudeForm({ ...saudeForm, tomaMedicamentoControlado: true })} /> Sim
                    </label>
                    <label style={{ cursor: 'pointer' }}>
                      <input type="radio" checked={saudeForm.tomaMedicamentoControlado === false} onChange={() => setSaudeForm({ ...saudeForm, tomaMedicamentoControlado: false, nomeMedicamento: '', obtemRedePublica: false, especifiqueRedePublica: '' })} /> Não
                    </label>
                  </div>

                  {saudeForm.tomaMedicamentoControlado && (
                    <>
                      <div className={styles.field} style={{ marginTop: '0.5rem' }}>
                        <label>Nome do medicamento</label>
                        <input value={saudeForm.nomeMedicamento} onChange={e => setSaudeForm({ ...saudeForm, nomeMedicamento: e.target.value })} />
                      </div>

                      <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                        <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Obtém de rede pública?</p>
                        <label style={{ marginRight: '1.5rem', cursor: 'pointer' }}>
                          <input type="radio" checked={saudeForm.obtemRedePublica === true} onChange={() => setSaudeForm({ ...saudeForm, obtemRedePublica: true })} /> Sim
                        </label>
                        <label style={{ cursor: 'pointer' }}>
                          <input type="radio" checked={saudeForm.obtemRedePublica === false} onChange={() => setSaudeForm({ ...saudeForm, obtemRedePublica: false, especifiqueRedePublica: '' })} /> Não
                        </label>
                      </div>

                      {saudeForm.obtemRedePublica && (
                        <div className={styles.field} style={{ marginTop: '0.5rem' }}>
                          <label>Especifique quais</label>
                          <input value={saudeForm.especifiqueRedePublica} onChange={e => setSaudeForm({ ...saudeForm, especifiqueRedePublica: e.target.value })} />
                        </div>
                      )}

                      <div className={styles.field} style={{ marginTop: '1rem' }}>
                        <label>Receita do medicamento</label>
                        {saudeForm.receitaNome ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <FiCheck size={16} color="green" />
                            <span style={{ fontSize: '0.85rem' }}>{saudeForm.receitaNome}</span>
                            <button type="button" className={styles.btnSmallOutline} onClick={() => handleViewSaudeArquivo('receita')}>Visualizar</button>
                            <button type="button" className={styles.btnSmallOutline} onClick={() => handleExcluirSaudeArquivo('receita')} style={{ color: '#c00' }}><FiTrash2 size={14} /></button>
                          </div>
                        ) : (
                          <>
                            <div
                              onClick={() => receitaInputRef.current?.click()}
                              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius)', background: 'var(--color-white)' }}
                            >
                              <span style={{ color: '#999' }}>Anexar arquivo</span>
                              <FiUpload size={16} style={{ marginLeft: 'auto' }} />
                            </div>
                            <input ref={receitaInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleUploadReceita(e.target.files[0]); e.target.value = '' }} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>*Tamanho máximo de 10Mb</span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              <div className={styles.footerSplit} style={{ marginTop: '1.5rem' }}>
                {saudeSubStep > 0
                  ? <button className={styles.btnArrow} onClick={() => { handleSalvarSaude(); setSaudeSubStep(s => s - 1) }}><FiArrowLeft size={20} /></button>
                  : <div />
                }
                <button className={styles.btnOutline} onClick={handleSalvarSaude} disabled={savingSaude}>
                  {savingSaude ? 'Salvando...' : 'Salvar'}
                </button>
                {saudeSubStep < SAUDE_STEP_LABELS.length - 1
                  ? <button className={styles.btnArrow} onClick={() => { handleSalvarSaude(); setSaudeSubStep(s => s + 1) }}><FiArrowRight size={20} /></button>
                  : <button className={styles.btnOutlineArrow} onClick={() => { handleSalvarSaude(); handleVoltarListaSaude() }}>Concluir <FiCheck size={16} /></button>
                }
              </div>
            </>
          )
        }

        // Lista de pessoas (candidato + membros)
        return (
          <>
            <h2 className={styles.sectionTitle}>Saúde</h2>
            <p className={styles.sectionSub}>Cadastre dados sobre a saúde de seu grupo familiar</p>
            <div className={styles.listItems}>
              {pessoasSaude.length > 0 ? pessoasSaude.map(p => (
                <div key={`${p.tipo}-${p.id}`} className={styles.listRow}>
                  <span className={styles.listName}>{p.nome}</span>
                  <button className={styles.btnSmallOutline} onClick={() => handleAbrirSaude(p)}>
                    {p.saude ? <><FiEye size={14} /> Visualizar</> : <><FiPlus size={14} /> Cadastrar</>}
                  </button>
                </div>
              )) : (
                <>
                  {dados.nome && (
                    <div className={styles.listRow}>
                      <span className={styles.listName}>{dados.nome}</span>
                      <button className={styles.btnSmallOutline} onClick={() => handleAbrirSaude({ id: '', nome: dados.nome, tipo: 'candidato', saude: null })}>
                        <FiPlus size={14} /> Cadastrar
                      </button>
                    </div>
                  )}
                  {membros.map(m => (
                    <div key={m.id} className={styles.listRow}>
                      <span className={styles.listName}>{m.nome}</span>
                      <button className={styles.btnSmallOutline} onClick={() => handleAbrirSaude({ id: m.id!, nome: m.nome, tipo: 'membro', saude: null })}>
                        <FiPlus size={14} /> Cadastrar
                      </button>
                    </div>
                  ))}
                  {!dados.nome && membros.length === 0 && <p className={styles.emptyMsg}>Cadastre seus dados pessoais e membros da família primeiro.</p>}
                </>
              )}
            </div>
            <div className={styles.footerCenter}><button className={styles.btnOutlineArrow} onClick={goToNextSection}>Próxima Etapa <FiArrowRight size={16} /></button></div>
          </>
        )

      // ════════════════════════════════════════
      // DECLARAÇÕES
      // ════════════════════════════════════════
      case 'declaracoes':
        return (
          <>
            <h2 className={styles.sectionTitle}>Declarações para fins de processo seletivo CEBAS</h2>
            <div className={styles.listItems}>
              {dados.nome && (
                <div className={styles.listRow}>
                  <span className={styles.listName}>{dados.nome}</span>
                  {documentos.filter(d => d.tipo === 'DECLARACAO_CEBAS').length > 0
                    ? documentos.filter(d => d.tipo === 'DECLARACAO_CEBAS').map(doc => (
                        <button key={doc.id} type="button" className={styles.btnPrimary} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => handleViewDoc(doc.id)}>Visualizar Documento</button>
                      ))
                    : <span style={{ fontSize: '0.8rem', color: '#999' }}>Nenhuma declaração enviada</span>
                  }
                </div>
              )}
              {membros.map(m => (
                <div key={m.id} className={styles.listRow}>
                  <span className={styles.listName}>{m.nome}</span>
                  <span style={{ fontSize: '0.8rem', color: '#999' }}>Nenhuma declaração enviada</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '1rem' }}>
              As declarações podem ser enviadas na seção "Documento Adicional" do cadastro.
            </p>
          </>
        )

      default: return null
    }
  }

  return (
    <div className={styles.pageContent}>
      {renderSection()}

      {/* Drawer de detalhe do membro */}
      {membroAberto && (
        <MembroDetalhe
          membroId={membroAberto}
          onClose={() => setMembroAberto(null)}
          onUpdate={() => carregarDados()}
        />
      )}
    </div>
  )
}
