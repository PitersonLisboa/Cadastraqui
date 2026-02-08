import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  FiArrowLeft, 
  FiUser,
  FiMapPin,
  FiPhone,
  FiMail,
  FiFileText,
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiSend,
  FiDownload
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { candidaturaService, parecerService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Card } from '@/components/common/Card/Card'
import { Select } from '@/components/common/Select/Select'
import { Modal } from '@/components/common/Modal/Modal'
import { formatDate, maskCPF, maskPhone } from '@/utils/masks'
import styles from './AnalisarCandidatura.module.scss'

interface Candidatura {
  id: string
  status: string
  dataInscricao: string
  observacoes?: string
  candidato: {
    id: string
    nome: string
    cpf: string
    dataNascimento: string
    telefone: string
    celular?: string
    endereco: string
    numero: string
    bairro: string
    cidade: string
    uf: string
    cep: string
    estadoCivil?: string
    profissao?: string
    rendaFamiliar?: number
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
  documentos: any[]
  membrosFamilia?: any[]
  parecerSocial?: {
    id: string
    parecer: string
    recomendacao: string
    dataEmissao: string
  }
}

const STATUS_OPTIONS = [
  { value: 'EM_ANALISE', label: 'Em Análise' },
  { value: 'DOCUMENTACAO_PENDENTE', label: 'Documentação Pendente' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REPROVADO', label: 'Reprovado' },
]

export function AnalisarCandidatura() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [candidatura, setCandidatura] = useState<Candidatura | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalParecerOpen, setModalParecerOpen] = useState(false)
  const [novoStatus, setNovoStatus] = useState('')
  const [parecer, setParecer] = useState('')
  const [recomendacao, setRecomendacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    loadCandidatura()
  }, [id])

  const loadCandidatura = async () => {
    try {
      const response = await candidaturaService.buscar(id!)
      setCandidatura(response.candidatura)
      setNovoStatus(response.candidatura.status)
    } catch (error) {
      toast.error('Erro ao carregar candidatura')
      navigate('/assistente-social/candidaturas')
    } finally {
      setLoading(false)
    }
  }

  const handleAtualizarStatus = async () => {
    if (!novoStatus) return

    setSalvando(true)
    try {
      await candidaturaService.atualizarStatus(id!, { status: novoStatus })
      toast.success('Status atualizado com sucesso')
      loadCandidatura()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar status')
    } finally {
      setSalvando(false)
    }
  }

  const handleEmitirParecer = async () => {
    if (!parecer.trim()) {
      toast.error('Digite o parecer')
      return
    }

    setSalvando(true)
    try {
      await parecerService.emitirParecerSocial(id!, {
        parecer,
        recomendacao,
      })
      toast.success('Parecer emitido com sucesso')
      setModalParecerOpen(false)
      setParecer('')
      setRecomendacao('')
      loadCandidatura()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao emitir parecer')
    } finally {
      setSalvando(false)
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

  if (!candidatura) return null

  const { candidato, edital } = candidatura

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/assistente-social/candidaturas')}
          leftIcon={<FiArrowLeft />}
        >
          Voltar
        </Button>
        <div className={styles.headerInfo}>
          <h1>Análise de Candidatura</h1>
          <p>{edital.titulo} - {edital.instituicao.razaoSocial}</p>
        </div>
      </header>

      <div className={styles.content}>
        {/* Coluna Principal */}
        <div className={styles.mainColumn}>
          {/* Dados do Candidato */}
          <Card title="Dados do Candidato">
            <div className={styles.candidatoHeader}>
              <div className={styles.avatar}>
                <FiUser size={32} />
              </div>
              <div>
                <h3>{candidato.nome}</h3>
                <span>CPF: {maskCPF(candidato.cpf)}</span>
              </div>
            </div>

            <div className={styles.dadosGrid}>
              <div className={styles.dadoItem}>
                <label>Data de Nascimento</label>
                <span>{formatDate(candidato.dataNascimento)}</span>
              </div>
              <div className={styles.dadoItem}>
                <label>Estado Civil</label>
                <span>{candidato.estadoCivil || 'Não informado'}</span>
              </div>
              <div className={styles.dadoItem}>
                <label>Profissão</label>
                <span>{candidato.profissao || 'Não informada'}</span>
              </div>
              <div className={styles.dadoItem}>
                <label>Renda Familiar</label>
                <span>
                  {candidato.rendaFamiliar 
                    ? `R$ ${Number(candidato.rendaFamiliar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : 'Não informada'}
                </span>
              </div>
            </div>

            <div className={styles.section}>
              <h4><FiPhone size={16} /> Contato</h4>
              <div className={styles.dadosGrid}>
                <div className={styles.dadoItem}>
                  <label>Telefone</label>
                  <span>{maskPhone(candidato.telefone)}</span>
                </div>
                <div className={styles.dadoItem}>
                  <label>Celular</label>
                  <span>{candidato.celular ? maskPhone(candidato.celular) : 'Não informado'}</span>
                </div>
                <div className={styles.dadoItem}>
                  <label>Email</label>
                  <span>{candidato.usuario.email}</span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h4><FiMapPin size={16} /> Endereço</h4>
              <p className={styles.endereco}>
                {candidato.endereco}, {candidato.numero} - {candidato.bairro}<br />
                {candidato.cidade}/{candidato.uf} - CEP: {candidato.cep}
              </p>
            </div>
          </Card>

          {/* Documentos */}
          <Card title="Documentos Enviados">
            {candidatura.documentos && candidatura.documentos.length > 0 ? (
              <div className={styles.documentosList}>
                {candidatura.documentos.map((doc: any) => (
                  <div key={doc.id} className={styles.documentoItem}>
                    <div className={styles.docInfo}>
                      <FiFileText size={20} />
                      <div>
                        <span className={styles.docNome}>{doc.nome}</span>
                        <span className={styles.docTipo}>{doc.tipo}</span>
                      </div>
                    </div>
                    <div className={styles.docActions}>
                      <span className={`${styles.docStatus} ${styles[doc.status.toLowerCase()]}`}>
                        {doc.status}
                      </span>
                      <Button variant="ghost" size="sm">
                        <FiDownload size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyDocs}>Nenhum documento enviado</p>
            )}
          </Card>

          {/* Parecer Social (se existir) */}
          {candidatura.parecerSocial && (
            <Card title="Parecer Social" className={styles.parecerCard}>
              <div className={styles.parecerContent}>
                <div className={styles.parecerMeta}>
                  <span>Emitido em {formatDate(candidatura.parecerSocial.dataEmissao)}</span>
                </div>
                <p className={styles.parecerTexto}>{candidatura.parecerSocial.parecer}</p>
                {candidatura.parecerSocial.recomendacao && (
                  <div className={styles.recomendacao}>
                    <strong>Recomendação:</strong> {candidatura.parecerSocial.recomendacao}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Coluna Lateral */}
        <div className={styles.sideColumn}>
          {/* Status e Ações */}
          <Card title="Ações">
            <div className={styles.acaoForm}>
              <Select
                label="Status da Candidatura"
                options={STATUS_OPTIONS}
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value)}
              />
              <Button 
                fullWidth
                onClick={handleAtualizarStatus}
                loading={salvando}
                disabled={novoStatus === candidatura.status}
              >
                Atualizar Status
              </Button>
            </div>

            <div className={styles.divider} />

            {!candidatura.parecerSocial && (
              <Button 
                fullWidth
                variant="outline"
                onClick={() => setModalParecerOpen(true)}
                leftIcon={<FiSend />}
              >
                Emitir Parecer Social
              </Button>
            )}
          </Card>

          {/* Informações da Candidatura */}
          <Card title="Informações">
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <label>Data de Inscrição</label>
                <span>{formatDate(candidatura.dataInscricao)}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Edital</label>
                <span>{edital.titulo}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Ano Letivo</label>
                <span>{edital.anoLetivo}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de Parecer */}
      <Modal
        isOpen={modalParecerOpen}
        onClose={() => setModalParecerOpen(false)}
        title="Emitir Parecer Social"
        size="lg"
      >
        <Modal.Body>
          <div className={styles.parecerForm}>
            <div className={styles.formGroup}>
              <label>Parecer *</label>
              <textarea
                value={parecer}
                onChange={(e) => setParecer(e.target.value)}
                placeholder="Digite seu parecer técnico sobre a situação socioeconômica do candidato..."
                rows={8}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Recomendação *</label>
              <select
                value={recomendacao}
                onChange={(e) => setRecomendacao(e.target.value)}
                className={styles.selectRecomendacao}
              >
                <option value="">Selecione uma recomendação</option>
                <option value="FAVORAVEL">Favorável à concessão do benefício</option>
                <option value="DESFAVORAVEL">Desfavorável à concessão do benefício</option>
                <option value="COM_RESSALVAS">Favorável com ressalvas</option>
              </select>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setModalParecerOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleEmitirParecer}
            loading={salvando}
            disabled={!parecer.trim() || !recomendacao}
            leftIcon={<FiSend />}
          >
            Emitir Parecer
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
