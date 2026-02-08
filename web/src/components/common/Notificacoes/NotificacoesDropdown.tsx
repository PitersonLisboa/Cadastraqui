import { useState, useEffect, useRef } from 'react'
import { FiBell, FiCheck, FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { notificacaoService } from '@/services/api'
import styles from './NotificacoesDropdown.module.scss'

interface Notificacao {
  id: string
  tipo: 'INFO' | 'SUCESSO' | 'ALERTA' | 'ERRO'
  titulo: string
  mensagem: string
  lida: boolean
  link?: string
  criadoEm: string
}

export function NotificacoesDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    carregarContagem()
    const interval = setInterval(carregarContagem, 30000) // Atualiza a cada 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function carregarContagem() {
    try {
      const { count } = await notificacaoService.contarNaoLidas()
      setNaoLidas(count)
    } catch (error) {
      console.error('Erro ao carregar contagem:', error)
    }
  }

  async function carregarNotificacoes() {
    setLoading(true)
    try {
      const { notificacoes: data } = await notificacaoService.listar({ limite: 10 })
      setNotificacoes(data)
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleDropdown() {
    if (!isOpen) {
      carregarNotificacoes()
    }
    setIsOpen(!isOpen)
  }

  async function marcarComoLida(id: string) {
    try {
      await notificacaoService.marcarComoLida(id)
      setNotificacoes(prev => 
        prev.map(n => n.id === id ? { ...n, lida: true } : n)
      )
      setNaoLidas(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  async function marcarTodasComoLidas() {
    try {
      await notificacaoService.marcarTodasComoLidas()
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
      setNaoLidas(0)
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }

  function handleNotificacaoClick(notificacao: Notificacao) {
    if (!notificacao.lida) {
      marcarComoLida(notificacao.id)
    }
    if (notificacao.link) {
      navigate(notificacao.link)
      setIsOpen(false)
    }
  }

  function getIcone(tipo: string) {
    switch (tipo) {
      case 'SUCESSO': return <FiCheckCircle className={styles.iconeSucesso} />
      case 'ALERTA': return <FiAlertCircle className={styles.iconeAlerta} />
      case 'ERRO': return <FiX className={styles.iconeErro} />
      default: return <FiInfo className={styles.iconeInfo} />
    }
  }

  function formatarData(data: string) {
    const date = new Date(data)
    const agora = new Date()
    const diff = agora.getTime() - date.getTime()
    const minutos = Math.floor(diff / 60000)
    const horas = Math.floor(diff / 3600000)
    const dias = Math.floor(diff / 86400000)

    if (minutos < 1) return 'Agora'
    if (minutos < 60) return `${minutos}m atrás`
    if (horas < 24) return `${horas}h atrás`
    if (dias < 7) return `${dias}d atrás`
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button className={styles.trigger} onClick={toggleDropdown}>
        <FiBell size={20} />
        {naoLidas > 0 && (
          <span className={styles.badge}>
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Notificações</h3>
            {naoLidas > 0 && (
              <button 
                className={styles.marcarTodas}
                onClick={marcarTodasComoLidas}
              >
                <FiCheck size={14} />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className={styles.lista}>
            {loading ? (
              <div className={styles.loading}>Carregando...</div>
            ) : notificacoes.length === 0 ? (
              <div className={styles.empty}>
                <FiBell size={32} />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notificacoes.map(notificacao => (
                <div
                  key={notificacao.id}
                  className={`${styles.item} ${!notificacao.lida ? styles.naoLida : ''}`}
                  onClick={() => handleNotificacaoClick(notificacao)}
                >
                  <div className={styles.icone}>
                    {getIcone(notificacao.tipo)}
                  </div>
                  <div className={styles.conteudo}>
                    <strong>{notificacao.titulo}</strong>
                    <p>{notificacao.mensagem}</p>
                    <span className={styles.tempo}>
                      {formatarData(notificacao.criadoEm)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {notificacoes.length > 0 && (
            <div className={styles.footer}>
              <button onClick={() => { navigate('/notificacoes'); setIsOpen(false); }}>
                Ver todas as notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
