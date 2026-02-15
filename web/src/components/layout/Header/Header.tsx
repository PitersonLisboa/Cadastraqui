import { useRecoilValue, useSetRecoilState } from 'recoil'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { FiMenu, FiX, FiLogOut, FiUser } from 'react-icons/fi'
import { authState, sidebarState, sidebarModeState } from '@/atoms'
import { ROLES_CONFIG } from '@/types'
import { NotificacoesDropdown } from '@/components/common/Notificacoes/NotificacoesDropdown'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/services/api'
import styles from './Header.module.scss'

export function Header() {
  const auth = useRecoilValue(authState)
  const sidebar = useRecoilValue(sidebarState)
  const setSidebar = useSetRecoilState(sidebarState)
  const sidebarMode = useRecoilValue(sidebarModeState)
  const setSidebarMode = useSetRecoilState(sidebarModeState)
  const setAuth = useSetRecoilState(authState)
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const { tenant } = useTenant()

  const roleConfig = auth.usuario ? ROLES_CONFIG[auth.usuario.role] : null
  const apiBase = api.defaults.baseURL || ''
  const tenantLogoSrc = tenant?.logoUrl
    ? (tenant.logoUrl.startsWith('http') ? tenant.logoUrl
      : tenant.logoUrl.startsWith('/uploads') ? `${apiBase}${tenant.logoUrl}`
      : tenant.logoUrl)
    : null

  const handleToggle = () => {
    const isCadastroPage = location.pathname.includes('/cadastro')

    if (!sidebar.isOpen) {
      // Sidebar fechada → abrir sidebar principal (menu)
      setSidebarMode({ mode: 'menu', activeSection: sidebarMode.activeSection || 'candidato' })
      setSidebar((prev) => ({ ...prev, isOpen: true }))
    } else if (sidebarMode.mode === 'menu' && isCadastroPage) {
      // Sidebar principal aberta + está na página de cadastro → trocar para sidebar cadastro
      setSidebarMode({ mode: 'cadastro', activeSection: sidebarMode.activeSection || 'candidato' })
      setSidebar((prev) => ({ ...prev, isOpen: true }))
    } else if (sidebarMode.mode === 'cadastro') {
      // Sidebar cadastro aberta → fechar tudo (X)
      setSidebar((prev) => ({ ...prev, isOpen: false }))
    } else {
      // Sidebar principal aberta, fora do cadastro → fechar
      setSidebar((prev) => ({ ...prev, isOpen: false }))
    }
  }

  const handleLogout = () => {
    setAuth({ token: null, usuario: null, isAuthenticated: false })
    setSidebarMode({ mode: 'menu', activeSection: 'candidato' })
    localStorage.removeItem('cadastraqui-persist')
    navigate(slug ? `/${slug}/login` : '/login')
  }

  if (!auth.usuario) return null

  // Ícone: ✕ quando sidebar aberta (qualquer modo), ☰ quando fechada
  const showClose = sidebar.isOpen

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          className={styles.menuButton}
          onClick={handleToggle}
          aria-label={showClose ? 'Voltar ao menu' : 'Menu'}
        >
          {showClose ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>

        <div className={styles.logo}>
          <img
            src="/images/logo/logo_white_transparent.png"
            alt="Cadastraqui"
            className={styles.logoImg}
          />
          {tenantLogoSrc && (
            <>
              <span className={styles.logoDivider} />
              <img
                src={tenantLogoSrc}
                alt={tenant?.nome || 'Instituição'}
                className={styles.logoInst}
              />
            </>
          )}
        </div>
      </div>

      <div className={styles.right}>
        <NotificacoesDropdown />

        <button className={styles.userButton} onClick={() => {
          const perfilPath = roleConfig?.rota ? `${roleConfig.rota}/perfil` : '/perfil'
          navigate(slug ? `/${slug}${perfilPath}` : perfilPath)
        }}>
          <div className={styles.userAvatar}>
            <FiUser size={16} />
          </div>
          <span className={styles.userRoleName}>{roleConfig?.nome || 'Usuário'}</span>
        </button>

        <button
          className={styles.logoutButton}
          onClick={handleLogout}
          title="Sair"
        >
          <FiLogOut size={18} />
        </button>
      </div>
    </header>
  )
}
