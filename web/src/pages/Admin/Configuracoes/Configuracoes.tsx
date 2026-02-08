import { useState, useEffect } from 'react'
import { 
  FiSettings, 
  FiSave, 
  FiMail, 
  FiDatabase,
  FiShield,
  FiGlobe,
  FiClock,
  FiCheck
} from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import { Select } from '@/components/common/Select/Select'
import { api } from '@/services/api'
import styles from './Configuracoes.module.scss'

interface Configuracao {
  chave: string
  valor: string
  descricao: string
  tipo: 'texto' | 'numero' | 'booleano' | 'email'
}

export function Configuracoes() {
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  
  // Configurações Gerais
  const [nomeAplicacao, setNomeAplicacao] = useState('CadastrAQUI')
  const [emailSuporte, setEmailSuporte] = useState('suporte@cadastraqui.com.br')
  const [urlBase, setUrlBase] = useState('https://cadastraqui.com.br')
  
  // Configurações de Email
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [emailRemetente, setEmailRemetente] = useState('')
  
  // Configurações de Segurança
  const [sessaoExpiracao, setSessaoExpiracao] = useState('24')
  const [tentativasLogin, setTentativasLogin] = useState('5')
  const [bloqueioMinutos, setBloqueioMinutos] = useState('30')
  
  // Configurações de Sistema
  const [manterLogs, setManterLogs] = useState('90')
  const [backupAutomatico, setBackupAutomatico] = useState('true')
  const [manutencao, setManutencao] = useState('false')

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  async function carregarConfiguracoes() {
    try {
      const response = await api.get('/admin/configuracoes')
      const configs = response.data.configuracoes || {}
      
      // Mapear configurações
      if (configs.nomeAplicacao) setNomeAplicacao(configs.nomeAplicacao)
      if (configs.emailSuporte) setEmailSuporte(configs.emailSuporte)
      if (configs.urlBase) setUrlBase(configs.urlBase)
      if (configs.smtpHost) setSmtpHost(configs.smtpHost)
      if (configs.smtpPort) setSmtpPort(configs.smtpPort)
      if (configs.smtpUser) setSmtpUser(configs.smtpUser)
      if (configs.emailRemetente) setEmailRemetente(configs.emailRemetente)
      if (configs.sessaoExpiracao) setSessaoExpiracao(configs.sessaoExpiracao)
      if (configs.tentativasLogin) setTentativasLogin(configs.tentativasLogin)
      if (configs.bloqueioMinutos) setBloqueioMinutos(configs.bloqueioMinutos)
      if (configs.manterLogs) setManterLogs(configs.manterLogs)
      if (configs.backupAutomatico) setBackupAutomatico(configs.backupAutomatico)
      if (configs.manutencao) setManutencao(configs.manutencao)
    } catch (error) {
      console.log('Configurações ainda não definidas')
    }
  }

  async function handleSalvar() {
    setSalvando(true)
    setSucesso(false)
    
    try {
      await api.post('/admin/configuracoes', {
        nomeAplicacao,
        emailSuporte,
        urlBase,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass: smtpPass || undefined, // Não enviar se vazio
        emailRemetente,
        sessaoExpiracao,
        tentativasLogin,
        bloqueioMinutos,
        manterLogs,
        backupAutomatico,
        manutencao,
      })
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao salvar configurações')
    } finally {
      setSalvando(false)
    }
  }

  async function testarEmail() {
    try {
      await api.post('/admin/configuracoes/testar-email')
      alert('Email de teste enviado com sucesso!')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao enviar email de teste')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Configurações do Sistema</h1>
          <p>Gerencie as configurações gerais da aplicação</p>
        </div>
        <Button onClick={handleSalvar} disabled={salvando}>
          {sucesso ? <FiCheck size={18} /> : <FiSave size={18} />}
          {salvando ? 'Salvando...' : sucesso ? 'Salvo!' : 'Salvar Alterações'}
        </Button>
      </div>

      <div className={styles.grid}>
        {/* Configurações Gerais */}
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <FiGlobe size={20} />
            <h2>Configurações Gerais</h2>
          </div>
          <div className={styles.form}>
            <Input
              label="Nome da Aplicação"
              value={nomeAplicacao}
              onChange={(e) => setNomeAplicacao(e.target.value)}
            />
            <Input
              label="Email de Suporte"
              type="email"
              value={emailSuporte}
              onChange={(e) => setEmailSuporte(e.target.value)}
            />
            <Input
              label="URL Base"
              value={urlBase}
              onChange={(e) => setUrlBase(e.target.value)}
              placeholder="https://seudominio.com.br"
            />
          </div>
        </Card>

        {/* Configurações de Email */}
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <FiMail size={20} />
            <h2>Configurações de Email (SMTP)</h2>
          </div>
          <div className={styles.form}>
            <div className={styles.row}>
              <Input
                label="Servidor SMTP"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.exemplo.com"
              />
              <Input
                label="Porta"
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
              />
            </div>
            <div className={styles.row}>
              <Input
                label="Usuário SMTP"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
              />
              <Input
                label="Senha SMTP"
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Input
              label="Email Remetente"
              type="email"
              value={emailRemetente}
              onChange={(e) => setEmailRemetente(e.target.value)}
              placeholder="noreply@exemplo.com"
            />
            <Button variant="outline" onClick={testarEmail}>
              <FiMail size={16} /> Enviar Email de Teste
            </Button>
          </div>
        </Card>

        {/* Configurações de Segurança */}
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <FiShield size={20} />
            <h2>Segurança</h2>
          </div>
          <div className={styles.form}>
            <Input
              label="Expiração da Sessão (horas)"
              type="number"
              value={sessaoExpiracao}
              onChange={(e) => setSessaoExpiracao(e.target.value)}
              min={1}
              max={720}
            />
            <div className={styles.row}>
              <Input
                label="Tentativas de Login"
                type="number"
                value={tentativasLogin}
                onChange={(e) => setTentativasLogin(e.target.value)}
                min={3}
                max={10}
              />
              <Input
                label="Tempo de Bloqueio (min)"
                type="number"
                value={bloqueioMinutos}
                onChange={(e) => setBloqueioMinutos(e.target.value)}
                min={5}
                max={1440}
              />
            </div>
          </div>
        </Card>

        {/* Configurações de Sistema */}
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <FiDatabase size={20} />
            <h2>Sistema</h2>
          </div>
          <div className={styles.form}>
            <Input
              label="Manter Logs por (dias)"
              type="number"
              value={manterLogs}
              onChange={(e) => setManterLogs(e.target.value)}
              min={30}
              max={365}
            />
            <Select
              label="Backup Automático"
              value={backupAutomatico}
              onChange={(e) => setBackupAutomatico(e.target.value)}
            >
              <option value="true">Habilitado</option>
              <option value="false">Desabilitado</option>
            </Select>
            <Select
              label="Modo Manutenção"
              value={manutencao}
              onChange={(e) => setManutencao(e.target.value)}
            >
              <option value="false">Desativado</option>
              <option value="true">Ativado (bloqueia acesso)</option>
            </Select>
            {manutencao === 'true' && (
              <div className={styles.warning}>
                ⚠️ O modo manutenção bloqueará o acesso de todos os usuários exceto administradores.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Informações do Sistema */}
      <Card className={styles.infoCard}>
        <div className={styles.sectionHeader}>
          <FiClock size={20} />
          <h2>Informações do Sistema</h2>
        </div>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <label>Versão</label>
            <span>2.0.0</span>
          </div>
          <div className={styles.infoItem}>
            <label>Ambiente</label>
            <span>{import.meta.env.MODE}</span>
          </div>
          <div className={styles.infoItem}>
            <label>API</label>
            <span>{import.meta.env.VITE_API_URL || 'http://localhost:3333'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Data/Hora Servidor</label>
            <span>{new Date().toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
