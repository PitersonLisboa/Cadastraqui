import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiMail, FiArrowLeft, FiCheck } from 'react-icons/fi'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import { api } from '@/services/api'
import styles from './EsqueciSenha.module.scss'

export function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!email) {
      setErro('Digite seu email')
      return
    }

    setLoading(true)

    try {
      await api.post('/auth/recuperar-senha', { email })
      setEnviado(true)
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao solicitar recuperação')
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successIcon}>
            <FiCheck size={48} />
          </div>
          <h1>Email Enviado!</h1>
          <p>
            Se o email <strong>{email}</strong> estiver cadastrado em nossa plataforma, 
            você receberá um link para redefinir sua senha.
          </p>
          <p className={styles.hint}>
            Verifique também sua caixa de spam.
          </p>
          <Link to="/login" className={styles.backLink}>
            <FiArrowLeft size={18} />
            Voltar para o Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>📚 CADASTRAQUI</div>
          <h1>Esqueceu sua senha?</h1>
          <p>Digite seu email para receber um link de recuperação</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {erro && <div className={styles.erro}>{erro}</div>}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            icon={<FiMail />}
            autoFocus
          />

          <Button type="submit" disabled={loading} fullWidth>
            {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </Button>
        </form>

        <Link to="/login" className={styles.backLink}>
          <FiArrowLeft size={18} />
          Voltar para o Login
        </Link>
      </div>
    </div>
  )
}
