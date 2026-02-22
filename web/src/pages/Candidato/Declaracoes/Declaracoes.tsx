import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import styles from './Declaracoes.module.scss'

// =============================================
// TIPOS
// =============================================

interface Candidato {
  id: string
  nome: string
  cpf: string
  rg?: string
  rgOrgao?: string
  rgEstado?: string
  nacionalidade?: string
  estadoCivil?: string
  profissao?: string
  cep?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  email?: string
  membrosFamilia: MembroFamilia[]
  veiculos: Veiculo[]
}

interface MembroFamilia {
  id: string
  nome: string
  parentesco: string
  cpf?: string
}

interface Veiculo {
  id: string
  modelo: string
  placa?: string
  ano?: string
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
// CONSTANTES
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

export function Declaracoes() {
  const [candidato, setCandidato] = useState<Candidato | null>(null)
  const [declaracoes, setDeclaracoes] = useState<Declaracao[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Form states por tipo (cada step tem seu state)
  const [formData, setFormData] = useState<Record<string, any>>({})

  // Carregar dados
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/declaracoes')
      setCandidato(res.data.candidato)
      const decls = res.data.declaracoes || []
      setDeclaracoes(decls)

      // Popular formData a partir das declarações existentes
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

      // Restaurar posição: ir para o primeiro step NÃO preenchido
      // (ou último step se todos já foram preenchidos)
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
      console.error('Erro ao carregar declarações:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Helpers
  const getForm = (tipo: string) => formData[tipo] || { resposta: null, dados: {}, confirmado: false }
  const setForm = (tipo: string, data: any) => {
    setFormData(prev => ({ ...prev, [tipo]: { ...getForm(tipo), ...data } }))
  }

  const salvarStep = async (tipo: string) => {
    const form = getForm(tipo)
    setSaving(true)
    setMsg('')
    try {
      const res = await api.put('/declaracoes', {
        tipo,
        resposta: form.resposta,
        dados: form.dados,
        confirmado: form.confirmado,
      })
      // Atualizar lista local de declarações preenchidas
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
    const fd = new FormData()
    fd.append('file', file)
    setSaving(true)
    try {
      const res = await api.post(`/declaracoes/upload/${tipo}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setForm(tipo, { arquivoUrl: res.data.arquivo.url, arquivoNome: res.data.arquivo.nome })
      setMsg('Arquivo enviado!')
      setTimeout(() => setMsg(''), 2000)
    } catch (e: any) {
      setMsg('Erro no upload: ' + (e.response?.data?.message || e.message))
    } finally {
      setSaving(false)
    }
  }

  const baixarPdf = async () => {
    try {
      setMsg('Gerando PDF...')
      const res = await api.get('/declaracoes/pdf', { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `declaracao_${candidato?.cpf?.replace(/\D/g, '') || 'cebas'}_${Date.now()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      setMsg('PDF baixado com sucesso!')
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setMsg('Erro ao gerar PDF')
    }
  }

  const enviarEmail = async () => {
    try {
      const res = await api.post('/declaracoes/email')
      setMsg(res.data?.message || '🚧 Funcionalidade em construção.')
      setTimeout(() => setMsg(''), 4000)
    } catch {
      setMsg('🚧 Envio por e-mail em construção.')
      setTimeout(() => setMsg(''), 4000)
    }
  }

  const goNext = async () => {
    await salvarStep(STEPS[currentStep])
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
  }
  const goPrev = () => { if (currentStep > 0) setCurrentStep(currentStep - 1) }

  // === RENDER ===
  if (loading) return <div className={styles.loading}>Carregando declarações...</div>
  if (!candidato) return <div className={styles.loading}>Complete primeiro o seu cadastro de candidato.</div>

  const tipo = STEPS[currentStep]
  const form = getForm(tipo)

  // Calcular quais steps já têm dados salvos
  const filledTypes = new Set(declaracoes.map(d => d.tipo))
  const filledCount = STEPS.filter(s => filledTypes.has(s)).length
  const isCurrentFilled = filledTypes.has(tipo)

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>DECLARAÇÕES PARA FINS DE PROCESSO SELETIVO CEBAS</h1>
        <h2>{STEP_LABELS[tipo]}</h2>
        <h3>{candidato.nome}</h3>
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
          <StepConfirmacaoDados candidato={candidato} form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'PENSAO_ALIMENTICIA' && (
          <StepPensaoAlimenticia candidato={candidato} form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'COMPROVANTE_ENDERECO' && (
          <StepSimNao pergunta="Você possui comprovante de endereço em seu nome?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'CARTEIRA_TRABALHO' && (
          <StepSimNao pergunta="Você possui Carteira de trabalho? (a partir de 16 anos)" form={form} setForm={(d: any) => setForm(tipo, d)} />
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
          <StepUniaoEstavel candidato={candidato} form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'ESTADO_CIVIL_SOLTEIRO' && (
          <StepSimNao pergunta="É solteiro e não mantém união estável?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'SEPARACAO_FATO' && (
          <StepSeparacaoFato candidato={candidato} form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'ISENTO_IR' && (
          <StepIsentoIR candidato={candidato} form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'AUSENCIA_RENDA' && (
          <StepSimNao pergunta="Você faz alguma atividade laboral?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'MEI' && (
          <StepMEI candidato={candidato} form={form} setForm={(d: any) => setForm(tipo, d)} onUpload={(file: File) => uploadArquivo(tipo, file)} />
        )}
        {tipo === 'TRABALHADOR_RURAL' && (
          <StepAtividade titulo="Você é trabalhador rural?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'AUTONOMO_INFORMAL' && (
          <StepAtividade titulo="Você desenvolve alguma atividade sem vínculo empregatício?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'EMPRESARIO' && (
          <StepAtividade titulo="Você é sócio de alguma empresa?" form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'EMPRESA_INATIVA' && (
          <StepEmpresaInativa candidato={candidato} form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'ALUGUEL' && (
          <StepAluguel candidato={candidato} form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'VEICULO' && (
          <StepVeiculo candidato={candidato} form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'CONTA_BANCARIA' && (
          <StepSimNao pergunta="Você possui conta corrente ou poupança?" form={form} setForm={(d: any) => setForm(tipo, d)} inverted />
        )}
        {tipo === 'LGPD' && (
          <StepLgpd form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'ALTERACAO_GRUPO' && (
          <StepAlteracaoGrupo form={form} setForm={(d: any) => setForm(tipo, d)} />
        )}
        {tipo === 'RESPONSABILIDADE' && (
          <StepResponsabilidade
            candidato={candidato}
            form={form}
            setForm={(d: any) => setForm(tipo, d)}
            onUpload={(file: File) => uploadArquivo(tipo, file)}
            onBaixarPdf={baixarPdf}
            onEnviarEmail={enviarEmail}
          />
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
        {currentStep < STEPS.length - 1 && (
          <button className={styles.btnNext} onClick={goNext}>→</button>
        )}
      </div>
    </div>
  )
}

// =============================================
// SUB-COMPONENTES DE STEP
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

// --- Step: Confirmação de Dados ---
function StepConfirmacaoDados({ candidato, form, setForm }: { candidato: Candidato; form: any; setForm: (d: any) => void }) {
  return (
    <div>
      <p className={styles.declaracaoTexto}>
        Eu, <b>{candidato.nome}</b>, portador(a) da cédula de identidade RG nº <b>{candidato.rg}</b>,
        órgão emissor <b>{candidato.rgOrgao}</b>, UF do órgão emissor <b>{candidato.rgEstado}</b>,
        inscrito(a) no CPF nº <b>{candidato.cpf}</b>, nacionalidade <b>{candidato.nacionalidade || 'Brasileira'}</b>,
        estado civil <b>{candidato.estadoCivil}</b>, profissão <b>{candidato.profissao}</b>,
        residente na Rua <b>{candidato.endereco}</b>, nº <b>{candidato.numero}</b>,
        complemento {candidato.complemento}, CEP: <b>{candidato.cep}</b>,
        bairro <b>{candidato.bairro}</b>, cidade <b>{candidato.cidade}</b>,
        estado <b>{candidato.uf}</b>, UF <b>{candidato.uf}</b>,
        e-mail: <b>{candidato.email}</b>,
        declaro para os devidos fins do processo seletivo realizado nos termos da Lei Complementar nº 187,
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
function StepSimNao({ pergunta, form, setForm, inverted }: { pergunta: string; form: any; setForm: (d: any) => void; inverted?: boolean }) {
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
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]) }} />
        {form.arquivoNome && <span className={styles.fileName}>📎 {form.arquivoNome}</span>}
        <small className={styles.hint}>*Tamanho máximo de 10Mb</small>
      </div>
    </div>
  )
}

// --- Step: CNIS ---
function StepCnis({ form, onUpload }: { form: any; onUpload: (f: File) => void }) {
  return (
    <div>
      <p>Não possui ainda o seu extrato de contribuição (CNIS)?</p>
      <div className={styles.center}>
        <a
          href="https://www.gov.br/pt-br/servicos/emitir-extrato-de-contribuicao-cnis"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.btnGerar}
        >
          Gerar Relatório
        </a>
      </div>
      <div className={styles.uploadArea}>
        <label>Anexar extrato de contribuição (CNIS)</label>
        <div className={styles.fileInput}>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]) }} />
        </div>
        {form.arquivoNome && <span className={styles.fileName}>📎 {form.arquivoNome}</span>}
        <small className={styles.hint}>*Tamanho máximo de 10Mb</small>
      </div>
    </div>
  )
}

// --- Step: Pensão Alimentícia ---
function StepPensaoAlimenticia({ candidato, form, setForm }: { candidato: Candidato; form: any; setForm: (d: any) => void }) {
  const dados = form.dados || {}
  const filhos = candidato.membrosFamilia.filter(m =>
    ['FILHO', 'FILHA', 'FILHO(A)', 'ENTEADO', 'ENTEADA'].includes((m.parentesco || '').toUpperCase())
  )

  // Sub-step: A, B, C, or confirmation
  const [subStep, setSubStep] = useState(0)

  const updDados = (d: any) => setForm({ dados: { ...dados, ...d } })

  return (
    <div>
      <h3 className={styles.subTitle}>RECEBIMENTO OU AUSÊNCIA DE RECEBIMENTO DE PENSÃO ALIMENTÍCIA</h3>

      {subStep === 0 && (
        <>
          <p className={styles.center}>A - Você recebe pensão alimentícia?</p>
          <RadioSimNao value={dados.recebePropia ?? null} onChange={v => updDados({ recebePropia: v })} />
          {dados.recebePropia === true && (
            <div className={styles.formGroup}>
              <div className={styles.field}><label>Nome do pagador</label><input value={dados.pagadorNome || ''} onChange={e => updDados({ pagadorNome: e.target.value })} /></div>
              <div className={styles.field}><label>CPF do pagador</label><input value={dados.pagadorCpf || ''} onChange={e => updDados({ pagadorCpf: e.target.value })} /></div>
              <div className={styles.field}><label>Valor da pensão</label><MoneyInput value={dados.valor || '0'} onChange={v => updDados({ valor: v })} /></div>
            </div>
          )}
          <div className={styles.subNav}>
            <button onClick={() => setSubStep(1)}>Próximo →</button>
          </div>
        </>
      )}

      {subStep === 1 && (
        <>
          <p className={styles.center}>B - Algum filho recebe pensão alimentícia?</p>
          <RadioSimNao value={dados.filhosRecebem ?? null} onChange={v => updDados({ filhosRecebem: v })} />
          {dados.filhosRecebem === true && (
            <div className={styles.formGroup}>
              <div className={styles.field}>
                <label>Selecione todos que recebem pensão</label>
                <select
                  multiple
                  value={dados.pensaoFilhos?.filhos || []}
                  onChange={e => {
                    const selected = Array.from(e.target.selectedOptions, o => o.value)
                    updDados({ pensaoFilhos: { ...(dados.pensaoFilhos || {}), filhos: selected } })
                  }}
                >
                  {filhos.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div className={styles.field}><label>Nome do pagador</label><input value={dados.pensaoFilhos?.pagadorNome || ''} onChange={e => updDados({ pensaoFilhos: { ...(dados.pensaoFilhos || {}), pagadorNome: e.target.value } })} /></div>
              <div className={styles.field}><label>CPF do pagador</label><input value={dados.pensaoFilhos?.pagadorCpf || ''} onChange={e => updDados({ pensaoFilhos: { ...(dados.pensaoFilhos || {}), pagadorCpf: e.target.value } })} /></div>
              <div className={styles.field}><label>Valor da pensão</label><MoneyInput value={dados.pensaoFilhos?.valor || '0'} onChange={v => updDados({ pensaoFilhos: { ...(dados.pensaoFilhos || {}), valor: v } })} /></div>
            </div>
          )}
          <div className={styles.subNav}>
            <button onClick={() => setSubStep(0)}>← Anterior</button>
            <button onClick={() => setSubStep(2)}>Próximo →</button>
          </div>
        </>
      )}

      {subStep === 2 && (
        <>
          <p className={styles.center}>C - Há filho(s) que recebe(m) pensão alimentícia de outro(s) pai(s) ou mãe(s)?</p>
          <RadioSimNao value={dados.outrosPaisRecebem ?? null} onChange={v => updDados({ outrosPaisRecebem: v })} />
          {dados.outrosPaisRecebem === true && (
            <PensoesOutros
              filhos={filhos}
              pensoes={dados.pensoesOutros || []}
              onChange={p => updDados({ pensoesOutros: p })}
            />
          )}
          <div className={styles.subNav}>
            <button onClick={() => setSubStep(1)}>← Anterior</button>
            <button onClick={() => setSubStep(3)}>Próximo →</button>
          </div>
        </>
      )}

      {subStep === 3 && (
        <>
          <div className={styles.declaracaoTexto}>
            {dados.recebePropia && (
              <p>A. Recebo pensão alimentícia(judicial) no valor total de <b>R$ {parseFloat(dados.valor || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b> de <b>{dados.pagadorNome}</b>, inscrito(a) no CPF nº {dados.pagadorCpf}.</p>
            )}
            {dados.filhosRecebem && dados.pensaoFilhos && (
              <p>B. Meu(s) filho(s) {(dados.pensaoFilhos.filhos || []).map((fid: string) => filhos.find(f => f.id === fid)?.nome).filter(Boolean).join(', ')} recebe(m) pensão alimentícia (judicial) no valor total de <b>R$ {parseFloat(dados.pensaoFilhos.valor || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b> de <b>{dados.pensaoFilhos.pagadorNome}</b>, inscrito(a) no CPF nº {dados.pensaoFilhos.pagadorCpf}.</p>
            )}
            {dados.outrosPaisRecebem && (dados.pensoesOutros || []).map((po: any, i: number) => (
              <p key={i}>C. Meu(s) filho(s) {(po.filhos || []).map((fid: string) => filhos.find(f => f.id === fid)?.nome).filter(Boolean).join(', ')} recebe(m) pensão alimentícia (judicial) no valor total de <b>R$ {parseFloat(po.valor || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b> de <b>{po.pagadorNome}</b>, inscrito(a) no CPF nº {po.pagadorCpf}.</p>
            ))}
          </div>
          <div className={styles.center}>
            <p>Confirma a declaração?</p>
            <RadioSimNao value={form.confirmado ?? null} onChange={v => setForm({ confirmado: v })} />
          </div>
          <div className={styles.subNav}>
            <button onClick={() => setSubStep(2)}>← Anterior</button>
          </div>
        </>
      )}
    </div>
  )
}

// Componente para múltiplas pensões (seção C)
function PensoesOutros({ filhos, pensoes, onChange }: { filhos: MembroFamilia[]; pensoes: any[]; onChange: (p: any[]) => void }) {
  const add = () => onChange([...pensoes, { filhos: [], pagadorNome: '', pagadorCpf: '', valor: '0' }])
  const remove = (i: number) => onChange(pensoes.filter((_, idx) => idx !== i))
  const upd = (i: number, d: any) => onChange(pensoes.map((p, idx) => idx === i ? { ...p, ...d } : p))

  return (
    <div>
      <div className={styles.row}>
        <div className={styles.field}><label>C - de quantos?</label><input type="number" min={1} value={pensoes.length} readOnly /></div>
        <button className={styles.btnAdd} onClick={add}>Adicionar</button>
      </div>
      {pensoes.map((p, i) => (
        <div key={i} className={styles.pensaoCard}>
          <div className={styles.cardHeader}>
            <span>Pensão {i + 1}</span>
            <button className={styles.btnRemove} onClick={() => remove(i)}>Remover</button>
          </div>
          <div className={styles.field}>
            <label>Selecione todos que recebem pensão</label>
            <select multiple value={p.filhos || []} onChange={e => {
              const sel = Array.from(e.target.selectedOptions, o => o.value)
              upd(i, { filhos: sel })
            }}>
              {filhos.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div className={styles.field}><label>Nome do pagador</label><input value={p.pagadorNome || ''} onChange={e => upd(i, { pagadorNome: e.target.value })} /></div>
          <div className={styles.field}><label>CPF do pagador</label><input value={p.pagadorCpf || ''} onChange={e => upd(i, { pagadorCpf: e.target.value })} /></div>
          <div className={styles.field}><label>Valor</label><MoneyInput value={p.valor || '0'} onChange={v => upd(i, { valor: v })} /></div>
        </div>
      ))}
    </div>
  )
}

// --- Step: União Estável ---
function StepUniaoEstavel({ candidato, form, setForm }: { candidato: Candidato; form: any; setForm: (d: any) => void }) {
  const dados = form.dados || {}
  const [showConfirm, setShowConfirm] = useState(false)
  const updDados = (d: any) => setForm({ dados: { ...dados, ...d } })

  return (
    <div>
      <p className={styles.center}>Convive em união estável com alguém?</p>
      <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      {form.resposta === true && !showConfirm && (
        <div className={styles.formGroup}>
          <div className={styles.field}><label>Nome do(a) parceiro(a)</label><input value={dados.parceiro || ''} onChange={e => updDados({ parceiro: e.target.value })} /></div>
          <div className={styles.field}><label>Data de início da união estável</label><input type="date" value={dados.dataInicio || ''} onChange={e => updDados({ dataInicio: e.target.value })} /></div>
          <div className={styles.field}><label>CPF</label><input value={dados.cpf || ''} onChange={e => updDados({ cpf: e.target.value })} /></div>
          <button className={styles.btnSave} onClick={() => setShowConfirm(true)}>Revisar declaração</button>
        </div>
      )}
      {form.resposta === true && showConfirm && (
        <div>
          <p className={styles.declaracaoTexto}>
            Convivo em União Estável com <b>{dados.parceiro}</b>, CPF <b>{dados.cpf}</b>,
            desde <b>{dados.dataInicio}</b> e que somos juridicamente capazes.
            Nossa União Estável possui natureza pública, contínua e duradoura com o objetivo de constituição de família,
            nos termos dos artigos 1723 e seguintes do Código Civil.
          </p>
          <div className={styles.center}>
            <p>Confirma a declaração?</p>
            <RadioSimNao value={form.confirmado ?? null} onChange={v => setForm({ confirmado: v })} />
          </div>
          <button className={styles.btnBack} onClick={() => setShowConfirm(false)}>← Editar</button>
        </div>
      )}
    </div>
  )
}

// --- Step: Separação de Fato ---
function StepSeparacaoFato({ candidato, form, setForm }: { candidato: Candidato; form: any; setForm: (d: any) => void }) {
  const dados = form.dados || {}
  const [showConfirm, setShowConfirm] = useState(false)
  const updDados = (d: any) => setForm({ dados: { ...dados, ...d } })

  return (
    <div>
      <p className={styles.center}>Você é separado de fato, porém ainda não formalizou ou encerramento por meio do divórcio?</p>
      <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      {form.resposta === true && !showConfirm && (
        <div className={styles.formGroup}>
          <div className={styles.field}><label>Nome da pessoa</label><input value={dados.nome || ''} onChange={e => updDados({ nome: e.target.value })} /></div>
          <div className={styles.field}><label>CPF da pessoa</label><input value={dados.cpf || ''} onChange={e => updDados({ cpf: e.target.value })} /></div>
          <div className={styles.field}><label>Data da separação</label><input type="date" value={dados.dataSeparacao || ''} onChange={e => updDados({ dataSeparacao: e.target.value })} /></div>
          <p>Sabe onde essa pessoa mora atualmente?</p>
          <RadioSimNao value={dados.sabeEndereco ?? null} onChange={v => updDados({ sabeEndereco: v })} />
          {dados.sabeEndereco === true && (
            <EnderecoForm value={dados.endereco || emptyEndereco()} onChange={e => updDados({ endereco: e })} />
          )}
          <button className={styles.btnSave} onClick={() => setShowConfirm(true)}>Revisar declaração</button>
        </div>
      )}
      {form.resposta === true && showConfirm && (
        <div>
          <p className={styles.declaracaoTexto}>
            Me separei de <b>{dados.nome}</b>, inscrito(a) no CPF nº <b>{dados.cpf}</b>,
            desde <b>{dados.dataSeparacao}</b>.
            {dados.sabeEndereco && dados.endereco && (
              <> Meu(minha) ex-companheiro(a) reside na <b>{dados.endereco.rua}</b>, nº <b>{dados.endereco.numero}</b>,
              complemento <b>{dados.endereco.complemento}</b>, CEP: <b>{dados.endereco.cep}</b>,
              bairro <b>{dados.endereco.bairro}</b>, cidade <b>{dados.endereco.cidade}</b>, UF <b>{dados.endereco.uf}</b>.</>
            )}
            {' '}Até o presente momento não formalizei o encerramento de nossa relação por meio de divórcio.
          </p>
          <div className={styles.center}>
            <p>Confirma a declaração?</p>
            <RadioSimNao value={form.confirmado ?? null} onChange={v => setForm({ confirmado: v })} />
          </div>
          <button className={styles.btnBack} onClick={() => setShowConfirm(false)}>← Editar</button>
        </div>
      )}
    </div>
  )
}

// --- Step: Isento IR ---
function StepIsentoIR({ candidato, form, setForm }: { candidato: Candidato; form: any; setForm: (d: any) => void }) {
  return (
    <div>
      <p className={styles.center}>Você é isento(a) de Imposto de Renda?</p>
      <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      {form.resposta === true && (
        <div>
          <p className={styles.declaracaoTexto}>
            Eu, <b>{candidato.nome}</b>, portador(a) da cédula de identidade RG n° <b>{candidato.rg}</b>,
            órgão emissor <b>{candidato.rgOrgao}</b>, UF do órgão emissor <b>{candidato.rgEstado}</b>,
            CPF n° <b>{candidato.cpf}</b>, nacionalidade <b>{candidato.nacionalidade || 'Brasileira'}</b>,
            estado civil <b>{candidato.estadoCivil}</b>, profissão <b>{candidato.profissao}</b>,
            residente na rua <b>{candidato.endereco}</b>, n° <b>{candidato.numero}</b>,
            complemento {candidato.complemento}, CEP: <b>{candidato.cep}</b>,
            bairro <b>{candidato.bairro}</b>, cidade <b>{candidato.cidade}</b>, UF <b>{candidato.uf}</b>,
            e-mail: <b>{candidato.email}</b>, DECLARO SER ISENTO(A) da apresentação da Declaração
            do Imposto de Renda Pessoa Física (DIRPF) no(s) exercício(s) <b>{new Date().getFullYear()}</b>.
            por não incorrer em nenhuma das hipóteses de obrigatoriedade estabelecidas pelas Instruções Normativas (IN)
            da Receita Federal do Brasil (RFB). Esta declaração está em conformidade com a IN RFB n° 1548/2015 e a Lei n° 7.115/83.
            Declaro ainda, sob as penas da lei, serem verdadeiras todas as informações acima prestadas.
          </p>
          <div className={styles.center}>
            <p>Confirma a declaração?</p>
            <RadioSimNao value={form.confirmado ?? null} onChange={v => setForm({ confirmado: v })} />
          </div>
        </div>
      )}
    </div>
  )
}

// --- Step: MEI ---
function StepMEI({ candidato, form, setForm, onUpload }: { candidato: Candidato; form: any; setForm: (d: any) => void; onUpload: (f: File) => void }) {
  const [showConfirm, setShowConfirm] = useState(false)
  return (
    <div>
      <p className={styles.center}>Você possui o cadastro de Microempreendedor Individual?</p>
      <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      {form.resposta === true && !showConfirm && (
        <div>
          <div className={styles.uploadArea}>
            <label>Anexar Declaração Anual do Simples Nacional para o(a) Microempreendedor(a) Individual (DAS-SIMEI)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]) }} />
            {form.arquivoNome && <span className={styles.fileName}>📎 {form.arquivoNome}</span>}
            <small className={styles.hint}>*Tamanho máximo de 10Mb</small>
          </div>
          <button className={styles.btnSave} onClick={() => setShowConfirm(true)}>Revisar declaração</button>
        </div>
      )}
      {form.resposta === true && showConfirm && (
        <div>
          <p className={styles.declaracaoTexto}>
            Eu, <b>{candidato.nome}</b>, portador(a) do CPF nº <b>{candidato.cpf}</b>, POSSUO o cadastro como
            Microempreendedor Individual e consta no meu cadastro, neste processo, a Declaração Anual do Simples Nacional
            para o(a) Microempreendedor(a) Individual (DAS-SIMEI). Esta declaração está em conformidade com a Lei n° 7.115/83.
            Declaro ainda, sob as penas da lei, serem verdadeiras todas as informações acima prestadas.
          </p>
          <div className={styles.center}>
            <p>Confirma a declaração?</p>
            <RadioSimNao value={form.confirmado ?? null} onChange={v => setForm({ confirmado: v })} />
          </div>
          <button className={styles.btnBack} onClick={() => setShowConfirm(false)}>← Editar</button>
        </div>
      )}
    </div>
  )
}

// --- Step: Atividade (Rural, Autônomo, Empresário) ---
function StepAtividade({ titulo, form, setForm }: { titulo: string; form: any; setForm: (d: any) => void }) {
  const dados = form.dados || {}
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div>
      <p className={styles.center}>{titulo}</p>
      <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      {form.resposta === true && !showConfirm && (
        <div className={styles.formGroup}>
          <div className={styles.field}>
            <label>Escreva a atividade que exerce</label>
            <textarea
              value={dados.atividade || ''}
              onChange={e => setForm({ dados: { ...dados, atividade: e.target.value } })}
              maxLength={255}
              rows={3}
            />
            <small>{(dados.atividade || '').length}/255</small>
          </div>
          <button className={styles.btnSave} onClick={() => setShowConfirm(true)}>Revisar declaração</button>
        </div>
      )}
      {form.resposta === true && showConfirm && (
        <div>
          <p className={styles.declaracaoTexto}>{dados.atividade}</p>
          <div className={styles.center}>
            <RadioSimNao value={form.confirmado ?? null} onChange={v => setForm({ confirmado: v })} />
          </div>
          <button className={styles.btnBack} onClick={() => setShowConfirm(false)}>← Editar</button>
        </div>
      )}
    </div>
  )
}

// --- Step: Empresa Inativa ---
function StepEmpresaInativa({ candidato, form, setForm }: { candidato: Candidato; form: any; setForm: (d: any) => void }) {
  const dados = form.dados || {}
  const [showConfirm, setShowConfirm] = useState(false)
  const updDados = (d: any) => setForm({ dados: { ...dados, ...d } })

  return (
    <div>
      <p className={styles.center}>Você possui alguma empresa inativa?</p>
      <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      {form.resposta === true && !showConfirm && (
        <div className={styles.formGroup}>
          <div className={styles.row}>
            <div className={styles.field}><label>Razão social</label><input value={dados.razaoSocial || ''} onChange={e => updDados({ razaoSocial: e.target.value })} /></div>
            <div className={styles.field}><label>CNPJ</label><input value={dados.cnpj || ''} onChange={e => updDados({ cnpj: e.target.value })} /></div>
          </div>
          <EnderecoForm value={dados.endereco || emptyEndereco()} onChange={e => updDados({ endereco: e })} />
          <button className={styles.btnSave} onClick={() => setShowConfirm(true)}>Revisar declaração</button>
        </div>
      )}
      {form.resposta === true && showConfirm && (
        <div>
          <p className={styles.declaracaoTexto}>
            Eu, <b>{candidato.nome}</b>, portador(a) do CPF nº <b>{candidato.cpf}</b>,
            possuo uma empresa inativa cuja razão social é <b>{dados.razaoSocial}</b>,
            inscrita sob o CNPJ <b>{dados.cnpj}</b>, localizada no endereço
            <b> {dados.endereco?.rua}</b>, nº <b>{dados.endereco?.numero}</b>,
            complemento <b>{dados.endereco?.complemento}</b>,
            bairro <b>{dados.endereco?.bairro}</b>, cidade <b>{dados.endereco?.cidade}</b>,
            UF <b>{dados.endereco?.uf}</b>, CEP <b>{dados.endereco?.cep}</b>.
          </p>
          <div className={styles.center}>
            <p>Confirma a declaração?</p>
            <RadioSimNao value={form.confirmado ?? null} onChange={v => setForm({ confirmado: v })} />
          </div>
          <button className={styles.btnBack} onClick={() => setShowConfirm(false)}>← Editar</button>
        </div>
      )}
    </div>
  )
}

// --- Step: Aluguel ---
function StepAluguel({ candidato, form, setForm }: { candidato: Candidato; form: any; setForm: (d: any) => void }) {
  const dados = form.dados || {}
  const [showConfirm, setShowConfirm] = useState(false)
  const updDados = (d: any) => setForm({ dados: { ...dados, ...d } })

  return (
    <div>
      <p className={styles.center}>Você recebe rendimento de imóvel alugado?</p>
      <RadioSimNao value={form.resposta} onChange={v => setForm({ resposta: v })} />
      {form.resposta === true && !showConfirm && (
        <div className={styles.formGroup}>
          <p>Preencha os dados do endereço do imóvel que você recebe aluguel:</p>
          <EnderecoForm value={dados.endereco || emptyEndereco()} onChange={e => updDados({ endereco: e })} />
          <div className={styles.field}><label>Nome do locatário</label><input value={dados.locatarioNome || ''} onChange={e => updDados({ locatarioNome: e.target.value })} /></div>
          <div className={styles.field}><label>CPF do locatário</label><input value={dados.locatarioCpf || ''} onChange={e => updDados({ locatarioCpf: e.target.value })} /></div>
          <div className={styles.field}><label>Valor</label><MoneyInput value={dados.valor || '0'} onChange={v => updDados({ valor: v })} /></div>
          <button className={styles.btnSave} onClick={() => setShowConfirm(true)}>Revisar declaração</button>
        </div>
      )}
      {form.resposta === true && showConfirm && (
        <div>
          <p className={styles.declaracaoTexto}>
            Recebo aluguel do imóvel situado no Endereço <b>{dados.endereco?.rua}</b>,
            nº <b>{dados.endereco?.numero}</b>, complemento {dados.endereco?.complemento},
            CEP: <b>{dados.endereco?.cep}</b>, bairro <b>{dados.endereco?.bairro}</b>,
            cidade <b>{dados.endereco?.cidade}</b>, Estado <b>{dados.endereco?.uf}</b>,
            no valor mensal de <b>R$ {parseFloat(dados.valor || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>,
            pago por <b>{dados.locatarioNome}</b>, inscrito(a) no CPF nº <b>{dados.locatarioCpf}</b> (locatário(a)).
          </p>
          <div className={styles.center}>
            <p>Confirma a declaração?</p>
            <RadioSimNao value={form.confirmado ?? null} onChange={v => setForm({ confirmado: v })} />
          </div>
          <button className={styles.btnBack} onClick={() => setShowConfirm(false)}>← Editar</button>
        </div>
      )}
    </div>
  )
}

// --- Step: Veículo ---
function StepVeiculo({ candidato, form, setForm }: { candidato: Candidato; form: any; setForm: (d: any) => void }) {
  const veiculos = candidato.veiculos || []
  return (
    <div>
      {veiculos.length > 0 ? (
        <>
          <p>Declaro que eu ou alguém do meu grupo familiar possui o(s) veículo(s) abaixo:</p>
          {veiculos.map((v, i) => (
            <p key={v.id}><b>{i + 1}. {v.modelo}</b> {v.placa ? `(${v.placa})` : ''} {v.ano ? `- ${v.ano}` : ''}</p>
          ))}
        </>
      ) : (
        <p>Não há veículos registrados no cadastro.</p>
      )}
      <div className={styles.center}>
        <p>Confirma a declaração?</p>
        <RadioSimNao value={form.confirmado ?? null} onChange={v => setForm({ confirmado: v })} />
      </div>
    </div>
  )
}

// --- Step: LGPD ---
function StepLgpd({ form, setForm }: { form: any; setForm: (d: any) => void }) {
  return (
    <div>
      <p className={styles.declaracaoTexto}>
        Declaro estar ciente de que o tratamento de meus dados pessoais é condição essencial para a participação no
        processo seletivo de concessão e/ou renovação de Bolsa de Estudo e por este termo declaro estar ciente e dou o
        meu consentimento para a realização do tratamento para as finalidades informadas no Edital, na forma da Lei nº
        13.709, DE 14 DE AGOSTO DE 2018.
      </p>
      <p className={styles.declaracaoTexto}>
        <i>"Art. 1o Esta Lei dispõe sobre o tratamento de dados pessoais, inclusive nos meios digitais, por pessoa natural
        ou por pessoa jurídica de direito público ou privado, com o objetivo de proteger os direitos fundamentais de liberdade
        e de privacidade e o livre desenvolvimento da personalidade da pessoa natural".</i>
      </p>
      <p className={styles.declaracaoTexto}>
        O processo seletivo realizado por meio da plataforma Cadastraqui se baseia na confiabilidade, sigilo e arquivamento
        do documento e na instituição de ensino, do mesmo modo nos termos de seu edital.
      </p>
      <p className={styles.declaracaoTexto}>
        Estou ciente e assumo, inteira responsabilidade pelas informações contidas neste instrumento e em relação as
        informações prestadas no decorrer do preenchimento deste formulário eletrônico e documentos anexados, estando
        consciente que a apresentação de documento falso e/ou a falsidade nas informações implicará nas penalidades cabíveis,
        previstas nos artigos 298 e 299 do Código Penal Brasileiro, bem como sobre a condição prevista no caput e § 2º do art. 26
        da Lei Complementar nº 187, de 16 de dezembro de 2021.
      </p>
      <div className={styles.center}>
        <p>Confirma a declaração?</p>
        <RadioSimNao value={form.confirmado ?? null} onChange={v => setForm({ confirmado: v })} />
      </div>
    </div>
  )
}

// --- Step: Alteração Grupo ---
function StepAlteracaoGrupo({ form, setForm }: { form: any; setForm: (d: any) => void }) {
  return (
    <div>
      <p className={styles.declaracaoTexto}>
        Tenho ciência de que devo comunicar o(a) assistente social da entidade beneficente sobre nascimento ou falecimento de
        membro do meu grupo familiar, desde que morem na mesma residência, bem como sobre eventual rescisão de contrato
        de trabalho, encerramento de atividade que gere renda ou sobre início em novo emprego ou atividade que gere renda
        para um dos membros, pois altera a aferição realizada e o benefício em decorrência da nova renda familiar bruta mensal
        pode ser ampliado, reduzido ou mesmo cancelado, após análise por profissional de serviço social.
      </p>
      <div className={styles.center}>
        <p>Confirma a declaração?</p>
        <RadioSimNao value={form.confirmado ?? null} onChange={v => setForm({ confirmado: v })} />
      </div>
    </div>
  )
}

// --- Step: Responsabilidade (final) ---
function StepResponsabilidade({ candidato, form, setForm, onUpload, onBaixarPdf, onEnviarEmail }: {
  candidato: Candidato; form: any; setForm: (d: any) => void
  onUpload: (f: File) => void; onBaixarPdf: () => void; onEnviarEmail: () => void
}) {
  return (
    <div>
      <p className={styles.declaracaoTexto}>
        Estou ciente e assumo, inteira responsabilidade pelas informações contidas neste instrumento e em relação as
        informações prestadas no decorrer do preenchimento deste formulário eletrônico e documentos anexados, estando
        consciente que a apresentação de documento falso e/ou a falsidade nas informações implicará nas penalidades cabíveis,
        previstas nos artigos 298 e 299 do Código Penal Brasileiro, bem como sobre a condição prevista no caput e § 2º do art. 26
        da Lei Complementar nº 187, de 16 de dezembro de 2021.
      </p>
      <p className={styles.declaracaoTexto}>
        Art. 26. Os alunos beneficiários das bolsas de estudo de que trata esta Lei Complementar, ou seus pais ou responsáveis,
        quando for o caso, respondem legalmente pela veracidade e pela autenticidade das informações por eles prestadas,
        e as informações prestadas pelas instituições de ensino superior (IES) acerca dos beneficiários em qualquer âmbito
        devem respeitar os limites estabelecidos pela Lei nº 13.709, de 14 de agosto de 2018.
      </p>
      <p className={styles.declaracaoTexto}>
        § 2º As bolsas de estudo poderão ser canceladas a qualquer tempo em caso de constatação de falsidade da informação
        prestada pelo bolsista ou por seus pais ou seu responsável, ou de inidoneidade de documento apresentado, sem prejuízo
        das demais sanções cíveis e penais cabíveis, sem que o ato do cancelamento resulte em prejuízo à entidade beneficente
        concedente, inclusive na apuração das proporções exigidas nesta Seção, salvo se comprovada negligência ou má-fé da
        entidade beneficente.
      </p>

      <div className={styles.center}>
        <p>Confirma a declaração?</p>
        <RadioSimNao value={form.confirmado ?? null} onChange={v => setForm({ confirmado: v })} />
      </div>

      <div className={styles.uploadArea}>
        <label>Anexar declaração assinada</label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]) }} />
        {form.arquivoNome && <span className={styles.fileName}>📎 {form.arquivoNome}</span>}
        <small className={styles.hint}>*Tamanho máximo de 10Mb</small>
      </div>

      <div className={styles.finalButtons}>
        <button className={styles.btnPdf} onClick={onBaixarPdf}>Baixar PDF</button>
        <button className={styles.btnEmail} onClick={onEnviarEmail}>Enviar por email</button>
      </div>
    </div>
  )
}
