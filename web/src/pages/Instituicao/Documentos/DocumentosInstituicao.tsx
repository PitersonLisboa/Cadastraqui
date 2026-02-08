import { useState, useEffect } from 'react'
import { 
  FiUpload, 
  FiFileText, 
  FiDownload, 
  FiTrash2, 
  FiEye,
  FiFolder,
  FiPlus,
  FiSearch,
  FiFilter
} from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { Modal } from '@/components/common/Modal/Modal'
import { Input } from '@/components/common/Input/Input'
import { Select } from '@/components/common/Select/Select'
import { FileUpload } from '@/components/common/FileUpload/FileUpload'
import { api } from '@/services/api'
import styles from './DocumentosInstituicao.module.scss'

interface Documento {
  id: string
  nome: string
  tipo: string
  categoria: string
  tamanho: number
  url: string
  criadoEm: string
}

const CATEGORIAS = [
  { value: '', label: 'Todas as categorias' },
  { value: 'INSTITUCIONAL', label: 'Institucional' },
  { value: 'REGULAMENTO', label: 'Regulamento' },
  { value: 'MODELO', label: 'Modelo/Template' },
  { value: 'CONTRATO', label: 'Contrato' },
  { value: 'RELATORIO', label: 'Relatório' },
  { value: 'OUTRO', label: 'Outro' },
]

export function DocumentosInstituicao() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  
  // Modal de Upload
  const [modalUpload, setModalUpload] = useState(false)
  const [novoDoc, setNovoDoc] = useState({
    nome: '',
    categoria: 'INSTITUCIONAL',
    arquivo: null as File | null,
  })
  const [uploading, setUploading] = useState(false)

  // Modal de Visualização
  const [docSelecionado, setDocSelecionado] = useState<Documento | null>(null)

  useEffect(() => {
    carregarDocumentos()
  }, [])

  async function carregarDocumentos() {
    setLoading(true)
    try {
      const response = await api.get('/instituicao/documentos')
      setDocumentos(response.data.documentos || [])
    } catch (error) {
      console.error('Erro ao carregar documentos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload() {
    if (!novoDoc.arquivo || !novoDoc.nome) {
      alert('Preencha o nome e selecione um arquivo')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('arquivo', novoDoc.arquivo)
      formData.append('nome', novoDoc.nome)
      formData.append('categoria', novoDoc.categoria)

      await api.post('/instituicao/documentos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setModalUpload(false)
      setNovoDoc({ nome: '', categoria: 'INSTITUCIONAL', arquivo: null })
      carregarDocumentos()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm('Deseja realmente excluir este documento?')) return
    
    try {
      await api.delete(`/instituicao/documentos/${id}`)
      carregarDocumentos()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao excluir documento')
    }
  }

  function formatarTamanho(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function formatarData(data: string): string {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const documentosFiltrados = documentos.filter(doc => {
    const matchBusca = doc.nome.toLowerCase().includes(busca.toLowerCase())
    const matchCategoria = !categoriaFilter || doc.categoria === categoriaFilter
    return matchBusca && matchCategoria
  })

  // Agrupar por categoria
  const documentosPorCategoria = documentosFiltrados.reduce((acc, doc) => {
    const cat = doc.categoria || 'OUTRO'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(doc)
    return acc
  }, {} as Record<string, Documento[]>)

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando documentos...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Documentos</h1>
          <p>Gerencie os documentos da sua instituição</p>
        </div>
        <Button onClick={() => setModalUpload(true)}>
          <FiPlus size={16} /> Novo Documento
        </Button>
      </div>

      {/* Filtros */}
      <Card className={styles.filtros}>
        <div className={styles.searchBox}>
          <FiSearch size={18} />
          <input
            type="text"
            placeholder="Buscar documento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={categoriaFilter} onChange={(e) => setCategoriaFilter(e.target.value)}>
          {CATEGORIAS.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
      </Card>

      {/* Estatísticas */}
      <div className={styles.stats}>
        <Card className={styles.statCard}>
          <FiFileText size={24} />
          <div>
            <span className={styles.statNumber}>{documentos.length}</span>
            <span className={styles.statLabel}>Total de Documentos</span>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <FiFolder size={24} />
          <div>
            <span className={styles.statNumber}>{Object.keys(documentosPorCategoria).length}</span>
            <span className={styles.statLabel}>Categorias</span>
          </div>
        </Card>
      </div>

      {/* Lista de Documentos */}
      {documentosFiltrados.length === 0 ? (
        <Card className={styles.empty}>
          <FiFileText size={48} />
          <h3>Nenhum documento encontrado</h3>
          <p>Faça upload de documentos para começar</p>
          <Button onClick={() => setModalUpload(true)}>
            <FiUpload size={16} /> Fazer Upload
          </Button>
        </Card>
      ) : (
        <div className={styles.documentosGrid}>
          {Object.entries(documentosPorCategoria).map(([categoria, docs]) => (
            <Card key={categoria} className={styles.categoriaCard}>
              <div className={styles.categoriaHeader}>
                <FiFolder size={18} />
                <h3>{CATEGORIAS.find(c => c.value === categoria)?.label || categoria}</h3>
                <span className={styles.count}>{docs.length}</span>
              </div>
              <div className={styles.documentosList}>
                {docs.map(doc => (
                  <div key={doc.id} className={styles.documentoItem}>
                    <FiFileText size={20} className={styles.docIcon} />
                    <div className={styles.docInfo}>
                      <span className={styles.docNome}>{doc.nome}</span>
                      <span className={styles.docMeta}>
                        {formatarTamanho(doc.tamanho)} • {formatarData(doc.criadoEm)}
                      </span>
                    </div>
                    <div className={styles.docActions}>
                      <button 
                        className={styles.actionBtn} 
                        title="Visualizar"
                        onClick={() => setDocSelecionado(doc)}
                      >
                        <FiEye size={16} />
                      </button>
                      <button 
                        className={styles.actionBtn} 
                        title="Download"
                        onClick={() => window.open(doc.url, '_blank')}
                      >
                        <FiDownload size={16} />
                      </button>
                      <button 
                        className={`${styles.actionBtn} ${styles.danger}`}
                        title="Excluir"
                        onClick={() => handleExcluir(doc.id)}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Upload */}
      <Modal 
        isOpen={modalUpload} 
        onClose={() => setModalUpload(false)} 
        title="Novo Documento"
      >
        <div className={styles.uploadForm}>
          <Input
            label="Nome do Documento"
            value={novoDoc.nome}
            onChange={(e) => setNovoDoc(prev => ({ ...prev, nome: e.target.value }))}
            placeholder="Ex: Regulamento Interno 2024"
          />
          <Select
            label="Categoria"
            value={novoDoc.categoria}
            onChange={(e) => setNovoDoc(prev => ({ ...prev, categoria: e.target.value }))}
          >
            {CATEGORIAS.filter(c => c.value).map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
          <FileUpload
            label="Arquivo"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onFileSelect={(file) => setNovoDoc(prev => ({ ...prev, arquivo: file }))}
          />
          {novoDoc.arquivo && (
            <p className={styles.fileSelected}>
              Arquivo selecionado: {novoDoc.arquivo.name}
            </p>
          )}
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setModalUpload(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Enviando...' : 'Fazer Upload'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Visualização */}
      <Modal
        isOpen={!!docSelecionado}
        onClose={() => setDocSelecionado(null)}
        title={docSelecionado?.nome || 'Documento'}
      >
        {docSelecionado && (
          <div className={styles.docPreview}>
            <div className={styles.previewInfo}>
              <div className={styles.previewItem}>
                <label>Categoria</label>
                <p>{CATEGORIAS.find(c => c.value === docSelecionado.categoria)?.label}</p>
              </div>
              <div className={styles.previewItem}>
                <label>Tamanho</label>
                <p>{formatarTamanho(docSelecionado.tamanho)}</p>
              </div>
              <div className={styles.previewItem}>
                <label>Enviado em</label>
                <p>{formatarData(docSelecionado.criadoEm)}</p>
              </div>
            </div>
            <div className={styles.previewActions}>
              <Button onClick={() => window.open(docSelecionado.url, '_blank')}>
                <FiDownload size={16} /> Baixar Documento
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
