import { useState, useEffect } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { useNavigate } from 'react-router-dom'
import { 
  FiUser, 
  FiMail, 
  FiLock, 
  FiPhone,
  FiMapPin,
  FiSave,
  FiLogOut,
  FiAlertTriangle
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { authState } from '@/atoms'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import { Modal } from '@/components/common/Modal/Modal'
import { perfilService, authService } from '@/services/api'
import styles from './Perfil.module.scss'

export function Perfil() {
  const auth = useRecoilValue(authState)
  const setAuth = useSetRecoilState(authState)
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'dados' | 'senha' | 'email'>('dados')
  const [modalDesativar, setModalDesativar] = useState(false)
  
  const [dadosPessoais, setDadosPessoais] = useState<any>({})
  const [senhaForm, setSenhaForm] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
  const [emailForm, setEmailForm] = useState({ novoEmail: '', senha: '' })
  const [senhaDesativar, setSenhaDesativar] = useState('')

  useEffect(() => {
    carregarPerfil()
  }, [])

  async function carregarPerfil() {
    try {
      const data = await perfilService.obter()
      setPerfil(data)
      if (data.perfil) {
        setDadosPessoais(data.perfil)
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSalvarDados(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (auth.usuario?.role === 'CANDIDATO') {
        await perfilService.atualizarCandidato(dadosPessoais)
      } else if (auth.usuario?.role === 'INSTITUICAO') {
        await perfilService.atualizarInstituicao(dadosPessoais)
      }
      toast.success('Dados atualizados!')
    } catch (error) {
      toast.error('Erro ao atualizar dados')
    } finally {
      setSaving(false)
    }
  }

  async function handleAlterarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (senhaForm.novaSenha !== senhaForm.confirmarSenha) {
      toast.error('As senhas não conferem')
      return
    }
    setSaving(true)
    try {
      await perfilService.alterarSenha(senhaForm)
      toast.success('Senha alterada!')
      setSenhaForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar senha')
    } finally {
      setSaving(false)
    }
  }

  async function handleAlterarEmail(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await perfilService.alterarEmail(emailForm)
      toast.success('Email alterado! Faça login novamente.')
      handleLogout()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar email')
    } finally {
      setSaving(false)
    }
  }

  async function handleDesativarConta() {
    if (!senhaDesativar) {
      toast.warning('Digite sua senha')
      return
    }
    try {
      await perfilService.desativarConta(senhaDesativar)
      toast.success('Conta desativada')
      handleLogout()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro')
    }
  }

  function handleLogout() {
    authService.logout().catch(() => {})
    setAuth({ token: null, usuario: null, isAuthenticated: false })
    localStorage.removeItem('cadastraqui-persist')
    navigate('/login')
  }

  if (loading) {
    return <div className={styles.loading}><div className={styles.spinner}></div></div>
  }

  const isCandidato = auth.usuario?.role === 'CANDIDATO'
  const isInstituicao = auth.usuario?.role === 'INSTITUICAO'

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Meu Perfil</h1>
        <Button variant="outline" onClick={handleLogout}>
          <FiLogOut size={18} />
          Sair
        </Button>
      </div>

      <div className={styles.content}>
        <Card className={styles.sidebar}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              <FiUser size={32} />
            </div>
            <h3>{dadosPessoais.nome || perfil?.usuario?.email}</h3>
            <span>{auth.usuario?.role}</span>
          </div>

          <nav className={styles.nav}>
            <button 
              className={activeTab === 'dados' ? styles.active : ''} 
              onClick={() => setActiveTab('dados')}
            >
              <FiUser size={18} />
              Dados Pessoais
            </button>
            <button 
              className={activeTab === 'senha' ? styles.active : ''} 
              onClick={() => setActiveTab('senha')}
            >
              <FiLock size={18} />
              Alterar Senha
            </button>
            <button 
              className={activeTab === 'email' ? styles.active : ''} 
              onClick={() => setActiveTab('email')}
            >
              <FiMail size={18} />
              Alterar Email
            </button>
          </nav>

          <button className={styles.btnDesativar} onClick={() => setModalDesativar(true)}>
            <FiAlertTriangle size={18} />
            Desativar Conta
          </button>
        </Card>

        <Card className={styles.mainContent}>
          {activeTab === 'dados' && (isCandidato || isInstituicao) && (
            <form onSubmit={handleSalvarDados}>
              <h2><FiUser size={20} /> Dados Pessoais</h2>
              
              <div className={styles.formGrid}>
                <Input
                  label="Nome"
                  value={dadosPessoais.nome || ''}
                  onChange={(e) => setDadosPessoais({ ...dadosPessoais, nome: e.target.value })}
                />
                <Input
                  label="Telefone"
                  value={dadosPessoais.telefone || ''}
                  onChange={(e) => setDadosPessoais({ ...dadosPessoais, telefone: e.target.value })}
                />
                {isCandidato && (
                  <>
                    <Input
                      label="Celular"
                      value={dadosPessoais.celular || ''}
                      onChange={(e) => setDadosPessoais({ ...dadosPessoais, celular: e.target.value })}
                    />
                    <Input
                      label="Profissão"
                      value={dadosPessoais.profissao || ''}
                      onChange={(e) => setDadosPessoais({ ...dadosPessoais, profissao: e.target.value })}
                    />
                  </>
                )}
              </div>

              <h3><FiMapPin size={18} /> Endereço</h3>
              <div className={styles.formGrid}>
                <Input
                  label="CEP"
                  value={dadosPessoais.cep || ''}
                  onChange={(e) => setDadosPessoais({ ...dadosPessoais, cep: e.target.value })}
                />
                <Input
                  label="Endereço"
                  value={dadosPessoais.endereco || ''}
                  onChange={(e) => setDadosPessoais({ ...dadosPessoais, endereco: e.target.value })}
                />
                <Input
                  label="Número"
                  value={dadosPessoais.numero || ''}
                  onChange={(e) => setDadosPessoais({ ...dadosPessoais, numero: e.target.value })}
                />
                <Input
                  label="Bairro"
                  value={dadosPessoais.bairro || ''}
                  onChange={(e) => setDadosPessoais({ ...dadosPessoais, bairro: e.target.value })}
                />
                <Input
                  label="Cidade"
                  value={dadosPessoais.cidade || ''}
                  onChange={(e) => setDadosPessoais({ ...dadosPessoais, cidade: e.target.value })}
                />
                <Input
                  label="UF"
                  value={dadosPessoais.uf || ''}
                  onChange={(e) => setDadosPessoais({ ...dadosPessoais, uf: e.target.value })}
                  maxLength={2}
                />
              </div>

              <div className={styles.formActions}>
                <Button type="submit" disabled={saving}>
                  <FiSave size={18} />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'dados' && !isCandidato && !isInstituicao && (
            <div className={styles.emptyState}>
              <FiUser size={48} />
              <p>Edição de dados não disponível para seu perfil</p>
            </div>
          )}

          {activeTab === 'senha' && (
            <form onSubmit={handleAlterarSenha}>
              <h2><FiLock size={20} /> Alterar Senha</h2>
              
              <div className={styles.formStack}>
                <Input
                  label="Senha Atual"
                  type="password"
                  value={senhaForm.senhaAtual}
                  onChange={(e) => setSenhaForm({ ...senhaForm, senhaAtual: e.target.value })}
                  required
                />
                <Input
                  label="Nova Senha"
                  type="password"
                  value={senhaForm.novaSenha}
                  onChange={(e) => setSenhaForm({ ...senhaForm, novaSenha: e.target.value })}
                  required
                />
                <Input
                  label="Confirmar Nova Senha"
                  type="password"
                  value={senhaForm.confirmarSenha}
                  onChange={(e) => setSenhaForm({ ...senhaForm, confirmarSenha: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formActions}>
                <Button type="submit" disabled={saving}>
                  <FiSave size={18} />
                  {saving ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'email' && (
            <form onSubmit={handleAlterarEmail}>
              <h2><FiMail size={20} /> Alterar Email</h2>
              <p className={styles.warning}>
                Após alterar o email, você precisará fazer login novamente.
              </p>
              
              <div className={styles.formStack}>
                <Input
                  label="Novo Email"
                  type="email"
                  value={emailForm.novoEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, novoEmail: e.target.value })}
                  required
                />
                <Input
                  label="Sua Senha (para confirmar)"
                  type="password"
                  value={emailForm.senha}
                  onChange={(e) => setEmailForm({ ...emailForm, senha: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formActions}>
                <Button type="submit" disabled={saving}>
                  <FiSave size={18} />
                  {saving ? 'Alterando...' : 'Alterar Email'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>

      <Modal
        isOpen={modalDesativar}
        onClose={() => { setModalDesativar(false); setSenhaDesativar(''); }}
        title="Desativar Conta"
      >
        <div className={styles.modalDesativar}>
          <FiAlertTriangle size={48} className={styles.iconeDanger} />
          <p>Tem certeza que deseja desativar sua conta? Você não poderá mais acessar o sistema.</p>
          
          <Input
            label="Digite sua senha para confirmar"
            type="password"
            value={senhaDesativar}
            onChange={(e) => setSenhaDesativar(e.target.value)}
          />

          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => { setModalDesativar(false); setSenhaDesativar(''); }}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDesativarConta}>
              Desativar Conta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
