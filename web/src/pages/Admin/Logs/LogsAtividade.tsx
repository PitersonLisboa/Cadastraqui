import { useState, useEffect } from 'react'
import { 
  FiActivity, 
  FiSearch, 
  FiFilter, 
  FiUser,
  FiCalendar,
  FiClock
} from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import { api } from '@/services/api'
import styles from './LogsAtividade.module.scss'

interface Log {
  id: string
  acao: string
  entidade?: string
  entidadeId?: string
  detalhes?: any
  ip?: string
  criadoEm: string
  usuario: { email: string; nome?: string; role: string }
}

const ACAO_ICONS: Record<string, string> = {
  LOGIN: '🔐',
  LOGOUT: '🚪',
  CRIAR_USUARIO: '👤',
  ATUALIZAR_USUARIO: '✏️',
  ATIVAR_USUARIO: '✅',
  DESATIVAR_USUARIO: '🚫',
  RESETAR_SENHA: '🔑',
  ATUALIZAR_STATUS_INSTITUICAO: '🏢',
  CRIAR_EDITAL: '📋',
  ATUALIZAR_EDITAL: '📝',
  CRIAR_CANDIDATURA: '📄',
  ATUALIZAR_CANDIDATURA: '🔄',
}

const ACAO_LABELS: Record<string, string> = {
  LOGIN: 'Login realizado',
  LOGOUT: 'Logout',
  CRIAR_USUARIO: 'Usuário criado',
  ATUALIZAR_USUARIO: 'Usuário atualizado',
  ATIVAR_USUARIO: 'Usuário ativado',
  DESATIVAR_USUARIO: 'Usuário desativado',
  RESETAR_SENHA: 'Senha resetada',
  ATUALIZAR_STATUS_INSTITUICAO: 'Status de instituição alterado',
  CRIAR_EDITAL: 'Edital criado',
  ATUALIZAR_EDITAL: 'Edital atualizado',
  CRIAR_CANDIDATURA: 'Candidatura realizada',
  ATUALIZAR_CANDIDATURA: 'Candidatura atualizada',
}

export function LogsAtividade() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [paginacao, setPaginacao] = useState({ pagina: 1, total: 0, totalPaginas: 0 })
  
  const [filtroAcao, setFiltroAcao] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  useEffect(() => {
    carregarLogs()
  }, [paginacao.pagina])

  async function carregarLogs() {
    setLoading(true)
    try {
      const params: any = { pagina: paginacao.pagina, limite: 50 }
      if (filtroAcao) params.acao = filtroAcao
      if (dataInicio) params.dataInicio = new Date(dataInicio).toISOString()
      if (dataFim) params.dataFim = new Date(dataFim).toISOString()
      
      const response = await api.get('/admin/logs', { params })
      setLogs(response.data.logs)
      setPaginacao(prev => ({ ...prev, ...response.data.paginacao }))
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleFiltrar(e: React.FormEvent) {
    e.preventDefault()
    setPaginacao(prev => ({ ...prev, pagina: 1 }))
    carregarLogs()
  }

  function formatarData(data: string): string {
    return new Date(data).toLocaleString('pt-BR')
  }

  function formatarTempoRelativo(data: string): string {
    const agora = new Date()
    const dataLog = new Date(data)
    const diffMs = agora.getTime() - dataLog.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMs / 3600000)
    const diffDias = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'Agora'
    if (diffMin < 60) return `${diffMin} min atrás`
    if (diffHr < 24) return `${diffHr}h atrás`
    if (diffDias < 7) return `${diffDias} dias atrás`
    return dataLog.toLocaleDateString('pt-BR')
  }

  if (loading && logs.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando logs...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Logs de Atividade</h1>
          <p>{paginacao.total} registros</p>
        </div>
      </div>

      {/* Filtros */}
      <Card className={styles.filtros}>
        <form onSubmit={handleFiltrar} className={styles.filtrosForm}>
          <div className={styles.searchBox}>
            <FiSearch size={18} />
            <input
              type="text"
              placeholder="Buscar por ação..."
              value={filtroAcao}
              onChange={(e) => setFiltroAcao(e.target.value)}
            />
          </div>
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            placeholder="Data início"
          />
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            placeholder="Data fim"
          />
          <Button type="submit"><FiFilter size={16} /> Filtrar</Button>
        </form>
      </Card>

      {/* Lista de Logs */}
      <Card className={styles.logsCard}>
        <div className={styles.timeline}>
          {logs.map(log => (
            <div key={log.id} className={styles.logItem}>
              <div className={styles.logIcon}>
                <span>{ACAO_ICONS[log.acao] || '📌'}</span>
              </div>
              <div className={styles.logContent}>
                <div className={styles.logHeader}>
                  <span className={styles.logAcao}>
                    {ACAO_LABELS[log.acao] || log.acao}
                  </span>
                  <span className={styles.logTempo}>
                    <FiClock size={12} />
                    {formatarTempoRelativo(log.criadoEm)}
                  </span>
                </div>
                <div className={styles.logUser}>
                  <FiUser size={14} />
                  <span>{log.usuario.nome || log.usuario.email}</span>
                  <span className={styles.logRole}>{log.usuario.role}</span>
                </div>
                {log.detalhes && Object.keys(log.detalhes).length > 0 && (
                  <div className={styles.logDetalhes}>
                    {Object.entries(log.detalhes).map(([key, value]) => (
                      <span key={key}>
                        <strong>{key}:</strong> {String(value)}
                      </span>
                    ))}
                  </div>
                )}
                <div className={styles.logMeta}>
                  <span><FiCalendar size={12} /> {formatarData(log.criadoEm)}</span>
                  {log.ip && <span>IP: {log.ip}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {logs.length === 0 && (
          <div className={styles.empty}>
            <FiActivity size={48} />
            <p>Nenhum log encontrado</p>
          </div>
        )}

        {/* Paginação */}
        {paginacao.totalPaginas > 1 && (
          <div className={styles.paginacao}>
            <Button 
              variant="outline" 
              disabled={paginacao.pagina === 1}
              onClick={() => setPaginacao(prev => ({ ...prev, pagina: prev.pagina - 1 }))}
            >
              Anterior
            </Button>
            <span>Página {paginacao.pagina} de {paginacao.totalPaginas}</span>
            <Button 
              variant="outline"
              disabled={paginacao.pagina === paginacao.totalPaginas}
              onClick={() => setPaginacao(prev => ({ ...prev, pagina: prev.pagina + 1 }))}
            >
              Próxima
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
