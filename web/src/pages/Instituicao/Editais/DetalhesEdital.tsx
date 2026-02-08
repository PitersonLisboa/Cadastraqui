import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  FiArrowLeft, 
  FiEdit2, 
  FiCalendar, 
  FiUsers,
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiXCircle
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { editalService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Card } from '@/components/common/Card/Card'
import { formatDate } from '@/utils/masks'
import styles from './DetalhesEdital.module.scss'

interface Edital {
  id: string
  titulo: string
  descricao?: string
  anoLetivo: number
  dataInicio: string
  dataFim: string
  vagasDisponiveis: number
  requisitos?: string
  documentosExigidos?: string
  ativo: boolean
  createdAt: string
  _count?: {
    candidaturas: number
  }
  candidaturas?: any[]
}

export function DetalhesEdital() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [edital, setEdital] = useState<Edital | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEdital()
  }, [id])

  const loadEdital = async () => {
    try {
      const response = await editalService.buscar(id!)
      setEdital(response.edital)
    } catch (error) {
      toast.error('Erro ao carregar edital')
      navigate('/instituicao/editais')
    } finally {
      setLoading(false)
    }
  }

  const getStatusEdital = () => {
    if (!edital) return null
    
    const hoje = new Date()
    const dataFim = new Date(edital.dataFim)
    
    if (!edital.ativo) return { label: 'Inativo', class: 'inativo', icon: <FiXCircle /> }
    if (dataFim < hoje) return { label: 'Encerrado', class: 'encerrado', icon: <FiClock /> }
    return { label: 'Ativo', class: 'ativo', icon: <FiCheckCircle /> }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Carregando...</p>
      </div>
    )
  }

  if (!edital) {
    return null
  }

  const status = getStatusEdital()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/instituicao/editais')}
          leftIcon={<FiArrowLeft />}
        >
          Voltar
        </Button>
        <div className={styles.headerInfo}>
          <div className={styles.titleRow}>
            <h1>{edital.titulo}</h1>
            {status && (
              <span className={`${styles.status} ${styles[status.class]}`}>
                {status.icon}
                {status.label}
              </span>
            )}
          </div>
          <p>Ano Letivo: {edital.anoLetivo}</p>
        </div>
        <Button 
          onClick={() => navigate(`/instituicao/editais/${id}/editar`)}
          leftIcon={<FiEdit2 />}
        >
          Editar
        </Button>
      </header>

      {/* Cards de Estatísticas */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <FiUsers size={24} />
          <div>
            <span className={styles.statValue}>{edital._count?.candidaturas || 0}</span>
            <span className={styles.statLabel}>Candidaturas</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <FiFileText size={24} />
          <div>
            <span className={styles.statValue}>{edital.vagasDisponiveis}</span>
            <span className={styles.statLabel}>Vagas</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <FiCalendar size={24} />
          <div>
            <span className={styles.statValue}>{formatDate(edital.dataInicio)}</span>
            <span className={styles.statLabel}>Início</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <FiCalendar size={24} />
          <div>
            <span className={styles.statValue}>{formatDate(edital.dataFim)}</span>
            <span className={styles.statLabel}>Término</span>
          </div>
        </div>
      </div>

      {/* Descrição */}
      {edital.descricao && (
        <Card title="Descrição" className={styles.section}>
          <p className={styles.descricao}>{edital.descricao}</p>
        </Card>
      )}

      {/* Requisitos */}
      {edital.requisitos && (
        <Card title="Requisitos" className={styles.section}>
          <div className={styles.listContent}>
            {edital.requisitos.split('\n').map((req, index) => (
              req.trim() && (
                <div key={index} className={styles.listItem}>
                  <span className={styles.bullet}>•</span>
                  <span>{req}</span>
                </div>
              )
            ))}
          </div>
        </Card>
      )}

      {/* Documentos Exigidos */}
      {edital.documentosExigidos && (
        <Card title="Documentos Exigidos" className={styles.section}>
          <div className={styles.listContent}>
            {edital.documentosExigidos.split('\n').map((doc, index) => (
              doc.trim() && (
                <div key={index} className={styles.listItem}>
                  <FiFileText size={16} />
                  <span>{doc}</span>
                </div>
              )
            ))}
          </div>
        </Card>
      )}

      {/* Candidaturas */}
      <Card 
        title="Candidaturas" 
        className={styles.section}
        actions={
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(`/instituicao/candidaturas?edital=${id}`)}
          >
            Ver todas
          </Button>
        }
      >
        {edital.candidaturas && edital.candidaturas.length > 0 ? (
          <div className={styles.candidaturasList}>
            {edital.candidaturas.slice(0, 5).map((candidatura: any) => (
              <div key={candidatura.id} className={styles.candidaturaItem}>
                <div className={styles.candidaturaInfo}>
                  <h4>{candidatura.candidato?.usuario?.nome || 'Candidato'}</h4>
                  <span>Inscrito em {formatDate(candidatura.dataInscricao)}</span>
                </div>
                <span className={`${styles.candidaturaStatus} ${styles[candidatura.status.toLowerCase()]}`}>
                  {getStatusLabel(candidatura.status)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>Nenhuma candidatura recebida ainda.</p>
        )}
      </Card>
    </div>
  )
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDENTE: 'Pendente',
    EM_ANALISE: 'Em Análise',
    DOCUMENTACAO_PENDENTE: 'Doc. Pendente',
    APROVADO: 'Aprovado',
    REPROVADO: 'Reprovado',
    CANCELADO: 'Cancelado',
  }
  return labels[status] || status
}
