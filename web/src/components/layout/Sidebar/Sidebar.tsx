import { NavLink, useParams } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import {
  FiHome,
  FiUsers,
  FiFileText,
  FiSettings,
  FiCalendar,
  FiFolder,
  FiClipboard,
  FiUserCheck,
  FiBookOpen,
  FiBarChart2,
  FiActivity,
} from 'react-icons/fi'
import { authState, sidebarState } from '@/atoms'
import { ROLES_CONFIG, Role } from '@/types'
import styles from './Sidebar.module.scss'

interface MenuItem {
  label: string
  path: string
  icon: React.ReactNode
}

const menusByRole: Record<Role, MenuItem[]> = {
  ADMIN: [
    { label: 'Início', path: '/admin', icon: <FiHome /> },
    { label: 'Usuários', path: '/admin/usuarios', icon: <FiUserCheck /> },
    { label: 'Instituições', path: '/admin/instituicoes', icon: <FiUsers /> },
    { label: 'Relatórios', path: '/admin/relatorios', icon: <FiBarChart2 /> },
    { label: 'Logs', path: '/admin/logs', icon: <FiActivity /> },
    { label: 'Configurações', path: '/admin/configuracoes', icon: <FiSettings /> },
  ],
  INSTITUICAO: [
    { label: 'Início', path: '/instituicao', icon: <FiHome /> },
    { label: 'Editais', path: '/instituicao/editais', icon: <FiBookOpen /> },
    { label: 'Candidaturas', path: '/instituicao/candidaturas', icon: <FiClipboard /> },
    { label: 'Equipe', path: '/instituicao/equipe', icon: <FiUsers /> },
    { label: 'Relatórios', path: '/instituicao/relatorios', icon: <FiBarChart2 /> },
    { label: 'Meu Perfil', path: '/instituicao/perfil', icon: <FiSettings /> },
  ],
  CANDIDATO: [
    { label: 'Início', path: '/candidato', icon: <FiHome /> },
    { label: 'Editais Disponíveis', path: '/candidato/editais', icon: <FiBookOpen /> },
    { label: 'Minhas Candidaturas', path: '/candidato/candidaturas', icon: <FiClipboard /> },
    { label: 'Meus Documentos', path: '/candidato/documentos', icon: <FiFolder /> },
    { label: 'Minha Família', path: '/candidato/familia', icon: <FiUsers /> },
    { label: 'Agendamentos', path: '/candidato/agendamentos', icon: <FiCalendar /> },
    { label: 'Meu Perfil', path: '/candidato/perfil', icon: <FiSettings /> },
  ],
  ASSISTENTE_SOCIAL: [
    { label: 'Início', path: '/assistente-social', icon: <FiHome /> },
    { label: 'Candidaturas', path: '/assistente-social/candidaturas', icon: <FiClipboard /> },
    { label: 'Agendamentos', path: '/assistente-social/agendamentos', icon: <FiCalendar /> },
    { label: 'Pareceres', path: '/assistente-social/pareceres', icon: <FiFileText /> },
    { label: 'Meu Perfil', path: '/assistente-social/perfil', icon: <FiSettings /> },
  ],
  ADVOGADO: [
    { label: 'Início', path: '/advogado', icon: <FiHome /> },
    { label: 'Candidaturas', path: '/advogado/candidaturas', icon: <FiClipboard /> },
    { label: 'Pareceres Jurídicos', path: '/advogado/pareceres', icon: <FiFileText /> },
    { label: 'Meu Perfil', path: '/advogado/perfil', icon: <FiSettings /> },
  ],
}

export function Sidebar() {
  const auth = useRecoilValue(authState)
  const sidebar = useRecoilValue(sidebarState)
  const { slug } = useParams<{ slug: string }>()

  if (!auth.usuario) return null

  const roleConfig = ROLES_CONFIG[auth.usuario.role]
  const menuItems = menusByRole[auth.usuario.role] || []

  // Prefixa com slug do tenant se existir
  const buildPath = (path: string) => {
    if (slug) return `/${slug}${path}`
    return path
  }

  return (
    <>
      {/* Overlay mobile */}
      {sidebar.isOpen && (
        <div className={styles.overlay} />
      )}

      <aside
        className={`${styles.sidebar} ${sidebar.isOpen ? '' : styles.closed}`}
        style={
          {
            '--role-color': roleConfig.cor,
            '--role-color-light': roleConfig.corClara,
          } as React.CSSProperties
        }
      >
        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={buildPath(item.path)}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              end={item.path === roleConfig.rota}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.footer}>
          <span className={styles.version}>Cadastraqui v2.0</span>
        </div>
      </aside>
    </>
  )
}
