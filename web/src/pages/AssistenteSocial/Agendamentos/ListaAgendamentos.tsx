import { useState, useEffect } from 'react'
import { 
  FiCalendar, 
  FiPlus, 
  FiClock, 
  FiUser, 
  FiMapPin, 
  FiVideo,
  FiCheck,
  FiX,
  FiEdit2,
  FiTrash2
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Modal } from '@/components/common/Modal/Modal'
import { Input } from '@/components/common/Input/Input'
import { Select } from '@/components/common/Select/Select'
import { agendamentoService, candidaturaService } from '@/services/api'
import styles from './ListaAgendamentos.module.scss'

interface Agendamento {
  id: string
  titulo: string
  descricao?: string
  dataHora: string
  duracao: number
  local?: string
  linkOnline?: string
  realizado: boolean
  observacoes?: string
  candidatura: {
    id: string
    candidato: {
      nome: string
      usuario: { email: string }
    }
    edital: { titulo: string }
  }
}

interface Candidatura {
  id: string
  candidato: { nome: string }
  edital: { titulo: string }
}

export function ListaAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalRealizado, setModalRealizado] = useState<Agendamento | null>(null)
  const [filtroRealizado, setFiltroRealizado] = useState<string>('')
  const [observacoes, setObservacoes] = useState('')
  
  const [formData, setFormData] = useState({
    candidaturaId: '',
    titulo: '',
    descricao: '',
    dataHora: '',
    duracao: 30,
    local: '',
    linkOnline: '',
  })

  useEffect(() => {
    carregarDados()
  }, [filtroRealizado])

  async function carregarDados() {
    setLoading(true)
    try {
      const params: any = { limite: 50 }
      if (filtroRealizado !== '') {
        params.realizado = filtroRealizado === 'true'
      }

      const [agendRes, candRes] = await Promise.all([
        agendamentoService.listar(params),
        candidaturaService.listarParaAnalise({ limite: 100 }),
      ])
      
      setAgendamentos(agendRes.agendamentos || [])
      setCandidaturas(candRes.candidaturas || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.candidaturaId || !formData.titulo || !formData.dataHora) {
      toast.warning('Preencha os campos obrigatórios')
      return
    }

    try {
      await agendamentoService.criar(formData)
      toast.success('Agendamento criado com sucesso!')
      setModalAberto(false)
      resetForm()
      carregarDados()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar agendamento')
    }
  }

  async function handleMarcarRealizado() {
    if (!modalRealizado) return

    try {
      await agendamentoService.marcarRealizado(modalRealizado.id, observacoes)
      toast.success('Agendamento marcado como realizado!')
      setModalRealizado(null)
      setObservacoes('')
      carregarDados()
    } catch (error) {
      toast.error('Erro ao atualizar agendamento')
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm('Deseja realmente excluir este agendamento?')) return

    try {
      await agendamentoService.excluir(id)
      toast.success('Agendamento excluído!')
      carregarDados()
    } catch (error) {
      toast.error('Erro ao excluir agendamento')
    }
  }

  function resetForm() {
    setFormData({
      candidaturaId: '',
      titulo: '',
      descricao: '',
      dataHora: '',
      duracao: 30,
      local: '',
      linkOnline: '',
    })
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function isPassado(data: string) {
    return new Date(data) < new Date()
  }

  const agendamentosPendentes = agendamentos.filter(a => !a.realizado && !isPassado(a.dataHora))
  const agendamentosAtrasados = agendamentos.filter(a => !a.realizado && isPassado(a.dataHora))
  const agendamentosRealizados = agendamentos.filter(a => a.realizado)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Agendamentos</h1>
          <p>Gerencie suas entrevistas e visitas</p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <FiPlus size={18} />
          Novo Agendamento
        </Button>
      </div>

      <div className={styles.filtros}>
        <Select
          label="Filtrar por status"
          value={filtroRealizado}
          onChange={(e) => setFiltroRealizado(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="false">Pendentes</option>
          <option value="true">Realizados</option>
        </Select>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : (
        <div className={styles.sections}>
          {agendamentosAtrasados.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <FiX className={styles.iconeAtrasado} />
                Atrasados ({agendamentosAtrasados.length})
              </h2>
              <div className={styles.lista}>
                {agendamentosAtrasados.map(ag => (
                  <AgendamentoCard
                    key={ag.id}
                    agendamento={ag}
                    onMarcarRealizado={() => setModalRealizado(ag)}
                    onExcluir={() => handleExcluir(ag.id)}
                    isAtrasado
                  />
                ))}
              </div>
            </section>
          )}

          {agendamentosPendentes.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <FiClock className={styles.iconePendente} />
                Próximos ({agendamentosPendentes.length})
              </h2>
              <div className={styles.lista}>
                {agendamentosPendentes.map(ag => (
                  <AgendamentoCard
                    key={ag.id}
                    agendamento={ag}
                    onMarcarRealizado={() => setModalRealizado(ag)}
                    onExcluir={() => handleExcluir(ag.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {agendamentosRealizados.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <FiCheck className={styles.iconeRealizado} />
                Realizados ({agendamentosRealizados.length})
              </h2>
              <div className={styles.lista}>
                {agendamentosRealizados.map(ag => (
                  <AgendamentoCard
                    key={ag.id}
                    agendamento={ag}
                    isRealizado
                  />
                ))}
              </div>
            </section>
          )}

          {agendamentos.length === 0 && (
            <Card className={styles.empty}>
              <FiCalendar size={48} />
              <h3>Nenhum agendamento</h3>
              <p>Clique em "Novo Agendamento" para criar um</p>
            </Card>
          )}
        </div>
      )}

      {/* Modal Novo Agendamento */}
      <Modal
        isOpen={modalAberto}
        onClose={() => { setModalAberto(false); resetForm(); }}
        title="Novo Agendamento"
      >
        <form onSubmit={handleCriar} className={styles.form}>
          <Select
            label="Candidatura *"
            value={formData.candidaturaId}
            onChange={(e) => setFormData({ ...formData, candidaturaId: e.target.value })}
            required
          >
            <option value="">Selecione...</option>
            {candidaturas.map(c => (
              <option key={c.id} value={c.id}>
                {c.candidato.nome} - {c.edital.titulo}
              </option>
            ))}
          </Select>

          <Input
            label="Título *"
            placeholder="Ex: Entrevista socioeconômica"
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            required
          />

          <Input
            label="Descrição"
            placeholder="Detalhes do agendamento"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          />

          <div className={styles.formRow}>
            <Input
              label="Data e Hora *"
              type="datetime-local"
              value={formData.dataHora}
              onChange={(e) => setFormData({ ...formData, dataHora: e.target.value })}
              required
            />

            <Select
              label="Duração"
              value={formData.duracao}
              onChange={(e) => setFormData({ ...formData, duracao: Number(e.target.value) })}
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>1 hora</option>
              <option value={90}>1h30</option>
              <option value={120}>2 horas</option>
            </Select>
          </div>

          <Input
            label="Local"
            placeholder="Endereço ou sala"
            value={formData.local}
            onChange={(e) => setFormData({ ...formData, local: e.target.value })}
          />

          <Input
            label="Link Online"
            placeholder="https://meet.google.com/..."
            type="url"
            value={formData.linkOnline}
            onChange={(e) => setFormData({ ...formData, linkOnline: e.target.value })}
          />

          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => { setModalAberto(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button type="submit">
              Criar Agendamento
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Marcar Realizado */}
      <Modal
        isOpen={!!modalRealizado}
        onClose={() => { setModalRealizado(null); setObservacoes(''); }}
        title="Marcar como Realizado"
      >
        <div className={styles.form}>
          <p>Confirma que o agendamento <strong>{modalRealizado?.titulo}</strong> foi realizado?</p>
          
          <div className={styles.textareaGroup}>
            <label>Observações (opcional)</label>
            <textarea
              rows={4}
              placeholder="Registre observações sobre a entrevista..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => { setModalRealizado(null); setObservacoes(''); }}>
              Cancelar
            </Button>
            <Button onClick={handleMarcarRealizado}>
              <FiCheck size={18} />
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Componente do Card de Agendamento
interface AgendamentoCardProps {
  agendamento: Agendamento
  onMarcarRealizado?: () => void
  onExcluir?: () => void
  isAtrasado?: boolean
  isRealizado?: boolean
}

function AgendamentoCard({ 
  agendamento, 
  onMarcarRealizado, 
  onExcluir,
  isAtrasado,
  isRealizado 
}: AgendamentoCardProps) {
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card className={`${styles.agendamentoCard} ${isAtrasado ? styles.atrasado : ''} ${isRealizado ? styles.realizado : ''}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitulo}>
          <h3>{agendamento.titulo}</h3>
          <span className={styles.dataHora}>
            <FiCalendar size={14} />
            {formatarData(agendamento.dataHora)}
          </span>
        </div>
        {!isRealizado && (
          <div className={styles.cardActions}>
            {onMarcarRealizado && (
              <button className={styles.btnRealizado} onClick={onMarcarRealizado} title="Marcar como realizado">
                <FiCheck size={16} />
              </button>
            )}
            {onExcluir && (
              <button className={styles.btnExcluir} onClick={onExcluir} title="Excluir">
                <FiTrash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.candidato}>
          <FiUser size={14} />
          <span>{agendamento.candidatura.candidato.nome}</span>
        </div>
        
        <div className={styles.edital}>
          {agendamento.candidatura.edital.titulo}
        </div>

        {agendamento.local && (
          <div className={styles.local}>
            <FiMapPin size={14} />
            <span>{agendamento.local}</span>
          </div>
        )}

        {agendamento.linkOnline && (
          <a href={agendamento.linkOnline} target="_blank" rel="noopener noreferrer" className={styles.link}>
            <FiVideo size={14} />
            <span>Link da reunião</span>
          </a>
        )}

        {agendamento.observacoes && (
          <div className={styles.observacoes}>
            <strong>Observações:</strong>
            <p>{agendamento.observacoes}</p>
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.duracao}>
          <FiClock size={14} />
          {agendamento.duracao} min
        </span>
        {isRealizado && (
          <span className={styles.badgeRealizado}>Realizado</span>
        )}
        {isAtrasado && (
          <span className={styles.badgeAtrasado}>Atrasado</span>
        )}
      </div>
    </Card>
  )
}
