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
  FiSearch,
} from 'react-icons/fi'
import { authState } from '@/atoms'
import { api } from '@/services/api'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import styles from './DashboardPainel.module.scss'

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
  cidade: string
  uf: string
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
    candidaturas: number
    usuarios: number
  }
}

interface StatusCount {
  status: string
  total: number
}

export function DashboardPainel() {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [instituicoes, setInstituicoes] = useState<InstituicaoCard[]>([])
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const auth = useRecoilValue(authState)
  const setAuth = useSetRecoilState(authState)
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [targetSlug, setTargetSlug] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
  }, [])

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
      fetchDashboard() // Recarregar
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
      {/* Header */}
      <header className={styles.header}>
        <img
          src="/images/logo/logo_white_transparent.png"
          alt="Cadastraqui"
          className={styles.headerLogo}
        />
        <div className={styles.headerRight}>
          <span className={styles.headerUser}>{auth.usuario?.email}</span>
          <button className={styles.headerBtn} onClick={() => setShowConfig(!showConfig)} title="Minha Conta">
            <FiSettings size={18} />
          </button>
          <button className={styles.headerBtn} onClick={handleLogout} title="Sair">
            <FiLogOut size={18} />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.pageTitle}>Painel de Gestão</h1>

        {/* KPIs */}
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

        {/* Status das candidaturas */}
        {statusCounts.length > 0 && (
          <div className={styles.statusBar}>
            {statusCounts.map((s) => (
              <span key={s.status} className={styles.statusChip}>
                {STATUS_LABELS[s.status] || s.status}: <strong>{s.total}</strong>
              </span>
            ))}
          </div>
        )}

        {/* Instituições */}
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
            <Card key={inst.id} className={styles.instCard}>
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

              {/* Info */}
              <h3 className={styles.instName}>
                {inst.nomeFantasia || inst.razaoSocial}
              </h3>
              <p className={styles.instLocation}>{inst.cidade}/{inst.uf}</p>

              {/* Metrics */}
              <div className={styles.instMetrics}>
                <span>{inst._count.candidatos} candidatos</span>
                <span>{inst._count.candidaturas} candidaturas</span>
                <span>{inst._count.editais} editais</span>
                <span>{inst._count.usuarios} usuários</span>
              </div>

              {/* Tenant info */}
              {inst.tenant && (
                <div className={styles.instTenant}>
                  <span
                    className={styles.tenantBadge}
                    style={{ backgroundColor: inst.tenant.corPrimaria || '#1F4B73' }}
                  >
                    /{inst.tenant.slug}
                  </span>
                  <span className={`${styles.tenantStatus} ${inst.tenant.ativo ? styles.active : styles.inactive}`}>
                    {inst.tenant.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className={styles.instActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => handleUploadLogo(inst.tenant?.slug || '')}
                  disabled={!inst.tenant || uploadingSlug === inst.tenant?.slug}
                  title="Upload logo"
                >
                  <FiUpload size={14} />
                  {uploadingSlug === inst.tenant?.slug ? 'Enviando...' : 'Logo'}
                </button>

                {inst.tenant?.logoUrl && (
                  <button
                    className={`${styles.actionBtn} ${styles.danger}`}
                    onClick={() => handleRemoveLogo(inst.tenant?.slug || '')}
                    title="Remover logo"
                  >
                    <FiTrash2 size={14} />
                  </button>
                )}

                {inst.tenant && (
                  <a
                    href={`/${inst.tenant.slug}/login`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.actionBtn}
                    title="Abrir tela de login"
                  >
                    <FiExternalLink size={14} />
                    Ver
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
