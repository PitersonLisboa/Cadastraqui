import { useState, useEffect, useRef } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { toast } from 'react-toastify'
import { FiArrowRight, FiArrowLeft, FiTrash2, FiEye, FiPlus, FiX, FiDollarSign, FiChevronDown, FiChevronUp, FiFileText } from 'react-icons/fi'
import { sidebarModeState } from '@/atoms'
import { StepperBar } from '@/components/common/StepperBar/StepperBar'
import { api, rendaService, despesaService, moradiaService, veiculoService } from '@/services/api'
import { maskCPF, maskPhone, maskCEP, unmaskValue, fetchAddressByCEP } from '@/utils/masks'
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
  'Dados Pessoais', 'Endereço', 'Comprovante de endereço',
  'Informações Adicionais', 'Estado Civil', 'Informações Pessoais',
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

interface Membro { id?: string; nome: string; cpf: string; parentesco: string; renda?: number }
interface Veiculo { id?: string; modelo: string; placa: string; ano: string }
interface RendaMensalItem { id: string; mes: number; ano: number; valor: number; fonte?: string; descricao?: string }
interface DespesaItem { id: string; mes: number; ano: number; categoria: string; descricao?: string; valor: number }
interface DocumentoItem { id: string; tipo: string; nome: string; url: string; status: string; criadoEm: string }

const TIPOS_DOCUMENTO = [
  { value: 'CARTEIRA_MOTORISTA', label: 'Carteira de Motorista' },
  { value: 'CARTEIRA_FUNCIONAL', label: 'Carteira Funcional' },
  { value: 'IDENTIDADE_MILITAR', label: 'Identidade Militar' },
  { value: 'PASSAPORTE', label: 'Passaporte' },
  { value: 'CARTEIRA_TRABALHO', label: 'Carteira de Trabalho' },
  { value: 'OUTROS_EDITAL', label: 'Outro(s) - Conforme Edital' },
]

const CATEGORIAS_DESPESA = [
  { value: 'MORADIA', label: 'Moradia (aluguel, condomínio, IPTU)' },
  { value: 'ALIMENTACAO', label: 'Alimentação' },
  { value: 'TRANSPORTE', label: 'Transporte' },
  { value: 'SAUDE', label: 'Saúde (plano, medicamentos)' },
  { value: 'EDUCACAO', label: 'Educação' },
  { value: 'LAZER', label: 'Lazer' },
  { value: 'VESTUARIO', label: 'Vestuário' },
  { value: 'OUTROS', label: 'Outros' },
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
  const [novoMembro, setNovoMembro] = useState<Membro>({ nome: '', cpf: '', parentesco: '' })

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

  // Membro selecionado para visualizar no drawer
  const [membroAberto, setMembroAberto] = useState<string | null>(null)

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

  const handleAddMembro = async () => {
    if (!novoMembro.nome || !novoMembro.parentesco) return toast.error('Preencha nome e parentesco')
    try {
      await api.post('/familia/membros', { nome: novoMembro.nome, cpf: unmaskValue(novoMembro.cpf), parentesco: novoMembro.parentesco })
      toast.success('Membro adicionado!')
      setNovoMembro({ nome: '', cpf: '', parentesco: '' })
      setShowAddMembro(false)
      carregarDados()
    } catch (error: any) { toast.error(error.response?.data?.message || 'Erro') }
  }

  const handleRemoveMembro = async (id: string) => {
    if (!confirm('Excluir este membro?')) return
    try { await api.delete(`/familia/membros/${id}`); toast.success('Removido'); carregarDados() }
    catch { toast.error('Erro ao remover') }
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
  const handleUploadDoc = async () => {
    if (!docTipo) return toast.error('Selecione o tipo de documento')
    if (docTipo === 'OUTROS_EDITAL') return // handled separately
    if (!docArquivo) return toast.error('Selecione um arquivo')
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

  const handleViewDoc = async (docId: string) => {
    try {
      const response = await api.get(`/documentos/${docId}/download`, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err: any) {
      toast.error('Erro ao visualizar documento')
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
  const RadioSimNao = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div className={styles.radioGroup}>
      <span className={styles.radioLabel}>{label}</span>
      <label><input type="radio" checked={value === true} onChange={() => onChange(true)} /> Sim</label>
      <label><input type="radio" checked={value === false} onChange={() => onChange(false)} /> Não</label>
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
                <div className={styles.formGrid}>
                  <div className={styles.field}><label>Nome completo</label><input value={dados.nome} disabled={!editMode} onChange={e => setDados({ ...dados, nome: e.target.value })} /></div>
                  <div className={styles.field}><label>CPF</label><input value={dados.cpf} disabled={!editMode} onChange={e => setDados({ ...dados, cpf: maskCPF(e.target.value) })} /></div>
                  <div className={styles.field}><label>Data de nascimento</label><input type="date" value={dados.dataNascimento} disabled={!editMode} onChange={e => setDados({ ...dados, dataNascimento: e.target.value })} /></div>
                  <div className={styles.field}><label>Telefone</label><input value={dados.telefone} disabled={!editMode} onChange={e => setDados({ ...dados, telefone: maskPhone(e.target.value) })} /></div>
                  <div className={styles.field}><label>RG/RNE</label><input value={dados.rg} disabled={!editMode} onChange={e => setDados({ ...dados, rg: e.target.value })} /></div>
                  <div className={styles.field}><label>Estado emissor do RG/RNE</label>
                    <select value={dados.rgEstado} disabled={!editMode} onChange={e => setDados({ ...dados, rgEstado: e.target.value })}>
                      <option value="">Selecione...</option>{ESTADOS_EMISSOR.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}><label>Órgão emissor do RG/RNE</label><input value={dados.rgOrgao} disabled={!editMode} placeholder="SSP" onChange={e => setDados({ ...dados, rgOrgao: e.target.value })} /></div>
                </div>
                <div className={styles.fieldWide}>
                  <label>Documento de identificação</label>
                  <div className={styles.fileUpload} onClick={() => fileInputRef.current?.click()}>
                    <span>{docFile ? docFile.name : 'Anexar arquivo'}</span><FiPlus size={16} />
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setDocFile(e.target.files[0]) }} />
                  <small className={styles.fileHint}>*Tamanho máximo de 10Mb</small>
                  {docFile && (
                    <button type="button" className={styles.btnPrimary} style={{ marginTop: '0.5rem' }} disabled={uploadingDoc} onClick={async () => {
                      setUploadingDoc(true)
                      try {
                        const formData = new FormData()
                        formData.append('tipo', 'RG')
                        formData.append('file', docFile)
                        await api.post('/documentos', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                        toast.success('Documento enviado!')
                        setDocFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                        carregarDados()
                      } catch (err: any) { toast.error(err.response?.data?.message || 'Erro ao enviar') }
                      finally { setUploadingDoc(false) }
                    }}>{uploadingDoc ? 'Enviando...' : 'Enviar Documento'}</button>
                  )}
                </div>
                <DocListBlock tipos={['RG']} titulo="Documento(s) RG enviado(s)" />
              </>
            )

            // ─── 2. Endereço ───
            case 1: return (
              <>
                <h2 className={styles.sectionTitle}>Endereço</h2>
                {dados.nome && <p className={styles.sectionName}>{dados.nome}</p>}
                <div className={styles.formGrid}>
                  <div className={styles.field}><label>CEP</label><input value={endereco.cep} disabled={!editMode} onChange={e => { const v = maskCEP(e.target.value); setEndereco({ ...endereco, cep: v }); handleCEPChange(v) }} /></div>
                  <div className={styles.field}><label>Rua</label><input value={endereco.rua} disabled={!editMode} onChange={e => setEndereco({ ...endereco, rua: e.target.value })} /></div>
                  <div className={styles.field}><label>Número</label><input value={endereco.numero} disabled={!editMode} onChange={e => setEndereco({ ...endereco, numero: e.target.value })} /></div>
                  <div className={styles.field}><label>Bairro</label><input value={endereco.bairro} disabled={!editMode} onChange={e => setEndereco({ ...endereco, bairro: e.target.value })} /></div>
                  <div className={styles.field}><label>Cidade</label><input value={endereco.cidade} disabled={!editMode} onChange={e => setEndereco({ ...endereco, cidade: e.target.value })} /></div>
                  <div className={styles.field}><label>Complemento</label><input value={endereco.complemento} disabled={!editMode} onChange={e => setEndereco({ ...endereco, complemento: e.target.value })} /></div>
                  <div className={styles.field}><label>Unidade federativa</label>
                    <select value={endereco.uf} disabled={!editMode} onChange={e => setEndereco({ ...endereco, uf: e.target.value })}>
                      <option value="">Selecione...</option>{ESTADOS_EMISSOR.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )

            // ─── 3. Comprovante de endereço ───
            case 2: return (
              <>
                <h2 className={styles.sectionTitle}>Comprovante de endereço</h2>
                {dados.nome && <p className={styles.sectionName}>{dados.nome}</p>}
                <RadioSimNao label="Possui comprovante de residência?" value={possuiComprovante} onChange={setPossuiComprovante} />
                {possuiComprovante && (
                  <div className={styles.fieldWide}>
                    <label>Comprovante</label>
                    <div className={styles.fileUpload} onClick={() => comprovanteRef.current?.click()}>
                      <span>{comprovanteFile ? comprovanteFile.name : 'Anexar arquivo'}</span><FiPlus size={16} />
                    </div>
                    <input ref={comprovanteRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setComprovanteFile(e.target.files[0]) }} />
                    <small className={styles.fileHint}>*Tamanho máximo de 10Mb</small>
                    {comprovanteFile && (
                      <button type="button" className={styles.btnPrimary} style={{ marginTop: '0.5rem' }} disabled={uploadingDoc} onClick={async () => {
                        setUploadingDoc(true)
                        try {
                          const formData = new FormData()
                          formData.append('tipo', 'COMPROVANTE_RESIDENCIA')
                          formData.append('file', comprovanteFile)
                          await api.post('/documentos', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                          toast.success('Comprovante enviado!')
                          setComprovanteFile(null)
                          if (comprovanteRef.current) comprovanteRef.current.value = ''
                          carregarDados()
                        } catch (err: any) { toast.error(err.response?.data?.message || 'Erro ao enviar') }
                        finally { setUploadingDoc(false) }
                      }}>{uploadingDoc ? 'Enviando...' : 'Enviar Comprovante'}</button>
                    )}
                  </div>
                )}
                <DocListBlock tipos={['COMPROVANTE_RESIDENCIA']} titulo="Comprovante(s) enviado(s)" />
              </>
            )

            // ─── 4. Informações Adicionais ───
            case 3: return (
              <>
                <h2 className={styles.sectionTitle}>Informações Adicionais</h2>
                {dados.nome && <p className={styles.sectionName}>{dados.nome}</p>}
                <div className={styles.formGridSingle}>
                  <div className={styles.field}><label>Nome social (quando houver)</label><input value={adicionais.nomeSocial} disabled={!editMode} onChange={e => setAdicionais({ ...adicionais, nomeSocial: e.target.value })} /></div>
                  <div className={styles.field}><label>Sexo</label>
                    <select value={adicionais.sexo} disabled={!editMode} onChange={e => setAdicionais({ ...adicionais, sexo: e.target.value })}>
                      <option value="">Selecione...</option>{SEXO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}><label>Profissão</label><input value={adicionais.profissao} disabled={!editMode} onChange={e => setAdicionais({ ...adicionais, profissao: e.target.value })} /></div>
                  <div className={styles.field}><label>Nacionalidade</label><input value={adicionais.nacionalidade} disabled={!editMode} onChange={e => setAdicionais({ ...adicionais, nacionalidade: e.target.value })} /></div>
                  <div className={styles.field}><label>Naturalidade</label><input value={adicionais.naturalidade} disabled={!editMode} onChange={e => setAdicionais({ ...adicionais, naturalidade: e.target.value })} /></div>
                  <div className={styles.field}><label>Estado</label>
                    <select value={adicionais.estado} disabled={!editMode} onChange={e => setAdicionais({ ...adicionais, estado: e.target.value })}>
                      <option value="">Selecione...</option>{ESTADOS_EMISSOR.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )

            // ─── 5. Estado Civil ───
            case 4: return (
              <>
                <h2 className={styles.sectionTitle}>Estado Civil</h2>
                {dados.nome && <p className={styles.sectionName}>{dados.nome}</p>}
                <div className={styles.formGridSingle}>
                  <div className={styles.field}><label>Estado civil</label>
                    <select value={estadoCivil} disabled={!editMode} onChange={e => setEstadoCivil(e.target.value)}>
                      <option value="">Selecione...</option>{ESTADO_CIVIL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className={styles.fieldWide}>
                  <label>Certidão de casamento</label>
                  <div className={styles.fileUpload} onClick={() => certidaoRef.current?.click()}>
                    <span>{certidaoFile ? certidaoFile.name : 'Anexar arquivo'}</span><FiPlus size={16} />
                  </div>
                  <input ref={certidaoRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setCertidaoFile(e.target.files[0]) }} />
                  <small className={styles.fileHint}>*Tamanho máximo de 10Mb</small>
                  {certidaoFile && (
                    <button type="button" className={styles.btnPrimary} style={{ marginTop: '0.5rem' }} disabled={uploadingDoc} onClick={async () => {
                      setUploadingDoc(true)
                      try {
                        const formData = new FormData()
                        formData.append('tipo', 'CERTIDAO_CASAMENTO')
                        formData.append('file', certidaoFile)
                        await api.post('/documentos', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                        toast.success('Certidão enviada!')
                        setCertidaoFile(null)
                        if (certidaoRef.current) certidaoRef.current.value = ''
                        carregarDados()
                      } catch (err: any) { toast.error(err.response?.data?.message || 'Erro ao enviar') }
                      finally { setUploadingDoc(false) }
                    }}>{uploadingDoc ? 'Enviando...' : 'Enviar Certidão'}</button>
                  )}
                </div>
                <DocListBlock tipos={['CERTIDAO_CASAMENTO']} titulo="Certidão(ões) enviada(s)" />
              </>
            )

            // ─── 6. Informações Pessoais ───
            case 5: return (
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
                <RadioSimNao label="Necessidades especiais" value={pessoaisExtra.necessidadesEspeciais} onChange={v => setPessoaisExtra({ ...pessoaisExtra, necessidadesEspeciais: v })} />
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

            // ─── 7. Documento Adicional ───
            case 6: {
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
                          }
                        }}>
                          <option value="">Selecione</option>
                          {TIPOS_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      {docTipo === 'OUTROS_EDITAL' && (
                        <div className={styles.field}>
                          <label>Quantidade de documentos</label>
                          <select value={outrosQtd} onChange={e => {
                            const qtd = Number(e.target.value)
                            setOutrosQtd(qtd)
                            setOutrosArquivos(Array(qtd).fill(null))
                          }}>
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
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

                    {docTipo === 'OUTROS_EDITAL' && (
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

            // ─── 8. Benefícios e Programas ───
            case 7: return (
              <>
                <h2 className={styles.sectionTitle}>Benefícios e Programas</h2>
                {dados.nome && <p className={styles.sectionName}>{dados.nome}</p>}
                <RadioSimNao label="Inscrito no cadastro único?" value={beneficios.cadastroUnico} onChange={v => setBeneficios({ ...beneficios, cadastroUnico: v })} />
                <RadioSimNao label="Estudou em escola pública?" value={beneficios.escolaPublica} onChange={v => setBeneficios({ ...beneficios, escolaPublica: v })} />
                <RadioSimNao label="Já recebeu bolsa CEBAS para educação básica?" value={beneficios.bolsaCebasBasica} onChange={v => setBeneficios({ ...beneficios, bolsaCebasBasica: v })} />
                <RadioSimNao label="Já recebeu bolsa CEBAS para educação profissional?" value={beneficios.bolsaCebasProfissional} onChange={v => setBeneficios({ ...beneficios, bolsaCebasProfissional: v })} />
              </>
            )
            default: return null
          }
        }

        return (
          <>
            <StepperBar totalSteps={8} currentStep={subStep} onStepClick={setSubStep} />
            {stepContent()}
            <FooterNav
              onPrev={subStep > 0 ? () => setSubStep(s => s - 1) : undefined}
              onNext={subStep < 7 ? () => setSubStep(s => s + 1) : () => goToNextSection()}
              isLast={subStep === 7}
            />
          </>
        )
      }

      // ════════════════════════════════════════
      // GRUPO FAMILIAR
      // ════════════════════════════════════════
      case 'grupo-familiar':
        return (
          <>
            <h2 className={styles.sectionTitle}>Integrantes do Grupo Familiar</h2>
            <p className={styles.sectionSub}>Selecione um parente ou cadastre um novo</p>
            <div className={styles.centeredActions}><button className={styles.btnOutline} onClick={() => setShowAddMembro(true)}>Adicionar</button></div>
            {showAddMembro && (
              <div className={styles.inlineForm}>
                <div className={styles.formGrid}>
                  <div className={styles.field}><label>Nome</label><input value={novoMembro.nome} onChange={e => setNovoMembro({ ...novoMembro, nome: e.target.value })} /></div>
                  <div className={styles.field}><label>CPF</label><input value={novoMembro.cpf} onChange={e => setNovoMembro({ ...novoMembro, cpf: maskCPF(e.target.value) })} /></div>
                  <div className={styles.field}><label>Parentesco</label><input value={novoMembro.parentesco} onChange={e => setNovoMembro({ ...novoMembro, parentesco: e.target.value })} placeholder="Cônjuge, Filho(a)..." /></div>
                </div>
                <div className={styles.inlineActions}>
                  <button className={styles.btnPrimary} onClick={handleAddMembro}>Salvar</button>
                  <button className={styles.btnGhost} onClick={() => setShowAddMembro(false)}>Cancelar</button>
                </div>
              </div>
            )}
            <div className={styles.listItems}>
              {membros.map(m => (
                <div key={m.id} className={styles.listRow}>
                  <span className={styles.listName}>{m.nome}</span>
                  <button className={styles.btnSmallOutline} onClick={() => setMembroAberto(m.id!)}><FiEye size={14} /> Visualizar</button>
                  <button className={styles.btnSmallDanger} onClick={() => handleRemoveMembro(m.id!)}><FiTrash2 size={14} /> Excluir</button>
                </div>
              ))}
              {membros.length === 0 && <p className={styles.emptyMsg}>Nenhum membro cadastrado ainda.</p>}
            </div>
            <div className={styles.footerCenter}><button className={styles.btnOutlineArrow} onClick={goToNextSection}>Próxima Etapa <FiArrowRight size={16} /></button></div>
          </>
        )

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
      case 'gastos':
        return (
          <>
            <h2 className={styles.sectionTitle}>Despesas Mensais</h2>
            <div className={styles.gastosCards}>
              <div className={styles.gastoCard}><span className={styles.gastoLabel}>Último mês</span><span className={styles.gastoValor}>R$ {formatCurrency(gastoUltimoMes)}</span></div>
              <div className={styles.gastoCard}><span className={styles.gastoLabel}>Média do trimestre</span><span className={styles.gastoValor}>R$ {formatCurrency(gastoMediaTrimestre)}</span></div>
            </div>
            <p className={styles.sectionSub}>Clique em cada mês para cadastrar suas despesas por categoria.</p>
            <div className={styles.mesesList}>
              {getUltimosMeses().map(({ month, year }) => {
                const chave = `${year}-${String(month).padStart(2, '0')}`
                const mesData = despesasPorMes[chave]
                return (
                  <button key={chave} className={styles.btnMes} onClick={() => abrirDespesaDrawer(month, year)}>
                    <span>{MESES_LABEL[month]} de {year}</span>
                    {mesData && <span className={styles.btnMesTotal}>R$ {formatCurrency(mesData.total)}</span>}
                  </button>
                )
              })}
            </div>
            <div className={styles.footerSplit}>
              <div />
              <button className={styles.btnOutlineArrow} onClick={goToNextSection}>Próxima Etapa <FiArrowRight size={16} /></button>
            </div>

            {/* Drawer de Despesas por Mês */}
            {despesaDrawerMes && (
              <div className={styles.despesaDrawerOverlay} onClick={() => { setDespesaDrawerMes(null); setDespesaDrawerData([]) }}>
                <div className={styles.despesaDrawer} onClick={e => e.stopPropagation()}>
                  <div className={styles.despesaDrawerHeader}>
                    <h3>Despesas — {MESES_LABEL[despesaDrawerMes.mes]} de {despesaDrawerMes.ano}</h3>
                    <button className={styles.btnGhost} onClick={() => { setDespesaDrawerMes(null); setDespesaDrawerData([]) }}><FiX size={20} /></button>
                  </div>

                  <div className={styles.despesaDrawerBody}>
                    {despesaDrawerLoading ? (
                      <div className={styles.loadingContainer}><div className={styles.spinner} /></div>
                    ) : (
                      <>
                        <div className={styles.despesaTotalCard}>
                          <span>Total do mês</span>
                          <strong>R$ {formatCurrency(despesaDrawerTotal)}</strong>
                        </div>

                        {/* Despesas agrupadas por categoria */}
                        {(() => {
                          const porCat: Record<string, DespesaItem[]> = {}
                          despesaDrawerData.forEach(d => {
                            if (!porCat[d.categoria]) porCat[d.categoria] = []
                            porCat[d.categoria].push(d)
                          })
                          return Object.entries(porCat).map(([cat, itens]) => {
                            const catLabel = CATEGORIAS_DESPESA.find(c => c.value === cat)?.label || cat
                            const catTotal = itens.reduce((acc, d) => acc + Number(d.valor), 0)
                            return (
                              <div key={cat} className={styles.categoriaGroup}>
                                <div className={styles.categoriaHeader}>
                                  <span className={styles.categoriaTitle}>{catLabel}</span>
                                  <span className={styles.categoriaTotal}>R$ {formatCurrency(catTotal)}</span>
                                </div>
                                {itens.map(d => (
                                  <div key={d.id} className={styles.despesaItem}>
                                    <div className={styles.despesaItemInfo}>
                                      <span className={styles.despesaItemDesc}>{d.descricao || catLabel}</span>
                                    </div>
                                    <span className={styles.despesaItemValor}>R$ {formatCurrency(Number(d.valor))}</span>
                                    <button className={styles.btnSmallDanger} onClick={() => handleExcluirDespesa(d.id)}><FiTrash2 size={12} /></button>
                                  </div>
                                ))}
                              </div>
                            )
                          })
                        })()}

                        {despesaDrawerData.length === 0 && <p className={styles.emptyMsg}>Nenhuma despesa cadastrada para este mês.</p>}

                        {/* Botão adicionar */}
                        {!showDespesaForm && (
                          <div className={styles.centeredActions} style={{ marginTop: '1rem' }}>
                            <button className={styles.btnOutline} onClick={() => setShowDespesaForm(true)}>
                              <FiPlus size={14} /> Adicionar Despesa
                            </button>
                          </div>
                        )}

                        {/* Form inline */}
                        {showDespesaForm && (
                          <div className={styles.despesaInlineForm}>
                            <div className={styles.despesaFormRow}>
                              <div className={styles.field}>
                                <label>Categoria</label>
                                <select value={novaDespesa.categoria} onChange={e => setNovaDespesa({ ...novaDespesa, categoria: e.target.value })}>
                                  <option value="">Selecione...</option>
                                  {CATEGORIAS_DESPESA.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                              </div>
                              <div className={styles.field}>
                                <label>Valor (R$)</label>
                                <input value={novaDespesa.valor} placeholder="0,00" onChange={e => setNovaDespesa({ ...novaDespesa, valor: e.target.value })} />
                              </div>
                            </div>
                            <div className={styles.field}>
                              <label>Descrição (opcional)</label>
                              <input value={novaDespesa.descricao} placeholder="Ex: Aluguel apartamento" onChange={e => setNovaDespesa({ ...novaDespesa, descricao: e.target.value })} />
                            </div>
                            <div className={styles.inlineActions}>
                              <button className={styles.btnPrimary} disabled={savingDespesa} onClick={handleSalvarDespesa}>
                                {savingDespesa ? 'Salvando...' : 'Salvar'}
                              </button>
                              <button className={styles.btnGhost} onClick={() => setShowDespesaForm(false)}>Cancelar</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className={styles.despesaDrawerFooter}>
                    <button className={styles.btnGhost} onClick={() => { setDespesaDrawerMes(null); setDespesaDrawerData([]) }}>Fechar</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )

      // ════════════════════════════════════════
      // SAÚDE
      // ════════════════════════════════════════
      case 'saude':
        return (
          <>
            <h2 className={styles.sectionTitle}>Saúde</h2>
            <p className={styles.sectionSub}>Cadastre dados sobre a saúde de seu grupo familiar</p>
            <div className={styles.listItems}>
              {membros.map(m => (<div key={m.id} className={styles.listRow}><span className={styles.listName}>{m.nome}</span><button className={styles.btnSmallOutline} onClick={() => setMembroAberto(m.id!)}><FiEye size={14} /> Visualizar</button></div>))}
              {membros.length === 0 && <p className={styles.emptyMsg}>Cadastre membros na seção Grupo Familiar.</p>}
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
