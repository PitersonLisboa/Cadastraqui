import { useState, useEffect } from 'react'
import { 
  FiUsers, 
  FiPlus, 
  FiUser, 
  FiBriefcase,
  FiMail,
  FiPhone,
  FiUserX,
  FiUserCheck,
  FiCheck,
  FiLink,
  FiCopy,
  FiTrash2,
  FiClock,
  FiClipboard,
  FiEye,
  FiSettings
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Modal } from '@/components/common/Modal/Modal'
import { Input } from '@/components/common/Input/Input'
import { Select } from '@/components/common/Select/Select'
import { equipeService, api } from '@/services/api'
import styles from './GestaoEquipe.module.scss'

// ===========================================
// INTERFACES
// ===========================================

interface MembroBase {
  id: string
  nome: string
  telefone?: string
  usuario: {
    email: string
    ativo: boolean
    criadoEm: string
  }
}

interface Assistente extends MembroBase {
  cress: string
  _count: { pareceres: number; agendamentos: number }
}

interface Advogado extends MembroBase {
  oab: string
  oabUf: string
  _count: { pareceresJuridicos: number }
}

interface Supervisor extends MembroBase {
  registro?: string
}

interface MembroControle extends MembroBase {
  cargo?: string
}

interface MembroOperacional extends MembroBase {
  cargo?: string
}

interface Convite {
  id: string
  codigo: string
  tipo: string
  email?: string
  usado: boolean
  expiraEm: string
  criadoEm: string
}

// ===========================================
// CONFIGURAÇÃO DOS TIPOS
// ===========================================

const TIPOS_MEMBRO = [
  { key: 'ASSISTENTE_SOCIAL', label: 'Assistente Social', icon: FiUser, cor: '#f59e0b' },
  { key: 'ADVOGADO', label: 'Advogado', icon: FiBriefcase, cor: '#7c3aed' },
  { key: 'SUPERVISAO', label: 'Supervisão', icon: FiEye, cor: '#0891b2' },
  { key: 'CONTROLE', label: 'Controle', icon: FiSettings, cor: '#4f46e5' },
  { key: 'OPERACIONAL', label: 'Operacional', icon: FiClipboard, cor: '#d97706' },
] as const

type TipoMembro = typeof TIPOS_MEMBRO[number]['key']

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

// ===========================================
// COMPONENTE PRINCIPAL
// ===========================================

export function GestaoEquipe() {
  const [assistentes, setAssistentes] = useState<Assistente[]>([])
  const [advogados, setAdvogados] = useState<Advogado[]>([])
  const [supervisores, setSupervisores] = useState<Supervisor[]>([])
  const [membrosControle, setMembrosControle] = useState<MembroControle[]>([])
  const [membrosOperacional, setMembrosOperacional] = useState<MembroOperacional[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [loading, setLoading] = useState(true)
  
  const [modalCadastro, setModalCadastro] = useState<TipoMembro | null>(null)
  const [modalConvite, setModalConvite] = useState(false)
  const [tipoConvite, setTipoConvite] = useState<TipoMembro>('ASSISTENTE_SOCIAL')
  const [gerandoConvite, setGerandoConvite] = useState(false)
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Form genérico
  const [form, setForm] = useState({
    email: '',
    senha: '',
    nome: '',
    cress: '',
    oab: '',
    oabUf: 'SP',
    cargo: '',
    telefone: '',
  })

  useEffect(() => {
    carregarEquipe()
    carregarConvites()
  }, [])

  async function carregarEquipe() {
    setLoading(true)
    try {
      const data = await equipeService.listar()
      setAssistentes(data.assistentes || [])
      setAdvogados(data.advogados || [])
      setSupervisores(data.supervisores || [])
      setMembrosControle(data.membrosControle || [])
      setMembrosOperacional(data.membrosOperacional || [])
    } catch (error) {
      console.error('Erro ao carregar equipe:', error)
      toast.error('Erro ao carregar equipe')
    } finally {
      setLoading(false)
    }
  }

  async function carregarConvites() {
    try {
      const response = await api.get('/convites')
      setConvites(response.data.convites || [])
    } catch (error) {
      console.error('Erro ao carregar convites:', error)
    }
  }

  function resetForm() {
    setForm({ email: '', senha: '', nome: '', cress: '', oab: '', oabUf: 'SP', cargo: '', telefone: '' })
  }

  async function handleSubmitMembro(e: React.FormEvent) {
    e.preventDefault()
    if (!modalCadastro || !form.email || !form.senha || !form.nome) {
      toast.warning('Preencha todos os campos obrigatórios')
      return
    }

    if (modalCadastro === 'ASSISTENTE_SOCIAL' && !form.cress) {
      toast.warning('Informe o CRESS'); return
    }
    if (modalCadastro === 'ADVOGADO' && !form.oab) {
      toast.warning('Informe a OAB'); return
    }

    setSalvando(true)
    try {
      await equipeService.adicionarMembro({
        tipo: modalCadastro,
        email: form.email,
        senha: form.senha,
        nome: form.nome,
        cress: modalCadastro === 'ASSISTENTE_SOCIAL' ? form.cress : undefined,
        oab: modalCadastro === 'ADVOGADO' ? form.oab : undefined,
        oabUf: modalCadastro === 'ADVOGADO' ? form.oabUf : undefined,
        cargo: ['SUPERVISAO', 'CONTROLE', 'OPERACIONAL'].includes(modalCadastro) ? form.cargo : undefined,
        telefone: form.telefone || undefined,
      })
      
      const tipoLabel = TIPOS_MEMBRO.find(t => t.key === modalCadastro)?.label
      toast.success(`${tipoLabel} adicionado(a) com sucesso!`)
      setModalCadastro(null)
      resetForm()
      carregarEquipe()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao adicionar membro')
    } finally {
      setSalvando(false)
    }
  }

  async function handleGerarConvite() {
    setGerandoConvite(true)
    try {
      const response = await api.post('/convites', { tipo: tipoConvite })
      toast.success(`Código gerado: ${response.data.convite.codigo}`)
      setModalConvite(false)
      carregarConvites()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao gerar convite')
    } finally {
      setGerandoConvite(false)
    }
  }

  async function handleRevogarConvite(id: string) {
    if (!confirm('Deseja revogar este convite?')) return
    try {
      await api.delete(`/convites/${id}`)
      toast.success('Convite revogado')
      carregarConvites()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao revogar convite')
    }
  }

  async function handleToggleStatus(id: string, ativo: boolean) {
    const acao = ativo ? 'desativar' : 'reativar'
    if (!confirm(`Deseja realmente ${acao} este membro?`)) return

    try {
      if (ativo) {
        await equipeService.desativar('', id)
      } else {
        await equipeService.reativar('', id)
      }
      toast.success(ativo ? 'Membro desativado!' : 'Membro reativado!')
      carregarEquipe()
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  function copiarCodigo(codigo: string) {
    navigator.clipboard.writeText(codigo)
    toast.success('Código copiado!')
  }

  function copiarLink(codigo: string) {
    const link = `${window.location.origin}/registrar?codigo=${codigo}`
    navigator.clipboard.writeText(link)
    toast.success('Link copiado!')
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  function getLabelTipo(tipo: string) {
    return TIPOS_MEMBRO.find(t => t.key === tipo)?.label || tipo
  }

  const totalEquipe = assistentes.length + advogados.length + supervisores.length + membrosControle.length + membrosOperacional.length
  const todosMembros = [
    ...assistentes.map(m => ({ ...m, _tipo: 'ASSISTENTE_SOCIAL' })),
    ...advogados.map(m => ({ ...m, _tipo: 'ADVOGADO' })),
    ...supervisores.map(m => ({ ...m, _tipo: 'SUPERVISAO' })),
    ...membrosControle.map(m => ({ ...m, _tipo: 'CONTROLE' })),
    ...membrosOperacional.map(m => ({ ...m, _tipo: 'OPERACIONAL' })),
  ]
  const ativos = todosMembros.filter(m => m.usuario.ativo).length

  // ===========================================
  // RENDER - Formulário específico por tipo
  // ===========================================

  function renderCamposEspecificos() {
    if (!modalCadastro) return null

    switch (modalCadastro) {
      case 'ASSISTENTE_SOCIAL':
        return (
          <Input
            label="CRESS *"
            placeholder="Número do CRESS"
            value={form.cress}
            onChange={(e) => setForm({ ...form, cress: e.target.value })}
            required
          />
        )
      case 'ADVOGADO':
        return (
          <div className={styles.formRow}>
            <Input
              label="Número OAB *"
              placeholder="123456"
              value={form.oab}
              onChange={(e) => setForm({ ...form, oab: e.target.value })}
              required
            />
            <Select
              label="UF da OAB *"
              value={form.oabUf}
              onChange={(e) => setForm({ ...form, oabUf: e.target.value })}
              required
            >
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </Select>
          </div>
        )
      case 'SUPERVISAO':
      case 'CONTROLE':
      case 'OPERACIONAL':
        return (
          <Input
            label="Cargo / Registro"
            placeholder={modalCadastro === 'SUPERVISAO' ? 'Ex: Coordenador Social' : 'Ex: Analista Documental'}
            value={form.cargo}
            onChange={(e) => setForm({ ...form, cargo: e.target.value })}
          />
        )
      default:
        return null
    }
  }

  // ===========================================
  // RENDER - Card de membro
  // ===========================================

  function renderMembroCard(membro: any, tipo: string) {
    const config = TIPOS_MEMBRO.find(t => t.key === tipo)
    const Icon = config?.icon || FiUser
    const subtitulo = tipo === 'ASSISTENTE_SOCIAL' ? `CRESS: ${membro.cress}`
      : tipo === 'ADVOGADO' ? `OAB: ${membro.oab}/${membro.oabUf}`
      : membro.cargo || membro.registro || getLabelTipo(tipo)

    return (
      <Card key={membro.id} className={`${styles.membroCard} ${!membro.usuario.ativo ? styles.inativo : ''}`}>
        <div className={styles.membroHeader}>
          <div className={styles.avatar} style={{ backgroundColor: `${config?.cor}15` }}>
            <Icon size={24} style={{ color: config?.cor }} />
          </div>
          <div className={styles.membroInfo}>
            <h3>{membro.nome}</h3>
            <span className={styles.registro}>{subtitulo}</span>
          </div>
          <span className={`${styles.status} ${membro.usuario.ativo ? styles.ativo : styles.inativo}`}>
            {membro.usuario.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        <div className={styles.membroBody}>
          <div className={styles.contato}>
            <FiMail size={14} />
            <span>{membro.usuario.email}</span>
          </div>
          {membro.telefone && (
            <div className={styles.contato}>
              <FiPhone size={14} />
              <span>{membro.telefone}</span>
            </div>
          )}
        </div>

        {(tipo === 'ASSISTENTE_SOCIAL' && membro._count) && (
          <div className={styles.membroStats}>
            <div className={styles.stat}>
              <span className={styles.statNumero}>{membro._count.pareceres}</span>
              <span className={styles.statLabel}>Pareceres</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumero}>{membro._count.agendamentos}</span>
              <span className={styles.statLabel}>Agendamentos</span>
            </div>
          </div>
        )}

        {(tipo === 'ADVOGADO' && membro._count) && (
          <div className={styles.membroStats}>
            <div className={styles.stat}>
              <span className={styles.statNumero}>{membro._count.pareceresJuridicos}</span>
              <span className={styles.statLabel}>Pareceres Jurídicos</span>
            </div>
          </div>
        )}

        <div className={styles.membroFooter}>
          <span className={styles.desde}>Desde {formatarData(membro.usuario.criadoEm)}</span>
          <button 
            className={`${styles.btnStatus} ${membro.usuario.ativo ? styles.btnDesativar : styles.btnReativar}`}
            onClick={() => handleToggleStatus(membro.id, membro.usuario.ativo)}
          >
            {membro.usuario.ativo ? <FiUserX size={16} /> : <FiUserCheck size={16} />}
            {membro.usuario.ativo ? 'Desativar' : 'Reativar'}
          </button>
        </div>
      </Card>
    )
  }

  // ===========================================
  // RENDER - Seção de tipo
  // ===========================================

  function renderSecao(tipo: string, membros: any[]) {
    const config = TIPOS_MEMBRO.find(t => t.key === tipo)
    if (!config) return null
    const Icon = config.icon

    return (
      <section key={tipo} className={styles.section}>
        <h2>
          <Icon style={{ color: config.cor }} />
          {config.label} ({membros.length})
        </h2>
        
        {membros.length === 0 ? (
          <Card className={styles.empty}>
            <p>Nenhum(a) {config.label.toLowerCase()} cadastrado(a)</p>
            <Button variant="outline" onClick={() => setModalCadastro(config.key)}>
              <FiPlus size={18} />
              Adicionar {config.label}
            </Button>
          </Card>
        ) : (
          <div className={styles.lista}>
            {membros.map(m => renderMembroCard(m, tipo))}
          </div>
        )}
      </section>
    )
  }

  // ===========================================
  // RENDER PRINCIPAL
  // ===========================================

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Gestão de Equipe</h1>
          <p>Gerencie os membros da equipe da instituição</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="ghost" onClick={() => setModalConvite(true)}>
            <FiLink size={18} />
            Gerar Convite
          </Button>
          <div style={{ position: 'relative' }}>
            <Button onClick={() => setDropdownAberto(!dropdownAberto)}>
              <FiPlus size={18} />
              Membro
            </Button>
            {dropdownAberto && (
              <>
                <div 
                  style={{ position: 'fixed', inset: 0, zIndex: 10 }} 
                  onClick={() => setDropdownAberto(false)} 
                />
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem',
                  background: '#fff', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0', zIndex: 11, minWidth: '220px', overflow: 'hidden',
                }}>
                  {TIPOS_MEMBRO.map((tipo) => {
                    const Icon = tipo.icon
                    return (
                      <button
                        key={tipo.key}
                        onClick={() => { setModalCadastro(tipo.key); setDropdownAberto(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                          padding: '0.75rem 1rem', border: 'none', background: 'transparent',
                          cursor: 'pointer', fontSize: '0.875rem', color: '#334155',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Icon size={16} style={{ color: tipo.cor }} />
                        {tipo.label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className={styles.resumo}>
        <Card className={styles.resumoCard}>
          <FiUsers size={24} />
          <div>
            <span className={styles.resumoNumero}>{totalEquipe}</span>
            <span className={styles.resumoLabel}>Total de Membros</span>
          </div>
        </Card>
        <Card className={styles.resumoCard}>
          <FiUserCheck size={24} />
          <div>
            <span className={styles.resumoNumero}>{ativos}</span>
            <span className={styles.resumoLabel}>Ativos</span>
          </div>
        </Card>
        {TIPOS_MEMBRO.map(tipo => {
          const Icon = tipo.icon
          const count = tipo.key === 'ASSISTENTE_SOCIAL' ? assistentes.length
            : tipo.key === 'ADVOGADO' ? advogados.length
            : tipo.key === 'SUPERVISAO' ? supervisores.length
            : tipo.key === 'CONTROLE' ? membrosControle.length
            : membrosOperacional.length
          return (
            <Card key={tipo.key} className={styles.resumoCard}>
              <Icon size={24} style={{ color: tipo.cor }} />
              <div>
                <span className={styles.resumoNumero}>{count}</span>
                <span className={styles.resumoLabel}>{tipo.label}</span>
              </div>
            </Card>
          )
        })}
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : (
        <div className={styles.sections}>
          {renderSecao('ASSISTENTE_SOCIAL', assistentes)}
          {renderSecao('ADVOGADO', advogados)}
          {renderSecao('SUPERVISAO', supervisores)}
          {renderSecao('CONTROLE', membrosControle)}
          {renderSecao('OPERACIONAL', membrosOperacional)}
        </div>
      )}

      {/* Modal Adicionar Membro (todos os tipos) */}
      <Modal
        isOpen={modalCadastro !== null}
        onClose={() => { setModalCadastro(null); resetForm(); }}
        title={`Adicionar ${TIPOS_MEMBRO.find(t => t.key === modalCadastro)?.label || 'Membro'}`}
      >
        <form onSubmit={handleSubmitMembro} className={styles.form}>
          <Input
            label="Nome Completo *"
            placeholder="Nome do profissional"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
          />

          <Input
            label="Email *"
            type="email"
            placeholder="email@exemplo.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <Input
            label="Senha Inicial *"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
            required
          />

          {renderCamposEspecificos()}

          <Input
            label="Telefone"
            placeholder="(11) 99999-9999"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />

          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => { setModalCadastro(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button type="submit" loading={salvando}>
              <FiCheck size={18} />
              Adicionar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Gerar Convite */}
      <Modal
        isOpen={modalConvite}
        onClose={() => setModalConvite(false)}
        title="Gerar Código de Convite"
      >
        <div className={styles.conviteForm}>
          <p className={styles.conviteDesc}>
            Gere um código de convite para que um profissional possa criar sua conta vinculada à sua instituição.
          </p>

          <Select
            label="Tipo de Profissional"
            value={tipoConvite}
            onChange={(e) => setTipoConvite(e.target.value as TipoMembro)}
          >
            {TIPOS_MEMBRO.map(tipo => (
              <option key={tipo.key} value={tipo.key}>{tipo.label}</option>
            ))}
          </Select>

          <div className={styles.conviteInfo}>
            <FiClock size={16} />
            <span>O código terá validade de 7 dias</span>
          </div>

          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => setModalConvite(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGerarConvite} loading={gerandoConvite}>
              <FiLink size={18} />
              Gerar Código
            </Button>
          </div>
        </div>
      </Modal>

      {/* Convites Ativos */}
      {convites.filter(c => !c.usado && new Date(c.expiraEm) > new Date()).length > 0 && (
        <Card className={styles.convitesCard}>
          <h3><FiLink size={18} /> Convites Ativos</h3>
          <div className={styles.convitesList}>
            {convites
              .filter(c => !c.usado && new Date(c.expiraEm) > new Date())
              .map(convite => (
                <div key={convite.id} className={styles.conviteItem}>
                  <div className={styles.conviteCodigo}>
                    <code>{convite.codigo}</code>
                    <span className={styles.tipoAssistente}>
                      {getLabelTipo(convite.tipo)}
                    </span>
                  </div>
                  <div className={styles.conviteExpira}>
                    Expira em {new Date(convite.expiraEm).toLocaleDateString('pt-BR')}
                  </div>
                  <div className={styles.conviteActions}>
                    <button onClick={() => copiarCodigo(convite.codigo)} title="Copiar código">
                      <FiCopy size={16} />
                    </button>
                    <button onClick={() => copiarLink(convite.codigo)} title="Copiar link">
                      <FiLink size={16} />
                    </button>
                    <button onClick={() => handleRevogarConvite(convite.id)} title="Revogar" className={styles.btnRevogar}>
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}
