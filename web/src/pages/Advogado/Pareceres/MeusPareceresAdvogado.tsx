import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FiFileText, 
  FiSearch, 
  FiEye,
  FiUser,
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiBook
} from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Select } from '@/components/common/Select/Select'
import { Modal } from '@/components/common/Modal/Modal'
import { api } from '@/services/api'
import styles from './MeusPareceresAdvogado.module.scss'

interface Parecer {
  id: string
  parecer: string
  fundamentacao?: string
  recomendacao: string
  dataEmissao: string
  candidatura: {
    id: string
    status: string
    candidato: {
      nome: string
      cpf: string
    }
    edital: {
      titulo: string
    }
  }
}

const RECOMENDACAO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  DEFERIDO: { label: 'Deferido', color: '#22c55e', bg: '#dcfce7', icon: FiCheckCircle },
  INDEFERIDO: { label: 'Indeferido', color: '#ef4444', bg: '#fee2e2', icon: FiXCircle },
  DILIGENCIA: { label: 'Diligência', color: '#f59e0b', bg: '#fef3c7', icon: FiClock },
}

export function MeusPareceresAdvogado() {
  const navigate = useNavigate()
  const [pareceres, setPareceres] = useState<Parecer[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [busca, setBusca] = useState('')
  
  // Modal de detalhes
  const [parecerSelecionado, setParecerSelecionado] = useState<Parecer | null>(null)

  useEffect(() => {
    carregarPareceres()
  }, [])

  async function carregarPareceres() {
    setLoading(true)
    try {
      const response = await api.get('/advogado/meus-pareceres')
      setPareceres(response.data.pareceres || [])
    } catch (error) {
      console.error('Erro ao carregar pareceres:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatarCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  function formatarData(data: string): string {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const pareceresFiltrados = pareceres.filter(p => {
    const matchBusca = p.candidatura.candidato.nome.toLowerCase().includes(busca.toLowerCase()) ||
                       p.candidatura.candidato.cpf.includes(busca)
    const matchFiltro = !filtro || p.recomendacao === filtro
    return matchBusca && matchFiltro
  })

  // Estatísticas
  const stats = {
    total: pareceres.length,
    deferidos: pareceres.filter(p => p.recomendacao === 'DEFERIDO').length,
    indeferidos: pareceres.filter(p => p.recomendacao === 'INDEFERIDO').length,
    diligencias: pareceres.filter(p => p.recomendacao === 'DILIGENCIA').length,
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando pareceres...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Meus Pareceres Jurídicos</h1>
          <p>Histórico de pareceres emitidos</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <FiBook size={24} />
          <div>
            <span className={styles.statNumber}>{stats.total}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
        </Card>
        <Card className={`${styles.statCard} ${styles.deferido}`}>
          <FiCheckCircle size={24} />
          <div>
            <span className={styles.statNumber}>{stats.deferidos}</span>
            <span className={styles.statLabel}>Deferidos</span>
          </div>
        </Card>
        <Card className={`${styles.statCard} ${styles.indeferido}`}>
          <FiXCircle size={24} />
          <div>
            <span className={styles.statNumber}>{stats.indeferidos}</span>
            <span className={styles.statLabel}>Indeferidos</span>
          </div>
        </Card>
        <Card className={`${styles.statCard} ${styles.diligencia}`}>
          <FiClock size={24} />
          <div>
            <span className={styles.statNumber}>{stats.diligencias}</span>
            <span className={styles.statLabel}>Em Diligência</span>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className={styles.filtros}>
        <div className={styles.searchBox}>
          <FiSearch size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todas as decisões</option>
          <option value="DEFERIDO">Deferido</option>
          <option value="INDEFERIDO">Indeferido</option>
          <option value="DILIGENCIA">Diligência</option>
        </Select>
      </Card>

      {/* Lista */}
      <div className={styles.lista}>
        {pareceresFiltrados.map(parecer => {
          const config = RECOMENDACAO_CONFIG[parecer.recomendacao] || RECOMENDACAO_CONFIG.DEFERIDO
          const Icon = config.icon
          
          return (
            <Card key={parecer.id} className={styles.parecerCard}>
              <div className={styles.parecerHeader}>
                <div className={styles.candidatoInfo}>
                  <div className={styles.avatar}>
                    <FiUser size={20} />
                  </div>
                  <div>
                    <h3>{parecer.candidatura.candidato.nome}</h3>
                    <span className={styles.cpf}>{formatarCPF(parecer.candidatura.candidato.cpf)}</span>
                  </div>
                </div>
                <span 
                  className={styles.badge}
                  style={{ backgroundColor: config.bg, color: config.color }}
                >
                  <Icon size={14} />
                  {config.label}
                </span>
              </div>

              <div className={styles.parecerBody}>
                <div className={styles.infoItem}>
                  <FiFileText size={14} />
                  <span>{parecer.candidatura.edital.titulo}</span>
                </div>
                <div className={styles.infoItem}>
                  <FiCalendar size={14} />
                  <span>Emitido em {formatarData(parecer.dataEmissao)}</span>
                </div>
              </div>

              <div className={styles.parecerPreview}>
                {parecer.parecer.substring(0, 150)}...
              </div>

              <div className={styles.parecerFooter}>
                <Button variant="outline" onClick={() => setParecerSelecionado(parecer)}>
                  <FiEye size={16} /> Ver Parecer Completo
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate(`/advogado/candidaturas/${parecer.candidatura.id}`)}
                >
                  Ver Candidatura
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {pareceresFiltrados.length === 0 && (
        <Card className={styles.empty}>
          <FiBook size={48} />
          <h3>Nenhum parecer encontrado</h3>
          <p>Você ainda não emitiu nenhum parecer jurídico</p>
        </Card>
      )}

      {/* Modal Detalhes */}
      <Modal 
        isOpen={!!parecerSelecionado} 
        onClose={() => setParecerSelecionado(null)}
        title="Detalhes do Parecer Jurídico"
      >
        {parecerSelecionado && (
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{parecerSelecionado.candidatura.candidato.nome}</h3>
              <span 
                className={styles.badge}
                style={{ 
                  backgroundColor: RECOMENDACAO_CONFIG[parecerSelecionado.recomendacao]?.bg,
                  color: RECOMENDACAO_CONFIG[parecerSelecionado.recomendacao]?.color
                }}
              >
                {RECOMENDACAO_CONFIG[parecerSelecionado.recomendacao]?.label}
              </span>
            </div>
            <div className={styles.modalInfo}>
              <p><strong>Edital:</strong> {parecerSelecionado.candidatura.edital.titulo}</p>
              <p><strong>Data de Emissão:</strong> {formatarData(parecerSelecionado.dataEmissao)}</p>
            </div>
            <div className={styles.parecerCompleto}>
              <h4>Parecer</h4>
              <p>{parecerSelecionado.parecer}</p>
            </div>
            {parecerSelecionado.fundamentacao && (
              <div className={styles.fundamentacao}>
                <h4>Fundamentação Legal</h4>
                <p>{parecerSelecionado.fundamentacao}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
