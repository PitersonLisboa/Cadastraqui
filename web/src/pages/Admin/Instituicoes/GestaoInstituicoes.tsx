import { useState, useEffect } from 'react'
import { 
  FiHome, 
  FiSearch, 
  FiFilter, 
  FiEye,
  FiCheck,
  FiX,
  FiFileText,
  FiUsers
} from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Select } from '@/components/common/Select/Select'
import { Modal } from '@/components/common/Modal/Modal'
import { api } from '@/services/api'
import styles from './GestaoInstituicoes.module.scss'

interface Instituicao {
  id: string
  razaoSocial: string
  nomeFantasia?: string
  cnpj: string
  email?: string
  telefone?: string
  status?: string
  criadoEm: string
  usuario: { email: string; ativo: boolean; criadoEm: string }
  _count: { editais: number; membrosEquipe: number }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'ATIVA', label: 'Ativa' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'SUSPENSA', label: 'Suspensa' },
  { value: 'INATIVA', label: 'Inativa' },
]

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ATIVA: { bg: '#dcfce7', text: '#166534' },
  PENDENTE: { bg: '#fef3c7', text: '#92400e' },
  SUSPENSA: { bg: '#fee2e2', text: '#991b1b' },
  INATIVA: { bg: '#f3f4f6', text: '#6b7280' },
}

export function GestaoInstituicoes() {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([])
  const [loading, setLoading] = useState(true)
  const [paginacao, setPaginacao] = useState({ pagina: 1, total: 0, totalPaginas: 0 })
  
  const [busca, setBusca] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  const [modalDetalhes, setModalDetalhes] = useState<any>(null)

  useEffect(() => {
    carregarInstituicoes()
  }, [paginacao.pagina, statusFilter])

  async function carregarInstituicoes() {
    setLoading(true)
    try {
      const params: any = { pagina: paginacao.pagina, limite: 20 }
      if (busca) params.busca = busca
      if (statusFilter) params.status = statusFilter
      
      const response = await api.get('/admin/instituicoes', { params })
      setInstituicoes(response.data.instituicoes)
      setPaginacao(prev => ({ ...prev, ...response.data.paginacao }))
    } catch (error) {
      console.error('Erro ao carregar instituições:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    setPaginacao(prev => ({ ...prev, pagina: 1 }))
    carregarInstituicoes()
  }

  async function verDetalhes(id: string) {
    setModalDetalhes({ loading: true }) // Abre o modal com loading
    try {
      const response = await api.get(`/admin/instituicoes/${id}`)
      setModalDetalhes(response.data)
    } catch (error: any) {
      console.error('Erro ao carregar detalhes:', error)
      alert(error.response?.data?.message || 'Erro ao carregar detalhes da instituição')
      setModalDetalhes(null)
    }
  }

  async function alterarStatus(id: string, novoStatus: string) {
    if (!confirm(`Deseja alterar o status para ${novoStatus}?`)) return
    try {
      await api.patch(`/admin/instituicoes/${id}/status`, { status: novoStatus })
      carregarInstituicoes()
      if (modalDetalhes?.instituicao?.id === id) {
        verDetalhes(id)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao alterar status')
    }
  }

  function formatCNPJ(cnpj: string): string {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  if (loading && instituicoes.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando instituições...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Gestão de Instituições</h1>
          <p>{paginacao.total} instituições cadastradas</p>
        </div>
      </div>

      {/* Filtros */}
      <Card className={styles.filtros}>
        <form onSubmit={handleBuscar} className={styles.filtrosForm}>
          <div className={styles.searchBox}>
            <FiSearch size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <Button type="submit"><FiFilter size={16} /> Filtrar</Button>
        </form>
      </Card>

      {/* Grid de Instituições */}
      <div className={styles.grid}>
        {instituicoes.map(inst => (
          <Card key={inst.id} className={styles.instCard}>
            <div className={styles.instHeader}>
              <div className={styles.instIcon}>
                <FiHome size={24} />
              </div>
              <div className={styles.instInfo}>
                <h3>{inst.nomeFantasia || inst.razaoSocial}</h3>
                <span className={styles.cnpj}>{formatCNPJ(inst.cnpj)}</span>
              </div>
              <span 
                className={styles.statusBadge}
                style={{
                  backgroundColor: STATUS_COLORS[inst.status || 'PENDENTE']?.bg,
                  color: STATUS_COLORS[inst.status || 'PENDENTE']?.text,
                }}
              >
                {inst.status || 'Pendente'}
              </span>
            </div>
            
            <div className={styles.instStats}>
              <div className={styles.stat}>
                <FiFileText size={16} />
                <span>{inst._count.editais} editais</span>
              </div>
              <div className={styles.stat}>
                <FiUsers size={16} />
                <span>{inst._count.membrosEquipe} membros</span>
              </div>
            </div>

            <div className={styles.instFooter}>
              <span className={styles.date}>
                Desde {new Date(inst.criadoEm).toLocaleDateString('pt-BR')}
              </span>
              <Button variant="outline" onClick={() => verDetalhes(inst.id)}>
                <FiEye size={16} /> Detalhes
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {instituicoes.length === 0 && (
        <Card className={styles.empty}>
          <FiHome size={48} />
          <p>Nenhuma instituição encontrada</p>
        </Card>
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

      {/* Modal Detalhes */}
      <Modal 
        isOpen={!!modalDetalhes} 
        onClose={() => setModalDetalhes(null)} 
        title="Detalhes da Instituição"
      >
        {modalDetalhes?.loading ? (
          <div className={styles.loading}><div className={styles.spinner}></div></div>
        ) : modalDetalhes?.instituicao && (
          <div className={styles.detalhes}>
            <div className={styles.detalhesHeader}>
              <h2>{modalDetalhes.instituicao.nomeFantasia || modalDetalhes.instituicao.razaoSocial}</h2>
              <span 
                className={styles.statusBadge}
                style={{
                  backgroundColor: STATUS_COLORS[modalDetalhes.instituicao.status || 'PENDENTE']?.bg,
                  color: STATUS_COLORS[modalDetalhes.instituicao.status || 'PENDENTE']?.text,
                }}
              >
                {modalDetalhes.instituicao.status || 'Pendente'}
              </span>
            </div>

            <div className={styles.detalhesGrid}>
              <div className={styles.detalheItem}>
                <label>CNPJ</label>
                <p>{formatCNPJ(modalDetalhes.instituicao.cnpj)}</p>
              </div>
              <div className={styles.detalheItem}>
                <label>Razão Social</label>
                <p>{modalDetalhes.instituicao.razaoSocial}</p>
              </div>
              <div className={styles.detalheItem}>
                <label>Email</label>
                <p>{modalDetalhes.instituicao.email || modalDetalhes.instituicao.usuario?.email}</p>
              </div>
              <div className={styles.detalheItem}>
                <label>Telefone</label>
                <p>{modalDetalhes.instituicao.telefone || '-'}</p>
              </div>
              <div className={styles.detalheItem}>
                <label>Total de Editais</label>
                <p>{modalDetalhes.instituicao._count.editais}</p>
              </div>
              <div className={styles.detalheItem}>
                <label>Equipe</label>
                <p>{modalDetalhes.instituicao._count.membrosEquipe} membros</p>
              </div>
            </div>

            {modalDetalhes.estatisticas && modalDetalhes.estatisticas.length > 0 && (
              <div className={styles.estatisticas}>
                <h4>Candidaturas</h4>
                <div className={styles.estatGrid}>
                  {modalDetalhes.estatisticas.map((e: any) => (
                    <div key={e.status} className={styles.estatItem}>
                      <span className={styles.estatValor}>{e.total}</span>
                      <span className={styles.estatLabel}>{e.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.statusActions}>
              <span>Alterar Status:</span>
              <div className={styles.statusButtons}>
                <Button 
                  variant="outline" 
                  onClick={() => alterarStatus(modalDetalhes.instituicao.id, 'ATIVA')}
                  disabled={modalDetalhes.instituicao.status === 'ATIVA'}
                >
                  <FiCheck size={16} /> Ativar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => alterarStatus(modalDetalhes.instituicao.id, 'SUSPENSA')}
                  disabled={modalDetalhes.instituicao.status === 'SUSPENSA'}
                >
                  <FiX size={16} /> Suspender
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
