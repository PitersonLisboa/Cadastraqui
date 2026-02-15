import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  FiFileText, 
  FiCalendar, 
  FiMapPin,
  FiEye,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiXCircle
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { candidaturaService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Card } from '@/components/common/Card/Card'
import { formatDate } from '@/utils/masks'
import styles from './MinhasCandidaturas.module.scss'

interface Candidatura {
  id: string
  status: string
  dataInscricao: string
  edital: {
    id: string
    titulo: string
    anoLetivo: number
    dataFim: string
    instituicao: {
      razaoSocial: string
      nomeFantasia?: string
      cidade: string
      uf: string
    }
  }
}

const STATUS_CONFIG: Record<string, { label: string; icon: JSX.Element; class: string }> = {
  PENDENTE: { 
    label: 'Pendente', 
    icon: <FiClock />, 
    class: 'pendente' 
  },
  EM_ANALISE: { 
    label: 'Em Análise', 
    icon: <FiFileText />, 
    class: 'emAnalise' 
  },
  DOCUMENTACAO_PENDENTE: { 
    label: 'Documentação Pendente', 
    icon: <FiAlertCircle />, 
    class: 'docPendente' 
  },
  APROVADO: { 
    label: 'Aprovado', 
    icon: <FiCheckCircle />, 
    class: 'aprovado' 
  },
  REPROVADO: { 
    label: 'Reprovado', 
    icon: <FiXCircle />, 
    class: 'reprovado' 
  },
  CANCELADO: { 
    label: 'Cancelado', 
    icon: <FiXCircle />, 
    class: 'cancelado' 
  },
}

export function MinhasCandidaturas() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const basePath = slug ? `/${slug}/candidato` : '/candidato'

  useEffect(() => {
    loadCandidaturas()
  }, [])

  const loadCandidaturas = async () => {
    try {
      const response = await candidaturaService.minhasCandidaturas()
      setCandidaturas(response.candidaturas)
    } catch (error) {
      toast.error('Erro ao carregar candidaturas')
    } finally {
      setLoading(false)
    }
  }

  const candidaturasFiltradas = filtroStatus 
    ? candidaturas.filter(c => c.status === filtroStatus)
    : candidaturas

  const contadores = {
    total: candidaturas.length,
    pendentes: candidaturas.filter(c => ['PENDENTE', 'EM_ANALISE', 'DOCUMENTACAO_PENDENTE'].includes(c.status)).length,
    aprovadas: candidaturas.filter(c => c.status === 'APROVADO').length,
    reprovadas: candidaturas.filter(c => c.status === 'REPROVADO').length,
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Carregando candidaturas...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Minhas Candidaturas</h1>
          <p>Acompanhe suas inscrições em editais</p>
        </div>
        <Button onClick={() => navigate(`${basePath}/editais`)}>
          Ver Editais
        </Button>
      </header>

      {/* Cards de Estatísticas */}
      <div className={styles.statsGrid}>
        <button 
          className={`${styles.statCard} ${filtroStatus === '' ? styles.active : ''}`}
          onClick={() => setFiltroStatus('')}
        >
          <span className={styles.statValue}>{contadores.total}</span>
          <span className={styles.statLabel}>Total</span>
        </button>
        <button 
          className={`${styles.statCard} ${filtroStatus === 'PENDENTE' ? styles.active : ''}`}
          onClick={() => setFiltroStatus(filtroStatus === 'PENDENTE' ? '' : 'PENDENTE')}
        >
          <span className={`${styles.statValue} ${styles.pendente}`}>{contadores.pendentes}</span>
          <span className={styles.statLabel}>Em andamento</span>
        </button>
        <button 
          className={`${styles.statCard} ${filtroStatus === 'APROVADO' ? styles.active : ''}`}
          onClick={() => setFiltroStatus(filtroStatus === 'APROVADO' ? '' : 'APROVADO')}
        >
          <span className={`${styles.statValue} ${styles.aprovado}`}>{contadores.aprovadas}</span>
          <span className={styles.statLabel}>Aprovadas</span>
        </button>
        <button 
          className={`${styles.statCard} ${filtroStatus === 'REPROVADO' ? styles.active : ''}`}
          onClick={() => setFiltroStatus(filtroStatus === 'REPROVADO' ? '' : 'REPROVADO')}
        >
          <span className={`${styles.statValue} ${styles.reprovado}`}>{contadores.reprovadas}</span>
          <span className={styles.statLabel}>Reprovadas</span>
        </button>
      </div>

      {/* Lista de Candidaturas */}
      {candidaturasFiltradas.length === 0 ? (
        <Card>
          <div className={styles.emptyState}>
            <FiFileText size={48} />
            <h3>
              {filtroStatus 
                ? 'Nenhuma candidatura encontrada com este status'
                : 'Você ainda não possui candidaturas'}
            </h3>
            <p>
              {filtroStatus 
                ? 'Tente remover o filtro para ver todas as candidaturas'
                : 'Explore os editais disponíveis e inscreva-se!'}
            </p>
            {filtroStatus ? (
              <Button variant="outline" onClick={() => setFiltroStatus('')}>
                Ver todas
              </Button>
            ) : (
              <Button onClick={() => navigate(`${basePath}/editais`)}>
                Ver Editais Disponíveis
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className={styles.candidaturasList}>
          {candidaturasFiltradas.map((candidatura) => {
            const statusConfig = STATUS_CONFIG[candidatura.status] || STATUS_CONFIG.PENDENTE
            
            return (
              <Card key={candidatura.id} className={styles.candidaturaCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.instituicaoInfo}>
                    <span className={styles.instituicaoNome}>
                      {candidatura.edital.instituicao.nomeFantasia || 
                       candidatura.edital.instituicao.razaoSocial}
                    </span>
                    <span className={`${styles.status} ${styles[statusConfig.class]}`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <h3>{candidatura.edital.titulo}</h3>
                  
                  <div className={styles.metaInfo}>
                    <div className={styles.metaItem}>
                      <FiMapPin size={14} />
                      <span>
                        {candidatura.edital.instituicao.cidade}/{candidatura.edital.instituicao.uf}
                      </span>
                    </div>
                    <div className={styles.metaItem}>
                      <FiCalendar size={14} />
                      <span>Inscrito em {formatDate(candidatura.dataInscricao)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.anoLetivo}>
                    Ano Letivo: {candidatura.edital.anoLetivo}
                  </span>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`${basePath}/candidaturas/${candidatura.id}`)}
                    rightIcon={<FiEye />}
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
