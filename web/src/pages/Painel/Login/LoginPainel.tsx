import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSetRecoilState } from 'recoil'
import { toast } from 'react-toastify'
import { authState } from '@/atoms'
import { authService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import styles from './LoginPainel.module.scss'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPainel() {
  const [loading, setLoading] = useState(false)
  const setAuth = useSetRecoilState(authState)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const response = await authService.login(data.email, data.senha)

      // Verificar se é equipe Cadastraqui (INSTITUICAO sem instituicaoId) ou ADMIN
      const { role, instituicaoId } = response.usuario
      const isEquipe = (role === 'INSTITUICAO' && !instituicaoId) || role === 'ADMIN'

      if (!isEquipe) {
        toast.error('Acesso restrito à equipe Cadastraqui')
        setLoading(false)
        return
      }

      setAuth({
        token: response.token,
        usuario: response.usuario,
        isAuthenticated: true,
      })

      toast.success('Bem-vindo(a)!')
      navigate('/painel')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* Header central com logo */}
      <header className={styles.header}>
        <img
          src="/images/logo/logo_primary_transparent.png"
          alt="Cadastraqui"
          className={styles.headerLogo}
        />
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h2 className={styles.title}>Painel Cadastraqui</h2>
          <p className={styles.subtitle}>Acesso restrito à equipe de administração</p>

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <Input
              label="Email"
              type="email"
              placeholder="equipe@cadastraqui.com.br"
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
            <Button type="submit" fullWidth loading={loading}>
              Entrar
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
