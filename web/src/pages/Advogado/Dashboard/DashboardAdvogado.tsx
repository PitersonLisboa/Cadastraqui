import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FiUsers, 
  FiFileText, 
  FiClock,
  FiCheckCircle,
  FiEye,
  FiBriefcase
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { advogadoService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Card } from '@/components/common/Card/Card'
import { formatDate } from '@/utils/masks'
import styles from './DashboardAdvogado.module.scss'

interface DashboardData {
  estatisticas: {
    candidaturasPendentes: number
    candidaturasEmAnalise: number
    pareceresEmitidos: number
  }
  candidaturasRecentes: any[]
}

export function DashboardAdvogado() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const response = await advogadoService.dashboard()
      setData(response)
    } catch (error) {
      toast.error('Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Carregando...</p>
      </div>
    )
  }

  const stats = data?.estatisticas

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.greeting}>
          <h1>Painel Jurídico</h1>
          <p>Análise jurídica de candidaturas e pareceres</p>
        </div>
      </header>

      {/* Cards de Estatísticas */}
      <div className={styles.statsGrid}>
        <div 
          className={styles.statCard}
          onClick={() => navigate('/advogado/candidaturas?status=PENDENTE')}
        >
          <div className={styles.statIcon} style={{ backgroundColor: '#fef3c7' }}>
            <FiClock color="#d97706" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.candidaturasPendentes || 0}</span>
            <span className={styles.statLabel}>Pendentes</span>
          </div>
        </div>

        <div 
          className={styles.statCard}
          onClick={() => navigate('/advogado/candidaturas?status=EM_ANALISE')}
        >
          <div className={styles.statIcon} style={{ backgroundColor: '#dbeafe' }}>
            <FiUsers color="#2563eb" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.candidaturasEmAnalise || 0}</span>
            <span className={styles.statLabel}>Em Análise</span>
          </div>
        </div>

        <div 
          className={styles.statCard}
          onClick={() => navigate('/advogado/pareceres')}
        >
          <div className={styles.statIcon} style={{ backgroundColor: '#faf5ff' }}>
            <FiBriefcase color="#7c3aed" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.pareceresEmitidos || 0}</span>
            <span className={styles.statLabel}>Pareceres</span>
          </div>
        </div>
      </div>

      {/* Candidaturas Recentes */}
      <Card 
        title="Candidaturas Aguardando Análise Jurídica" 
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/advogado/candidaturas')}>
            Ver todas
          </Button>
        }
      >
        {data?.candidaturasRecentes && data.candidaturasRecentes.length > 0 ? (
          <div className={styles.candidaturasList}>
            {data.candidaturasRecentes.map((cand: any) => (
              <div key={cand.id} className={styles.candidaturaItem}>
                <div className={styles.candidaturaInfo}>
                  <h4>{cand.candidato?.usuario?.nome || 'Candidato'}</h4>
                  <span>{cand.edital?.titulo}</span>
                  <span className={styles.dataInscricao}>
                    Inscrito em {formatDate(cand.dataInscricao)}
                  </span>
                </div>
                <div className={styles.candidaturaActions}>
                  {cand.parecerSocial && (
                    <span className={styles.tagParecer}>
                      <FiCheckCircle size={12} />
                      Parecer Social OK
                    </span>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/advogado/candidaturas/${cand.id}`)}
                  >
                    <FiEye size={16} />
                    Analisar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <FiCheckCircle size={32} />
            <p>Nenhuma candidatura pendente de análise jurídica</p>
          </div>
        )}
      </Card>
    </div>
  )
}
