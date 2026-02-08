import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FiPlus, 
  FiSearch, 
  FiEdit2, 
  FiTrash2, 
  FiEye,
  FiCalendar,
  FiUsers,
  FiAlertCircle
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { editalService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import { Card } from '@/components/common/Card/Card'
import { formatDate } from '@/utils/masks'
import styles from './ListaEditais.module.scss'

interface Edital {
  id: string
  titulo: string
  descricao?: string
  anoLetivo: number
  dataInicio: string
  dataFim: string
  vagasDisponiveis: number
  ativo: boolean
  _count?: {
    candidaturas: number
  }
}

export function ListaEditais() {
  const navigate = useNavigate()
  const [editais, setEditais] = useState<Edital[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [paginacao, setPaginacao] = useState({
    pagina: 1,
    limite: 10,
    total: 0,
    totalPaginas: 0,
  })

  useEffect(() => {
    loadEditais()
  }, [paginacao.pagina, busca])

  const loadEditais = async () => {
    setLoading(true)
    try {
      const response = await editalService.meusEditais({
        pagina: paginacao.pagina,
        limite: paginacao.limite,
        busca: busca || undefined,
      })
      setEditais(response.editais)
      setPaginacao((prev) => ({
        ...prev,
        total: response.paginacao.total,
        totalPaginas: response.paginacao.totalPaginas,
      }))
    } catch (error) {
      toast.error('Erro ao carregar editais')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, titulo: string) => {
    if (!window.confirm(`Deseja realmente excluir o edital "${titulo}"?`)) {
      return
    }

    try {
      await editalService.excluir(id)
      toast.success('Edital excluído com sucesso')
      loadEditais()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir edital')
    }
  }

  const getStatusEdital = (edital: Edital) => {
    const hoje = new Date()
    const dataFim = new Date(edital.dataFim)
    
    if (!edital.ativo) return { label: 'Inativo', class: 'inativo' }
    if (dataFim < hoje) return { label: 'Encerrado', class: 'encerrado' }
    return { label: 'Ativo', class: 'ativo' }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Editais</h1>
          <p>Gerencie os editais da sua instituição</p>
        </div>
        <Button 
          onClick={() => navigate('/instituicao/editais/novo')}
          leftIcon={<FiPlus />}
        >
          Novo Edital
        </Button>
      </header>

      {/* Filtros */}
      <Card className={styles.filters}>
        <div className={styles.searchBox}>
          <FiSearch className={styles.searchIcon} />
          <Input
            placeholder="Buscar editais..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </Card>

      {/* Lista de Editais */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Carregando editais...</p>
        </div>
      ) : editais.length === 0 ? (
        <Card>
          <div className={styles.emptyState}>
            <FiAlertCircle size={48} />
            <h3>Nenhum edital encontrado</h3>
            <p>
              {busca 
                ? 'Tente buscar com outros termos' 
                : 'Crie seu primeiro edital para começar a receber candidaturas'}
            </p>
            {!busca && (
              <Button 
                onClick={() => navigate('/instituicao/editais/novo')}
                leftIcon={<FiPlus />}
              >
                Criar Edital
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className={styles.editaisGrid}>
          {editais.map((edital) => {
            const status = getStatusEdital(edital)
            return (
              <Card key={edital.id} className={styles.editalCard} padding="none">
                <div className={styles.editalHeader}>
                  <span className={`${styles.status} ${styles[status.class]}`}>
                    {status.label}
                  </span>
                  <span className={styles.anoLetivo}>Ano Letivo: {edital.anoLetivo}</span>
                </div>
                
                <div className={styles.editalBody}>
                  <h3>{edital.titulo}</h3>
                  {edital.descricao && (
                    <p className={styles.descricao}>
                      {edital.descricao.length > 100 
                        ? `${edital.descricao.substring(0, 100)}...` 
                        : edital.descricao}
                    </p>
                  )}
                  
                  <div className={styles.editalInfo}>
                    <div className={styles.infoItem}>
                      <FiCalendar size={16} />
                      <span>
                        {formatDate(edital.dataInicio)} - {formatDate(edital.dataFim)}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <FiUsers size={16} />
                      <span>
                        {edital._count?.candidaturas || 0} candidatura(s) • 
                        {edital.vagasDisponiveis} vaga(s)
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.editalActions}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(`/instituicao/editais/${edital.id}`)}
                  >
                    <FiEye size={16} />
                    Ver
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(`/instituicao/editais/${edital.id}/editar`)}
                  >
                    <FiEdit2 size={16} />
                    Editar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(edital.id, edital.titulo)}
                  >
                    <FiTrash2 size={16} />
                    Excluir
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Paginação */}
      {paginacao.totalPaginas > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="outline"
            size="sm"
            disabled={paginacao.pagina === 1}
            onClick={() => setPaginacao((prev) => ({ ...prev, pagina: prev.pagina - 1 }))}
          >
            Anterior
          </Button>
          <span>
            Página {paginacao.pagina} de {paginacao.totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={paginacao.pagina === paginacao.totalPaginas}
            onClick={() => setPaginacao((prev) => ({ ...prev, pagina: prev.pagina + 1 }))}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}
