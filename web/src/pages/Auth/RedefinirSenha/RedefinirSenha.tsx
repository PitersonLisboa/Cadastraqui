import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { FiLock, FiArrowLeft, FiCheck, FiAlertCircle } from 'react-icons/fi'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import { api } from '@/services/api'
import styles from './RedefinirSenha.module.scss'

export function RedefinirSenha() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [validando, setValidando] = useState(true)
  const [tokenValido, setTokenValido] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [erroToken, setErroToken] = useState('')

  useEffect(() => {
    validarToken()
  }, [token])

  async function validarToken() {
    if (!token) {
      setErroToken('Token não informado')
      setValidando(false)
      return
    }

    try {
      const response = await api.get(`/auth/validar-token-recuperacao?token=${token}`)
      if (response.data.valido) {
        setTokenValido(true)
      } else {
        setErroToken(response.data.message || 'Token inválido')
      }
    } catch (error: any) {
      setErroToken(error.response?.data?.message || 'Token inválido ou expirado')
    } finally {
      setValidando(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!novaSenha || !confirmarSenha) {
      setErro('Preencha todos os campos')
      return
    }

    if (novaSenha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não conferem')
      return
    }

    setLoading(true)

    try {
      await api.post('/auth/redefinir-senha', {
        token,
        novaSenha,
        confirmarNovaSenha: confirmarSenha,
      })
      setSucesso(true)
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao redefinir senha')
    } finally {
      setLoading(false)
    }
  }

  if (validando) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Validando link...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!tokenValido) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorIcon}>
            <FiAlertCircle size={48} />
          </div>
          <h1>Link Inválido</h1>
          <p>{erroToken}</p>
          <Link to="/esqueci-senha" className={styles.linkButton}>
            Solicitar Novo Link
          </Link>
          <Link to="/login" className={styles.backLink}>
            <FiArrowLeft size={18} />
            Voltar para o Login
          </Link>
        </div>
      </div>
    )
  }

  if (sucesso) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successIcon}>
            <FiCheck size={48} />
          </div>
          <h1>Senha Redefinida!</h1>
          <p>Sua senha foi alterada com sucesso. Agora você pode fazer login com sua nova senha.</p>
          <Button onClick={() => navigate('/login')} fullWidth>
            Fazer Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>📚 CADASTRAQUI</div>
          <h1>Redefinir Senha</h1>
          <p>Digite sua nova senha</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {erro && <div className={styles.erro}>{erro}</div>}

          <Input
            label="Nova Senha"
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            icon={<FiLock />}
            autoFocus
          />

          <Input
            label="Confirmar Nova Senha"
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            placeholder="Digite novamente"
            icon={<FiLock />}
          />

          <Button type="submit" disabled={loading} fullWidth>
            {loading ? 'Salvando...' : 'Redefinir Senha'}
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
