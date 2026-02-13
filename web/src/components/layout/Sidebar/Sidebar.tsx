import { NavLink, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useRecoilValue, useSetRecoilState } from 'recoil'
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
  FiHelpCircle,
  FiClock,
  FiMessageSquare,
} from 'react-icons/fi'
import { authState, sidebarState, sidebarModeState } from '@/atoms'
import { ROLES_CONFIG, Role } from '@/types'
import styles from './Sidebar.module.scss'

// ===========================================
// MENU PADRÃO POR ROLE
// ===========================================

const menusByRole: Record<string, { label: string; path: string; icon: JSX.Element; triggerCadastro?: boolean }[]> = {
  ADMIN: [
    { label: 'Início', path: '/admin', icon: <FiHome /> },
    { label: 'Usuários', path: '/admin/usuarios', icon: <FiUsers /> },
    { label: 'Instituições', path: '/admin/instituicoes', icon: <FiBookOpen /> },
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
    { label: 'Cadastro', path: '/candidato/cadastro', icon: <FiFileText />, triggerCadastro: true },
    { label: 'Solicitações', path: '/candidato/candidaturas', icon: <FiMessageSquare /> },
    { label: 'Agenda', path: '/candidato/agendamentos', icon: <FiCalendar /> },
    { label: 'Histórico', path: '/candidato/editais', icon: <FiClock /> },
    { label: 'SAC', path: '/candidato/documentos', icon: <FiHelpCircle /> },
    { label: 'Perfil', path: '/candidato/perfil', icon: <FiSettings /> },
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

// ===========================================
// SEÇÕES DO CADASTRO (sidebar de seções)
// ===========================================

const CADASTRO_SECTIONS = [
  { id: 'candidato', label: 'Candidato', icon: '/icons/user.svg' },
  { id: 'grupo-familiar', label: 'Grupo Familiar', icon: '/icons/family.svg' },
  { id: 'moradia', label: 'Moradia', icon: '/icons/house.svg' },
  { id: 'veiculo', label: 'Veículo', icon: '/icons/car.svg' },
  { id: 'renda', label: 'Renda', icon: '/icons/currency.svg' },
  { id: 'gastos', label: 'Gastos', icon: '/icons/money.svg' },
  { id: 'saude', label: 'Saúde', icon: '/icons/doctor.svg' },
  { id: 'declaracoes', label: 'Declarações', icon: '/icons/document.svg' },
]

// ===========================================
// COMPONENTE
// ===========================================

export function Sidebar() {
  const auth = useRecoilValue(authState)
  const sidebar = useRecoilValue(sidebarState)
  const setSidebar = useSetRecoilState(sidebarState)
  const sidebarMode = useRecoilValue(sidebarModeState)
  const setSidebarMode = useSetRecoilState(sidebarModeState)
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  if (!auth.usuario) return null

  const roleConfig = ROLES_CONFIG[auth.usuario.role]
  const menuItems = menusByRole[auth.usuario.role] || []

  const buildPath = (path: string) => (slug ? `/${slug}${path}` : path)

  // Handler para clicar em "Cadastro" — ativa a sidebar de seções
  const handleMenuClick = (item: typeof menuItems[0], e: React.MouseEvent) => {
    if (item.triggerCadastro) {
      e.preventDefault()
      setSidebarMode({ mode: 'cadastro', activeSection: 'candidato' })
      navigate(buildPath(item.path))
    }
  }

  // Handler para clicar em uma seção do cadastro
  const handleSectionClick = (sectionId: string) => {
    setSidebarMode({ mode: 'cadastro', activeSection: sectionId })
  }

  // ===== RENDER: Sidebar de Cadastro (seções) =====
  if (sidebarMode.mode === 'cadastro') {
    return (
      <>
        {sidebar.isOpen && <div className={styles.overlay} />}
        <aside className={`${styles.sidebar} ${sidebar.isOpen ? '' : styles.closed}`}
          style={{ '--role-color': roleConfig.cor, '--role-color-light': roleConfig.corClara } as React.CSSProperties}
        >
          <nav className={styles.sectionNav}>
            {CADASTRO_SECTIONS.map((section) => {
              const isActive = section.id === sidebarMode.activeSection
              return (
                <button
                  key={section.id}
                  className={`${styles.sectionBtn} ${isActive ? styles.sectionActive : ''}`}
                  onClick={() => handleSectionClick(section.id)}
                >
                  <div className={styles.sectionIconCircle}>
                    <img src={section.icon} alt="" className={styles.sectionIcon} />
                  </div>
                  <span className={styles.sectionLabel}>{section.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>
      </>
    )
  }

  // ===== RENDER: Sidebar padrão (menu) =====
  return (
    <>
      {sidebar.isOpen && <div className={styles.overlay} />}
      <aside
        className={`${styles.sidebar} ${sidebar.isOpen ? '' : styles.closed}`}
        style={{ '--role-color': roleConfig.cor, '--role-color-light': roleConfig.corClara } as React.CSSProperties}
      >
        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={buildPath(item.path)}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              end={item.path === roleConfig.rota}
              onClick={(e) => handleMenuClick(item, e)}
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
