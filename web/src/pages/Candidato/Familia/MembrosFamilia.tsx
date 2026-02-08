import { useState, useEffect } from 'react'
import { 
  FiUsers, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiUser,
  FiDollarSign,
  FiCalendar,
  FiBriefcase,
  FiCheck
} from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Modal } from '@/components/common/Modal/Modal'
import { Input } from '@/components/common/Input/Input'
import { Select } from '@/components/common/Select/Select'
import { api } from '@/services/api'
import styles from './MembrosFamilia.module.scss'

interface Membro {
  id: string
  nome: string
  parentesco: string
  dataNascimento: string
  cpf: string
  renda?: number
  ocupacao?: string
}

const PARENTESCOS = [
  'Cônjuge',
  'Pai',
  'Mãe',
  'Filho(a)',
  'Irmão(ã)',
  'Avô/Avó',
  'Neto(a)',
  'Tio(a)',
  'Primo(a)',
  'Sogro(a)',
  'Enteado(a)',
  'Outro',
]

export function MembrosFamilia() {
  const [membros, setMembros] = useState<Membro[]>([])
  const [resumo, setResumo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [membroEditando, setMembroEditando] = useState<Membro | null>(null)
  const [salvando, setSalvando] = useState(false)
  
  const [formData, setFormData] = useState({
    nome: '',
    parentesco: '',
    dataNascimento: '',
    cpf: '',
    renda: '',
    ocupacao: '',
  })

  useEffect(() => {
    carregarMembros()
  }, [])

  async function carregarMembros() {
    try {
      const response = await api.get('/familia')
      setMembros(response.data.membros || [])
      setResumo(response.data.resumo)
    } catch (error) {
      console.error('Erro ao carregar membros:', error)
    } finally {
      setLoading(false)
    }
  }

  function abrirModal(membro?: Membro) {
    if (membro) {
      setMembroEditando(membro)
      setFormData({
        nome: membro.nome,
        parentesco: membro.parentesco,
        dataNascimento: membro.dataNascimento.split('T')[0],
        cpf: membro.cpf || '',
        renda: membro.renda?.toString() || '',
        ocupacao: membro.ocupacao || '',
      })
    } else {
      setMembroEditando(null)
      resetForm()
    }
    setModalAberto(true)
  }

  function resetForm() {
    setFormData({
      nome: '',
      parentesco: '',
      dataNascimento: '',
      cpf: '',
      renda: '',
      ocupacao: '',
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.nome || !formData.parentesco || !formData.dataNascimento || !formData.cpf) {
      alert('Preencha os campos obrigatórios')
      return
    }

    setSalvando(true)

    const dados = {
      nome: formData.nome,
      parentesco: formData.parentesco,
      dataNascimento: formData.dataNascimento,
      cpf: formData.cpf,
      renda: formData.renda ? parseFloat(formData.renda) : undefined,
      ocupacao: formData.ocupacao || undefined,
    }

    try {
      if (membroEditando) {
        await api.put(`/familia/${membroEditando.id}`, dados)
      } else {
        await api.post('/familia', dados)
      }
      setModalAberto(false)
      resetForm()
      carregarMembros()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm('Deseja realmente excluir este membro?')) return

    try {
      await api.delete(`/familia/${id}`)
      carregarMembros()
    } catch (error) {
      alert('Erro ao excluir')
    }
  }

  function calcularIdade(dataNascimento: string) {
    const nascimento = new Date(dataNascimento)
    const hoje = new Date()
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const m = hoje.getMonth() - nascimento.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }
    return idade
  }

  function formatarMoeda(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Composição Familiar</h1>
          <p>Cadastre os membros da sua família</p>
        </div>
        <Button onClick={() => abrirModal()}>
          <FiPlus size={18} />
          Adicionar Membro
        </Button>
      </div>

      {/* Resumo */}
      {resumo && (
        <div className={styles.resumoGrid}>
          <Card className={styles.resumoCard}>
            <FiUsers size={24} color="#3b82f6" />
            <div>
              <span className={styles.resumoNumero}>{resumo.totalMembros}</span>
              <span className={styles.resumoLabel}>Membros</span>
            </div>
          </Card>
          <Card className={styles.resumoCard}>
            <FiDollarSign size={24} color="#10b981" />
            <div>
              <span className={styles.resumoNumero}>{formatarMoeda(resumo.rendaTotal)}</span>
              <span className={styles.resumoLabel}>Renda Total</span>
            </div>
          </Card>
          <Card className={styles.resumoCard}>
            <FiDollarSign size={24} color="#f59e0b" />
            <div>
              <span className={styles.resumoNumero}>{formatarMoeda(resumo.rendaPerCapita)}</span>
              <span className={styles.resumoLabel}>Renda Per Capita</span>
            </div>
          </Card>
        </div>
      )}

      {/* Lista de Membros */}
      {membros.length === 0 ? (
        <Card className={styles.empty}>
          <FiUsers size={48} />
          <h3>Nenhum membro cadastrado</h3>
          <p>Adicione os membros da sua família para compor o perfil socioeconômico</p>
          <Button onClick={() => abrirModal()}>
            <FiPlus size={18} />
            Adicionar Primeiro Membro
          </Button>
        </Card>
      ) : (
        <div className={styles.lista}>
          {membros.map((membro) => (
            <Card key={membro.id} className={styles.membroCard}>
              <div className={styles.membroHeader}>
                <div className={styles.avatar}>
                  <FiUser size={24} />
                </div>
                <div className={styles.membroInfo}>
                  <h3>{membro.nome}</h3>
                  <span className={styles.parentesco}>{membro.parentesco}</span>
                </div>
                <div className={styles.membroActions}>
                  <button onClick={() => abrirModal(membro)} title="Editar">
                    <FiEdit2 size={16} />
                  </button>
                  <button onClick={() => handleExcluir(membro.id)} title="Excluir">
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>

              <div className={styles.membroBody}>
                <div className={styles.infoItem}>
                  <FiCalendar size={14} />
                  <span>{calcularIdade(membro.dataNascimento)} anos</span>
                </div>
                {membro.ocupacao && (
                  <div className={styles.infoItem}>
                    <FiBriefcase size={14} />
                    <span>{membro.ocupacao}</span>
                  </div>
                )}
                {membro.renda !== undefined && membro.renda > 0 && (
                  <div className={styles.infoItem}>
                    <FiDollarSign size={14} />
                    <span>{formatarMoeda(membro.renda)}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalAberto}
        onClose={() => { setModalAberto(false); resetForm(); }}
        title={membroEditando ? 'Editar Membro' : 'Adicionar Membro'}
      >
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Nome Completo *"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />

          <div className={styles.formRow}>
            <Select
              label="Parentesco *"
              value={formData.parentesco}
              onChange={(e) => setFormData({ ...formData, parentesco: e.target.value })}
              required
            >
              <option value="">Selecione...</option>
              {PARENTESCOS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>

            <Input
              label="Data de Nascimento *"
              type="date"
              value={formData.dataNascimento}
              onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
              required
            />
          </div>

          <div className={styles.formRow}>
            <Input
              label="CPF *"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              required
            />
            <Input
              label="Ocupação"
              value={formData.ocupacao}
              onChange={(e) => setFormData({ ...formData, ocupacao: e.target.value })}
              placeholder="Ex: Auxiliar de Limpeza, Estudante..."
            />
          </div>

          <Input
            label="Renda Mensal (R$)"
            type="number"
            step="0.01"
            min="0"
            value={formData.renda}
            onChange={(e) => setFormData({ ...formData, renda: e.target.value })}
          />

          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => { setModalAberto(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              <FiCheck size={18} />
              {salvando ? 'Salvando...' : membroEditando ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
