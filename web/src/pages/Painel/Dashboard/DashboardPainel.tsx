import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetRecoilState, useRecoilValue } from 'recoil'
import { toast } from 'react-toastify'
import {
  FiUsers,
  FiClipboard,
  FiBookOpen,
  FiHome,
  FiLogOut,
  FiSettings,
  FiUpload,
  FiTrash2,
  FiExternalLink,
  FiEdit2,
  FiX,
  FiSave,
  FiLock,
} from 'react-icons/fi'
import { authState } from '@/atoms'
import { api } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import styles from './DashboardPainel.module.scss'

// ===== TYPES =====

interface Resumo {
  totalInstituicoes: number
  totalTenants: number
  totalCandidatos: number
  totalCandidaturas: number
  totalEditais: number
  totalUsuarios: number
}

interface InstituicaoCard {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  cnpj: string
  telefone: string
  email: string
  cidade: string
  uf: string
  endereco: string
  numero: string
  bairro: string
  cep: string
  status: string
  criadoEm: string
  tenant: {
    slug: string
    nome: string
    logoUrl: string | null
    corPrimaria: string | null
    ativo: boolean
  } | null
  _count: {
    candidatos: number
    editais: number
    usuarios: number
  }
}

interface StatusCount {
  status: string
  total: number
}

// ===== COMPONENT =====

export function DashboardPainel() {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [instituicoes, setInstituicoes] = useState<InstituicaoCard[]>([])
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null)

  // Modal: editar instituição
  const [editModal, setEditModal] = useState<InstituicaoCard | null>(null)
  const [editData, setEditData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Modal: minha conta (engrenagem)
  const [showAccount, setShowAccount] = useState(false)
  const [accountEmail, setAccountEmail] = useState('')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)

  const auth = useRecoilValue(authState)
  const setAuth = useSetRecoilState(authState)
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [targetSlug, setTargetSlug] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
  }, [])

  useEffect(() => {
    if (auth.usuario) setAccountEmail(auth.usuario.email)
  }, [auth.usuario])

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/painel/dashboard')
      setResumo(response.data.resumo)
      setInstituicoes(response.data.instituicoes)
      setStatusCounts(response.data.candidaturasPorStatus)
    } catch (error: any) {
      toast.error('Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setAuth({ token: null, usuario: null, isAuthenticated: false })
    localStorage.removeItem('cadastraqui-persist')
    navigate('/instituicao')
  }

  // ===== UPLOAD LOGO =====

  const handleUploadLogo = (slug: string) => {
    setTargetSlug(slug)
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !targetSlug) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      toast.error('Use JPG, PNG, WebP ou SVG.')
      return
    }

    setUploadingSlug(targetSlug)
    try {
      const formData = new FormData()
      formData.append('file', file)

      await api.patch(`/painel/tenant/${targetSlug}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success(`Logo de ${targetSlug} atualizado!`)
      fetchDashboard()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao enviar logo')
    } finally {
      setUploadingSlug(null)
      setTargetSlug(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveLogo = async (slug: string) => {
    if (!confirm(`Remover o logo de ${slug}?`)) return
    try {
      await api.delete(`/painel/tenant/${slug}/logo`)
      toast.success('Logo removido')
      fetchDashboard()
    } catch (error: any) {
      toast.error('Erro ao remover logo')
    }
  }

  // ===== EDITAR INSTITUIÇÃO =====

  const openEditModal = (inst: InstituicaoCard) => {
    setEditModal(inst)
    setEditData({
      razaoSocial: inst.razaoSocial || '',
      nomeFantasia: inst.nomeFantasia || '',
      cnpj: inst.cnpj || '',
      telefone: inst.telefone || '',
      email: inst.email || '',
      cep: inst.cep || '',
      endereco: inst.endereco || '',
      numero: inst.numero || '',
      bairro: inst.bairro || '',
      cidade: inst.cidade || '',
      uf: inst.uf || '',
    })
  }

  const handleSaveInst = async () => {
    if (!editModal) return
    setSaving(true)
    try {
      await api.put(`/painel/instituicoes/${editModal.id}`, editData)
      toast.success('Instituição atualizada!')
      setEditModal(null)
      fetchDashboard()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  // ===== MINHA CONTA =====

  const handleSaveAccount = async () => {
    setSavingAccount(true)
    try {
      const payload: any = {}
      if (accountEmail !== auth.usuario?.email) payload.email = accountEmail
      if (novaSenha) {
        payload.senhaAtual = senhaAtual
        payload.novaSenha = novaSenha
      }

      if (Object.keys(payload).length === 0) {
        toast.info('Nenhuma alteração')
        setSavingAccount(false)
        return
      }

      await api.put('/painel/minha-conta', payload)
      toast.success('Conta atualizada!')
      setSenhaAtual('')
      setNovaSenha('')
      setShowAccount(false)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar conta')
    } finally {
      setSavingAccount(false)
    }
  }

  const apiBase = api.defaults.baseURL || ''

  const STATUS_LABELS: Record<string, string> = {
    PENDENTE: 'Pendentes',
    EM_ANALISE: 'Em Análise',
    DOCUMENTACAO_PENDENTE: 'Doc. Pendente',
    APROVADO: 'Aprovados',
    REPROVADO: 'Reprovados',
    CANCELADO: 'Cancelados',
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Carregando painel...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* ===== HEADER ===== */}
      <header className={styles.header}>
        <img src="/images/logo/logo_white_transparent.png" alt="Cadastraqui" className={styles.headerLogo} />
        <div className={styles.headerRight}>
          <span className={styles.headerUser}>{auth.usuario?.email}</span>
          <button className={styles.headerBtn} onClick={() => setShowAccount(true)} title="Minha Conta">
            <FiSettings size={18} />
          </button>
          <button className={styles.headerBtn} onClick={handleLogout} title="Sair">
            <FiLogOut size={18} />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.pageTitle}>Painel de Gestão</h1>

        {/* ===== KPIs ===== */}
        {resumo && (
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <FiHome className={styles.kpiIcon} />
              <div className={styles.kpiValue}>{resumo.totalInstituicoes}</div>
              <div className={styles.kpiLabel}>Instituições</div>
            </div>
            <div className={styles.kpiCard}>
              <FiUsers className={styles.kpiIcon} />
              <div className={styles.kpiValue}>{resumo.totalCandidatos}</div>
              <div className={styles.kpiLabel}>Candidatos</div>
            </div>
            <div className={styles.kpiCard}>
              <FiClipboard className={styles.kpiIcon} />
              <div className={styles.kpiValue}>{resumo.totalCandidaturas}</div>
              <div className={styles.kpiLabel}>Candidaturas</div>
            </div>
            <div className={styles.kpiCard}>
              <FiBookOpen className={styles.kpiIcon} />
              <div className={styles.kpiValue}>{resumo.totalEditais}</div>
              <div className={styles.kpiLabel}>Editais</div>
            </div>
          </div>
        )}

        {/* ===== STATUS BAR ===== */}
        {statusCounts.length > 0 && (
          <div className={styles.statusBar}>
            {statusCounts.map((s) => (
              <span key={s.status} className={styles.statusChip}>
                {STATUS_LABELS[s.status] || s.status}: <strong>{s.total}</strong>
              </span>
            ))}
          </div>
        )}

        {/* ===== INSTITUIÇÕES ===== */}
        <h2 className={styles.sectionTitle}>Instituições do Portfólio</h2>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <div className={styles.instGrid}>
          {instituicoes.map((inst) => (
            <div key={inst.id} className={styles.instCard}>
              {/* Logo */}
              <div className={styles.instLogoArea}>
                {inst.tenant?.logoUrl ? (
                  <img
                    src={inst.tenant.logoUrl.startsWith('http') ? inst.tenant.logoUrl : `${apiBase}${inst.tenant.logoUrl}`}
                    alt={inst.nomeFantasia || inst.razaoSocial}
                    className={styles.instLogo}
                  />
                ) : (
                  <div className={styles.instLogoPlaceholder}>
                    <FiHome size={24} />
                  </div>
                )}
              </div>

              <h3 className={styles.instName}>{inst.nomeFantasia || inst.razaoSocial}</h3>
              <p className={styles.instLocation}>{inst.cidade}/{inst.uf}</p>

              {/* Metrics */}
              <div className={styles.instMetrics}>
                <span>{inst._count.candidatos} candidatos</span>
                <span>{inst._count.editais} editais</span>
                <span>{inst._count.usuarios} usuários</span>
              </div>

              {/* Tenant badge */}
              {inst.tenant && (
                <div className={styles.instTenant}>
                  <span className={styles.tenantBadge} style={{ backgroundColor: inst.tenant.corPrimaria || '#1F4B73' }}>
                    /{inst.tenant.slug}
                  </span>
                  <span className={`${styles.tenantStatus} ${inst.tenant.ativo ? styles.active : styles.inactive}`}>
                    {inst.tenant.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className={styles.instActions}>
                <button className={styles.actionBtn} onClick={() => openEditModal(inst)} title="Editar dados">
                  <FiEdit2 size={14} /> Editar
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => handleUploadLogo(inst.tenant?.slug || '')}
                  disabled={!inst.tenant || uploadingSlug === inst.tenant?.slug}
                  title="Upload logo"
                >
                  <FiUpload size={14} />
                  {uploadingSlug === inst.tenant?.slug ? '...' : 'Logo'}
                </button>
                {inst.tenant?.logoUrl && (
                  <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleRemoveLogo(inst.tenant?.slug || '')} title="Remover logo">
                    <FiTrash2 size={14} />
                  </button>
                )}
                {inst.tenant && (
                  <a href={`/${inst.tenant.slug}/login`} target="_blank" rel="noopener noreferrer" className={styles.actionBtn} title="Abrir login">
                    <FiExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ===== MODAL: EDITAR INSTITUIÇÃO ===== */}
      {editModal && (
        <div className={styles.overlay} onClick={() => setEditModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Editar Instituição</h3>
              <button className={styles.modalClose} onClick={() => setEditModal(null)}><FiX size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Razão Social</label>
                  <input value={editData.razaoSocial || ''} onChange={(e) => setEditData({ ...editData, razaoSocial: e.target.value })} />
                </div>
                <div className={styles.formField}>
                  <label>Nome Fantasia</label>
                  <input value={editData.nomeFantasia || ''} onChange={(e) => setEditData({ ...editData, nomeFantasia: e.target.value })} />
                </div>
                <div className={styles.formField}>
                  <label>CNPJ</label>
                  <input value={editData.cnpj || ''} onChange={(e) => setEditData({ ...editData, cnpj: e.target.value })} />
                </div>
                <div className={styles.formField}>
                  <label>Telefone</label>
                  <input value={editData.telefone || ''} onChange={(e) => setEditData({ ...editData, telefone: e.target.value })} />
                </div>
                <div className={styles.formField}>
                  <label>Email</label>
                  <input value={editData.email || ''} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                </div>
                <div className={styles.formField}>
                  <label>CEP</label>
                  <input value={editData.cep || ''} onChange={(e) => setEditData({ ...editData, cep: e.target.value })} />
                </div>
                <div className={`${styles.formField} ${styles.wide}`}>
                  <label>Endereço</label>
                  <input value={editData.endereco || ''} onChange={(e) => setEditData({ ...editData, endereco: e.target.value })} />
                </div>
                <div className={styles.formField}>
                  <label>Número</label>
                  <input value={editData.numero || ''} onChange={(e) => setEditData({ ...editData, numero: e.target.value })} />
                </div>
                <div className={styles.formField}>
                  <label>Bairro</label>
                  <input value={editData.bairro || ''} onChange={(e) => setEditData({ ...editData, bairro: e.target.value })} />
                </div>
                <div className={styles.formField}>
                  <label>Cidade</label>
                  <input value={editData.cidade || ''} onChange={(e) => setEditData({ ...editData, cidade: e.target.value })} />
                </div>
                <div className={styles.formField}>
                  <label>UF</label>
                  <input value={editData.uf || ''} maxLength={2} onChange={(e) => setEditData({ ...editData, uf: e.target.value.toUpperCase() })} />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setEditModal(null)}>Cancelar</button>
              <button className={styles.btnPrimary} onClick={handleSaveInst} disabled={saving}>
                <FiSave size={14} /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: MINHA CONTA ===== */}
      {showAccount && (
        <div className={styles.overlay} onClick={() => setShowAccount(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3><FiLock size={18} /> Minha Conta</h3>
              <button className={styles.modalClose} onClick={() => setShowAccount(false)}><FiX size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label>Email</label>
                <input value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} />
              </div>
              <hr className={styles.divider} />
              <p className={styles.hint}>Preencha abaixo apenas se quiser trocar a senha:</p>
              <div className={styles.formField}>
                <label>Senha atual</label>
                <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="••••••••" />
              </div>
              <div className={styles.formField}>
                <label>Nova senha</label>
                <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setShowAccount(false)}>Cancelar</button>
              <button className={styles.btnPrimary} onClick={handleSaveAccount} disabled={savingAccount}>
                <FiSave size={14} /> {savingAccount ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
