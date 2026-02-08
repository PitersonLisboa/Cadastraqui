import { useState, useEffect } from 'react'
import { 
  FiUsers, 
  FiPlus, 
  FiUser, 
  FiBriefcase,
  FiMail,
  FiPhone,
  FiEdit2,
  FiUserX,
  FiUserCheck,
  FiCheck,
  FiLink,
  FiCopy,
  FiTrash2,
  FiClock
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Modal } from '@/components/common/Modal/Modal'
import { Input } from '@/components/common/Input/Input'
import { Select } from '@/components/common/Select/Select'
import { equipeService, api } from '@/services/api'
import styles from './GestaoEquipe.module.scss'

interface Assistente {
  id: string
  nome: string
  cress: string
  telefone?: string
  usuario: {
    email: string
    ativo: boolean
    criadoEm: string
  }
  _count: {
    pareceres: number
    agendamentos: number
  }
}

interface Advogado {
  id: string
  nome: string
  oab: string
  oabUf: string
  telefone?: string
  usuario: {
    email: string
    ativo: boolean
    criadoEm: string
  }
  _count: {
    pareceresJuridicos: number
  }
}

interface Convite {
  id: string
  codigo: string
  tipo: string
  email?: string
  usado: boolean
  expiraEm: string
  criadoEm: string
}

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

export function GestaoEquipe() {
  const [assistentes, setAssistentes] = useState<Assistente[]>([])
  const [advogados, setAdvogados] = useState<Advogado[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [loading, setLoading] = useState(true)
  const [modalTipo, setModalTipo] = useState<'assistente' | 'advogado' | null>(null)
  const [modalConvite, setModalConvite] = useState(false)
  const [tipoConvite, setTipoConvite] = useState<'ASSISTENTE_SOCIAL' | 'ADVOGADO'>('ASSISTENTE_SOCIAL')
  const [gerandoConvite, setGerandoConvite] = useState(false)
  
  const [formAssistente, setFormAssistente] = useState({
    email: '',
    senha: '',
    nome: '',
    cress: '',
    telefone: '',
  })
  
  const [formAdvogado, setFormAdvogado] = useState({
    email: '',
    senha: '',
    nome: '',
    oab: '',
    oabUf: 'SP',
    telefone: '',
  })

  useEffect(() => {
    carregarEquipe()
    carregarConvites()
  }, [])

  async function carregarEquipe() {
    setLoading(true)
    try {
      const data = await equipeService.listar()
      setAssistentes(data.assistentes || [])
      setAdvogados(data.advogados || [])
    } catch (error) {
      console.error('Erro ao carregar equipe:', error)
      toast.error('Erro ao carregar equipe')
    } finally {
      setLoading(false)
    }
  }

  async function carregarConvites() {
    try {
      const response = await api.get('/convites')
      setConvites(response.data.convites || [])
    } catch (error) {
      console.error('Erro ao carregar convites:', error)
    }
  }

  async function handleGerarConvite() {
    setGerandoConvite(true)
    try {
      const response = await api.post('/convites', { tipo: tipoConvite })
      toast.success(`Código gerado: ${response.data.convite.codigo}`)
      setModalConvite(false)
      carregarConvites()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao gerar convite')
    } finally {
      setGerandoConvite(false)
    }
  }

  async function handleRevogarConvite(id: string) {
    if (!confirm('Deseja revogar este convite?')) return
    
    try {
      await api.delete(`/convites/${id}`)
      toast.success('Convite revogado')
      carregarConvites()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao revogar convite')
    }
  }

  function copiarCodigo(codigo: string) {
    navigator.clipboard.writeText(codigo)
    toast.success('Código copiado!')
  }

  function copiarLink(codigo: string) {
    const link = `${window.location.origin}/registrar?codigo=${codigo}`
    navigator.clipboard.writeText(link)
    toast.success('Link copiado!')
  }

  async function handleAddAssistente(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formAssistente.email || !formAssistente.senha || !formAssistente.nome || !formAssistente.cress) {
      toast.warning('Preencha todos os campos obrigatórios')
      return
    }

    try {
      await equipeService.adicionarAssistente(formAssistente)
      toast.success('Assistente social adicionado com sucesso!')
      setModalTipo(null)
      resetForms()
      carregarEquipe()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao adicionar assistente')
    }
  }

  async function handleAddAdvogado(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formAdvogado.email || !formAdvogado.senha || !formAdvogado.nome || !formAdvogado.oab) {
      toast.warning('Preencha todos os campos obrigatórios')
      return
    }

    try {
      await equipeService.adicionarAdvogado(formAdvogado)
      toast.success('Advogado adicionado com sucesso!')
      setModalTipo(null)
      resetForms()
      carregarEquipe()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao adicionar advogado')
    }
  }

  async function handleToggleStatus(tipo: 'assistente' | 'advogado', id: string, ativo: boolean) {
    const acao = ativo ? 'desativar' : 'reativar'
    if (!confirm(`Deseja realmente ${acao} este membro?`)) return

    try {
      if (ativo) {
        await equipeService.desativar(tipo, id)
        toast.success('Membro desativado!')
      } else {
        await equipeService.reativar(tipo, id)
        toast.success('Membro reativado!')
      }
      carregarEquipe()
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  function resetForms() {
    setFormAssistente({ email: '', senha: '', nome: '', cress: '', telefone: '' })
    setFormAdvogado({ email: '', senha: '', nome: '', oab: '', oabUf: 'SP', telefone: '' })
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const totalEquipe = assistentes.length + advogados.length
  const ativos = [...assistentes, ...advogados].filter(m => m.usuario.ativo).length

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Gestão de Equipe</h1>
          <p>Gerencie assistentes sociais e advogados</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="ghost" onClick={() => setModalConvite(true)}>
            <FiLink size={18} />
            Gerar Convite
          </Button>
          <Button variant="outline" onClick={() => setModalTipo('assistente')}>
            <FiPlus size={18} />
            Assistente Social
          </Button>
          <Button onClick={() => setModalTipo('advogado')}>
            <FiPlus size={18} />
            Advogado
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className={styles.resumo}>
        <Card className={styles.resumoCard}>
          <FiUsers size={24} />
          <div>
            <span className={styles.resumoNumero}>{totalEquipe}</span>
            <span className={styles.resumoLabel}>Total de Membros</span>
          </div>
        </Card>
        <Card className={styles.resumoCard}>
          <FiUserCheck size={24} />
          <div>
            <span className={styles.resumoNumero}>{ativos}</span>
            <span className={styles.resumoLabel}>Ativos</span>
          </div>
        </Card>
        <Card className={styles.resumoCard}>
          <FiUser size={24} />
          <div>
            <span className={styles.resumoNumero}>{assistentes.length}</span>
            <span className={styles.resumoLabel}>Assistentes Sociais</span>
          </div>
        </Card>
        <Card className={styles.resumoCard}>
          <FiBriefcase size={24} />
          <div>
            <span className={styles.resumoNumero}>{advogados.length}</span>
            <span className={styles.resumoLabel}>Advogados</span>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : (
        <div className={styles.sections}>
          {/* Assistentes Sociais */}
          <section className={styles.section}>
            <h2>
              <FiUser className={styles.iconeAssistente} />
              Assistentes Sociais ({assistentes.length})
            </h2>
            
            {assistentes.length === 0 ? (
              <Card className={styles.empty}>
                <p>Nenhum assistente social cadastrado</p>
                <Button variant="outline" onClick={() => setModalTipo('assistente')}>
                  <FiPlus size={18} />
                  Adicionar Assistente
                </Button>
              </Card>
            ) : (
              <div className={styles.lista}>
                {assistentes.map(as => (
                  <Card key={as.id} className={`${styles.membroCard} ${!as.usuario.ativo ? styles.inativo : ''}`}>
                    <div className={styles.membroHeader}>
                      <div className={styles.avatar}>
                        <FiUser size={24} />
                      </div>
                      <div className={styles.membroInfo}>
                        <h3>{as.nome}</h3>
                        <span className={styles.registro}>CRESS: {as.cress}</span>
                      </div>
                      <span className={`${styles.status} ${as.usuario.ativo ? styles.ativo : styles.inativo}`}>
                        {as.usuario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <div className={styles.membroBody}>
                      <div className={styles.contato}>
                        <FiMail size={14} />
                        <span>{as.usuario.email}</span>
                      </div>
                      {as.telefone && (
                        <div className={styles.contato}>
                          <FiPhone size={14} />
                          <span>{as.telefone}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.membroStats}>
                      <div className={styles.stat}>
                        <span className={styles.statNumero}>{as._count.pareceres}</span>
                        <span className={styles.statLabel}>Pareceres</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statNumero}>{as._count.agendamentos}</span>
                        <span className={styles.statLabel}>Agendamentos</span>
                      </div>
                    </div>

                    <div className={styles.membroFooter}>
                      <span className={styles.desde}>Desde {formatarData(as.usuario.criadoEm)}</span>
                      <button 
                        className={`${styles.btnStatus} ${as.usuario.ativo ? styles.btnDesativar : styles.btnReativar}`}
                        onClick={() => handleToggleStatus('assistente', as.id, as.usuario.ativo)}
                      >
                        {as.usuario.ativo ? <FiUserX size={16} /> : <FiUserCheck size={16} />}
                        {as.usuario.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Advogados */}
          <section className={styles.section}>
            <h2>
              <FiBriefcase className={styles.iconeAdvogado} />
              Advogados ({advogados.length})
            </h2>
            
            {advogados.length === 0 ? (
              <Card className={styles.empty}>
                <p>Nenhum advogado cadastrado</p>
                <Button variant="outline" onClick={() => setModalTipo('advogado')}>
                  <FiPlus size={18} />
                  Adicionar Advogado
                </Button>
              </Card>
            ) : (
              <div className={styles.lista}>
                {advogados.map(adv => (
                  <Card key={adv.id} className={`${styles.membroCard} ${!adv.usuario.ativo ? styles.inativo : ''}`}>
                    <div className={styles.membroHeader}>
                      <div className={styles.avatar} style={{ backgroundColor: '#f5f3ff' }}>
                        <FiBriefcase size={24} style={{ color: '#7c3aed' }} />
                      </div>
                      <div className={styles.membroInfo}>
                        <h3>{adv.nome}</h3>
                        <span className={styles.registro}>OAB: {adv.oab}/{adv.oabUf}</span>
                      </div>
                      <span className={`${styles.status} ${adv.usuario.ativo ? styles.ativo : styles.inativo}`}>
                        {adv.usuario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <div className={styles.membroBody}>
                      <div className={styles.contato}>
                        <FiMail size={14} />
                        <span>{adv.usuario.email}</span>
                      </div>
                      {adv.telefone && (
                        <div className={styles.contato}>
                          <FiPhone size={14} />
                          <span>{adv.telefone}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.membroStats}>
                      <div className={styles.stat}>
                        <span className={styles.statNumero}>{adv._count.pareceresJuridicos}</span>
                        <span className={styles.statLabel}>Pareceres Jurídicos</span>
                      </div>
                    </div>

                    <div className={styles.membroFooter}>
                      <span className={styles.desde}>Desde {formatarData(adv.usuario.criadoEm)}</span>
                      <button 
                        className={`${styles.btnStatus} ${adv.usuario.ativo ? styles.btnDesativar : styles.btnReativar}`}
                        onClick={() => handleToggleStatus('advogado', adv.id, adv.usuario.ativo)}
                      >
                        {adv.usuario.ativo ? <FiUserX size={16} /> : <FiUserCheck size={16} />}
                        {adv.usuario.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal Adicionar Assistente */}
      <Modal
        isOpen={modalTipo === 'assistente'}
        onClose={() => { setModalTipo(null); resetForms(); }}
        title="Adicionar Assistente Social"
      >
        <form onSubmit={handleAddAssistente} className={styles.form}>
          <Input
            label="Nome Completo *"
            placeholder="Nome do assistente social"
            value={formAssistente.nome}
            onChange={(e) => setFormAssistente({ ...formAssistente, nome: e.target.value })}
            required
          />

          <Input
            label="Email *"
            type="email"
            placeholder="email@exemplo.com"
            value={formAssistente.email}
            onChange={(e) => setFormAssistente({ ...formAssistente, email: e.target.value })}
            required
          />

          <Input
            label="Senha Inicial *"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={formAssistente.senha}
            onChange={(e) => setFormAssistente({ ...formAssistente, senha: e.target.value })}
            required
          />

          <Input
            label="CRESS *"
            placeholder="Número do CRESS"
            value={formAssistente.cress}
            onChange={(e) => setFormAssistente({ ...formAssistente, cress: e.target.value })}
            required
          />

          <Input
            label="Telefone"
            placeholder="(11) 99999-9999"
            value={formAssistente.telefone}
            onChange={(e) => setFormAssistente({ ...formAssistente, telefone: e.target.value })}
          />

          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => { setModalTipo(null); resetForms(); }}>
              Cancelar
            </Button>
            <Button type="submit">
              <FiCheck size={18} />
              Adicionar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Adicionar Advogado */}
      <Modal
        isOpen={modalTipo === 'advogado'}
        onClose={() => { setModalTipo(null); resetForms(); }}
        title="Adicionar Advogado"
      >
        <form onSubmit={handleAddAdvogado} className={styles.form}>
          <Input
            label="Nome Completo *"
            placeholder="Nome do advogado"
            value={formAdvogado.nome}
            onChange={(e) => setFormAdvogado({ ...formAdvogado, nome: e.target.value })}
            required
          />

          <Input
            label="Email *"
            type="email"
            placeholder="email@exemplo.com"
            value={formAdvogado.email}
            onChange={(e) => setFormAdvogado({ ...formAdvogado, email: e.target.value })}
            required
          />

          <Input
            label="Senha Inicial *"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={formAdvogado.senha}
            onChange={(e) => setFormAdvogado({ ...formAdvogado, senha: e.target.value })}
            required
          />

          <div className={styles.formRow}>
            <Input
              label="Número OAB *"
              placeholder="123456"
              value={formAdvogado.oab}
              onChange={(e) => setFormAdvogado({ ...formAdvogado, oab: e.target.value })}
              required
            />

            <Select
              label="UF da OAB *"
              value={formAdvogado.oabUf}
              onChange={(e) => setFormAdvogado({ ...formAdvogado, oabUf: e.target.value })}
              required
            >
              {UFS.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </Select>
          </div>

          <Input
            label="Telefone"
            placeholder="(11) 99999-9999"
            value={formAdvogado.telefone}
            onChange={(e) => setFormAdvogado({ ...formAdvogado, telefone: e.target.value })}
          />

          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => { setModalTipo(null); resetForms(); }}>
              Cancelar
            </Button>
            <Button type="submit">
              <FiCheck size={18} />
              Adicionar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Gerar Convite */}
      <Modal
        isOpen={modalConvite}
        onClose={() => setModalConvite(false)}
        title="Gerar Código de Convite"
      >
        <div className={styles.conviteForm}>
          <p className={styles.conviteDesc}>
            Gere um código de convite para que um profissional possa criar sua conta vinculada à sua instituição.
          </p>

          <Select
            label="Tipo de Profissional"
            value={tipoConvite}
            onChange={(e) => setTipoConvite(e.target.value as 'ASSISTENTE_SOCIAL' | 'ADVOGADO')}
          >
            <option value="ASSISTENTE_SOCIAL">Assistente Social</option>
            <option value="ADVOGADO">Advogado</option>
          </Select>

          <div className={styles.conviteInfo}>
            <FiClock size={16} />
            <span>O código terá validade de 7 dias</span>
          </div>

          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => setModalConvite(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGerarConvite} loading={gerandoConvite}>
              <FiLink size={18} />
              Gerar Código
            </Button>
          </div>
        </div>
      </Modal>

      {/* Convites Ativos */}
      {convites.filter(c => !c.usado && new Date(c.expiraEm) > new Date()).length > 0 && (
        <Card className={styles.convitesCard}>
          <h3><FiLink size={18} /> Convites Ativos</h3>
          <div className={styles.convitesList}>
            {convites
              .filter(c => !c.usado && new Date(c.expiraEm) > new Date())
              .map(convite => (
                <div key={convite.id} className={styles.conviteItem}>
                  <div className={styles.conviteCodigo}>
                    <code>{convite.codigo}</code>
                    <span className={convite.tipo === 'ASSISTENTE_SOCIAL' ? styles.tipoAssistente : styles.tipoAdvogado}>
                      {convite.tipo === 'ASSISTENTE_SOCIAL' ? 'Assistente Social' : 'Advogado'}
                    </span>
                  </div>
                  <div className={styles.conviteExpira}>
                    Expira em {new Date(convite.expiraEm).toLocaleDateString('pt-BR')}
                  </div>
                  <div className={styles.conviteActions}>
                    <button onClick={() => copiarCodigo(convite.codigo)} title="Copiar código">
                      <FiCopy size={16} />
                    </button>
                    <button onClick={() => copiarLink(convite.codigo)} title="Copiar link">
                      <FiLink size={16} />
                    </button>
                    <button onClick={() => handleRevogarConvite(convite.id)} title="Revogar" className={styles.btnRevogar}>
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}
