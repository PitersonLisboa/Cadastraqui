import { Outlet } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import { Header } from '../Header/Header'
import { Sidebar } from '../Sidebar/Sidebar'
import { sidebarState, authState } from '@/atoms'
import { ROLES_CONFIG } from '@/types'
import styles from './Layout.module.scss'

export function Layout() {
  const sidebar = useRecoilValue(sidebarState)
  const auth = useRecoilValue(authState)

  const roleConfig = auth.usuario ? ROLES_CONFIG[auth.usuario.role] : null

  return (
    <div
      className={styles.layout}
      style={
        {
          '--role-color': roleConfig?.cor,
          '--role-color-light': roleConfig?.corClara,
        } as React.CSSProperties
      }
    >
      <Header />
      <Sidebar />
      <main className={`${styles.main} ${sidebar.isOpen ? '' : styles.sidebarClosed}`}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
