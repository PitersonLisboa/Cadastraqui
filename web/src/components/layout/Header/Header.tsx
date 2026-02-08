import { useRecoilValue, useSetRecoilState } from 'recoil'
import { useNavigate } from 'react-router-dom'
import { FiMenu, FiLogOut, FiUser } from 'react-icons/fi'
import { authState, sidebarState } from '@/atoms'
import { ROLES_CONFIG } from '@/types'
import { NotificacoesDropdown } from '@/components/common/Notificacoes/NotificacoesDropdown'
import styles from './Header.module.scss'

export function Header() {
  const auth = useRecoilValue(authState)
  const setSidebar = useSetRecoilState(sidebarState)
  const setAuth = useSetRecoilState(authState)
  const navigate = useNavigate()

  const roleConfig = auth.usuario ? ROLES_CONFIG[auth.usuario.role] : null

  const handleToggleSidebar = () => {
    setSidebar((prev) => ({ ...prev, isOpen: !prev.isOpen }))
  }

  const handleLogout = () => {
    setAuth({ token: null, usuario: null, isAuthenticated: false })
    localStorage.removeItem('cadastraqui-persist')
    navigate('/login')
  }

  if (!auth.usuario) return null

  return (
    <header
      className={styles.header}
      style={{ '--role-color': roleConfig?.cor } as React.CSSProperties}
    >
      <div className={styles.left}>
        <button className={styles.menuButton} onClick={handleToggleSidebar}>
          <FiMenu size={24} />
        </button>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>📋</span>
          <span className={styles.logoText}>Cadastraqui</span>
        </div>
      </div>

      <div className={styles.right}>
        <NotificacoesDropdown />

        <div className={styles.userInfo}>
          <div className={styles.userAvatar} style={{ backgroundColor: roleConfig?.cor }}>
            {roleConfig?.icone || <FiUser size={18} />}
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userEmail}>{auth.usuario.email}</span>
            <span className={styles.userRole} style={{ color: roleConfig?.cor }}>
              {roleConfig?.nome}
            </span>
          </div>
        </div>

        <button className={styles.logoutButton} onClick={handleLogout}>
          <FiLogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </header>
  )
}
