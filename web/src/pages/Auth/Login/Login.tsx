import { useState } from 'react'
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
import styles from './Login.module.scss'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)
  const setAuth = useSetRecoilState(authState)
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    if (!selectedRole) {
      toast.warning('Selecione o tipo de acesso')
      return
    }

    setLoading(true)
    try {
      const response = await authService.login(data.email, data.senha)
      
      // Verificar se o role do usuário corresponde ao selecionado
      if (response.usuario.role !== selectedRole) {
        toast.error(`Este usuário não tem acesso como ${ROLES_CONFIG[selectedRole].nome}`)
        setLoading(false)
        return
      }

      setAuth({
        token: response.token,
        usuario: response.usuario,
        isAuthenticated: true,
      })

      toast.success(`Bem-vindo(a)!`)
      const userRole = response.usuario.role as Role
      const baseRota = ROLES_CONFIG[userRole].rota
      // Se estiver dentro de um tenant, prefixar com o slug
      const rota = slug ? `/${slug}${baseRota}` : baseRota
      navigate(rota)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>📋</span>
          <h1 className={styles.brandTitle}>Cadastraqui</h1>
          <p className={styles.brandSubtitle}>
            Sistema de Gestão de Certificação CEBAS
          </p>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.formContainer}>
          <h2 className={styles.title}>Entrar no Sistema</h2>
          <p className={styles.subtitle}>Selecione o tipo de acesso e faça login</p>

          {/* Seleção de Role */}
          <div className={styles.roleSelection}>
            {(Object.keys(ROLES_CONFIG) as Role[]).map((role) => {
              const config = ROLES_CONFIG[role]
              return (
                <button
                  key={role}
                  type="button"
                  className={`${styles.roleCard} ${selectedRole === role ? styles.selected : ''}`}
                  style={
                    {
                      '--role-color': config.cor,
                      '--role-color-light': config.corClara,
                    } as React.CSSProperties
                  }
                  onClick={() => setSelectedRole(role)}
                >
                  <span className={styles.roleIcon}>{config.icone}</span>
                  <span className={styles.roleName}>{config.nome}</span>
                </button>
              )
            })}
          </div>

          {/* Formulário de Login */}
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              error={errors.senha?.message}
              {...register('senha')}
            />

            <Button
              type="submit"
              fullWidth
              loading={loading}
              style={
                selectedRole
                  ? ({ '--role-color': ROLES_CONFIG[selectedRole].cor } as React.CSSProperties)
                  : undefined
              }
            >
              Entrar
            </Button>
          </form>

          <div className={styles.links}>
            <Link to={slug ? `/${slug}/esqueci-senha` : '/esqueci-senha'}>Esqueci minha senha</Link>
            <span>•</span>
            <Link to={slug ? `/${slug}/registrar` : '/registrar'}>Criar conta</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
