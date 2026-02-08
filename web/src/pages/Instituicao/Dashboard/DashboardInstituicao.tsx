import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import { 
  FiFileText, 
  FiUsers, 
  FiCheckCircle,
  FiClock,
  FiPlus,
  FiEye,
  FiAlertCircle
} from 'react-icons/fi'
import { authState } from '@/atoms'
import { instituicaoService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Card } from '@/components/common/Card/Card'
import styles from './DashboardInstituicao.module.scss'

interface DashboardData {
  estatisticas: {
    totalEditais: number
    editaisAtivos: number
    totalCandidaturas: number
    candidaturasPendentes: number
    candidaturasAprovadas: number
    totalAssistentes: number
    totalAdvogados: number
  }
  ultimosEditais: any[]
}

export function DashboardInstituicao() {
  const auth = useRecoilValue(authState)
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsRegistration, setNeedsRegistration] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const response = await instituicaoService.dashboard()
      setData(response)
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

  // Se a instituição ainda não completou o cadastro
  if (needsRegistration) {
    return (
      <div className={styles.container}>
        <div className={styles.welcomeCard}>
          <div className={styles.welcomeIcon}>🏢</div>
          <h1>Bem-vindo(a) ao Cadastraqui!</h1>
          <p>
            Para começar a usar o sistema e publicar editais, você precisa 
            completar o cadastro da sua instituição.
          </p>
          <Button 
            onClick={() => navigate('/instituicao/cadastro')}
            leftIcon={<FiPlus />}
          >
            Cadastrar Instituição
          </Button>
        </div>
      </div>
    )
  }

  const stats = data?.estatisticas

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.greeting}>
          <h1>Painel da Instituição</h1>
          <p>Gerencie seus editais e candidaturas</p>
        </div>
        <Button 
          onClick={() => navigate('/instituicao/editais/novo')}
          leftIcon={<FiPlus />}
        >
          Novo Edital
        </Button>
      </header>

      {/* Cards de Estatísticas */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#eff6ff' }}>
            <FiFileText color="#1e40af" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.totalEditais || 0}</span>
            <span className={styles.statLabel}>Total de Editais</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#f0fdf4' }}>
            <FiCheckCircle color="#166534" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.editaisAtivos || 0}</span>
            <span className={styles.statLabel}>Editais Ativos</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#fef3c7' }}>
            <FiUsers color="#d97706" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.totalCandidaturas || 0}</span>
            <span className={styles.statLabel}>Candidaturas</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#faf5ff' }}>
            <FiClock color="#7c3aed" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.candidaturasPendentes || 0}</span>
            <span className={styles.statLabel}>Pendentes</span>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <Card title="Ações Rápidas" className={styles.actionsCard}>
        <div className={styles.quickActions}>
          <button 
            className={styles.quickAction}
            onClick={() => navigate('/instituicao/editais/novo')}
          >
            <FiPlus size={24} />
            <span>Novo Edital</span>
          </button>
          <button 
            className={styles.quickAction}
            onClick={() => navigate('/instituicao/editais')}
          >
            <FiFileText size={24} />
            <span>Ver Editais</span>
          </button>
          <button 
            className={styles.quickAction}
            onClick={() => navigate('/instituicao/candidaturas')}
          >
            <FiUsers size={24} />
            <span>Candidaturas</span>
          </button>
          <button 
            className={styles.quickAction}
            onClick={() => navigate('/instituicao/equipe')}
          >
            <FiUsers size={24} />
            <span>Equipe</span>
          </button>
        </div>
      </Card>

      {/* Últimos Editais */}
      <Card 
        title="Últimos Editais" 
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/instituicao/editais')}>
            Ver todos
          </Button>
        }
      >
        {data?.ultimosEditais && data.ultimosEditais.length > 0 ? (
          <div className={styles.editaisList}>
            {data.ultimosEditais.map((edital: any) => (
              <div key={edital.id} className={styles.editalItem}>
                <div className={styles.editalInfo}>
                  <h4>{edital.titulo}</h4>
                  <span>
                    {edital._count?.candidaturas || 0} candidatura(s) • 
                    Ano Letivo: {edital.anoLetivo}
                  </span>
                </div>
                <div className={styles.editalActions}>
                  <span className={`${styles.status} ${edital.ativo ? styles.ativo : styles.inativo}`}>
                    {edital.ativo ? 'Ativo' : 'Encerrado'}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(`/instituicao/editais/${edital.id}`)}
                  >
                    <FiEye size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <FiAlertCircle size={48} />
            <p>Você ainda não possui editais</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/instituicao/editais/novo')}
            >
              Criar primeiro edital
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
