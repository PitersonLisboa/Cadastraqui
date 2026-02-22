import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../../services/api'
import styles from './Declaracoes.module.scss'

// =============================================
// TIPOS
// =============================================

interface MembroFamilia {
  id: string
  nome: string
  parentesco: string
  cpf?: string
  rg?: string
  rgOrgao?: string
  rgEstado?: string
  nacionalidade?: string
  estadoCivil?: string
  profissao?: string
  dataNascimento?: string
}

interface Declaracao {
  id: string
  tipo: string
  resposta: boolean | null
  dados: any
  confirmado: boolean
  arquivoUrl?: string
  arquivoNome?: string
}

type Endereco = {
  cep: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  complemento: string
  uf: string
}

// =============================================
// CONSTANTES — mesmos 22 steps do candidato
// =============================================

const STEPS = [
  'CONFIRMACAO_DADOS',
  'PENSAO_ALIMENTICIA',
  'COMPROVANTE_ENDERECO',
  'CARTEIRA_TRABALHO',
  'CTPS_DIGITAL',
  'CNIS',
  'UNIAO_ESTAVEL',
  'ESTADO_CIVIL_SOLTEIRO',
  'SEPARACAO_FATO',
  'ISENTO_IR',
  'AUSENCIA_RENDA',
  'MEI',
  'TRABALHADOR_RURAL',
  'AUTONOMO_INFORMAL',
  'EMPRESARIO',
  'EMPRESA_INATIVA',
  'ALUGUEL',
  'VEICULO',
  'CONTA_BANCARIA',
  'LGPD',
  'ALTERACAO_GRUPO',
  'RESPONSABILIDADE',
]

const STEP_LABELS: Record<string, string> = {
  CONFIRMACAO_DADOS: 'Confirmação de Dados',
  PENSAO_ALIMENTICIA: 'Pensão Alimentícia',
  COMPROVANTE_ENDERECO: 'Comprovante de Endereço',
  CARTEIRA_TRABALHO: 'Carteira de Trabalho',
  CTPS_DIGITAL: 'CTPS Digital',
  CNIS: 'Extrato CNIS',
  UNIAO_ESTAVEL: 'União Estável',
  ESTADO_CIVIL_SOLTEIRO: 'Estado Civil Solteiro(a)',
  SEPARACAO_FATO: 'Separação de Fato',
  ISENTO_IR: 'Isento de Imposto de Renda',
  AUSENCIA_RENDA: 'Ausência de Renda',
  MEI: 'Rendimentos MEI',
  TRABALHADOR_RURAL: 'Trabalhador(a) Rural',
  AUTONOMO_INFORMAL: 'Autônomo(a)/Renda Informal',
  EMPRESARIO: 'Renda de Empresário',
  EMPRESA_INATIVA: 'Empresa Inativa',
  ALUGUEL: 'Recebimento de Aluguel',
  VEICULO: 'Veículo Automotor',
  CONTA_BANCARIA: 'Conta Corrente/Poupança',
  LGPD: 'Consentimento LGPD',
  ALTERACAO_GRUPO: 'Alteração Grupo Familiar/Renda',
  RESPONSABILIDADE: 'Responsabilidade',
}

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
const UF_LABELS: Record<string, string> = {
  AC:'Acre',AL:'Alagoas',AM:'Amazonas',AP:'Amapá',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',
  ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MG:'Minas Gerais',MS:'Mato Grosso do Sul',
  MT:'Mato Grosso',PA:'Pará',PB:'Paraíba',PE:'Pernambuco',PI:'Piauí',PR:'Paraná',
  RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RO:'Rondônia',RR:'Roraima',
  RS:'Rio Grande do Sul',SC:'Santa Catarina',SE:'Sergipe',SP:'São Paulo',TO:'Tocantins',
}

const emptyEndereco = (): Endereco => ({ cep: '', rua: '', numero: '', bairro: '', cidade: '', complemento: '', uf: '' })

// =============================================
// COMPONENTE PRINCIPAL
// =============================================

export function DeclaracoesMembro() {
  const { membroId, slug } = useParams<{ membroId: string; slug: string }>()
  const navigate = useNavigate()
  const [membro, setMembro] = useState<MembroFamilia | null>(null)
  const [declaracoes, setDeclaracoes] = useState<Declaracao[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [formData, setFormData] = useState<Record<string, any>>({})

  const loadData = useCallback(async () => {
    if (!membroId) return
    try {
      setLoading(true)
      const res = await api.get(`/declaracoes/membro/${membroId}`)
      setMembro(res.data.membro)
      const decls = res.data.declaracoes || []
      setDeclaracoes(decls)

      const fd: Record<string, any> = {}
      for (const d of decls) {
        fd[d.tipo] = {
          resposta: d.resposta,
          dados: d.dados || {},
          confirmado: d.confirmado,
          arquivoUrl: d.arquivoUrl,
          arquivoNome: d.arquivoNome,
        }
      }
      setFormData(fd)

      // Restaurar posição: ir para o primeiro step não preenchido
      if (decls.length > 0) {
        const filledTypes = new Set(decls.map((d: any) => d.tipo))
        let resumeStep = STEPS.length - 1
        for (let i = 0; i < STEPS.length; i++) {
          if (!filledTypes.has(STEPS[i])) {
            resumeStep = i
            break
          }
        }
        setCurrentStep(resumeStep)
      }
    } catch (e) {
      console.error('Erro ao carregar declarações do membro:', e)
    } finally {
      setLoading(false)
    }
  }, [membroId])

  useEffect(() => { loadData() }, [loadData])

  // Helpers
  const getForm = (tipo: string) => formData[tipo] || { resposta: null, dados: {}, confirmado: false }
  const setForm = (tipo: string, data: any) => {
    setFormData(prev => ({ ...prev, [tipo]: { ...getForm(tipo), ...data } }))
  }

  const salvarStep = async (tipo: string) => {
    if (!membroId) return
    const form = getForm(tipo)
    setSaving(true)
    setMsg('')
    try {
      const res = await api.put('/declaracoes/membro', {
        tipo,
        membroId,
        resposta: form.resposta,
        dados: form.dados,
        confirmado: form.confirmado,
      })
      setDeclaracoes(prev => {
        const exists = prev.find(d => d.tipo === tipo)
        if (exists) {
          return prev.map(d => d.tipo === tipo ? { ...d, ...form, id: d.id } : d)
        }
        return [...prev, { id: res.data.declaracao?.id || tipo, tipo, ...form }]
      })
      setMsg('Salvo com sucesso!')
      setTimeout(() => setMsg(''), 2000)
    } catch (e: any) {
      setMsg('Erro ao salvar: ' + (e.response?.data?.message || e.message))
    } finally {
      setSaving(false)
    }
  }

  const uploadArquivo = async (tipo: string, file: File) => {
    if (!membroId) return
    const fd = new FormData()
    fd.append('file', file)
    setSaving(true)
    try {
      const res = await api.post(`/declaracoes/membro/${membroId}/upload/${tipo}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setForm(tipo, { arquivoUrl: res.data.arquivo.url, arquivoNome: res.data.arquivo.nome })
      setMsg('Arquivo enviado!')
      setTimeout(() => setMsg(''), 2000)
    } catch (e: any) {
      setMsg('Erro: ' + (e.response?.data?.message || e.message))
    } finally {
      setSaving(false)
    }
  }

  const goNext = async () => {
    await salvarStep(STEPS[currentStep])
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
  }
  const goPrev = () => { if (currentStep > 0) setCurrentStep(currentStep - 1) }

  // Voltar para declarações do candidato
  const voltarCandidato = () => {
    navigate(`/${slug}/candidato/declaracoes`)
  }

  // === RENDER ===
  if (loading) return <div className={styles.loading}>Carregando declarações...</div>
  if (!membro) return <div className={styles.loading}>Membro familiar não encontrado.</div>

  const tipo = STEPS[currentStep]
  const form = getForm(tipo)
  const filledTypes = new Set(declaracoes.map(d => d.tipo))
  const filledCount = STEPS.filter(s => filledTypes.has(s)).length
  const isCurrentFilled = filledTypes.has(tipo)

  return (
    <div className={styles.container}>
      {/* Botão voltar */}
      <button className={styles.btnBack} onClick={voltarCandidato} style={{ marginBottom: 10 }}>
        ← Voltar para Declarações do Candidato
      </button>

      {/* Header */}
      <div className={styles.header}>
        <h1>DECLARAÇÕES — MEMBRO FAMILIAR</h1>
        <h2>{STEP_LABELS[tipo]}</h2>
        <h3>{membro.nome} ({membro.parentesco})</h3>
      </div>

      {/* Progress */}
      <div className={styles.progress}>
        <span>Etapa {currentStep + 1} de {STEPS.length} — {filledCount} preenchida{filledCount !== 1 ? 's' : ''}{isCurrentFilled ? ' (esta etapa já foi salva)' : ''}</span>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {/* Step Content */}
      <div className={styles.stepContent}>
        {tipo === 'CONFIRMACAO_DADOS' && (
          <StepConfirmacaoDadosMembro membro={membro} form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'PENSAO_ALIMENTICIA' && (
          <StepPensaoMembro form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'COMPROVANTE_ENDERECO' && (
          <StepSimNao pergunta="Possui comprovante de endereço em seu nome?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'CARTEIRA_TRABALHO' && (
          <StepSimNao pergunta="Possui Carteira de trabalho? (a partir de 16 anos)" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'CTPS_DIGITAL' && (
          <StepUpload
            titulo="Relatório digital da Carteira de Trabalho e Previdência Social contendo todos os dados pessoais e todos os contratos de trabalho."
            form={form}
            onUpload={(file: File) => uploadArquivo(tipo, file)}
          />
        )}
        {tipo === 'CNIS' && (
          <StepCnis form={form} onUpload={(file: File) => uploadArquivo(tipo, file)} />
        )}
        {tipo === 'UNIAO_ESTAVEL' && (
          <StepUniaoEstavel form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'ESTADO_CIVIL_SOLTEIRO' && (
          <StepSimNao pergunta="É solteiro e não mantém união estável?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'SEPARACAO_FATO' && (
          <StepSeparacaoFato form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'ISENTO_IR' && (
          <StepSimNao pergunta="É isento(a) da Declaração do Imposto de Renda?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'AUSENCIA_RENDA' && (
          <StepSimNao pergunta="Exerce alguma atividade laboral?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'MEI' && (
          <StepSimNaoUpload pergunta="Possui cadastro como Microempreendedor Individual (MEI)?" form={form} setForm={(d: any) => setForm(tipo, d)} onUpload={(file: File) => uploadArquivo(tipo, file)} />
        )}
        {tipo === 'TRABALHADOR_RURAL' && (
          <StepAtividade titulo="É trabalhador rural?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'AUTONOMO_INFORMAL' && (
          <StepAtividade titulo="Desenvolve alguma atividade sem vínculo empregatício?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'EMPRESARIO' && (
          <StepAtividade titulo="É sócio de alguma empresa?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'EMPRESA_INATIVA' && (
          <StepEmpresaInativa form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'ALUGUEL' && (
          <StepAluguel form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'VEICULO' && (
          <StepSimNao pergunta="Possui veículo automotor?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'CONTA_BANCARIA' && (
          <StepSimNao pergunta="Possui conta corrente ou poupança?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'LGPD' && (
          <StepLgpd form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'ALTERACAO_GRUPO' && (
          <StepAlteracaoGrupo form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'RESPONSABILIDADE' && (
          <StepResponsabilidadeMembro membro={membro} form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
      </div>

      {/* Mensagem */}
      {msg && <div className={styles.message}>{msg}</div>}

      {/* Navegação */}
      <div className={styles.navigation}>
        <button className={styles.btnBack} onClick={goPrev} disabled={currentStep === 0}>
          ←
        </button>
        <button className={styles.btnSave} onClick={() => salvarStep(tipo)} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        {currentStep < STEPS.length - 1 ? (
          <button className={styles.btnNext} onClick={goNext}>→</button>
        ) : (
          <button className={styles.btnNext} onClick={voltarCandidato}>
            ✓ Concluir
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================
// SUB-COMPONENTES
// =============================================

function RadioSimNao({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className={styles.radioGroup}>
      <label><input type="radio" checked={value === true} onChange={() => onChange(true)} /> Sim</label>
      <label><input type="radio" checked={value === false} onChange={() => onChange(false)} /> Não</label>
    </div>
  )
}

function EnderecoForm({ value, onChange }: { value: Endereco; onChange: (e: Endereco) => void }) {
  const upd = (field: string, val: string) => onChange({ ...value, [field]: val })
  return (
    <div className={styles.enderecoGrid}>
      <h3>Endereço</h3>
      <div className={styles.row}>
        <div className={styles.field}><label>CEP</label><input value={value.cep} onChange={e => upd('cep', e.target.value)} /></div>
        <div className={styles.field}><label>Rua</label><input value={value.rua} onChange={e => upd('rua', e.target.value)} /></div>
      </div>
      <div className={styles.row}>
        <div className={styles.field}><label>Número</label><input value={value.numero} onChange={e => upd('numero', e.target.value)} /></div>
        <div className={styles.field}><label>Bairro</label><input value={value.bairro} onChange={e => upd('bairro', e.target.value)} /></div>
      </div>
      <div className={styles.row}>
        <div className={styles.field}><label>Cidade</label><input value={value.cidade} onChange={e => upd('cidade', e.target.value)} /></div>
        <div className={styles.field}><label>Complemento</label><input value={value.complemento} onChange={e => upd('complemento', e.target.value)} /></div>
      </div>
      <div className={styles.field}>
        <label>Unidade federativa</label>
        <select value={value.uf} onChange={e => upd('uf', e.target.value)}>
          <option value="">Selecione o estado</option>
          {UFS.map(u => <option key={u} value={u}>{UF_LABELS[u] || u}</option>)}
        </select>
      </div>
    </div>
  )
}

function MoneyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '')
    if (!raw) { onChange('0'); return }
    const num = parseInt(raw, 10) / 100
    onChange(num.toFixed(2))
  }
  const display = `R$ ${parseFloat(value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  return <input value={display} onChange={handleChange} />
}

// --- Step: Confirmação de Dados do Membro ---
function StepConfirmacaoDadosMembro({ membro, form, setForm }: { membro: MembroFamilia; form: any; setForm: (d: any) => void }) {
  return (
    <div>
      <p className={styles.declaracaoTexto}>
        Eu, <b>{membro.nome}</b>,
        {membro.rg && <> portador(a) da cédula de identidade RG nº <b>{membro.rg}</b>,
        órgão emissor <b>{membro.rgOrgao}</b>, UF <b>{membro.rgEstado}</b>,</>}
        {membro.cpf && <> inscrito(a) no CPF nº <b>{membro.cpf}</b>,</>}
        {' '}nacionalidade <b>{membro.nacionalidade || 'Brasileira'}</b>,
        {' '}estado civil <b>{membro.estadoCivil || '-'}</b>,
        {' '}profissão <b>{membro.profissao || '-'}</b>,
        {' '}declaro para os devidos fins do processo seletivo realizado nos termos da Lei Complementar nº 187,
        de 16 de dezembro de 2021 que:
      </p>
      <div className={styles.center}>
        <p>Todas as informações estão corretas?</p>
        <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      </div>
    </div>
  )
}

// --- Step: Sim/Não simples ---
function StepSimNao({ pergunta, form, setForm }: { pergunta: string; form: any; setForm: (d: any) => void }) {
  return (
    <div className={styles.center}>
      <p>{pergunta}</p>
      <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
    </div>
  )
}

// --- Step: Upload ---
function StepUpload({ titulo, form, onUpload }: { titulo: string; form: any; onUpload: (f: File) => void }) {
  return (
    <div>
      <p>{titulo}</p>
      <div className={styles.uploadArea}>
        <label>Anexar arquivo</label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
        {form.arquivoNome && <p className={styles.fileOk}>Arquivo: {form.arquivoNome}</p>}
      </div>
    </div>
  )
}

// --- Step: Sim/Não com Upload ---
function StepSimNaoUpload({ pergunta, form, setForm, onUpload }: { pergunta: string; form: any; setForm: (d: any) => void; onUpload: (f: File) => void }) {
  return (
    <div>
      <div className={styles.center}>
        <p>{pergunta}</p>
        <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      </div>
      {form.resposta === true && (
        <div className={styles.uploadArea}>
          <label>Anexar documento comprobatório (DAS-SIMEI)</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
          {form.arquivoNome && <p className={styles.fileOk}>Arquivo: {form.arquivoNome}</p>}
        </div>
      )}
    </div>
  )
}

// --- Step: CNIS ---
function StepCnis({ form, onUpload }: { form: any; onUpload: (f: File) => void }) {
  return (
    <div>
      <p>Extrato CNIS (Cadastro Nacional de Informações Sociais)</p>
      <p className={styles.small}>
        Acesse pelo site <a href="https://meu.inss.gov.br" target="_blank" rel="noreferrer">meu.inss.gov.br</a> ou
        pelo aplicativo Gov.br para obter o extrato.
      </p>
      <div className={styles.uploadArea}>
        <label>Anexar extrato CNIS</label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
        {form.arquivoNome && <p className={styles.fileOk}>Arquivo: {form.arquivoNome}</p>}
      </div>
    </div>
  )
}

// --- Step: União Estável ---
function StepUniaoEstavel({ form, setForm }: { form: any; setForm: (d: any) => void }) {
  const dados = form.dados || {}
  const upd = (field: string, val: any) => setForm({ dados: { ...dados, [field]: val } })
  return (
    <div>
      <div className={styles.center}>
        <p>Convive em união estável?</p>
        <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      </div>
      {form.resposta === true && (
        <div className={styles.formGroup}>
          <div className={styles.field}><label>Nome do(a) parceiro(a)</label><input value={dados.parceiro || ''} onChange={e => upd('parceiro', e.target.value)} /></div>
          <div className={styles.field}><label>CPF do(a) parceiro(a)</label><input value={dados.cpf || ''} onChange={e => upd('cpf', e.target.value)} /></div>
          <div className={styles.field}><label>Data de início</label><input type="date" value={dados.dataInicio || ''} onChange={e => upd('dataInicio', e.target.value)} /></div>
        </div>
      )}
    </div>
  )
}

// --- Step: Separação de Fato ---
function StepSeparacaoFato({ form, setForm }: { form: any; setForm: (d: any) => void }) {
  const dados = form.dados || {}
  const upd = (field: string, val: any) => setForm({ dados: { ...dados, [field]: val } })
  const endereco = dados.endereco || emptyEndereco()
  return (
    <div>
      <div className={styles.center}>
        <p>É separado(a) de fato (não judicial)?</p>
        <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      </div>
      {form.resposta === true && (
        <div className={styles.formGroup}>
          <div className={styles.field}><label>Nome do(a) ex-companheiro(a)</label><input value={dados.nome || ''} onChange={e => upd('nome', e.target.value)} /></div>
          <div className={styles.field}><label>CPF</label><input value={dados.cpf || ''} onChange={e => upd('cpf', e.target.value)} /></div>
          <div className={styles.field}><label>Data da separação</label><input type="date" value={dados.dataSeparacao || ''} onChange={e => upd('dataSeparacao', e.target.value)} /></div>
          <EnderecoForm value={endereco} onChange={e => upd('endereco', e)} />
        </div>
      )}
    </div>
  )
}

// --- Step: Pensão Alimentícia (simplificado para membro) ---
function StepPensaoMembro({ form, setForm }: { form: any; setForm: (d: any) => void }) {
  const dados = form.dados || {}
  const upd = (field: string, val: any) => setForm({ dados: { ...dados, [field]: val } })
  return (
    <div>
      <div className={styles.center}>
        <p>Recebe pensão alimentícia?</p>
        <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      </div>
      {form.resposta === true && (
        <div className={styles.formGroup}>
          <div className={styles.field}><label>Valor mensal (R$)</label><MoneyInput value={dados.valor || '0'} onChange={v => upd('valor', v)} /></div>
          <div className={styles.field}><label>Nome do pagador</label><input value={dados.pagadorNome || ''} onChange={e => upd('pagadorNome', e.target.value)} /></div>
          <div className={styles.field}><label>CPF do pagador</label><input value={dados.pagadorCpf || ''} onChange={e => upd('pagadorCpf', e.target.value)} /></div>
        </div>
      )}
    </div>
  )
}

// --- Step: Atividade (trabalhador rural, autônomo, empresário) ---
function StepAtividade({ titulo, form, setForm }: { titulo: string; form: any; setForm: (d: any) => void }) {
  const dados = form.dados || {}
  return (
    <div>
      <div className={styles.center}>
        <p>{titulo}</p>
        <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      </div>
      {form.resposta === true && (
        <div className={styles.formGroup}>
          <div className={styles.field}>
            <label>Qual atividade?</label>
            <input value={dados.atividade || ''} onChange={e => setForm({ dados: { ...dados, atividade: e.target.value } })} />
          </div>
        </div>
      )}
    </div>
  )
}

// --- Step: Empresa Inativa ---
function StepEmpresaInativa({ form, setForm }: { form: any; setForm: (d: any) => void }) {
  const dados = form.dados || {}
  const upd = (field: string, val: any) => setForm({ dados: { ...dados, [field]: val } })
  const endereco = dados.endereco || emptyEndereco()
  return (
    <div>
      <div className={styles.center}>
        <p>Possui empresa inativa?</p>
        <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      </div>
      {form.resposta === true && (
        <div className={styles.formGroup}>
          <div className={styles.field}><label>Razão Social</label><input value={dados.razaoSocial || ''} onChange={e => upd('razaoSocial', e.target.value)} /></div>
          <div className={styles.field}><label>CNPJ</label><input value={dados.cnpj || ''} onChange={e => upd('cnpj', e.target.value)} /></div>
          <EnderecoForm value={endereco} onChange={e => upd('endereco', e)} />
        </div>
      )}
    </div>
  )
}

// --- Step: Aluguel ---
function StepAluguel({ form, setForm }: { form: any; setForm: (d: any) => void }) {
  const dados = form.dados || {}
  const upd = (field: string, val: any) => setForm({ dados: { ...dados, [field]: val } })
  const endereco = dados.endereco || emptyEndereco()
  return (
    <div>
      <div className={styles.center}>
        <p>Recebe rendimento de aluguel?</p>
        <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      </div>
      {form.resposta === true && (
        <div className={styles.formGroup}>
          <EnderecoForm value={endereco} onChange={e => upd('endereco', e)} />
          <div className={styles.field}><label>Valor mensal (R$)</label><MoneyInput value={dados.valor || '0'} onChange={v => upd('valor', v)} /></div>
          <div className={styles.field}><label>Nome do locatário</label><input value={dados.locatarioNome || ''} onChange={e => upd('locatarioNome', e.target.value)} /></div>
          <div className={styles.field}><label>CPF do locatário</label><input value={dados.locatarioCpf || ''} onChange={e => upd('locatarioCpf', e.target.value)} /></div>
        </div>
      )}
    </div>
  )
}

// --- Step: LGPD ---
function StepLgpd({ form, setForm }: { form: any; setForm: (d: any) => void }) {
  return (
    <div>
      <p className={styles.declaracaoTexto}>
        Declaro estar ciente de que o tratamento de meus dados pessoais é condição essencial para a participação
        no processo seletivo de concessão e/ou renovação de Bolsa de Estudo e por este termo declaro estar ciente
        e dou o meu consentimento para a realização do tratamento para as finalidades informadas no Edital,
        na forma da Lei nº 13.709, DE 14 DE AGOSTO DE 2018.
      </p>
      <div className={styles.center}>
        <p>Concordo com o tratamento de dados pessoais.</p>
        <RadioSimNao value={form.confirmado} onChange={v => setForm({ confirmado: v, resposta: v })} />
      </div>
    </div>
  )
}

// --- Step: Alteração Grupo ---
function StepAlteracaoGrupo({ form, setForm }: { form: any; setForm: (d: any) => void }) {
  return (
    <div>
      <p className={styles.declaracaoTexto}>
        Tenho ciência de que devo comunicar o(a) assistente social da entidade beneficente sobre nascimento ou
        falecimento de membro do meu grupo familiar, bem como sobre eventual rescisão de contrato de trabalho,
        encerramento de atividade que gere renda ou sobre início em novo emprego ou atividade que gere renda.
      </p>
      <div className={styles.center}>
        <p>Estou ciente.</p>
        <RadioSimNao value={form.confirmado} onChange={v => setForm({ confirmado: v, resposta: v })} />
      </div>
    </div>
  )
}

// --- Step: Responsabilidade (membro — sem PDF/email) ---
function StepResponsabilidadeMembro({ membro, form, setForm }: { membro: MembroFamilia; form: any; setForm: (d: any) => void }) {
  return (
    <div>
      <p className={styles.declaracaoTexto}>
        Eu, <b>{membro.nome}</b>, estou ciente e assumo inteira responsabilidade pelas informações contidas neste
        instrumento, estando consciente que a apresentação de documento falso e/ou a falsidade nas informações
        implicará nas penalidades cabíveis, previstas nos artigos 298 e 299 do Código Penal Brasileiro.
      </p>
      <div className={styles.center}>
        <p>Concordo e assumo a responsabilidade.</p>
        <RadioSimNao value={form.confirmado} onChange={v => setForm({ confirmado: v, resposta: v })} />
      </div>
    </div>
  )
}
