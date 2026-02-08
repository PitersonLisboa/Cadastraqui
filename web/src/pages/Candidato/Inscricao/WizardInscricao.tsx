import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiCheck, FiAlertCircle, FiUser, FiUsers, FiFileText, FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { api } from '@/services/api'
import styles from './WizardInscricao.module.scss'

const STEPS = ['Dados Pessoais', 'Composição Familiar', 'Documentos', 'Confirmação']

const DOCS_INFO: Record<string, string> = {
  RG: 'Documento de identidade',
  CPF: 'CPF do candidato',
  COMPROVANTE_RESIDENCIA: 'Conta de água, luz ou telefone',
  COMPROVANTE_RENDA: 'Holerite ou declaração',
  HISTORICO_ESCOLAR: 'Histórico escolar atualizado',
}

export function WizardInscricao() {
  const { editalId } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [edital, setEdital] = useState<any>(null)
  const [candidato, setCandidato] = useState<any>(null)
  const [membros, setMembros] = useState<any[]>([])
  const [documentos, setDocumentos] = useState<any[]>([])
  const [concordo, setConcordo] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [editalId])

  async function carregarDados() {
    try {
      const [editalRes, candidatoRes, membrosRes, docsRes] = await Promise.all([
        api.get(`/editais/${editalId}`),
        api.get('/candidatos/me'),
        api.get('/familia/membros'),
        api.get('/documentos'),
      ])
      setEdital(editalRes.data.edital)
      setCandidato(candidatoRes.data)
      setMembros(membrosRes.data.membros || [])
      setDocumentos(docsRes.data.documentos || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  async function finalizarInscricao() {
    if (!concordo) return alert('Você precisa concordar com os termos')
    setSubmitting(true)
    try {
      await api.post('/candidaturas/inscrever', { editalId })
      navigate('/candidato/candidaturas')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao realizar inscrição')
    } finally {
      setSubmitting(false)
    }
  }

  const docsObrigatorios = edital?.documentosObrigatorios || []
  const docsFaltando = docsObrigatorios.filter((tipo: string) => 
    !documentos.some(d => d.tipo === tipo)
  )

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /><p>Carregando...</p></div>

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" onClick={() => navigate(-1)}><FiArrowLeft /> Voltar</Button>
        <div>
          <h1>Inscrição: {edital?.titulo}</h1>
          <p>{edital?.instituicao?.nomeFantasia || edital?.instituicao?.razaoSocial}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className={styles.stepper}>
        {STEPS.map((label, i) => (
          <div key={i} className={`${styles.step} ${i === step ? styles.active : ''} ${i < step ? styles.completed : ''}`}>
            <div className={styles.stepCircle}>{i < step ? <FiCheck /> : i + 1}</div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Step 0: Dados Pessoais */}
      {step === 0 && (
        <Card className={styles.stepContent}>
          <h2><FiUser /> Seus Dados Pessoais</h2>
          {!candidato?.nome ? (
            <div className={styles.alert}>
              <FiAlertCircle /> Complete seu cadastro antes de se inscrever.
              <Button onClick={() => navigate('/candidato/cadastro')}>Completar Cadastro</Button>
            </div>
          ) : (
            <div className={styles.dadosGrid}>
              <div><label>Nome</label><p>{candidato.nome}</p></div>
              <div><label>CPF</label><p>{candidato.cpf}</p></div>
              <div><label>Data Nascimento</label><p>{new Date(candidato.dataNascimento).toLocaleDateString('pt-BR')}</p></div>
              <div><label>Telefone</label><p>{candidato.telefone || '-'}</p></div>
              <div><label>Email</label><p>{candidato.usuario?.email}</p></div>
              <div><label>Endereço</label><p>{candidato.endereco || '-'}</p></div>
            </div>
          )}
        </Card>
      )}

      {/* Step 1: Família */}
      {step === 1 && (
        <Card className={styles.stepContent}>
          <h2><FiUsers /> Composição Familiar</h2>
          {membros.length === 0 ? (
            <div className={styles.alert}>
              <FiAlertCircle /> Cadastre os membros da sua família.
              <Button onClick={() => navigate('/candidato/familia')}>Cadastrar Família</Button>
            </div>
          ) : (
            <>
              <p className={styles.info}>{membros.length} membro(s) cadastrado(s)</p>
              <div className={styles.membrosLista}>
                {membros.map((m: any) => (
                  <div key={m.id} className={styles.membroItem}>
                    <span className={styles.membroNome}>{m.nome}</span>
                    <span className={styles.membroParentesco}>{m.parentesco}</span>
                    <span className={styles.membroRenda}>R$ {m.renda?.toFixed(2) || '0,00'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Step 2: Documentos */}
      {step === 2 && (
        <Card className={styles.stepContent}>
          <h2><FiFileText /> Documentos Obrigatórios</h2>
          {docsObrigatorios.length === 0 ? (
            <p className={styles.info}>Nenhum documento obrigatório para este edital.</p>
          ) : (
            <div className={styles.docsLista}>
              {docsObrigatorios.map((tipo: string) => {
                const enviado = documentos.find(d => d.tipo === tipo)
                return (
                  <div key={tipo} className={`${styles.docItem} ${enviado ? styles.enviado : styles.pendente}`}>
                    <div>
                      <strong>{DOCS_INFO[tipo] || tipo}</strong>
                      <span>{enviado ? 'Enviado' : 'Pendente'}</span>
                    </div>
                    {enviado ? <FiCheck color="#22c55e" /> : <FiAlertCircle color="#f59e0b" />}
                  </div>
                )
              })}
            </div>
          )}
          {docsFaltando.length > 0 && (
            <div className={styles.alert}>
              <FiAlertCircle /> Você precisa enviar {docsFaltando.length} documento(s).
              <Button onClick={() => navigate('/candidato/documentos')}>Enviar Documentos</Button>
            </div>
          )}
        </Card>
      )}

      {/* Step 3: Confirmação */}
      {step === 3 && (
        <Card className={styles.stepContent}>
          <h2><FiCheck /> Confirmação da Inscrição</h2>
          <div className={styles.resumo}>
            <div className={styles.resumoItem}>
              <label>Edital</label>
              <p>{edital?.titulo}</p>
            </div>
            <div className={styles.resumoItem}>
              <label>Candidato</label>
              <p>{candidato?.nome}</p>
            </div>
            <div className={styles.resumoItem}>
              <label>Membros da Família</label>
              <p>{membros.length}</p>
            </div>
            <div className={styles.resumoItem}>
              <label>Documentos</label>
              <p>{documentos.length} enviados</p>
            </div>
          </div>
          <label className={styles.termos}>
            <input type="checkbox" checked={concordo} onChange={(e) => setConcordo(e.target.checked)} />
            <span>Declaro que todas as informações prestadas são verdadeiras e estou ciente de que a falsidade pode acarretar a eliminação do processo seletivo.</span>
          </label>
        </Card>
      )}

      {/* Navegação */}
      <div className={styles.navigation}>
        {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}><FiArrowLeft /> Anterior</Button>}
        <div style={{ flex: 1 }} />
        {step < 3 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !candidato?.nome}>
            Próximo <FiArrowRight />
          </Button>
        ) : (
          <Button onClick={finalizarInscricao} disabled={!concordo || submitting}>
            {submitting ? 'Enviando...' : 'Confirmar Inscrição'}
          </Button>
        )}
      </div>
    </div>
  )
}
