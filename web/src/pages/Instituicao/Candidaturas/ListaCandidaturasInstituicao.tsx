import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FiClipboard, 
  FiSearch, 
  FiFilter, 
  FiEye,
  FiUser,
  FiCalendar,
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAlertCircle
} from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Select } from '@/components/common/Select/Select'
import { FiltrosAvancados, FiltroConfig } from '@/components/common/FiltrosAvancados/FiltrosAvancados'
import { api } from '@/services/api'
import styles from './ListaCandidaturasInstituicao.module.scss'

interface Candidatura {
  id: string
  status: string
  dataInscricao: string
  observacoes?: string
  candidato: {
    id: string
    nome: string
    cpf: string
    email?: string
  }
  edital: {
    id: string
    titulo: string
  }
  _count?: {
    documentos: number
  }
  parecerSocial?: { id: string }
  parecerJuridico?: { id: string }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'EM_ANALISE', label: 'Em Análise' },
  { value: 'DOCUMENTACAO_PENDENTE', label: 'Documentação Pendente' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REPROVADO', label: 'Reprovado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDENTE: { label: 'Pendente', color: '#f59e0b', bg: '#fef3c7', icon: FiClock },
  EM_ANALISE: { label: 'Em Análise', color: '#3b82f6', bg: '#dbeafe', icon: FiSearch },
  DOCUMENTACAO_PENDENTE: { label: 'Doc. Pendente', color: '#f97316', bg: '#ffedd5', icon: FiAlertCircle },
  APROVADO: { label: 'Aprovado', color: '#22c55e', bg: '#dcfce7', icon: FiCheckCircle },
  REPROVADO: { label: 'Reprovado', color: '#ef4444', bg: '#fee2e2', icon: FiXCircle },
  CANCELADO: { label: 'Cancelado', color: '#6b7280', bg: '#f3f4f6', icon: FiXCircle },
}

const FILTROS_AVANCADOS: FiltroConfig[] = [
  {
    nome: 'comParecerSocial',
    label: 'Parecer Social',
    tipo: 'select',
    opcoes: [
      { value: 'true', label: 'Com parecer' },
      { value: 'false', label: 'Sem parecer' },
    ],
  },
  {
    nome: 'comParecerJuridico',
    label: 'Parecer Jurídico',
    tipo: 'select',
    opcoes: [
      { value: 'true', label: 'Com parecer' },
      { value: 'false', label: 'Sem parecer' },
    ],
  },
  {
    nome: 'dataInscricao',
    label: 'Data de Inscrição',
    tipo: 'dataRange',
  },
]

export function ListaCandidaturasInstituicao() {
  const navigate = useNavigate()
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([])
  const [editais, setEditais] = useState<{ id: string; titulo: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [paginacao, setPaginacao] = useState({ pagina: 1, total: 0, totalPaginas: 0 })
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editalFilter, setEditalFilter] = useState('')
  const [filtrosAvancados, setFiltrosAvancados] = useState<Record<string, any>>({
    comParecerSocial: '',
    comParecerJuridico: '',
    dataInscricaoDe: '',
    dataInscricaoAte: '',
  })

  // Resumo
  const [resumo, setResumo] = useState<Record<string, number>>({})

  useEffect(() => {
    carregarEditais()
  }, [])

  useEffect(() => {
    carregarCandidaturas()
  }, [paginacao.pagina, statusFilter, editalFilter])

  async function carregarEditais() {
    try {
      const response = await api.get('/editais/meus')
      setEditais(response.data.editais || [])
    } catch (error) {
      console.error('Erro ao carregar editais:', error)
    }
  }

  async function carregarCandidaturas() {
    setLoading(true)
    try {
      const params: any = { pagina: paginacao.pagina, limite: 20 }
      if (busca) params.busca = busca
      if (statusFilter) params.status = statusFilter
      if (editalFilter) params.editalId = editalFilter
      
      const response = await api.get('/instituicao/candidaturas', { params })
      setCandidaturas(response.data.candidaturas || [])
      setPaginacao(prev => ({ ...prev, ...response.data.paginacao }))
      setResumo(response.data.resumo || {})
    } catch (error) {
      console.error('Erro ao carregar candidaturas:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    setPaginacao(prev => ({ ...prev, pagina: 1 }))
    carregarCandidaturas()
  }

  function handleFiltroChange(nome: string, valor: any) {
    setFiltrosAvancados(prev => ({ ...prev, [nome]: valor }))
  }

  function handleLimparFiltros() {
    setFiltrosAvancados({
      comParecerSocial: '',
      comParecerJuridico: '',
      dataInscricaoDe: '',
      dataInscricaoAte: '',
    })
    setBusca('')
    setStatusFilter('')
    setEditalFilter('')
    setPaginacao(prev => ({ ...prev, pagina: 1 }))
  }

  function handleAplicarFiltros() {
    setPaginacao(prev => ({ ...prev, pagina: 1 }))
    carregarCandidaturas()
  }

  function formatarCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  function formatarData(data: string): string {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  if (loading && candidaturas.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando candidaturas...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Candidaturas</h1>
          <p>Gerencie as candidaturas dos seus editais</p>
        </div>
      </div>

      {/* Resumo por Status */}
      <div className={styles.resumoGrid}>
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon
          const count = resumo[status] || 0
          return (
            <Card 
              key={status} 
              className={`${styles.resumoCard} ${statusFilter === status ? styles.active : ''}`}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            >
              <div className={styles.resumoIcon} style={{ backgroundColor: config.bg, color: config.color }}>
                <Icon size={20} />
              </div>
              <div className={styles.resumoInfo}>
                <span className={styles.resumoNumero}>{count}</span>
                <span className={styles.resumoLabel}>{config.label}</span>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Filtros */}
      <Card className={styles.filtros}>
        <form onSubmit={handleBuscar} className={styles.filtrosForm}>
          <div className={styles.searchBox}>
            <FiSearch size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={editalFilter} onChange={(e) => setEditalFilter(e.target.value)}>
            <option value="">Todos os editais</option>
            {editais.map(e => (
              <option key={e.id} value={e.id}>{e.titulo}</option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
          <Button type="submit"><FiFilter size={16} /> Filtrar</Button>
        </form>
      </Card>

      {/* Filtros Avançados */}
      <FiltrosAvancados
        filtros={FILTROS_AVANCADOS}
        valores={filtrosAvancados}
        onChange={handleFiltroChange}
        onLimpar={handleLimparFiltros}
        onAplicar={handleAplicarFiltros}
      />

      {/* Lista de Candidaturas */}
      <div className={styles.lista}>
        {candidaturas.map(candidatura => {
          const statusConfig = STATUS_CONFIG[candidatura.status] || STATUS_CONFIG.PENDENTE
          const StatusIcon = statusConfig.icon
          
          return (
            <Card key={candidatura.id} className={styles.candidaturaCard}>
              <div className={styles.candidaturaHeader}>
                <div className={styles.candidatoInfo}>
                  <div className={styles.avatar}>
                    <FiUser size={20} />
                  </div>
                  <div>
                    <h3>{candidatura.candidato.nome}</h3>
                    <span className={styles.cpf}>{formatarCPF(candidatura.candidato.cpf)}</span>
                  </div>
                </div>
                <span 
                  className={styles.statusBadge}
                  style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                >
                  <StatusIcon size={14} />
                  {statusConfig.label}
                </span>
              </div>

              <div className={styles.candidaturaBody}>
                <div className={styles.infoItem}>
                  <FiFileText size={14} />
                  <span>{candidatura.edital.titulo}</span>
                </div>
                <div className={styles.infoItem}>
                  <FiCalendar size={14} />
                  <span>Inscrito em {formatarData(candidatura.dataInscricao)}</span>
                </div>
              </div>

              <div className={styles.candidaturaFooter}>
                <div className={styles.badges}>
                  <span className={`${styles.badge} ${candidatura._count?.documentos ? styles.ok : styles.pending}`}>
                    {candidatura._count?.documentos || 0} docs
                  </span>
                  <span className={`${styles.badge} ${candidatura.parecerSocial ? styles.ok : styles.pending}`}>
                    Parecer Social {candidatura.parecerSocial ? '✓' : '○'}
                  </span>
                  <span className={`${styles.badge} ${candidatura.parecerJuridico ? styles.ok : styles.pending}`}>
                    Parecer Jurídico {candidatura.parecerJuridico ? '✓' : '○'}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/instituicao/candidaturas/${candidatura.id}`)}
                >
                  <FiEye size={16} /> Ver Detalhes
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {candidaturas.length === 0 && !loading && (
        <Card className={styles.empty}>
          <FiClipboard size={48} />
          <h3>Nenhuma candidatura encontrada</h3>
          <p>Não há candidaturas com os filtros selecionados</p>
        </Card>
      )}

      {/* Paginação */}
      {paginacao.totalPaginas > 1 && (
        <div className={styles.paginacao}>
          <Button 
            variant="outline" 
            disabled={paginacao.pagina === 1}
            onClick={() => setPaginacao(prev => ({ ...prev, pagina: prev.pagina - 1 }))}
          >
            Anterior
          </Button>
          <span>Página {paginacao.pagina} de {paginacao.totalPaginas}</span>
          <Button 
            variant="outline"
            disabled={paginacao.pagina === paginacao.totalPaginas}
            onClick={() => setPaginacao(prev => ({ ...prev, pagina: prev.pagina + 1 }))}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}
