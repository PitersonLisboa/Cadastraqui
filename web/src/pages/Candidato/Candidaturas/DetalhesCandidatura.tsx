import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  FiArrowLeft, 
  FiCalendar, 
  FiMapPin,
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiAlertCircle,
  FiUpload,
  FiDownload,
  FiTrash2
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { candidaturaService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Card } from '@/components/common/Card/Card'
import { formatDate, formatDateTime } from '@/utils/masks'
import styles from './DetalhesCandidatura.module.scss'

interface Documento {
  id: string
  nome: string
  tipo: string
  url: string
  status: string
  observacao?: string
  createdAt: string
}

interface HistoricoItem {
  id: string
  status: string
  observacao?: string
  createdAt: string
  usuario?: {
    nome: string
  }
}

interface Candidatura {
  id: string
  status: string
  dataInscricao: string
  observacoes?: string
  edital: {
    id: string
    titulo: string
    anoLetivo: number
    dataFim: string
    documentosExigidos?: string
    instituicao: {
      razaoSocial: string
      nomeFantasia?: string
      cidade: string
      uf: string
    }
  }
  documentos: Documento[]
  historico: HistoricoItem[]
}

const STATUS_CONFIG: Record<string, { label: string; icon: JSX.Element; class: string; description: string }> = {
  PENDENTE: { 
    label: 'Pendente', 
    icon: <FiClock />, 
    class: 'pendente',
    description: 'Sua candidatura foi recebida e está aguardando análise.'
  },
  EM_ANALISE: { 
    label: 'Em Análise', 
    icon: <FiFileText />, 
    class: 'emAnalise',
    description: 'Sua candidatura está sendo analisada pela equipe.'
  },
  DOCUMENTACAO_PENDENTE: { 
    label: 'Documentação Pendente', 
    icon: <FiAlertCircle />, 
    class: 'docPendente',
    description: 'Você precisa enviar ou corrigir alguns documentos.'
  },
  APROVADO: { 
    label: 'Aprovado', 
    icon: <FiCheckCircle />, 
    class: 'aprovado',
    description: 'Parabéns! Sua candidatura foi aprovada.'
  },
  REPROVADO: { 
    label: 'Reprovado', 
    icon: <FiXCircle />, 
    class: 'reprovado',
    description: 'Infelizmente sua candidatura não foi aprovada.'
  },
  CANCELADO: { 
    label: 'Cancelado', 
    icon: <FiXCircle />, 
    class: 'cancelado',
    description: 'Esta candidatura foi cancelada.'
  },
}

export function DetalhesCandidatura() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [candidatura, setCandidatura] = useState<Candidatura | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCandidatura()
  }, [id])

  const loadCandidatura = async () => {
    try {
      const response = await candidaturaService.buscar(id!)
      setCandidatura(response.candidatura)
    } catch (error) {
      toast.error('Erro ao carregar candidatura')
      navigate('/candidato/candidaturas')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelar = async () => {
    if (!window.confirm('Tem certeza que deseja cancelar esta candidatura? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      await candidaturaService.cancelar(id!)
      toast.success('Candidatura cancelada')
      loadCandidatura()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao cancelar candidatura')
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

  if (!candidatura) {
    return null
  }

  const statusConfig = STATUS_CONFIG[candidatura.status] || STATUS_CONFIG.PENDENTE
  const podeEnviarDocumentos = ['PENDENTE', 'DOCUMENTACAO_PENDENTE'].includes(candidatura.status)
  const podeCancelar = ['PENDENTE', 'EM_ANALISE', 'DOCUMENTACAO_PENDENTE'].includes(candidatura.status)

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/candidato/candidaturas')}
          leftIcon={<FiArrowLeft />}
        >
          Voltar
        </Button>
        {podeCancelar && (
          <Button 
            variant="outline" 
            onClick={handleCancelar}
            leftIcon={<FiXCircle />}
          >
            Cancelar Candidatura
          </Button>
        )}
      </header>

      {/* Status Card */}
      <div className={`${styles.statusCard} ${styles[statusConfig.class]}`}>
        <div className={styles.statusIcon}>
          {statusConfig.icon}
        </div>
        <div className={styles.statusInfo}>
          <h2>{statusConfig.label}</h2>
          <p>{statusConfig.description}</p>
        </div>
      </div>

      <div className={styles.content}>
        {/* Coluna Principal */}
        <div className={styles.mainColumn}>
          {/* Informações do Edital */}
          <Card title="Informações do Edital">
            <div className={styles.editalInfo}>
              <h3>{candidatura.edital.titulo}</h3>
              <p className={styles.instituicao}>
                {candidatura.edital.instituicao.nomeFantasia || 
                 candidatura.edital.instituicao.razaoSocial}
              </p>
              <div className={styles.metaInfo}>
                <div className={styles.metaItem}>
                  <FiMapPin size={14} />
                  <span>
                    {candidatura.edital.instituicao.cidade}/{candidatura.edital.instituicao.uf}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <FiCalendar size={14} />
                  <span>Ano Letivo: {candidatura.edital.anoLetivo}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Documentos */}
          <Card 
            title="Documentos" 
            actions={
              podeEnviarDocumentos && (
                <Button size="sm" leftIcon={<FiUpload />}>
                  Enviar Documento
                </Button>
              )
            }
          >
            {candidatura.edital.documentosExigidos && (
              <div className={styles.docsExigidos}>
                <h4>Documentos Exigidos:</h4>
                <ul>
                  {candidatura.edital.documentosExigidos.split('\n').map((doc, index) => (
                    doc.trim() && <li key={index}>{doc}</li>
                  ))}
                </ul>
              </div>
            )}

            {candidatura.documentos.length > 0 ? (
              <div className={styles.documentosList}>
                {candidatura.documentos.map((doc) => (
                  <div key={doc.id} className={styles.documentoItem}>
                    <div className={styles.docInfo}>
                      <FiFileText size={20} />
                      <div>
                        <span className={styles.docNome}>{doc.nome}</span>
                        <span className={styles.docData}>
                          Enviado em {formatDate(doc.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.docActions}>
                      <span className={`${styles.docStatus} ${styles[doc.status.toLowerCase()]}`}>
                        {doc.status}
                      </span>
                      <Button variant="ghost" size="sm">
                        <FiDownload />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyDocs}>
                Nenhum documento enviado ainda.
                {podeEnviarDocumentos && ' Envie seus documentos para dar continuidade ao processo.'}
              </p>
            )}
          </Card>

          {/* Observações */}
          {candidatura.observacoes && (
            <Card title="Observações">
              <p className={styles.observacoes}>{candidatura.observacoes}</p>
            </Card>
          )}
        </div>

        {/* Coluna Lateral */}
        <div className={styles.sideColumn}>
          {/* Timeline / Histórico */}
          <Card title="Histórico">
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot} />
                <div className={styles.timelineContent}>
                  <span className={styles.timelineTitle}>Inscrição realizada</span>
                  <span className={styles.timelineDate}>
                    {formatDateTime(candidatura.dataInscricao)}
                  </span>
                </div>
              </div>
              
              {candidatura.historico?.map((item, index) => (
                <div key={item.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineTitle}>
                      {STATUS_CONFIG[item.status]?.label || item.status}
                    </span>
                    {item.observacao && (
                      <span className={styles.timelineObs}>{item.observacao}</span>
                    )}
                    <span className={styles.timelineDate}>
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Ações Rápidas */}
          <Card title="Ações">
            <div className={styles.actionsList}>
              <Button 
                variant="outline" 
                fullWidth
                onClick={() => navigate(`/candidato/editais/${candidatura.edital.id}`)}
              >
                Ver Edital
              </Button>
              {podeEnviarDocumentos && (
                <Button 
                  variant="outline" 
                  fullWidth
                  leftIcon={<FiUpload />}
                >
                  Enviar Documentos
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
