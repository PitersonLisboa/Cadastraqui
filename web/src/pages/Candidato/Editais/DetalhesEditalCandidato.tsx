import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  FiArrowLeft, 
  FiCalendar, 
  FiUsers,
  FiMapPin,
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiSend,
  FiTool
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { editalService, candidaturaService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Card } from '@/components/common/Card/Card'
import { formatDate } from '@/utils/masks'
import styles from './DetalhesEditalCandidato.module.scss'

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
  instituicao: {
    id: string
    razaoSocial: string
    nomeFantasia?: string
    cidade: string
    uf: string
    endereco: string
    telefone: string
    email: string
  }
}

export function DetalhesEditalCandidato() {
  const { id, slug } = useParams()
  const navigate = useNavigate()
  const [edital, setEdital] = useState<Edital | null>(null)
  const [loading, setLoading] = useState(true)
  const [emConstrucao, setEmConstrucao] = useState(false)
  const [inscrevendo, setInscrevendo] = useState(false)
  const [jaInscrito, setJaInscrito] = useState(false)
  const [candidaturaId, setCandidaturaId] = useState<string | null>(null)
  const basePath = slug ? `/${slug}/candidato` : '/candidato'

  useEffect(() => {
    loadEdital()
    verificarInscricao()
  }, [id])

  const loadEdital = async () => {
    try {
      const response = await editalService.buscarPublico(id!)
      setEdital(response.edital)
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 500) {
        setEmConstrucao(true)
      } else {
        toast.error('Erro ao carregar edital')
        navigate(`${basePath}/editais`)
      }
    } finally {
      setLoading(false)
    }
  }

  const verificarInscricao = async () => {
    try {
      const response = await candidaturaService.verificarInscricao(id!)
      if (response.inscrito) {
        setJaInscrito(true)
        setCandidaturaId(response.candidaturaId)
      }
    } catch (error) {
      // Ignora erro - usuário não inscrito
    }
  }

  const handleInscrever = async () => {
    setInscrevendo(true)
    
    try {
      const response = await candidaturaService.inscrever(id!)
      toast.success('Inscrição realizada com sucesso!')
      setCandidaturaId(response.candidatura.id)
      setJaInscrito(true)
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao realizar inscrição'
      toast.error(message)
    } finally {
      setInscrevendo(false)
    }
  }

  const getStatusEdital = () => {
    if (!edital) return null
    
    const hoje = new Date()
    const dataInicio = new Date(edital.dataInicio)
    const dataFim = new Date(edital.dataFim)
    
    if (hoje < dataInicio) {
      return { 
        label: 'Inscrições em breve', 
        class: 'emBreve', 
        icon: <FiClock />,
        aberto: false 
      }
    }
    if (hoje > dataFim) {
      return { 
        label: 'Inscrições encerradas', 
        class: 'encerrado', 
        icon: <FiAlertTriangle />,
        aberto: false 
      }
    }
    
    const diasRestantes = Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    
    return { 
      label: diasRestantes <= 7 ? `${diasRestantes} dias restantes` : 'Inscrições abertas', 
      class: diasRestantes <= 7 ? 'urgente' : 'aberto', 
      icon: <FiCheckCircle />,
      aberto: true,
      diasRestantes
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

  if (!edital && !emConstrucao) {
    return null
  }

  if (emConstrucao) {
    return (
      <div className={styles.container}>
        <div className={styles.emConstrucao}>
          <FiTool size={56} color="#d97706" />
          <h2>Módulo em Construção</h2>
          <p>
            Os detalhes dos editais estarão disponíveis em breve, após a implementação
            do módulo Operacional da instituição.
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

  if (!edital) {
    return null
  }

  const status = getStatusEdital()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Button 
          variant="ghost" 
          onClick={() => navigate(`${basePath}/editais`)}
          leftIcon={<FiArrowLeft />}
        >
          Voltar
        </Button>
      </header>

      <div className={styles.content}>
        {/* Coluna Principal */}
        <div className={styles.mainColumn}>
          {/* Card do Edital */}
          <Card className={styles.editalCard}>
            <div className={styles.editalHeader}>
              <span className={styles.instituicaoNome}>
                {edital.instituicao.nomeFantasia || edital.instituicao.razaoSocial}
              </span>
              {status && (
                <span className={`${styles.status} ${styles[status.class]}`}>
                  {status.icon}
                  {status.label}
                </span>
              )}
            </div>

            <h1>{edital.titulo}</h1>
            
            <div className={styles.metaInfo}>
              <div className={styles.metaItem}>
                <FiCalendar />
                <span>
                  {formatDate(edital.dataInicio)} até {formatDate(edital.dataFim)}
                </span>
              </div>
              <div className={styles.metaItem}>
                <FiUsers />
                <span>{edital.vagasDisponiveis} vaga(s) disponível(is)</span>
              </div>
              <div className={styles.metaItem}>
                <FiMapPin />
                <span>{edital.instituicao.cidade}/{edital.instituicao.uf}</span>
              </div>
            </div>

            {edital.descricao && (
              <div className={styles.section}>
                <h3>Descrição</h3>
                <p className={styles.descricao}>{edital.descricao}</p>
              </div>
            )}

            {edital.requisitos && (
              <div className={styles.section}>
                <h3>Requisitos</h3>
                <div className={styles.listContent}>
                  {edital.requisitos.split('\n').map((req, index) => (
                    req.trim() && (
                      <div key={index} className={styles.listItem}>
                        <FiCheckCircle size={16} />
                        <span>{req}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {edital.documentosExigidos && (
              <div className={styles.section}>
                <h3>Documentos Exigidos</h3>
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
              </div>
            )}
          </Card>
        </div>

        {/* Coluna Lateral */}
        <div className={styles.sideColumn}>
          {/* Card de Inscrição */}
          <Card className={styles.inscricaoCard}>
            <h3>Inscrição</h3>
            
            {jaInscrito ? (
              <div className={styles.jaInscrito}>
                <FiCheckCircle size={32} />
                <p>Você já está inscrito neste edital!</p>
                <Button 
                  variant="outline"
                  onClick={() => navigate(`${basePath}/candidaturas/${candidaturaId}`)}
                >
                  Ver minha candidatura
                </Button>
              </div>
            ) : status?.aberto ? (
              <>
                <p className={styles.inscricaoInfo}>
                  Ao se inscrever, você poderá enviar seus documentos e acompanhar 
                  o processo seletivo.
                </p>
                <Button 
                  fullWidth
                  loading={inscrevendo}
                  onClick={handleInscrever}
                  leftIcon={<FiSend />}
                >
                  Realizar Inscrição
                </Button>
              </>
            ) : (
              <div className={styles.inscricaoFechada}>
                <FiAlertTriangle size={24} />
                <p>
                  {status?.class === 'emBreve' 
                    ? 'As inscrições ainda não começaram.' 
                    : 'As inscrições para este edital estão encerradas.'}
                </p>
              </div>
            )}
          </Card>

          {/* Card da Instituição */}
          <Card className={styles.instituicaoCard}>
            <h3>Sobre a Instituição</h3>
            <div className={styles.instituicaoInfo}>
              <p className={styles.instituicaoNomeCompleto}>
                {edital.instituicao.razaoSocial}
              </p>
              {edital.instituicao.nomeFantasia && (
                <p className={styles.nomeFantasia}>
                  ({edital.instituicao.nomeFantasia})
                </p>
              )}
              <div className={styles.instituicaoContato}>
                <div>
                  <FiMapPin size={14} />
                  <span>
                    {edital.instituicao.endereco}, {edital.instituicao.cidade}/{edital.instituicao.uf}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
