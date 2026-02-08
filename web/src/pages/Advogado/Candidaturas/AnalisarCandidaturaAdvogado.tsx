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
  FiDownload,
  FiSend,
  FiCheck,
  FiX,
  FiClock,
  FiAlertCircle
} from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Modal } from '@/components/common/Modal/Modal'
import { api } from '@/services/api'
import styles from './AnalisarCandidaturaAdvogado.module.scss'

interface Candidatura {
  id: string
  status: string
  dataInscricao: string
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
    bairro: string
    cidade: string
    uf: string
  }
  edital: {
    id: string
    titulo: string
  }
  documentos: {
    id: string
    tipo: string
    nome: string
    url: string
    status: string
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
    recomendacao: string
    dataEmissao: string
  }
}

export function AnalisarCandidaturaAdvogado() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [candidatura, setCandidatura] = useState<Candidatura | null>(null)
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'dados' | 'documentos' | 'parecer-social' | 'parecer'>('dados')
  
  // Modal de parecer
  const [modalParecerOpen, setModalParecerOpen] = useState(false)
  const [parecer, setParecer] = useState('')
  const [fundamentacao, setFundamentacao] = useState('')
  const [recomendacao, setRecomendacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarCandidatura()
  }, [id])

  async function carregarCandidatura() {
    setLoading(true)
    try {
      const response = await api.get(`/candidaturas/${id}`)
      setCandidatura(response.data.candidatura)
    } catch (error) {
      console.error('Erro ao carregar candidatura:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleEmitirParecer() {
    if (!parecer.trim() || !recomendacao) {
      alert('Preencha o parecer e selecione uma recomendação')
      return
    }

    setSalvando(true)
    try {
      await api.post(`/pareceres/juridico/${id}`, {
        parecer,
        fundamentacao: fundamentacao || undefined,
        recomendacao,
      })
      alert('Parecer jurídico emitido com sucesso!')
      setModalParecerOpen(false)
      setParecer('')
      setFundamentacao('')
      setRecomendacao('')
      carregarCandidatura()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao emitir parecer')
    } finally {
      setSalvando(false)
    }
  }

  function formatarCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  function formatarData(data: string): string {
    return new Date(data).toLocaleDateString('pt-BR')
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
        <Button onClick={() => navigate('/advogado/candidaturas')}>Voltar</Button>
      </div>
    )
  }

  const temParecerSocial = !!candidatura.parecerSocial
  const temParecerJuridico = !!candidatura.parecerJuridico

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" onClick={() => navigate('/advogado/candidaturas')}>
          <FiArrowLeft size={18} /> Voltar
        </Button>
        <div className={styles.headerInfo}>
          <h1>Análise Jurídica</h1>
          <span>{candidatura.edital.titulo}</span>
        </div>
        {!temParecerJuridico && temParecerSocial && (
          <Button onClick={() => setModalParecerOpen(true)}>
            <FiSend size={16} /> Emitir Parecer Jurídico
          </Button>
        )}
      </div>

      {/* Info do Candidato */}
      <Card className={styles.candidatoCard}>
        <div className={styles.candidatoInfo}>
          <div className={styles.avatar}>
            <FiUser size={24} />
          </div>
          <div>
            <h2>{candidatura.candidato.nome}</h2>
            <p>CPF: {formatarCPF(candidatura.candidato.cpf)}</p>
          </div>
        </div>
        <div className={styles.candidatoMeta}>
          <span><FiCalendar size={14} /> Inscrito em {formatarData(candidatura.dataInscricao)}</span>
          <span className={styles.status}>{candidatura.status}</span>
        </div>
      </Card>

      {/* Alerta se não tem parecer social */}
      {!temParecerSocial && (
        <Card className={styles.alertCard}>
          <FiAlertCircle size={20} />
          <div>
            <strong>Aguardando Parecer Social</strong>
            <p>O parecer social ainda não foi emitido. Você só poderá emitir o parecer jurídico após a análise social.</p>
          </div>
        </Card>
      )}

      {/* Abas */}
      <div className={styles.tabs}>
        <button 
          className={abaAtiva === 'dados' ? styles.active : ''} 
          onClick={() => setAbaAtiva('dados')}
        >
          <FiUser size={16} /> Dados
        </button>
        <button 
          className={abaAtiva === 'documentos' ? styles.active : ''} 
          onClick={() => setAbaAtiva('documentos')}
        >
          <FiFileText size={16} /> Documentos ({candidatura.documentos.length})
        </button>
        <button 
          className={abaAtiva === 'parecer-social' ? styles.active : ''} 
          onClick={() => setAbaAtiva('parecer-social')}
        >
          <FiCheck size={16} /> Parecer Social {temParecerSocial ? '✓' : ''}
        </button>
        <button 
          className={abaAtiva === 'parecer' ? styles.active : ''} 
          onClick={() => setAbaAtiva('parecer')}
        >
          <FiFileText size={16} /> Parecer Jurídico {temParecerJuridico ? '✓' : ''}
        </button>
      </div>

      {/* Conteúdo das Abas */}
      <div className={styles.content}>
        {/* Aba Dados */}
        {abaAtiva === 'dados' && (
          <div className={styles.dadosGrid}>
            <Card className={styles.dadosCard}>
              <h3><FiUser size={18} /> Informações Pessoais</h3>
              <div className={styles.dadosList}>
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
                  <p>{formatarData(candidatura.candidato.dataNascimento)}</p>
                </div>
              </div>
            </Card>

            <Card className={styles.dadosCard}>
              <h3><FiPhone size={18} /> Contato</h3>
              <div className={styles.dadosList}>
                <div className={styles.dadoItem}>
                  <label>Telefone</label>
                  <p>{candidatura.candidato.telefone || '-'}</p>
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
              <div className={styles.dadosList}>
                <div className={styles.dadoItem}>
                  <label>Logradouro</label>
                  <p>{candidatura.candidato.endereco}, {candidatura.candidato.numero}</p>
                </div>
                <div className={styles.dadoItem}>
                  <label>Bairro</label>
                  <p>{candidatura.candidato.bairro}</p>
                </div>
                <div className={styles.dadoItem}>
                  <label>Cidade/UF</label>
                  <p>{candidatura.candidato.cidade}/{candidatura.candidato.uf}</p>
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
                candidatura.documentos.map(doc => (
                  <div key={doc.id} className={styles.documentoItem}>
                    <FiFileText size={20} />
                    <div className={styles.docInfo}>
                      <span className={styles.docNome}>{doc.nome}</span>
                      <span className={styles.docTipo}>{doc.tipo}</span>
                    </div>
                    <Button variant="ghost" onClick={() => window.open(doc.url, '_blank')}>
                      <FiDownload size={16} />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* Aba Parecer Social */}
        {abaAtiva === 'parecer-social' && (
          <Card>
            {candidatura.parecerSocial ? (
              <div className={styles.parecerExistente}>
                <div className={styles.parecerMeta}>
                  <span>Emitido por: {candidatura.parecerSocial.assistenteSocial.nome}</span>
                  <span>Data: {formatarData(candidatura.parecerSocial.dataEmissao)}</span>
                </div>
                {candidatura.parecerSocial.recomendacao && (
                  <div className={styles.recomendacaoBadge}>
                    Recomendação: {candidatura.parecerSocial.recomendacao.replace('_', ' ')}
                  </div>
                )}
                <div className={styles.parecerTexto}>
                  {candidatura.parecerSocial.parecer}
                </div>
              </div>
            ) : (
              <div className={styles.semParecer}>
                <FiClock size={40} />
                <h3>Parecer Social Pendente</h3>
                <p>O parecer social ainda não foi emitido pelo Assistente Social.</p>
              </div>
            )}
          </Card>
        )}

        {/* Aba Parecer Jurídico */}
        {abaAtiva === 'parecer' && (
          <Card>
            {candidatura.parecerJuridico ? (
              <div className={styles.parecerExistente}>
                <div className={styles.parecerMeta}>
                  <span>Data: {formatarData(candidatura.parecerJuridico.dataEmissao)}</span>
                </div>
                <div className={styles.recomendacaoBadge}>
                  Decisão: {candidatura.parecerJuridico.recomendacao}
                </div>
                <div className={styles.parecerTexto}>
                  <h4>Parecer</h4>
                  {candidatura.parecerJuridico.parecer}
                </div>
                {candidatura.parecerJuridico.fundamentacao && (
                  <div className={styles.fundamentacaoTexto}>
                    <h4>Fundamentação Legal</h4>
                    {candidatura.parecerJuridico.fundamentacao}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.semParecer}>
                <FiFileText size={40} />
                <h3>Parecer Jurídico Pendente</h3>
                {temParecerSocial ? (
                  <>
                    <p>Você pode emitir o parecer jurídico para esta candidatura.</p>
                    <Button onClick={() => setModalParecerOpen(true)}>
                      <FiSend size={16} /> Emitir Parecer Jurídico
                    </Button>
                  </>
                ) : (
                  <p>Aguarde o parecer social ser emitido antes de emitir o parecer jurídico.</p>
                )}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Modal de Parecer Jurídico */}
      <Modal
        isOpen={modalParecerOpen}
        onClose={() => setModalParecerOpen(false)}
        title="Emitir Parecer Jurídico"
      >
        <div className={styles.parecerForm}>
          <div className={styles.formGroup}>
            <label>Parecer *</label>
            <textarea
              value={parecer}
              onChange={(e) => setParecer(e.target.value)}
              placeholder="Digite seu parecer jurídico sobre a candidatura..."
              rows={6}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Fundamentação Legal</label>
            <textarea
              value={fundamentacao}
              onChange={(e) => setFundamentacao(e.target.value)}
              placeholder="Cite as bases legais, artigos, leis que fundamentam sua decisão..."
              rows={4}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Decisão *</label>
            <select
              value={recomendacao}
              onChange={(e) => setRecomendacao(e.target.value)}
              className={styles.selectRecomendacao}
            >
              <option value="">Selecione uma decisão</option>
              <option value="DEFERIDO">Deferido - Candidatura aprovada</option>
              <option value="INDEFERIDO">Indeferido - Candidatura reprovada</option>
              <option value="DILIGENCIA">Em Diligência - Necessita mais informações</option>
            </select>
          </div>
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setModalParecerOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEmitirParecer}
              disabled={!parecer.trim() || !recomendacao || salvando}
            >
              {salvando ? 'Salvando...' : 'Emitir Parecer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
