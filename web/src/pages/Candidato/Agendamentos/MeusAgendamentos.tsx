import { useState, useEffect } from 'react'
import { 
  FiCalendar, 
  FiClock, 
  FiMapPin, 
  FiVideo, 
  FiUser,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { agendamentoService } from '@/services/api'
import styles from './MeusAgendamentos.module.scss'

interface Agendamento {
  id: string
  titulo: string
  descricao?: string
  dataHora: string
  duracao: number
  local?: string
  linkOnline?: string
  realizado: boolean
  assistenteSocial?: { nome: string }
  candidatura: {
    edital: { titulo: string }
  }
}

export function MeusAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarAgendamentos()
  }, [])

  async function carregarAgendamentos() {
    try {
      const { agendamentos: data } = await agendamentoService.listarCandidato()
      setAgendamentos(data || [])
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function isProximo(data: string) {
    const agendamento = new Date(data)
    const agora = new Date()
    const diff = agendamento.getTime() - agora.getTime()
    const horas = diff / (1000 * 60 * 60)
    return horas > 0 && horas <= 24
  }

  function isPassado(data: string) {
    return new Date(data) < new Date()
  }

  const agendamentosFuturos = agendamentos.filter(a => !a.realizado && !isPassado(a.dataHora))
  const agendamentosPassados = agendamentos.filter(a => a.realizado || isPassado(a.dataHora))

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando agendamentos...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Meus Agendamentos</h1>
        <p>Acompanhe suas entrevistas e compromissos</p>
      </div>

      {agendamentos.length === 0 ? (
        <Card className={styles.empty}>
          <FiCalendar size={48} />
          <h3>Nenhum agendamento</h3>
          <p>Você ainda não possui agendamentos marcados</p>
        </Card>
      ) : (
        <>
          {agendamentosFuturos.length > 0 && (
            <section className={styles.section}>
              <h2>
                <FiClock className={styles.iconePendente} />
                Próximos Agendamentos
              </h2>
              <div className={styles.lista}>
                {agendamentosFuturos.map(ag => (
                  <Card 
                    key={ag.id} 
                    className={`${styles.agendamentoCard} ${isProximo(ag.dataHora) ? styles.proximo : ''}`}
                  >
                    {isProximo(ag.dataHora) && (
                      <div className={styles.alertaProximo}>
                        <FiAlertCircle size={14} />
                        Acontece em breve!
                      </div>
                    )}

                    <div className={styles.cardHeader}>
                      <h3>{ag.titulo}</h3>
                      <span className={styles.edital}>{ag.candidatura.edital.titulo}</span>
                    </div>

                    <div className={styles.dataHora}>
                      <FiCalendar size={18} />
                      <span>{formatarData(ag.dataHora)}</span>
                    </div>

                    <div className={styles.info}>
                      <div className={styles.duracao}>
                        <FiClock size={14} />
                        <span>Duração: {ag.duracao} minutos</span>
                      </div>

                      {ag.assistenteSocial && (
                        <div className={styles.assistente}>
                          <FiUser size={14} />
                          <span>Com: {ag.assistenteSocial.nome}</span>
                        </div>
                      )}

                      {ag.local && (
                        <div className={styles.local}>
                          <FiMapPin size={14} />
                          <span>{ag.local}</span>
                        </div>
                      )}

                      {ag.linkOnline && (
                        <a 
                          href={ag.linkOnline} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={styles.linkOnline}
                        >
                          <FiVideo size={14} />
                          <span>Acessar reunião online</span>
                        </a>
                      )}
                    </div>

                    {ag.descricao && (
                      <div className={styles.descricao}>
                        <strong>Observações:</strong>
                        <p>{ag.descricao}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {agendamentosPassados.length > 0 && (
            <section className={styles.section}>
              <h2>
                <FiCheckCircle className={styles.iconeRealizado} />
                Agendamentos Anteriores
              </h2>
              <div className={styles.lista}>
                {agendamentosPassados.map(ag => (
                  <Card key={ag.id} className={`${styles.agendamentoCard} ${styles.passado}`}>
                    <div className={styles.cardHeader}>
                      <h3>{ag.titulo}</h3>
                      <span className={`${styles.status} ${ag.realizado ? styles.realizado : styles.naoRealizado}`}>
                        {ag.realizado ? 'Realizado' : 'Não compareceu'}
                      </span>
                    </div>

                    <div className={styles.dataHora}>
                      <FiCalendar size={16} />
                      <span>{formatarData(ag.dataHora)}</span>
                    </div>

                    <div className={styles.editalSmall}>
                      {ag.candidatura.edital.titulo}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
