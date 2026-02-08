import { useState, useEffect } from 'react'
import { 
  FiUsers, 
  FiPlus, 
  FiEdit2, 
  FiLock, 
  FiToggleLeft, 
  FiToggleRight,
  FiSearch,
  FiFilter,
  FiEye,
  FiX
} from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import { Select } from '@/components/common/Select/Select'
import { Modal } from '@/components/common/Modal/Modal'
import { FiltrosAvancados, FiltroConfig } from '@/components/common/FiltrosAvancados/FiltrosAvancados'
import { api } from '@/services/api'
import styles from './GestaoUsuarios.module.scss'

interface Usuario {
  id: string
  email: string
  nome?: string
  role: string
  ativo: boolean
  primeiroAcesso: boolean
  criadoEm: string
  candidato?: { nome: string; cpf: string }
  instituicao?: { razaoSocial: string }
  assistenteSocial?: { nome: string; cress: string }
  advogado?: { nome: string; oab: string }
}

const ROLES = [
  { value: '', label: 'Todos' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'INSTITUICAO', label: 'Instituição' },
  { value: 'CANDIDATO', label: 'Candidato' },
  { value: 'ASSISTENTE_SOCIAL', label: 'Assistente Social' },
  { value: 'ADVOGADO', label: 'Advogado' },
]

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  INSTITUICAO: 'Instituição',
  CANDIDATO: 'Candidato',
  ASSISTENTE_SOCIAL: 'Assistente Social',
  ADVOGADO: 'Advogado',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#ef4444',
  INSTITUICAO: '#3b82f6',
  CANDIDATO: '#22c55e',
  ASSISTENTE_SOCIAL: '#f59e0b',
  ADVOGADO: '#8b5cf6',
}

const FILTROS_AVANCADOS_CONFIG: FiltroConfig[] = [
  {
    nome: 'primeiroAcesso',
    label: 'Primeiro Acesso',
    tipo: 'select',
    opcoes: [
      { value: 'true', label: 'Sim' },
      { value: 'false', label: 'Não' },
    ],
  },
  {
    nome: 'criadoEm',
    label: 'Data de Criação',
    tipo: 'dataRange',
  },
]

export function GestaoUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [paginacao, setPaginacao] = useState({ pagina: 1, total: 0, totalPaginas: 0 })
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [ativoFilter, setAtivoFilter] = useState('')
  const [filtrosAvancados, setFiltrosAvancados] = useState<Record<string, any>>({
    primeiroAcesso: '',
    criadoEmDe: '',
    criadoEmAte: '',
  })
  
  // Modais
  const [modalCriar, setModalCriar] = useState(false)
  const [modalEditar, setModalEditar] = useState<Usuario | null>(null)
  const [modalResetar, setModalResetar] = useState<Usuario | null>(null)
  const [modalDetalhes, setModalDetalhes] = useState<Usuario | null>(null)
  
  // Form
  const [form, setForm] = useState({ email: '', senha: '', role: 'CANDIDATO', nome: '' })
  const [novaSenha, setNovaSenha] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarUsuarios()
  }, [paginacao.pagina, roleFilter, ativoFilter])

  async function carregarUsuarios() {
    setLoading(true)
    try {
      const params: any = { pagina: paginacao.pagina, limite: 20 }
      if (busca) params.busca = busca
      if (roleFilter) params.role = roleFilter
      if (ativoFilter) params.ativo = ativoFilter
      
      const response = await api.get('/admin/usuarios', { params })
      setUsuarios(response.data.usuarios)
      setPaginacao(prev => ({ ...prev, ...response.data.paginacao }))
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    setPaginacao(prev => ({ ...prev, pagina: 1 }))
    carregarUsuarios()
  }

  function handleFiltroChange(nome: string, valor: any) {
    setFiltrosAvancados(prev => ({ ...prev, [nome]: valor }))
  }

  function handleLimparFiltros() {
    setFiltrosAvancados({
      primeiroAcesso: '',
      criadoEmDe: '',
      criadoEmAte: '',
    })
    setBusca('')
    setRoleFilter('')
    setAtivoFilter('')
    setPaginacao(prev => ({ ...prev, pagina: 1 }))
  }

  function handleAplicarFiltros() {
    setPaginacao(prev => ({ ...prev, pagina: 1 }))
    carregarUsuarios()
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      await api.post('/admin/usuarios', form)
      setModalCriar(false)
      setForm({ email: '', senha: '', role: 'CANDIDATO', nome: '' })
      carregarUsuarios()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao criar usuário')
    } finally {
      setSalvando(false)
    }
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!modalEditar) return
    setSalvando(true)
    try {
      await api.put(`/admin/usuarios/${modalEditar.id}`, {
        email: form.email,
        role: form.role,
        nome: form.nome,
      })
      setModalEditar(null)
      carregarUsuarios()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao atualizar usuário')
    } finally {
      setSalvando(false)
    }
  }

  async function handleAlternarStatus(usuario: Usuario) {
    if (!confirm(`Deseja ${usuario.ativo ? 'desativar' : 'ativar'} o usuário ${usuario.email}?`)) return
    try {
      await api.patch(`/admin/usuarios/${usuario.id}/status`)
      carregarUsuarios()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao alterar status')
    }
  }

  async function handleResetarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (!modalResetar) return
    setSalvando(true)
    try {
      await api.post(`/admin/usuarios/${modalResetar.id}/resetar-senha`, { novaSenha })
      setModalResetar(null)
      setNovaSenha('')
      alert('Senha resetada com sucesso!')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao resetar senha')
    } finally {
      setSalvando(false)
    }
  }

  function abrirEditar(usuario: Usuario) {
    setForm({
      email: usuario.email,
      senha: '',
      role: usuario.role,
      nome: usuario.nome || '',
    })
    setModalEditar(usuario)
  }

  function getNomeExibicao(usuario: Usuario): string {
    if (usuario.nome) return usuario.nome
    if (usuario.candidato?.nome) return usuario.candidato.nome
    if (usuario.instituicao?.razaoSocial) return usuario.instituicao.razaoSocial
    if (usuario.assistenteSocial?.nome) return usuario.assistenteSocial.nome
    if (usuario.advogado?.nome) return usuario.advogado.nome
    return usuario.email.split('@')[0]
  }

  if (loading && usuarios.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando usuários...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Gestão de Usuários</h1>
          <p>{paginacao.total} usuários cadastrados</p>
        </div>
        <Button onClick={() => setModalCriar(true)}>
          <FiPlus size={18} /> Novo Usuário
        </Button>
      </div>

      {/* Filtros */}
      <Card className={styles.filtros}>
        <form onSubmit={handleBuscar} className={styles.filtrosForm}>
          <div className={styles.searchBox}>
            <FiSearch size={18} />
            <input
              type="text"
              placeholder="Buscar por email ou nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <Select value={ativoFilter} onChange={(e) => setAtivoFilter(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </Select>
          <Button type="submit"><FiFilter size={16} /> Filtrar</Button>
        </form>
      </Card>

      {/* Filtros Avançados */}
      <FiltrosAvancados
        filtros={FILTROS_AVANCADOS_CONFIG}
        valores={filtrosAvancados}
        onChange={handleFiltroChange}
        onLimpar={handleLimparFiltros}
        onAplicar={handleAplicarFiltros}
      />

      {/* Tabela */}
      <Card className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(usuario => (
              <tr key={usuario.id} className={!usuario.ativo ? styles.inativo : ''}>
                <td>
                  <div className={styles.userCell}>
                    <span className={styles.userName}>{getNomeExibicao(usuario)}</span>
                    <span className={styles.userEmail}>{usuario.email}</span>
                  </div>
                </td>
                <td>
                  <span 
                    className={styles.roleBadge}
                    style={{ backgroundColor: ROLE_COLORS[usuario.role] + '20', color: ROLE_COLORS[usuario.role] }}
                  >
                    {ROLE_LABELS[usuario.role] || usuario.role}
                  </span>
                </td>
                <td>
                  <span className={`${styles.statusBadge} ${usuario.ativo ? styles.ativo : styles.inativoBadge}`}>
                    {usuario.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>{new Date(usuario.criadoEm).toLocaleDateString('pt-BR')}</td>
                <td>
                  <div className={styles.actions}>
                    <button onClick={() => setModalDetalhes(usuario)} title="Ver detalhes">
                      <FiEye size={16} />
                    </button>
                    <button onClick={() => abrirEditar(usuario)} title="Editar">
                      <FiEdit2 size={16} />
                    </button>
                    <button onClick={() => setModalResetar(usuario)} title="Resetar senha">
                      <FiLock size={16} />
                    </button>
                    <button onClick={() => handleAlternarStatus(usuario)} title={usuario.ativo ? 'Desativar' : 'Ativar'}>
                      {usuario.ativo ? <FiToggleRight size={18} color="#22c55e" /> : <FiToggleLeft size={18} color="#9ca3af" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {usuarios.length === 0 && (
          <div className={styles.empty}>
            <FiUsers size={48} />
            <p>Nenhum usuário encontrado</p>
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

      {/* Modal Criar */}
      <Modal isOpen={modalCriar} onClose={() => setModalCriar(false)} title="Novo Usuário">
        <form onSubmit={handleCriar} className={styles.form}>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Nome (opcional)"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Input
            label="Senha"
            type="password"
            value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
            required
            minLength={6}
          />
          <Select
            label="Tipo de Usuário"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {ROLES.filter(r => r.value).map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => setModalCriar(false)}>Cancelar</Button>
            <Button type="submit" disabled={salvando}>{salvando ? 'Criando...' : 'Criar Usuário'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={!!modalEditar} onClose={() => setModalEditar(null)} title="Editar Usuário">
        <form onSubmit={handleEditar} className={styles.form}>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Select
            label="Tipo de Usuário"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {ROLES.filter(r => r.value).map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => setModalEditar(null)}>Cancelar</Button>
            <Button type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Resetar Senha */}
      <Modal isOpen={!!modalResetar} onClose={() => setModalResetar(null)} title="Resetar Senha">
        <form onSubmit={handleResetarSenha} className={styles.form}>
          <p className={styles.resetInfo}>
            Resetando senha do usuário: <strong>{modalResetar?.email}</strong>
          </p>
          <Input
            label="Nova Senha"
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
            minLength={6}
          />
          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => setModalResetar(null)}>Cancelar</Button>
            <Button type="submit" disabled={salvando}>{salvando ? 'Resetando...' : 'Resetar Senha'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Detalhes */}
      <Modal isOpen={!!modalDetalhes} onClose={() => setModalDetalhes(null)} title="Detalhes do Usuário">
        {modalDetalhes && (
          <div className={styles.detalhes}>
            <div className={styles.detalheItem}>
              <label>Email</label>
              <p>{modalDetalhes.email}</p>
            </div>
            <div className={styles.detalheItem}>
              <label>Nome</label>
              <p>{getNomeExibicao(modalDetalhes)}</p>
            </div>
            <div className={styles.detalheItem}>
              <label>Tipo</label>
              <p>{ROLE_LABELS[modalDetalhes.role]}</p>
            </div>
            <div className={styles.detalheItem}>
              <label>Status</label>
              <p>{modalDetalhes.ativo ? 'Ativo' : 'Inativo'}</p>
            </div>
            <div className={styles.detalheItem}>
              <label>Primeiro Acesso</label>
              <p>{modalDetalhes.primeiroAcesso ? 'Sim' : 'Não'}</p>
            </div>
            <div className={styles.detalheItem}>
              <label>Criado em</label>
              <p>{new Date(modalDetalhes.criadoEm).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
