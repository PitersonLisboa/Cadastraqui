import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSetRecoilState } from 'recoil'
import { toast } from 'react-toastify'
import { authState } from '@/atoms'
import { authService } from '@/services/api'
import { ROLES_CONFIG, Role } from '@/types'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import { useTenant } from '@/contexts/TenantContext'
import styles from './Login.module.scss'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

// Roles restritos da instituição (dropdown)
const RESTRICTED_ROLES: { role: string; label: string }[] = [
  { role: 'SUPERVISAO', label: 'Supervisão' },
  { role: 'CONTROLE', label: 'Controle' },
  { role: 'OPERACIONAL', label: 'Operacional' },
  { role: 'ASSISTENTE_SOCIAL', label: 'Assistente Social' },
  { role: 'ADVOGADO', label: 'Advogado' },
  { role: 'GESTAO_ESCOLAR', label: 'Alunos - Gestão Escolar' },
]

// Tipos de acesso público — ícones SVG do 1.x
const PUBLIC_ACCESS_TYPES = [
  { id: 'ALUNO', label: 'Aluno', icon: '/icons/student.svg', isExternal: true },
  { id: 'CANDIDATO', label: 'Candidato', icon: '/icons/student-register.svg', isExternal: false },
]

export function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [restrictedRole, setRestrictedRole] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const setAuth = useSetRecoilState(authState)
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const { tenant } = useTenant()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const tenantPrimary = tenant?.corPrimaria || '#1F4B73'

  const handleRestrictedRoleSelect = (role: string) => {
    if (role === 'GESTAO_ESCOLAR') {
      toast.info('Acesso de Alunos - Gestão Escolar em breve!')
      setDropdownOpen(false)
      return
    }
    setRestrictedRole(role)
    setSelectedRole(role)
    setDropdownOpen(false)
    reset()
  }

  const handleBackToMain = () => {
    setRestrictedRole(null)
    setSelectedRole(null)
    reset()
  }

  const handlePublicAccess = (item: (typeof PUBLIC_ACCESS_TYPES)[number]) => {
    if (item.isExternal && slug) {
      navigate(`/${slug}/aluno`)
      return
    }
    setSelectedRole(item.id)
    setRestrictedRole(null)
  }

  const onSubmit = async (data: LoginForm) => {
    if (!selectedRole) {
      toast.warning('Selecione o tipo de acesso')
      return
    }

    setLoading(true)
    try {
      const response = await authService.login(data.email, data.senha)

      if (response.usuario.role !== selectedRole) {
        const roleName = ROLES_CONFIG[selectedRole as Role]?.nome || selectedRole
        toast.error(`Este usuário não tem acesso como ${roleName}`)
        setLoading(false)
        return
      }

      setAuth({
        token: response.token,
        usuario: response.usuario,
        isAuthenticated: true,
      })

      toast.success('Bem-vindo(a)!')
      const userRole = response.usuario.role as Role
      const baseRota = ROLES_CONFIG[userRole].rota
      const rota = slug ? `/${slug}${baseRota}` : baseRota
      navigate(rota)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const restrictedLabel = RESTRICTED_ROLES.find((r) => r.role === restrictedRole)?.label

  // ========================
  // RENDER: Sem tenant (admin / legado)
  // ========================
  if (!tenant) {
    return (
      <div className={styles.container}>
        <div className={styles.legacyLeft}>
          <div className={styles.brand}>
            <img
              src="/images/logo/logo_white_transparent.png"
              alt="Cadastraqui"
              className={styles.brandLogo}
            />
            <p className={styles.brandSubtitle}>Sistema de Gestão de Certificação CEBAS</p>
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.formContainer}>
            <h2 className={styles.title}>Entrar no Sistema</h2>
            <p className={styles.subtitle}>Selecione o tipo de acesso e faça login</p>
            <div className={styles.legacyRoleSelection}>
              {(Object.keys(ROLES_CONFIG) as Role[]).map((role) => {
                const config = ROLES_CONFIG[role]
                return (
                  <button
                    key={role}
                    type="button"
                    className={`${styles.roleCard} ${selectedRole === role ? styles.selected : ''}`}
                    style={
                      { '--role-color': config.cor, '--role-color-light': config.corClara } as React.CSSProperties
                    }
                    onClick={() => setSelectedRole(role)}
                  >
                    <span className={styles.roleIcon}>{config.icone}</span>
                    <span className={styles.roleName}>{config.nome}</span>
                  </button>
                )
              })}
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              <Input label="Email" type="email" placeholder="seu@email.com" error={errors.email?.message} {...register('email')} />
              <Input label="Senha" type="password" placeholder="••••••••" error={errors.senha?.message} {...register('senha')} />
              <Button type="submit" fullWidth loading={loading}>Entrar</Button>
            </form>
            <div className={styles.links}>
              <Link to="/esqueci-senha">Esqueci minha senha</Link>
              <span>•</span>
              <Link to="/registrar">Criar conta</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ========================
  // RENDER: Com tenant
  // ========================
  return (
    <div className={styles.tenantContainer}>
      {/* ===== STICKY HEADER ===== */}
      <header className={styles.stickyHeader}>
        <div className={styles.cadastraquiLogo}>
          <img src="/images/logo/logo_primary_transparent.png" alt="Cadastraqui" className={styles.cadastraquiLogoImg} />
        </div>

        <button className={styles.institutionLogoBtn} onClick={handleBackToMain} title={`Voltar — ${tenant.nome}`}>
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.nome} className={styles.institutionLogo} />
          ) : (
            <span className={styles.institutionNameFallback} style={{ color: tenantPrimary }}>
              {tenant.nome}
            </span>
          )}
        </button>

        <div className={styles.dropdownWrapper} ref={dropdownRef}>
          <button
            className={styles.dropdownToggle}
            style={{ backgroundColor: tenantPrimary }}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            Acesso Restrito
            <span className={`${styles.dropdownArrow} ${dropdownOpen ? styles.open : ''}`}>▾</span>
          </button>

          {dropdownOpen && (
            <div className={styles.dropdownMenu}>
              {RESTRICTED_ROLES.map((item) => (
                <button
                  key={item.role}
                  className={styles.dropdownItem}
                  onClick={() => handleRestrictedRoleSelect(item.role)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ===== CONTEÚDO ===== */}
      <main className={styles.mainContent}>
        <div className={styles.formContainer}>
          <h2 className={styles.title}>Entrar no Sistema</h2>

          {/* TELA 1: Acesso público */}
          {!restrictedRole && (
            <>
              <p className={styles.subtitle}>Selecione o tipo de acesso e faça login</p>

              <div className={styles.publicAccessCards}>
                {PUBLIC_ACCESS_TYPES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.accessCard} ${selectedRole === item.id ? styles.selected : ''}`}
                    style={{ '--access-color': tenantPrimary } as React.CSSProperties}
                    onClick={() => handlePublicAccess(item)}
                  >
                    <img src={item.icon} alt={item.label} className={styles.accessCardSvg} />
                    <span className={styles.accessCardLabel}>{item.label}</span>
                  </button>
                ))}
              </div>

              {selectedRole && (
                <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                  <Input label="Email" type="email" placeholder="seu@email.com" error={errors.email?.message} {...register('email')} />
                  <Input label="Senha" type="password" placeholder="••••••••" error={errors.senha?.message} {...register('senha')} />
                  <Button type="submit" fullWidth loading={loading} style={{ backgroundColor: tenantPrimary }}>Entrar</Button>
                </form>
              )}
            </>
          )}

          {/* TELA 2: Login restrito */}
          {restrictedRole && (
            <>
              <div className={styles.restrictedHeader}>
                <span className={styles.restrictedBadge} style={{ backgroundColor: tenantPrimary }}>Acesso Restrito</span>
                <h3 className={styles.restrictedRoleName}>{restrictedLabel}</h3>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                <Input type="email" placeholder="seu@email.com" error={errors.email?.message} {...register('email')} />
                <Input label="Senha" type="password" placeholder="••••••••" error={errors.senha?.message} {...register('senha')} />
                <Button type="submit" fullWidth loading={loading} style={{ backgroundColor: tenantPrimary }}>Entrar</Button>
              </form>
            </>
          )}

          <div className={styles.links}>
            <Link to={`/${slug}/esqueci-senha`}>Esqueci minha senha</Link>
            <span>•</span>
            <Link to={`/${slug}/registrar`}>Criar conta</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
