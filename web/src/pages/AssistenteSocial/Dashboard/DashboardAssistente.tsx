import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FiUsers, 
  FiFileText, 
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiEye
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { assistenteSocialService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Card } from '@/components/common/Card/Card'
import { formatDate } from '@/utils/masks'
import styles from './DashboardAssistente.module.scss'

interface DashboardData {
  estatisticas: {
    candidaturasPendentes: number
    candidaturasEmAnalise: number
    pareceresEmitidos: number
    agendamentosHoje: number
  }
  candidaturasRecentes: any[]
  proximosAgendamentos: any[]
}

export function DashboardAssistente() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const response = await assistenteSocialService.dashboard()
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
          <h1>Painel do Assistente Social</h1>
          <p>Gerencie candidaturas e emita pareceres</p>
        </div>
      </header>

      {/* Cards de Estatísticas */}
      <div className={styles.statsGrid}>
        <div 
          className={styles.statCard}
          onClick={() => navigate('/assistente-social/candidaturas?status=PENDENTE')}
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
          onClick={() => navigate('/assistente-social/candidaturas?status=EM_ANALISE')}
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
          onClick={() => navigate('/assistente-social/pareceres')}
        >
          <div className={styles.statIcon} style={{ backgroundColor: '#dcfce7' }}>
            <FiFileText color="#16a34a" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.pareceresEmitidos || 0}</span>
            <span className={styles.statLabel}>Pareceres</span>
          </div>
        </div>

        <div 
          className={styles.statCard}
          onClick={() => navigate('/assistente-social/agendamentos')}
        >
          <div className={styles.statIcon} style={{ backgroundColor: '#faf5ff' }}>
            <FiCalendar color="#7c3aed" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.agendamentosHoje || 0}</span>
            <span className={styles.statLabel}>Agendamentos Hoje</span>
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Candidaturas Recentes */}
        <Card 
          title="Candidaturas Pendentes" 
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate('/assistente-social/candidaturas')}>
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/assistente-social/candidaturas/${cand.id}`)}
                  >
                    <FiEye size={16} />
                    Analisar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <FiCheckCircle size={32} />
              <p>Nenhuma candidatura pendente</p>
            </div>
          )}
        </Card>

        {/* Próximos Agendamentos */}
        <Card 
          title="Próximos Agendamentos" 
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate('/assistente-social/agendamentos')}>
              Ver todos
            </Button>
          }
        >
          {data?.proximosAgendamentos && data.proximosAgendamentos.length > 0 ? (
            <div className={styles.agendamentosList}>
              {data.proximosAgendamentos.map((ag: any) => (
                <div key={ag.id} className={styles.agendamentoItem}>
                  <div className={styles.agendamentoData}>
                    <span className={styles.dia}>{new Date(ag.dataHora).getDate()}</span>
                    <span className={styles.mes}>
                      {new Date(ag.dataHora).toLocaleDateString('pt-BR', { month: 'short' })}
                    </span>
                  </div>
                  <div className={styles.agendamentoInfo}>
                    <h4>{ag.titulo}</h4>
                    <span>{ag.candidatura?.candidato?.usuario?.nome}</span>
                    <span className={styles.hora}>
                      {new Date(ag.dataHora).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <FiCalendar size={32} />
              <p>Nenhum agendamento próximo</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
