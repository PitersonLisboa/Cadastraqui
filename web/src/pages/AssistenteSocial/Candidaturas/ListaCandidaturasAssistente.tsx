import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  FiSearch, 
  FiFilter, 
  FiEye,
  FiUser,
  FiCalendar,
  FiFileText
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { candidaturaService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import { Select } from '@/components/common/Select/Select'
import { Card } from '@/components/common/Card/Card'
import { FiltrosAvancados, FiltroConfig } from '@/components/common/FiltrosAvancados/FiltrosAvancados'
import { formatDate } from '@/utils/masks'
import styles from './ListaCandidaturasAssistente.module.scss'

interface Candidatura {
  id: string
  status: string
  dataInscricao: string
  candidato: {
    nome: string
    cpf: string
    usuario: {
      email: string
    }
  }
  edital: {
    id: string
    titulo: string
    anoLetivo: number
    instituicao: {
      razaoSocial: string
    }
  }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'EM_ANALISE', label: 'Em Análise' },
  { value: 'DOCUMENTACAO_PENDENTE', label: 'Doc. Pendente' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REPROVADO', label: 'Reprovado' },
]

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  PENDENTE: { label: 'Pendente', class: 'pendente' },
  EM_ANALISE: { label: 'Em Análise', class: 'emAnalise' },
  DOCUMENTACAO_PENDENTE: { label: 'Doc. Pendente', class: 'docPendente' },
  APROVADO: { label: 'Aprovado', class: 'aprovado' },
  REPROVADO: { label: 'Reprovado', class: 'reprovado' },
  CANCELADO: { label: 'Cancelado', class: 'cancelado' },
}

const FILTROS_CONFIG: FiltroConfig[] = [
  {
    nome: 'status',
    label: 'Status',
    tipo: 'select',
    opcoes: [
      { value: 'PENDENTE', label: 'Pendente' },
      { value: 'EM_ANALISE', label: 'Em Análise' },
      { value: 'DOCUMENTACAO_PENDENTE', label: 'Doc. Pendente' },
      { value: 'APROVADO', label: 'Aprovado' },
      { value: 'REPROVADO', label: 'Reprovado' },
    ],
  },
  {
    nome: 'dataInscricao',
    label: 'Data de Inscrição',
    tipo: 'dataRange',
  },
  {
    nome: 'anoLetivo',
    label: 'Ano Letivo',
    tipo: 'select',
    opcoes: [
      { value: '2026', label: '2026' },
      { value: '2025', label: '2025' },
      { value: '2024', label: '2024' },
    ],
  },
]

export function ListaCandidaturasAssistente() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState(searchParams.get('status') || '')
  const [filtrosAvancados, setFiltrosAvancados] = useState<Record<string, any>>({
    status: searchParams.get('status') || '',
    dataInscricaoDe: '',
    dataInscricaoAte: '',
    anoLetivo: '',
  })
  const [paginacao, setPaginacao] = useState({
    pagina: 1,
    limite: 10,
    total: 0,
    totalPaginas: 0,
  })

  useEffect(() => {
    loadCandidaturas()
  }, [paginacao.pagina, statusFiltro])

  const loadCandidaturas = async () => {
    setLoading(true)
    try {
      const response = await candidaturaService.listar({
        pagina: paginacao.pagina,
        limite: paginacao.limite,
        status: statusFiltro || undefined,
      })
      setCandidaturas(response.candidaturas)
      setPaginacao((prev) => ({
        ...prev,
        total: response.paginacao.total,
        totalPaginas: response.paginacao.totalPaginas,
      }))
    } catch (error) {
      toast.error('Erro ao carregar candidaturas')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (status: string) => {
    setStatusFiltro(status)
    setFiltrosAvancados(prev => ({ ...prev, status }))
    setPaginacao((prev) => ({ ...prev, pagina: 1 }))
    if (status) {
      setSearchParams({ status })
    } else {
      setSearchParams({})
    }
  }

  const handleFiltroChange = (nome: string, valor: any) => {
    setFiltrosAvancados(prev => ({ ...prev, [nome]: valor }))
  }

  const handleLimparFiltros = () => {
    setFiltrosAvancados({
      status: '',
      dataInscricaoDe: '',
      dataInscricaoAte: '',
      anoLetivo: '',
    })
    setStatusFiltro('')
    setSearchParams({})
    setPaginacao((prev) => ({ ...prev, pagina: 1 }))
  }

  const handleAplicarFiltros = () => {
    setStatusFiltro(filtrosAvancados.status || '')
    setPaginacao((prev) => ({ ...prev, pagina: 1 }))
    loadCandidaturas()
  }

  const filteredCandidaturas = busca
    ? candidaturas.filter(c => 
        c.candidato?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        c.edital?.titulo?.toLowerCase().includes(busca.toLowerCase())
      )
    : candidaturas

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Candidaturas</h1>
          <p>Analise e emita pareceres para as candidaturas</p>
        </div>
      </header>

      {/* Filtros */}
      <Card className={styles.filters}>
        <div className={styles.filtersRow}>
          <div className={styles.searchBox}>
            <FiSearch className={styles.searchIcon} />
            <Input
              placeholder="Buscar por nome ou edital..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select
            placeholder="Status"
            options={STATUS_OPTIONS}
            value={statusFiltro}
            onChange={(e) => handleStatusChange(e.target.value)}
          />
        </div>
      </Card>

      {/* Filtros Avançados */}
      <FiltrosAvancados
        filtros={FILTROS_CONFIG}
        valores={filtrosAvancados}
        onChange={handleFiltroChange}
        onLimpar={handleLimparFiltros}
        onAplicar={handleAplicarFiltros}
      />

      {/* Lista de Candidaturas */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Carregando candidaturas...</p>
        </div>
      ) : filteredCandidaturas.length === 0 ? (
        <Card>
          <div className={styles.emptyState}>
            <FiFileText size={48} />
            <h3>Nenhuma candidatura encontrada</h3>
            <p>Não há candidaturas para o filtro selecionado</p>
          </div>
        </Card>
      ) : (
        <div className={styles.candidaturasTable}>
          <table>
            <thead>
              <tr>
                <th>Candidato</th>
                <th>Edital</th>
                <th>Data Inscrição</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidaturas.map((cand) => {
                const statusConfig = STATUS_CONFIG[cand.status] || STATUS_CONFIG.PENDENTE
                return (
                  <tr key={cand.id}>
                    <td>
                      <div className={styles.candidatoCell}>
                        <div className={styles.avatar}>
                          <FiUser size={18} />
                        </div>
                        <div>
                          <span className={styles.nome}>{cand.candidato?.nome || 'N/A'}</span>
                          <span className={styles.email}>{cand.candidato?.usuario?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.editalCell}>
                        <span className={styles.editalTitulo}>{cand.edital?.titulo}</span>
                        <span className={styles.instituicao}>
                          {cand.edital?.instituicao?.razaoSocial}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.data}>
                        <FiCalendar size={14} />
                        {formatDate(cand.dataInscricao)}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.status} ${styles[statusConfig.class]}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/assistente-social/candidaturas/${cand.id}`)}
                      >
                        <FiEye size={16} />
                        Analisar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {paginacao.totalPaginas > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="outline"
            size="sm"
            disabled={paginacao.pagina === 1}
            onClick={() => setPaginacao((prev) => ({ ...prev, pagina: prev.pagina - 1 }))}
          >
            Anterior
          </Button>
          <span>
            Página {paginacao.pagina} de {paginacao.totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={paginacao.pagina === paginacao.totalPaginas}
            onClick={() => setPaginacao((prev) => ({ ...prev, pagina: prev.pagina + 1 }))}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}
