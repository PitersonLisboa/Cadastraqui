import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  FiSearch, 
  FiCalendar, 
  FiUsers,
  FiMapPin,
  FiArrowRight,
  FiAlertCircle,
  FiFilter,
  FiArrowLeft,
  FiTool
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { editalService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import { Select } from '@/components/common/Select/Select'
import { Card } from '@/components/common/Card/Card'
import { formatDate } from '@/utils/masks'
import { UF_OPTIONS } from '@/types'
import styles from './ListaEditaisDisponiveis.module.scss'

interface Edital {
  id: string
  titulo: string
  descricao?: string
  anoLetivo: number
  dataInicio: string
  dataFim: string
  vagasDisponiveis: number
  instituicao: {
    id: string
    razaoSocial: string
    nomeFantasia?: string
    cidade: string
    uf: string
  }
}

export function ListaEditaisDisponiveis() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const [editais, setEditais] = useState<Edital[]>([])
  const [loading, setLoading] = useState(true)
  const [emConstrucao, setEmConstrucao] = useState(false)
  const [busca, setBusca] = useState('')
  const [ufFiltro, setUfFiltro] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [paginacao, setPaginacao] = useState({
    pagina: 1,
    limite: 12,
    total: 0,
    totalPaginas: 0,
  })

  useEffect(() => {
    loadEditais()
  }, [paginacao.pagina, busca, ufFiltro])

  const loadEditais = async () => {
    setLoading(true)
    try {
      const response = await editalService.listarDisponiveis({
        pagina: paginacao.pagina,
        limite: paginacao.limite,
        busca: busca || undefined,
        uf: ufFiltro || undefined,
      })
      setEditais(response.editais)
      setPaginacao((prev) => ({
        ...prev,
        total: response.paginacao.total,
        totalPaginas: response.paginacao.totalPaginas,
      }))
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 500) {
        setEmConstrucao(true)
      } else {
        toast.error('Erro ao carregar editais')
      }
    } finally {
      setLoading(false)
    }
  }

  const getDiasRestantes = (dataFim: string) => {
    const hoje = new Date()
    const fim = new Date(dataFim)
    const diff = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const clearFilters = () => {
    setBusca('')
    setUfFiltro('')
    setPaginacao((prev) => ({ ...prev, pagina: 1 }))
  }

  // Se o módulo de editais ainda não está disponível
  if (emConstrucao) {
    const basePath = slug ? `/${slug}/candidato` : '/candidato'
    return (
      <div className={styles.container}>
        <div className={styles.emConstrucao}>
          <FiTool size={56} color="#d97706" />
          <h2>Módulo em Construção</h2>
          <p>
            A publicação de editais será gerenciada pelo perfil Operacional da instituição.
            Este módulo estará disponível em breve!
          </p>
          <Button
            onClick={() => navigate(basePath)}
            leftIcon={<FiArrowLeft />}
          >
            Voltar para o Início
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Editais Disponíveis</h1>
          <p>Encontre oportunidades de bolsas de estudo</p>
        </div>
      </header>

      {/* Barra de Busca e Filtros */}
      <Card className={styles.filtersCard}>
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <FiSearch className={styles.searchIcon} />
            <Input
              placeholder="Buscar por instituição ou título..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setPaginacao((prev) => ({ ...prev, pagina: 1 }))
              }}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<FiFilter />}
          >
            Filtros
          </Button>
        </div>

        {showFilters && (
          <div className={styles.filtersRow}>
            <Select
              placeholder="Todos os estados"
              options={[{ value: '', label: 'Todos os estados' }, ...UF_OPTIONS]}
              value={ufFiltro}
              onChange={(e) => {
                setUfFiltro(e.target.value)
                setPaginacao((prev) => ({ ...prev, pagina: 1 }))
              }}
            />
            {(busca || ufFiltro) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Contagem de resultados */}
      {!loading && (
        <p className={styles.resultCount}>
          {paginacao.total} edital(is) encontrado(s)
        </p>
      )}

      {/* Lista de Editais */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Carregando editais...</p>
        </div>
      ) : editais.length === 0 ? (
        <Card>
          <div className={styles.emptyState}>
            <FiAlertCircle size={48} />
            <h3>Nenhum edital encontrado</h3>
            <p>
              {busca || ufFiltro 
                ? 'Tente buscar com outros termos ou remova os filtros' 
                : 'Não há editais disponíveis no momento. Volte em breve!'}
            </p>
            {(busca || ufFiltro) && (
              <Button variant="outline" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className={styles.editaisGrid}>
          {editais.map((edital) => {
            const diasRestantes = getDiasRestantes(edital.dataFim)
            const urgente = diasRestantes <= 7 && diasRestantes > 0
            
            return (
              <Card key={edital.id} className={styles.editalCard} padding="none">
                <div className={styles.editalHeader}>
                  <span className={styles.instituicaoNome}>
                    {edital.instituicao.nomeFantasia || edital.instituicao.razaoSocial}
                  </span>
                  {urgente && (
                    <span className={styles.urgentBadge}>
                      Últimos {diasRestantes} dias!
                    </span>
                  )}
                </div>
                
                <div className={styles.editalBody}>
                  <h3>{edital.titulo}</h3>
                  
                  {edital.descricao && (
                    <p className={styles.descricao}>
                      {edital.descricao.length > 120 
                        ? `${edital.descricao.substring(0, 120)}...` 
                        : edital.descricao}
                    </p>
                  )}
                  
                  <div className={styles.editalInfo}>
                    <div className={styles.infoItem}>
                      <FiMapPin size={16} />
                      <span>{edital.instituicao.cidade}/{edital.instituicao.uf}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <FiCalendar size={16} />
                      <span>Até {formatDate(edital.dataFim)}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <FiUsers size={16} />
                      <span>{edital.vagasDisponiveis} vaga(s)</span>
                    </div>
                  </div>
                </div>

                <div className={styles.editalFooter}>
                  <span className={styles.anoLetivo}>Ano Letivo: {edital.anoLetivo}</span>
                  <Button 
                    size="sm"
                    onClick={() => navigate(`${slug ? `/${slug}` : ''}/candidato/editais/${edital.id}`)}
                    rightIcon={<FiArrowRight />}
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </Card>
            )
          })}
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
