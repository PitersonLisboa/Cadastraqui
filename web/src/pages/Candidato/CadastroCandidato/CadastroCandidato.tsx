import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { FiArrowRight, FiTrash2, FiEye, FiPlus } from 'react-icons/fi'
import { SectionSidebar, SectionItem } from '@/components/common/SectionSidebar/SectionSidebar'
import { StepperBar } from '@/components/common/StepperBar/StepperBar'
import { api } from '@/services/api'
import { maskCPF, maskPhone, unmaskValue } from '@/utils/masks'
import styles from './CadastroCandidato.module.scss'

// ===========================================
// SEÇÕES DO FORMULÁRIO (fiéis ao 1.x)
// ===========================================

const SECTIONS: SectionItem[] = [
  { id: 'candidato', label: 'Candidato', icon: '/icons/user.svg' },
  { id: 'grupo-familiar', label: 'Grupo Familiar', icon: '/icons/family.svg' },
  { id: 'moradia', label: 'Moradia', icon: '/icons/house.svg' },
  { id: 'veiculo', label: 'Veículo', icon: '/icons/car.svg' },
  { id: 'renda', label: 'Renda', icon: '/icons/currency.svg' },
  { id: 'gastos', label: 'Gastos', icon: '/icons/money.svg' },
  { id: 'saude', label: 'Saúde', icon: '/icons/doctor.svg' },
  { id: 'declaracoes', label: 'Declarações', icon: '/icons/document.svg' },
]

const ESTADOS_EMISSOR = [
  { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' }, { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' }, { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' }, { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' }, { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' }, { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' }, { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' }, { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' }, { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' }, { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' }, { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' }, { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
]

const STATUS_MORADIA = [
  { value: 'PROPRIA_QUITADA', label: 'Própria e quitada' },
  { value: 'PROPRIA_FINANCIADA', label: 'Própria financiada' },
  { value: 'ALUGADA', label: 'Alugada' },
  { value: 'CEDIDA', label: 'Cedida' },
  { value: 'OUTROS', label: 'Outros' },
]

const MESES_LABEL: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
}

// ===========================================
// TIPOS
// ===========================================

interface DadosCandidato {
  nome: string; cpf: string; dataNascimento: string; telefone: string
  email: string; rg: string; rgEstado: string; rgOrgao: string
}

interface Membro { id?: string; nome: string; cpf: string; parentesco: string; renda?: number }
interface Veiculo { id?: string; modelo: string; placa: string; ano: string }

// ===========================================
// COMPONENTE PRINCIPAL
// ===========================================

export function CadastroCandidato() {
  const [activeSection, setActiveSection] = useState('candidato')
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ===== SEÇÃO: Candidato =====
  const [dados, setDados] = useState<DadosCandidato>({
    nome: '', cpf: '', dataNascimento: '', telefone: '',
    email: '', rg: '', rgEstado: '', rgOrgao: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ===== SEÇÃO: Grupo Familiar =====
  const [membros, setMembros] = useState<Membro[]>([])
  const [showAddMembro, setShowAddMembro] = useState(false)
  const [novoMembro, setNovoMembro] = useState<Membro>({ nome: '', cpf: '', parentesco: '' })

  // ===== SEÇÃO: Moradia =====
  const [subStepMoradia, setSubStepMoradia] = useState(0)
  const [statusMoradia, setStatusMoradia] = useState('')

  // ===== SEÇÃO: Veículo =====
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [showAddVeiculo, setShowAddVeiculo] = useState(false)
  const [novoVeiculo, setNovoVeiculo] = useState<Veiculo>({ modelo: '', placa: '', ano: '' })

  // ===== SEÇÃO: Renda =====
  const [rendaMedia, setRendaMedia] = useState('0,00')

  // ===== SEÇÃO: Gastos =====
  const [gastoUltimoMes] = useState('0,00')
  const [gastoMediaTrimestre] = useState('0,00')

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      const res = await api.get('/candidatos/me')
      const c = res.data
      if (c) {
        setDados({
          nome: c.nome || '',
          cpf: c.cpf ? maskCPF(c.cpf) : '',
          dataNascimento: c.dataNascimento ? c.dataNascimento.split('T')[0] : '',
          telefone: c.telefone ? maskPhone(c.telefone) : '',
          email: c.usuario?.email || '',
          rg: c.rg || '',
          rgEstado: c.rgEstado || '',
          rgOrgao: c.rgOrgao || '',
        })
        setRendaMedia(c.rendaFamiliar ? Number(c.rendaFamiliar).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00')
      }

      try {
        const memRes = await api.get('/familia/membros')
        setMembros(memRes.data.membros || [])
      } catch { /* sem membros */ }
    } catch { /* candidato não cadastrado */ }
    finally { setLoading(false) }
  }

  const handleSaveDados = async () => {
    setSaving(true)
    try {
      await api.put('/candidatos/me', {
        nome: dados.nome,
        cpf: unmaskValue(dados.cpf),
        dataNascimento: dados.dataNascimento,
        telefone: unmaskValue(dados.telefone),
        rg: dados.rg,
        rgEstado: dados.rgEstado,
        rgOrgao: dados.rgOrgao,
      })
      toast.success('Dados salvos!')
      setEditMode(false)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const handleAddMembro = async () => {
    if (!novoMembro.nome || !novoMembro.parentesco) return toast.error('Preencha nome e parentesco')
    try {
      await api.post('/familia/membros', {
        nome: novoMembro.nome,
        cpf: unmaskValue(novoMembro.cpf),
        parentesco: novoMembro.parentesco,
      })
      toast.success('Membro adicionado!')
      setNovoMembro({ nome: '', cpf: '', parentesco: '' })
      setShowAddMembro(false)
      carregarDados()
    } catch (error: any) { toast.error(error.response?.data?.message || 'Erro') }
  }

  const handleRemoveMembro = async (id: string) => {
    if (!confirm('Excluir este membro?')) return
    try {
      await api.delete(`/familia/membros/${id}`)
      toast.success('Membro removido')
      carregarDados()
    } catch { toast.error('Erro ao remover') }
  }

  const goToNextSection = () => {
    const idx = SECTIONS.findIndex((s) => s.id === activeSection)
    if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id)
  }

  const sectionIndex = SECTIONS.findIndex((s) => s.id === activeSection)

  const getUltimosMeses = () => {
    const now = new Date()
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      return { month: d.getMonth() + 1, year: d.getFullYear() }
    })
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Carregando dados...</p>
      </div>
    )
  }

  // ===========================================
  // RENDER
  // ===========================================

  const renderSection = () => {
    switch (activeSection) {

      // ───────────── 1. CANDIDATO ─────────────
      case 'candidato':
        return (
          <>
            <StepperBar totalSteps={8} currentStep={sectionIndex} onStepClick={(i) => setActiveSection(SECTIONS[i].id)} />
            <h2 className={styles.sectionTitle}>Dados Pessoais</h2>
            {dados.nome && <p className={styles.sectionName}>{dados.nome}</p>}

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Nome completo</label>
                <input value={dados.nome} disabled={!editMode} onChange={(e) => setDados({ ...dados, nome: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>CPF</label>
                <input value={dados.cpf} disabled={!editMode} onChange={(e) => setDados({ ...dados, cpf: maskCPF(e.target.value) })} />
              </div>
              <div className={styles.field}>
                <label>Data de nascimento</label>
                <input type="date" value={dados.dataNascimento} disabled={!editMode} onChange={(e) => setDados({ ...dados, dataNascimento: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>Telefone</label>
                <input value={dados.telefone} disabled={!editMode} onChange={(e) => setDados({ ...dados, telefone: maskPhone(e.target.value) })} />
              </div>
              <div className={styles.field}>
                <label>Email</label>
                <input value={dados.email} disabled />
              </div>
              <div className={styles.field}>
                <label>RG/RNE</label>
                <input value={dados.rg} disabled={!editMode} onChange={(e) => setDados({ ...dados, rg: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>Estado emissor do RG/RNE</label>
                <select value={dados.rgEstado} disabled={!editMode} onChange={(e) => setDados({ ...dados, rgEstado: e.target.value })}>
                  <option value="">Selecione...</option>
                  {ESTADOS_EMISSOR.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Órgão emissor do RG/RNE</label>
                <input value={dados.rgOrgao} disabled={!editMode} placeholder="SSP" onChange={(e) => setDados({ ...dados, rgOrgao: e.target.value })} />
              </div>
            </div>

            <div className={styles.fieldWide}>
              <label>Documento de identificação</label>
              <div className={styles.fileUpload} onClick={() => editMode && fileInputRef.current?.click()}>
                <span>Anexar arquivo</span>
                <FiPlus size={16} />
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} />
              <small className={styles.fileHint}>*Tamanho máximo de 10Mb</small>
              <button type="button" className={styles.linkBtn}>VISUALIZAR DOCUMENTO</button>
            </div>

            <div className={styles.footerSplit}>
              <button className={styles.btnOutline} onClick={() => editMode ? handleSaveDados() : setEditMode(true)} disabled={saving}>
                {editMode ? (saving ? 'Salvando...' : 'Salvar') : 'Editar'}
              </button>
              <button className={styles.btnArrow} onClick={goToNextSection}><FiArrowRight size={20} /></button>
            </div>
          </>
        )

      // ───────────── 2. GRUPO FAMILIAR ─────────────
      case 'grupo-familiar':
        return (
          <>
            <h2 className={styles.sectionTitle}>Integrantes do Grupo Familiar</h2>
            <p className={styles.sectionSub}>Selecione um parente ou cadastre um novo</p>

            <div className={styles.centeredActions}>
              <button className={styles.btnOutline} onClick={() => setShowAddMembro(true)}>Adicionar</button>
            </div>

            {showAddMembro && (
              <div className={styles.inlineForm}>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Nome</label>
                    <input value={novoMembro.nome} onChange={(e) => setNovoMembro({ ...novoMembro, nome: e.target.value })} />
                  </div>
                  <div className={styles.field}>
                    <label>CPF</label>
                    <input value={novoMembro.cpf} onChange={(e) => setNovoMembro({ ...novoMembro, cpf: maskCPF(e.target.value) })} />
                  </div>
                  <div className={styles.field}>
                    <label>Parentesco</label>
                    <input value={novoMembro.parentesco} onChange={(e) => setNovoMembro({ ...novoMembro, parentesco: e.target.value })} placeholder="Cônjuge, Filho(a)..." />
                  </div>
                </div>
                <div className={styles.inlineActions}>
                  <button className={styles.btnPrimary} onClick={handleAddMembro}>Salvar</button>
                  <button className={styles.btnGhost} onClick={() => setShowAddMembro(false)}>Cancelar</button>
                </div>
              </div>
            )}

            <div className={styles.listItems}>
              {membros.map((m) => (
                <div key={m.id} className={styles.listRow}>
                  <span className={styles.listName}>{m.nome}</span>
                  <button className={styles.btnSmallOutline}><FiEye size={14} /> Visualizar</button>
                  <button className={styles.btnSmallDanger} onClick={() => handleRemoveMembro(m.id!)}><FiTrash2 size={14} /> Excluir</button>
                </div>
              ))}
              {membros.length === 0 && <p className={styles.emptyMsg}>Nenhum membro cadastrado ainda.</p>}
            </div>

            <div className={styles.footerCenter}>
              <button className={styles.btnOutlineArrow} onClick={goToNextSection}>Próxima Etapa <FiArrowRight size={16} /></button>
            </div>
          </>
        )

      // ───────────── 3. MORADIA ─────────────
      case 'moradia':
        return (
          <>
            <StepperBar totalSteps={2} currentStep={subStepMoradia} onStepClick={setSubStepMoradia} />
            <h2 className={styles.sectionTitle}>Status da Propriedade</h2>
            <div className={styles.formGridSingle}>
              <div className={styles.field}>
                <label>Status</label>
                <select value={statusMoradia} onChange={(e) => setStatusMoradia(e.target.value)}>
                  <option value="">Selecione...</option>
                  {STATUS_MORADIA.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.footerSplit}>
              <button className={styles.btnOutline}>Editar</button>
              <button className={styles.btnArrow} onClick={goToNextSection}><FiArrowRight size={20} /></button>
            </div>
          </>
        )

      // ───────────── 4. VEÍCULO ─────────────
      case 'veiculo':
        return (
          <>
            <h2 className={styles.sectionTitle}>Veículos</h2>
            <div className={styles.listItems}>
              {veiculos.map((v, i) => (
                <div key={i} className={styles.listRow}>
                  <span className={styles.listName}>{v.modelo}</span>
                  <button className={styles.btnSmallOutline}><FiEye size={14} /> Visualizar</button>
                  <button className={styles.btnSmallDanger} onClick={() => { setVeiculos(veiculos.filter((_, j) => j !== i)); toast.success('Removido') }}><FiTrash2 size={14} /> Excluir</button>
                </div>
              ))}
            </div>
            <div className={styles.centeredActions}>
              <button className={styles.btnOutline} onClick={() => setShowAddVeiculo(!showAddVeiculo)}>Novo veículo</button>
            </div>
            {showAddVeiculo && (
              <div className={styles.inlineForm}>
                <div className={styles.formGrid}>
                  <div className={styles.field}><label>Modelo</label><input value={novoVeiculo.modelo} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, modelo: e.target.value })} placeholder="Fiat Palio" /></div>
                  <div className={styles.field}><label>Placa</label><input value={novoVeiculo.placa} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, placa: e.target.value })} /></div>
                  <div className={styles.field}><label>Ano</label><input value={novoVeiculo.ano} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, ano: e.target.value })} /></div>
                </div>
                <div className={styles.inlineActions}>
                  <button className={styles.btnPrimary} onClick={() => { setVeiculos([...veiculos, novoVeiculo]); setNovoVeiculo({ modelo: '', placa: '', ano: '' }); setShowAddVeiculo(false); toast.success('Veículo adicionado') }}>Salvar</button>
                  <button className={styles.btnGhost} onClick={() => setShowAddVeiculo(false)}>Cancelar</button>
                </div>
              </div>
            )}
            <div className={styles.footerCenter}>
              <button className={styles.btnOutlineArrow} onClick={goToNextSection}>Próxima Etapa <FiArrowRight size={16} /></button>
            </div>
          </>
        )

      // ───────────── 5. RENDA ─────────────
      case 'renda':
        return (
          <>
            <h2 className={styles.sectionTitle}>Renda Familiar</h2>
            <div className={styles.rendaBadge}>
              <span>Renda média familiar cadastrada</span>
              <div className={styles.rendaValue}>R$ {rendaMedia}</div>
            </div>
            <div className={styles.listItems}>
              {membros.map((m) => (
                <div key={m.id} className={styles.listRow}>
                  <span className={styles.listName}>{m.nome}</span>
                  <div className={styles.indicators}>
                    <span className={styles.indicatorGreen} />
                    <span className={m.renda ? styles.indicatorGreen : styles.indicatorYellow} />
                  </div>
                  <button className={styles.btnSmallOutline}><FiEye size={14} /> Visualizar</button>
                </div>
              ))}
              {membros.length === 0 && <p className={styles.emptyMsg}>Cadastre membros na seção Grupo Familiar.</p>}
            </div>
            <div className={styles.footerCenter}>
              <button className={styles.btnOutlineArrow} onClick={goToNextSection}>Próxima Etapa <FiArrowRight size={16} /></button>
            </div>
          </>
        )

      // ───────────── 6. GASTOS ─────────────
      case 'gastos':
        return (
          <>
            <h2 className={styles.sectionTitle}>Despesas Mensais</h2>
            <div className={styles.gastosCards}>
              <div className={styles.gastoCard}>
                <span className={styles.gastoLabel}>Último mês</span>
                <span className={styles.gastoValor}>R$ {gastoUltimoMes}</span>
              </div>
              <div className={styles.gastoCard}>
                <span className={styles.gastoLabel}>Média do trimestre</span>
                <span className={styles.gastoValor}>R$ {gastoMediaTrimestre}</span>
              </div>
            </div>
            <p className={styles.sectionSub}>Agora realize o cadastro para cada um dos meses abaixo, inserindo as informações correspondentes.</p>
            <div className={styles.mesesList}>
              {getUltimosMeses().map(({ month, year }) => (
                <button key={`${month}-${year}`} className={styles.btnMes}>{MESES_LABEL[month]} de {year}</button>
              ))}
            </div>
            <div className={styles.footerSplit}>
              <button className={styles.btnOutline}>Salvar</button>
              <button className={styles.btnOutlineArrow} onClick={goToNextSection}>Próxima Etapa <FiArrowRight size={16} /></button>
            </div>
          </>
        )

      // ───────────── 7. SAÚDE ─────────────
      case 'saude':
        return (
          <>
            <h2 className={styles.sectionTitle}>Saúde</h2>
            <p className={styles.sectionSub}>Cadastre dados sobre a saúde de seu grupo familiar</p>
            <div className={styles.listItems}>
              {membros.map((m) => (
                <div key={m.id} className={styles.listRow}>
                  <span className={styles.listName}>{m.nome}</span>
                  <button className={styles.btnSmallOutline}><FiEye size={14} /> Visualizar</button>
                </div>
              ))}
              {membros.length === 0 && <p className={styles.emptyMsg}>Cadastre membros na seção Grupo Familiar.</p>}
            </div>
            <div className={styles.footerCenter}>
              <button className={styles.btnOutlineArrow} onClick={goToNextSection}>Próxima Etapa <FiArrowRight size={16} /></button>
            </div>
          </>
        )

      // ───────────── 8. DECLARAÇÕES ─────────────
      case 'declaracoes':
        return (
          <>
            <h2 className={styles.sectionTitle}>Declarações para fins de processo seletivo CEBAS</h2>
            <div className={styles.listItems}>
              {dados.nome && (
                <div className={styles.listRow}>
                  <span className={styles.listName}>{dados.nome}</span>
                  <button type="button" className={styles.linkBtn}>VER DECLARAÇÃO</button>
                  <button className={styles.btnSmallOutline}>Cadastrar</button>
                </div>
              )}
              {membros.map((m) => (
                <div key={m.id} className={styles.listRow}>
                  <span className={styles.listName}>{m.nome}</span>
                  <button type="button" className={styles.linkBtn}>VER DECLARAÇÃO</button>
                  <button className={styles.btnSmallOutline}>Cadastrar</button>
                </div>
              ))}
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className={styles.pageLayout}>
      <SectionSidebar sections={SECTIONS} activeSection={activeSection} onSectionClick={setActiveSection} />
      <div className={styles.mainArea}>
        <div className={styles.sectionContent}>
          {renderSection()}
        </div>
      </div>
    </div>
  )
}
