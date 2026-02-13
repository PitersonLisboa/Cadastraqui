import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import { 
  FiFileText, 
  FiFolder, 
  FiCalendar, 
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiPlus
} from 'react-icons/fi'
import { authState } from '@/atoms'
import { candidatoService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Card } from '@/components/common/Card/Card'
import styles from './DashboardCandidato.module.scss'

interface CandidatoData {
  id: string
  nome: string
  cpf: string
  candidaturas: any[]
  documentos: any[]
}

export function DashboardCandidato() {
  const auth = useRecoilValue(authState)
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const [candidato, setCandidato] = useState<CandidatoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsRegistration, setNeedsRegistration] = useState(false)

  useEffect(() => {
    loadCandidatoData()
  }, [])

  const loadCandidatoData = async () => {
    try {
      const response = await candidatoService.meuPerfil()
      setCandidato(response.candidato)
    } catch (error: any) {
      if (error.response?.status === 404) {
        setNeedsRegistration(true)
      }
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

  // Se o candidato ainda não completou o cadastro
  if (needsRegistration) {
    return (
      <div className={styles.container}>
        <div className={styles.welcomeCard}>
          <div className={styles.welcomeIcon}>🎓</div>
          <h1>Bem-vindo(a) ao Cadastraqui!</h1>
          <p>
            Para começar a usar o sistema, você precisa completar seu cadastro 
            com suas informações pessoais.
          </p>
          <Button 
            onClick={() => navigate(slug ? `/${slug}/candidato/cadastro` : '/candidato/cadastro')}
            leftIcon={<FiPlus />}
          >
            Completar Cadastro
          </Button>
        </div>
      </div>
    )
  }

  const candidaturasPendentes = candidato?.candidaturas?.filter(
    c => c.status === 'PENDENTE' || c.status === 'EM_ANALISE'
  ).length || 0

  const candidaturasAprovadas = candidato?.candidaturas?.filter(
    c => c.status === 'APROVADO'
  ).length || 0

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.greeting}>
          <h1>Olá, {candidato?.nome?.split(' ')[0]}!</h1>
          <p>Acompanhe suas candidaturas e documentos</p>
        </div>
      </header>

      {/* Cards de Estatísticas */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#f0fdf4' }}>
            <FiFileText color="#166534" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{candidato?.candidaturas?.length || 0}</span>
            <span className={styles.statLabel}>Candidaturas</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#fef3c7' }}>
            <FiClock color="#d97706" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{candidaturasPendentes}</span>
            <span className={styles.statLabel}>Em Análise</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#dcfce7' }}>
            <FiCheckCircle color="#16a34a" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{candidaturasAprovadas}</span>
            <span className={styles.statLabel}>Aprovadas</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#eff6ff' }}>
            <FiFolder color="#2563eb" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{candidato?.documentos?.length || 0}</span>
            <span className={styles.statLabel}>Documentos</span>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <Card title="Ações Rápidas" className={styles.actionsCard}>
        <div className={styles.quickActions}>
          <button 
            className={styles.quickAction}
            onClick={() => navigate('editais')}
          >
            <FiFileText size={24} />
            <span>Ver Editais</span>
          </button>
          <button 
            className={styles.quickAction}
            onClick={() => navigate('candidaturas')}
          >
            <FiCheckCircle size={24} />
            <span>Minhas Candidaturas</span>
          </button>
          <button 
            className={styles.quickAction}
            onClick={() => navigate('documentos')}
          >
            <FiFolder size={24} />
            <span>Meus Documentos</span>
          </button>
          <button 
            className={styles.quickAction}
            onClick={() => navigate('agendamentos')}
          >
            <FiCalendar size={24} />
            <span>Agendamentos</span>
          </button>
        </div>
      </Card>

      {/* Candidaturas Recentes */}
      <Card 
        title="Candidaturas Recentes" 
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('candidaturas')}>
            Ver todas
          </Button>
        }
      >
        {candidato?.candidaturas && candidato.candidaturas.length > 0 ? (
          <div className={styles.candidaturasList}>
            {candidato.candidaturas.slice(0, 3).map((candidatura: any) => (
              <div key={candidatura.id} className={styles.candidaturaItem}>
                <div className={styles.candidaturaInfo}>
                  <h4>{candidatura.edital?.titulo || 'Edital'}</h4>
                  <span>Inscrito em {new Date(candidatura.dataInscricao).toLocaleDateString('pt-BR')}</span>
                </div>
                <span className={`${styles.status} ${styles[candidatura.status.toLowerCase()]}`}>
                  {getStatusLabel(candidatura.status)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <FiAlertCircle size={48} />
            <p>Você ainda não possui candidaturas</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('editais')}
            >
              Ver editais disponíveis
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDENTE: 'Pendente',
    EM_ANALISE: 'Em Análise',
    DOCUMENTACAO_PENDENTE: 'Documentação Pendente',
    APROVADO: 'Aprovado',
    REPROVADO: 'Reprovado',
    CANCELADO: 'Cancelado',
  }
  return labels[status] || status
}
