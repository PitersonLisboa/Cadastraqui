import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { FiX, FiEdit2, FiSave, FiUser, FiDollarSign, FiHeart } from 'react-icons/fi'
import { api } from '@/services/api'
import { maskCPF, maskPhone, unmaskValue } from '@/utils/masks'
import styles from './MembroDetalhe.module.scss'

// ===========================================
// CONSTANTES
// ===========================================

const PARENTESCO_OPTIONS = [
  { value: 'CONJUGE', label: 'Cônjuge' },
  { value: 'COMPANHEIRO', label: 'Companheiro(a)' },
  { value: 'PAI', label: 'Pai' },
  { value: 'MAE', label: 'Mãe' },
  { value: 'FILHO', label: 'Filho(a)' },
  { value: 'IRMAO', label: 'Irmão/Irmã' },
  { value: 'AVO', label: 'Avô/Avó' },
  { value: 'PADRASTO', label: 'Padrasto' },
  { value: 'MADRASTA', label: 'Madrasta' },
  { value: 'TIO', label: 'Tio(a)' },
  { value: 'SOBRINHO', label: 'Sobrinho(a)' },
  { value: 'OUTRO', label: 'Outro' },
]

const SEXO_OPTIONS = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMININO', label: 'Feminino' },
  { value: 'OUTRO', label: 'Outro' },
]

const ESTADO_CIVIL_OPTIONS = [
  { value: 'SOLTEIRO', label: 'Solteiro(a)' },
  { value: 'CASADO', label: 'Casado(a)' },
  { value: 'DIVORCIADO', label: 'Divorciado(a)' },
  { value: 'VIUVO', label: 'Viúvo(a)' },
  { value: 'UNIAO_ESTAVEL', label: 'União Estável' },
]

const ESCOLARIDADE_OPTIONS = [
  { value: 'FUNDAMENTAL_INCOMPLETO', label: 'Ensino Fundamental Incompleto' },
  { value: 'FUNDAMENTAL_COMPLETO', label: 'Ensino Fundamental Completo' },
  { value: 'MEDIO_INCOMPLETO', label: 'Ensino Médio Incompleto' },
  { value: 'MEDIO_COMPLETO', label: 'Ensino Médio' },
  { value: 'SUPERIOR_INCOMPLETO', label: 'Superior Incompleto' },
  { value: 'SUPERIOR_COMPLETO', label: 'Superior Completo' },
  { value: 'POS_GRADUACAO', label: 'Pós-graduação' },
]

const DOENCAS_OPTIONS = [
  { value: 'ALIENATION_MENTAL', label: 'Alienação Mental' },
  { value: 'CARDIOPATHY_SEVERE', label: 'Cardiopatia Grave' },
  { value: 'BLINDNESS', label: 'Cegueira' },
  { value: 'PARKINSONS_DISEASE', label: 'Doença de Parkinson' },
  { value: 'HANSENS_DISEASE', label: 'Hanseníase' },
  { value: 'HIV_AIDS', label: 'HIV/AIDS' },
  { value: 'MALIGNANT_NEOPLASM', label: 'Neoplasma Maligno (Câncer)' },
  { value: 'AUTISM_SPECTRUM_DISORDER', label: 'Transtorno do Espectro Autista' },
  { value: 'RARE_DISEASE', label: 'Doença Rara' },
  { value: 'OTHER_HIGH_COST_DISEASE', label: 'Outra Doença de Alto Custo' },
  { value: 'NONE', label: 'Nenhuma' },
]

type TabId = 'dados' | 'renda' | 'saude'

interface MembroDetalheProps {
  membroId: string
  onClose: () => void
  onUpdate?: () => void
}

// ===========================================
// COMPONENTE
// ===========================================

export function MembroDetalhe({ membroId, onClose, onUpdate }: MembroDetalheProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dados')
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ── Dados Pessoais ──
  const [dadosPessoais, setDadosPessoais] = useState({
    nome: '', cpf: '', dataNascimento: '', parentesco: '',
    telefone: '', sexo: '', estadoCivil: '', escolaridade: '',
    profissao: '', nacionalidade: '', naturalidade: '',
  })

  // ── Renda ──
  const [dadosRenda, setDadosRenda] = useState({
    renda: '', ocupacao: '', fonteRenda: '', observacaoRenda: '',
  })

  // ── Saúde ──
  const [dadosSaude, setDadosSaude] = useState({
    doenca: 'NONE', doencaEspecifica: '', possuiLaudo: false,
    medicamento: '', medicamentoRedePublica: false,
    medicamentoRedePublicaDetalhe: '',
  })

  useEffect(() => {
    carregarMembro()
  }, [membroId])

  const carregarMembro = async () => {
    try {
      const res = await api.get(`/familia/membros/${membroId}`)
      const m = res.data
      setDadosPessoais({
        nome: m.nome || '', cpf: m.cpf ? maskCPF(m.cpf) : '',
        dataNascimento: m.dataNascimento ? m.dataNascimento.split('T')[0] : '',
        parentesco: m.parentesco || '', telefone: m.telefone ? maskPhone(m.telefone) : '',
        sexo: m.sexo || '', estadoCivil: m.estadoCivil || '',
        escolaridade: m.escolaridade || '', profissao: m.profissao || '',
        nacionalidade: m.nacionalidade || '', naturalidade: m.naturalidade || '',
      })
      setDadosRenda({
        renda: m.renda ? Number(m.renda).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
        ocupacao: m.ocupacao || '', fonteRenda: m.fonteRenda || '',
        observacaoRenda: m.observacaoRenda || '',
      })
      if (m.saude) {
        setDadosSaude({
          doenca: m.saude.doenca || 'NONE', doencaEspecifica: m.saude.doencaEspecifica || '',
          possuiLaudo: m.saude.possuiLaudo || false,
          medicamento: m.saude.medicamento || '',
          medicamentoRedePublica: m.saude.medicamentoRedePublica || false,
          medicamentoRedePublicaDetalhe: m.saude.medicamentoRedePublicaDetalhe || '',
        })
      }
    } catch {
      toast.error('Erro ao carregar dados do membro')
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async () => {
    setSaving(true)
    try {
      await api.put(`/familia/membros/${membroId}`, {
        nome: dadosPessoais.nome,
        cpf: unmaskValue(dadosPessoais.cpf),
        dataNascimento: dadosPessoais.dataNascimento,
        parentesco: dadosPessoais.parentesco,
        telefone: dadosPessoais.telefone ? unmaskValue(dadosPessoais.telefone) : undefined,
        sexo: dadosPessoais.sexo || undefined,
        estadoCivil: dadosPessoais.estadoCivil || undefined,
        escolaridade: dadosPessoais.escolaridade || undefined,
        profissao: dadosPessoais.profissao || undefined,
        nacionalidade: dadosPessoais.nacionalidade || undefined,
        naturalidade: dadosPessoais.naturalidade || undefined,
        renda: dadosRenda.renda ? parseFloat(dadosRenda.renda.replace(/\./g, '').replace(',', '.')) : undefined,
        ocupacao: dadosRenda.ocupacao || undefined,
        fonteRenda: dadosRenda.fonteRenda || undefined,
        observacaoRenda: dadosRenda.observacaoRenda || undefined,
      })
      toast.success('Dados do membro salvos!')
      setEditMode(false)
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const tabs: { id: TabId; label: string; icon: JSX.Element }[] = [
    { id: 'dados', label: 'Dados Pessoais', icon: <FiUser size={16} /> },
    { id: 'renda', label: 'Renda', icon: <FiDollarSign size={16} /> },
    { id: 'saude', label: 'Saúde', icon: <FiHeart size={16} /> },
  ]

  // Radio helper
  const RadioSimNao = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div className={styles.radioGroup}>
      <span className={styles.radioLabel}>{label}</span>
      <div className={styles.radioOptions}>
        <label><input type="radio" checked={value} disabled={!editMode} onChange={() => onChange(true)} /> Sim</label>
        <label><input type="radio" checked={!value} disabled={!editMode} onChange={() => onChange(false)} /> Não</label>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.drawer} onClick={e => e.stopPropagation()}>
          <div className={styles.loadingInner}><div className={styles.spinner} /><p>Carregando...</p></div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.drawerHeader}>
          <h3>{dadosPessoais.nome || 'Membro'}</h3>
          <button className={styles.closeBtn} onClick={onClose}><FiX size={20} /></button>
        </div>

        {/* Tabs */}
        <div className={styles.tabBar}>
          {tabs.map(t => (
            <button
              key={t.id}
              className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className={styles.drawerBody}>

          {/* ── ABA: DADOS PESSOAIS ── */}
          {activeTab === 'dados' && (
            <div className={styles.formGrid}>
              <div className={styles.field}><label>Nome completo</label>
                <input value={dadosPessoais.nome} disabled={!editMode} onChange={e => setDadosPessoais({ ...dadosPessoais, nome: e.target.value })} />
              </div>
              <div className={styles.field}><label>CPF</label>
                <input value={dadosPessoais.cpf} disabled={!editMode} onChange={e => setDadosPessoais({ ...dadosPessoais, cpf: maskCPF(e.target.value) })} />
              </div>
              <div className={styles.field}><label>Data de nascimento</label>
                <input type="date" value={dadosPessoais.dataNascimento} disabled={!editMode} onChange={e => setDadosPessoais({ ...dadosPessoais, dataNascimento: e.target.value })} />
              </div>
              <div className={styles.field}><label>Parentesco</label>
                <select value={dadosPessoais.parentesco} disabled={!editMode} onChange={e => setDadosPessoais({ ...dadosPessoais, parentesco: e.target.value })}>
                  <option value="">Selecione...</option>
                  {PARENTESCO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className={styles.field}><label>Telefone</label>
                <input value={dadosPessoais.telefone} disabled={!editMode} onChange={e => setDadosPessoais({ ...dadosPessoais, telefone: maskPhone(e.target.value) })} />
              </div>
              <div className={styles.field}><label>Sexo</label>
                <select value={dadosPessoais.sexo} disabled={!editMode} onChange={e => setDadosPessoais({ ...dadosPessoais, sexo: e.target.value })}>
                  <option value="">Selecione...</option>
                  {SEXO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className={styles.field}><label>Estado Civil</label>
                <select value={dadosPessoais.estadoCivil} disabled={!editMode} onChange={e => setDadosPessoais({ ...dadosPessoais, estadoCivil: e.target.value })}>
                  <option value="">Selecione...</option>
                  {ESTADO_CIVIL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className={styles.field}><label>Escolaridade</label>
                <select value={dadosPessoais.escolaridade} disabled={!editMode} onChange={e => setDadosPessoais({ ...dadosPessoais, escolaridade: e.target.value })}>
                  <option value="">Selecione...</option>
                  {ESCOLARIDADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className={styles.field}><label>Profissão</label>
                <input value={dadosPessoais.profissao} disabled={!editMode} onChange={e => setDadosPessoais({ ...dadosPessoais, profissao: e.target.value })} />
              </div>
              <div className={styles.field}><label>Nacionalidade</label>
                <input value={dadosPessoais.nacionalidade} disabled={!editMode} placeholder="Brasileira" onChange={e => setDadosPessoais({ ...dadosPessoais, nacionalidade: e.target.value })} />
              </div>
              <div className={styles.field}><label>Naturalidade</label>
                <input value={dadosPessoais.naturalidade} disabled={!editMode} onChange={e => setDadosPessoais({ ...dadosPessoais, naturalidade: e.target.value })} />
              </div>
            </div>
          )}

          {/* ── ABA: RENDA ── */}
          {activeTab === 'renda' && (
            <div className={styles.formGrid}>
              <div className={styles.field}><label>Renda mensal (R$)</label>
                <input value={dadosRenda.renda} disabled={!editMode} placeholder="0,00" onChange={e => setDadosRenda({ ...dadosRenda, renda: e.target.value })} />
              </div>
              <div className={styles.field}><label>Ocupação</label>
                <input value={dadosRenda.ocupacao} disabled={!editMode} onChange={e => setDadosRenda({ ...dadosRenda, ocupacao: e.target.value })} />
              </div>
              <div className={styles.field}><label>Fonte de renda</label>
                <input value={dadosRenda.fonteRenda} disabled={!editMode} placeholder="CLT, Autônomo, Aposentado..." onChange={e => setDadosRenda({ ...dadosRenda, fonteRenda: e.target.value })} />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}><label>Observações sobre renda</label>
                <textarea value={dadosRenda.observacaoRenda} disabled={!editMode} rows={3} onChange={e => setDadosRenda({ ...dadosRenda, observacaoRenda: e.target.value })} />
              </div>
            </div>
          )}

          {/* ── ABA: SAÚDE ── */}
          {activeTab === 'saude' && (
            <>
              <h4 className={styles.subTitle}>Informações de Saúde — {dadosPessoais.nome}</h4>
              <div className={styles.formGrid}>
                <div className={styles.field}><label>Doença</label>
                  <select value={dadosSaude.doenca} disabled={!editMode} onChange={e => setDadosSaude({ ...dadosSaude, doenca: e.target.value })}>
                    {DOENCAS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {dadosSaude.doenca !== 'NONE' && (
                  <div className={styles.field}><label>Doença específica</label>
                    <input value={dadosSaude.doencaEspecifica} disabled={!editMode} onChange={e => setDadosSaude({ ...dadosSaude, doencaEspecifica: e.target.value })} />
                  </div>
                )}
              </div>

              {dadosSaude.doenca !== 'NONE' && (
                <RadioSimNao label="Possui laudo médico?" value={dadosSaude.possuiLaudo} onChange={v => setDadosSaude({ ...dadosSaude, possuiLaudo: v })} />
              )}

              <h4 className={styles.subTitle}>Uso de medicamento contínuo e/ou controlado</h4>
              <div className={styles.formGrid}>
                <div className={styles.field}><label>Nome do medicamento</label>
                  <input value={dadosSaude.medicamento} disabled={!editMode} onChange={e => setDadosSaude({ ...dadosSaude, medicamento: e.target.value })} />
                </div>
              </div>
              <RadioSimNao label="Obtém através da Rede Pública?" value={dadosSaude.medicamentoRedePublica} onChange={v => setDadosSaude({ ...dadosSaude, medicamentoRedePublica: v })} />
              {dadosSaude.medicamentoRedePublica && (
                <div className={styles.formGridSingle}>
                  <div className={styles.field}><label>Medicações obtidas na Rede Pública</label>
                    <input value={dadosSaude.medicamentoRedePublicaDetalhe} disabled={!editMode} onChange={e => setDadosSaude({ ...dadosSaude, medicamentoRedePublicaDetalhe: e.target.value })} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.drawerFooter}>
          <button className={styles.btnGhost} onClick={onClose}>Voltar</button>
          <button
            className={editMode ? styles.btnPrimary : styles.btnOutline}
            onClick={() => editMode ? handleSalvar() : setEditMode(true)}
            disabled={saving}
          >
            {editMode ? (
              saving ? 'Salvando...' : <><FiSave size={14} /> Salvar</>
            ) : (
              <><FiEdit2 size={14} /> Editar</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
