import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  FiArrowLeft,
  FiUser,
  FiFileText,
  FiCalendar,
  FiMapPin,
  FiPhone,
  FiMail,
  FiDollarSign,
  FiUsers,
  FiDownload,
  FiCheck,
  FiX,
  FiClock,
  FiMessageSquare,
  FiEdit2
} from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Select } from '@/components/common/Select/Select'
import { Modal } from '@/components/common/Modal/Modal'
import { api } from '@/services/api'
import styles from './DetalhesCandidaturaInstituicao.module.scss'

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
    email?: string
    endereco: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    uf: string
    cep: string
    profissao?: string
    rendaFamiliar?: number
  }
  edital: {
    id: string
    titulo: string
    dataInicio: string
    dataFim: string
  }
  documentos: {
    id: string
    tipo: string
    nome: string
    url: string
    status: string
    observacao?: string
  }[]
  parecerSocial?: {
    id: string
    parecer: string
    recomendacao?: string
    dataEmissao: string
    assistenteSocial: { nome: string }
  }
  parecerJuridico?: {
    id: string
    parecer: string
    fundamentacao?: string
    dataEmissao: string
    advogado: { nome: string }
  }
  historico: {
    id: string
    status: string
    observacao?: string
    createdAt: string
    usuario: { nome?: string; email: string }
  }[]
}

const STATUS_OPTIONS = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'EM_ANALISE', label: 'Em Análise' },
  { value: 'DOCUMENTACAO_PENDENTE', label: 'Documentação Pendente' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REPROVADO', label: 'Reprovado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDENTE: { bg: '#fef3c7', color: '#92400e' },
  EM_ANALISE: { bg: '#dbeafe', color: '#1e40af' },
  DOCUMENTACAO_PENDENTE: { bg: '#ffedd5', color: '#c2410c' },
  APROVADO: { bg: '#dcfce7', color: '#166534' },
  REPROVADO: { bg: '#fee2e2', color: '#991b1b' },
  CANCELADO: { bg: '#f3f4f6', color: '#374151' },
}

const DOC_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDENTE: { bg: '#f3f4f6', color: '#6b7280' },
  ENVIADO: { bg: '#dbeafe', color: '#1e40af' },
  APROVADO: { bg: '#dcfce7', color: '#166534' },
  REJEITADO: { bg: '#fee2e2', color: '#991b1b' },
}

export function DetalhesCandidaturaInstituicao() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [candidatura, setCandidatura] = useState<Candidatura | null>(null)
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'dados' | 'documentos' | 'pareceres' | 'historico'>('dados')
  
  // Modal de alterar status
  const [modalStatus, setModalStatus] = useState(false)
  const [novoStatus, setNovoStatus] = useState('')
  const [observacaoStatus, setObservacaoStatus] = useState('')
  const [salvandoStatus, setSalvandoStatus] = useState(false)

  useEffect(() => {
    carregarCandidatura()
  }, [id])

  async function carregarCandidatura() {
    setLoading(true)
    try {
      const response = await api.get(`/instituicao/candidaturas/${id}`)
      setCandidatura(response.data.candidatura)
    } catch (error) {
      console.error('Erro ao carregar candidatura:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAlterarStatus() {
    if (!novoStatus) return
    setSalvandoStatus(true)
    try {
      await api.patch(`/candidaturas/${id}/status`, {
        status: novoStatus,
        observacao: observacaoStatus || undefined
      })
      setModalStatus(false)
      setNovoStatus('')
      setObservacaoStatus('')
      carregarCandidatura()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao alterar status')
    } finally {
      setSalvandoStatus(false)
    }
  }

  function formatarCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  function formatarData(data: string): string {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  function formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function calcularIdade(dataNascimento: string): number {
    const nascimento = new Date(dataNascimento)
    const hoje = new Date()
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const m = hoje.getMonth() - nascimento.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }
    return idade
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando candidatura...</p>
      </div>
    )
  }

  if (!candidatura) {
    return (
      <div className={styles.error}>
        <p>Candidatura não encontrada</p>
        <Button onClick={() => navigate('/instituicao/candidaturas')}>Voltar</Button>
      </div>
    )
  }

  const statusConfig = STATUS_COLORS[candidatura.status] || STATUS_COLORS.PENDENTE

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" onClick={() => navigate('/instituicao/candidaturas')}>
          <FiArrowLeft size={18} /> Voltar
        </Button>
        <div className={styles.headerInfo}>
          <h1>{candidatura.candidato.nome}</h1>
          <span className={styles.edital}>{candidatura.edital.titulo}</span>
        </div>
        <div className={styles.headerActions}>
          <span 
            className={styles.statusBadge}
            style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
          >
            {STATUS_OPTIONS.find(s => s.value === candidatura.status)?.label}
          </span>
          <Button onClick={() => { setNovoStatus(candidatura.status); setModalStatus(true); }}>
            <FiEdit2 size={16} /> Alterar Status
          </Button>
        </div>
      </div>

      {/* Abas */}
      <div className={styles.tabs}>
        <button 
          className={abaAtiva === 'dados' ? styles.active : ''} 
          onClick={() => setAbaAtiva('dados')}
        >
          <FiUser size={16} /> Dados do Candidato
        </button>
        <button 
          className={abaAtiva === 'documentos' ? styles.active : ''} 
          onClick={() => setAbaAtiva('documentos')}
        >
          <FiFileText size={16} /> Documentos ({candidatura.documentos.length})
        </button>
        <button 
          className={abaAtiva === 'pareceres' ? styles.active : ''} 
          onClick={() => setAbaAtiva('pareceres')}
        >
          <FiMessageSquare size={16} /> Pareceres
        </button>
        <button 
          className={abaAtiva === 'historico' ? styles.active : ''} 
          onClick={() => setAbaAtiva('historico')}
        >
          <FiClock size={16} /> Histórico
        </button>
      </div>

      {/* Conteúdo das Abas */}
      <div className={styles.content}>
        {/* Aba Dados */}
        {abaAtiva === 'dados' && (
          <div className={styles.dadosGrid}>
            <Card className={styles.dadosCard}>
              <h3><FiUser size={18} /> Informações Pessoais</h3>
              <div className={styles.dadosLista}>
                <div className={styles.dadoItem}>
                  <label>Nome Completo</label>
                  <p>{candidatura.candidato.nome}</p>
                </div>
                <div className={styles.dadoItem}>
                  <label>CPF</label>
                  <p>{formatarCPF(candidatura.candidato.cpf)}</p>
                </div>
                <div className={styles.dadoItem}>
                  <label>Data de Nascimento</label>
                  <p>{formatarData(candidatura.candidato.dataNascimento)} ({calcularIdade(candidatura.candidato.dataNascimento)} anos)</p>
                </div>
                <div className={styles.dadoItem}>
                  <label>Profissão</label>
                  <p>{candidatura.candidato.profissao || '-'}</p>
                </div>
              </div>
            </Card>

            <Card className={styles.dadosCard}>
              <h3><FiPhone size={18} /> Contato</h3>
              <div className={styles.dadosLista}>
                <div className={styles.dadoItem}>
                  <label>Telefone</label>
                  <p>{candidatura.candidato.telefone}</p>
                </div>
                <div className={styles.dadoItem}>
                  <label>Celular</label>
                  <p>{candidatura.candidato.celular || '-'}</p>
                </div>
                <div className={styles.dadoItem}>
                  <label>Email</label>
                  <p>{candidatura.candidato.email || '-'}</p>
                </div>
              </div>
            </Card>

            <Card className={styles.dadosCard}>
              <h3><FiMapPin size={18} /> Endereço</h3>
              <div className={styles.dadosLista}>
                <div className={styles.dadoItem}>
                  <label>Logradouro</label>
                  <p>{candidatura.candidato.endereco}, {candidatura.candidato.numero} {candidatura.candidato.complemento}</p>
                </div>
                <div className={styles.dadoItem}>
                  <label>Bairro</label>
                  <p>{candidatura.candidato.bairro}</p>
                </div>
                <div className={styles.dadoItem}>
                  <label>Cidade/UF</label>
                  <p>{candidatura.candidato.cidade}/{candidatura.candidato.uf}</p>
                </div>
                <div className={styles.dadoItem}>
                  <label>CEP</label>
                  <p>{candidatura.candidato.cep}</p>
                </div>
              </div>
            </Card>

            <Card className={styles.dadosCard}>
              <h3><FiDollarSign size={18} /> Informações Socioeconômicas</h3>
              <div className={styles.dadosLista}>
                <div className={styles.dadoItem}>
                  <label>Renda Familiar</label>
                  <p>{candidatura.candidato.rendaFamiliar ? formatarMoeda(candidatura.candidato.rendaFamiliar) : '-'}</p>
                </div>
                <div className={styles.dadoItem}>
                  <label>Inscrito em</label>
                  <p>{formatarData(candidatura.dataInscricao)}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Aba Documentos */}
        {abaAtiva === 'documentos' && (
          <Card>
            <div className={styles.documentosLista}>
              {candidatura.documentos.length === 0 ? (
                <div className={styles.emptyDocs}>
                  <FiFileText size={40} />
                  <p>Nenhum documento enviado</p>
                </div>
              ) : (
                candidatura.documentos.map(doc => {
                  const docStatus = DOC_STATUS_COLORS[doc.status] || DOC_STATUS_COLORS.PENDENTE
                  return (
                    <div key={doc.id} className={styles.documentoItem}>
                      <div className={styles.docInfo}>
                        <FiFileText size={20} />
                        <div>
                          <span className={styles.docNome}>{doc.nome}</span>
                          <span className={styles.docTipo}>{doc.tipo}</span>
                        </div>
                      </div>
                      <span 
                        className={styles.docStatus}
                        style={{ backgroundColor: docStatus.bg, color: docStatus.color }}
                      >
                        {doc.status}
                      </span>
                      <Button variant="ghost" onClick={() => window.open(doc.url, '_blank')}>
                        <FiDownload size={16} />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        )}

        {/* Aba Pareceres */}
        {abaAtiva === 'pareceres' && (
          <div className={styles.pareceresGrid}>
            <Card className={styles.parecerCard}>
              <h3>Parecer Social</h3>
              {candidatura.parecerSocial ? (
                <div className={styles.parecerConteudo}>
                  <div className={styles.parecerMeta}>
                    <span>Por: {candidatura.parecerSocial.assistenteSocial.nome}</span>
                    <span>Em: {formatarData(candidatura.parecerSocial.dataEmissao)}</span>
                  </div>
                  <p className={styles.parecerTexto}>{candidatura.parecerSocial.parecer}</p>
                  {candidatura.parecerSocial.recomendacao && (
                    <div className={styles.parecerRecomendacao}>
                      <strong>Recomendação:</strong> {candidatura.parecerSocial.recomendacao}
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.semParecer}>
                  <FiClock size={24} />
                  <p>Parecer ainda não emitido</p>
                </div>
              )}
            </Card>

            <Card className={styles.parecerCard}>
              <h3>Parecer Jurídico</h3>
              {candidatura.parecerJuridico ? (
                <div className={styles.parecerConteudo}>
                  <div className={styles.parecerMeta}>
                    <span>Por: {candidatura.parecerJuridico.advogado.nome}</span>
                    <span>Em: {formatarData(candidatura.parecerJuridico.dataEmissao)}</span>
                  </div>
                  <p className={styles.parecerTexto}>{candidatura.parecerJuridico.parecer}</p>
                  {candidatura.parecerJuridico.fundamentacao && (
                    <div className={styles.parecerRecomendacao}>
                      <strong>Fundamentação:</strong> {candidatura.parecerJuridico.fundamentacao}
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.semParecer}>
                  <FiClock size={24} />
                  <p>Parecer ainda não emitido</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Aba Histórico */}
        {abaAtiva === 'historico' && (
          <Card>
            <div className={styles.timeline}>
              {candidatura.historico.length === 0 ? (
                <p className={styles.semHistorico}>Nenhum registro no histórico</p>
              ) : (
                candidatura.historico.map((item, index) => {
                  const itemStatus = STATUS_COLORS[item.status] || STATUS_COLORS.PENDENTE
                  return (
                    <div key={item.id} className={styles.timelineItem}>
                      <div 
                        className={styles.timelineDot}
                        style={{ backgroundColor: itemStatus.color }}
                      ></div>
                      {index < candidatura.historico.length - 1 && <div className={styles.timelineLine}></div>}
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineHeader}>
                          <span 
                            className={styles.timelineStatus}
                            style={{ backgroundColor: itemStatus.bg, color: itemStatus.color }}
                          >
                            {STATUS_OPTIONS.find(s => s.value === item.status)?.label}
                          </span>
                          <span className={styles.timelineData}>
                            {new Date(item.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className={styles.timelineUser}>Por: {item.usuario.nome || item.usuario.email}</p>
                        {item.observacao && (
                          <p className={styles.timelineObs}>{item.observacao}</p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Modal Alterar Status */}
      <Modal isOpen={modalStatus} onClose={() => setModalStatus(false)} title="Alterar Status da Candidatura">
        <div className={styles.modalForm}>
          <Select
            label="Novo Status"
            value={novoStatus}
            onChange={(e) => setNovoStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
          <div className={styles.textareaGroup}>
            <label>Observação (opcional)</label>
            <textarea
              rows={4}
              value={observacaoStatus}
              onChange={(e) => setObservacaoStatus(e.target.value)}
              placeholder="Adicione uma observação sobre esta alteração..."
            />
          </div>
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setModalStatus(false)}>Cancelar</Button>
            <Button onClick={handleAlterarStatus} disabled={salvandoStatus}>
              {salvandoStatus ? 'Salvando...' : 'Confirmar Alteração'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
