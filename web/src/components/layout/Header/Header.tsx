import { useRecoilValue, useSetRecoilState } from 'recoil'
import { useNavigate, useParams } from 'react-router-dom'
import { FiMenu, FiLogOut, FiUser, FiBell } from 'react-icons/fi'
import { authState, sidebarState } from '@/atoms'
import { ROLES_CONFIG } from '@/types'
import { NotificacoesDropdown } from '@/components/common/Notificacoes/NotificacoesDropdown'
import styles from './Header.module.scss'

export function Header() {
  const auth = useRecoilValue(authState)
  const setSidebar = useSetRecoilState(sidebarState)
  const setAuth = useSetRecoilState(authState)
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()

  const roleConfig = auth.usuario ? ROLES_CONFIG[auth.usuario.role] : null

  const handleToggleSidebar = () => {
    setSidebar((prev) => ({ ...prev, isOpen: !prev.isOpen }))
  }

  const handleLogout = () => {
    setAuth({ token: null, usuario: null, isAuthenticated: false })
    localStorage.removeItem('cadastraqui-persist')
    navigate(slug ? `/${slug}/login` : '/login')
  }

  if (!auth.usuario) return null

  return (
    <header className={styles.header}>
      {/* Esquerda: hamburger + logo */}
      <div className={styles.left}>
        <button
          className={styles.menuButton}
          onClick={handleToggleSidebar}
          aria-label="Menu"
        >
          <FiMenu size={22} />
        </button>

        <div className={styles.logo}>
          <img
            src="/images/logo/logo_white_transparent.png"
            alt="Cadastraqui"
            className={styles.logoImg}
          />
        </div>
      </div>

      {/* Direita: notificações + user info */}
      <div className={styles.right}>
        <NotificacoesDropdown />

        <button className={styles.userButton} onClick={() => navigate(roleConfig?.rota ? `${roleConfig.rota}/perfil` : '/perfil')}>
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
