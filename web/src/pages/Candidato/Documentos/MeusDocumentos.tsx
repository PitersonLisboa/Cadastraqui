import { useState, useEffect } from 'react'
import { 
  FiFile, 
  FiDownload, 
  FiTrash2,
  FiCheckCircle,
  FiClock,
  FiXCircle
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { documentoService } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Card } from '@/components/common/Card/Card'
import { formatDate } from '@/utils/masks'
import styles from './MeusDocumentos.module.scss'

interface Documento {
  id: string
  tipo: string
  nome: string
  url: string
  status: 'PENDENTE' | 'ENVIADO' | 'APROVADO' | 'REJEITADO'
  observacao?: string
  createdAt: string
}

const TIPOS_DOCUMENTO = [
  { value: 'RG', label: 'RG - Documento de Identidade' },
  { value: 'CPF', label: 'CPF' },
  { value: 'COMPROVANTE_RESIDENCIA', label: 'Comprovante de Residência' },
  { value: 'COMPROVANTE_RENDA', label: 'Comprovante de Renda' },
  { value: 'CERTIDAO_NASCIMENTO', label: 'Certidão de Nascimento' },
  { value: 'HISTORICO_ESCOLAR', label: 'Histórico Escolar' },
  { value: 'DECLARACAO_ESCOLAR', label: 'Declaração Escolar' },
  { value: 'CARTEIRA_TRABALHO', label: 'Carteira de Trabalho' },
  { value: 'IMPOSTO_RENDA', label: 'Declaração de Imposto de Renda' },
  { value: 'OUTROS', label: 'Outros' },
]

const STATUS_CONFIG: Record<string, { label: string; icon: JSX.Element; class: string }> = {
  PENDENTE: { label: 'Pendente', icon: <FiClock />, class: 'pendente' },
  ENVIADO: { label: 'Enviado', icon: <FiClock />, class: 'enviado' },
  APROVADO: { label: 'Aprovado', icon: <FiCheckCircle />, class: 'aprovado' },
  REJEITADO: { label: 'Rejeitado', icon: <FiXCircle />, class: 'rejeitado' },
}

export function MeusDocumentos() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDocumentos()
  }, [])

  const loadDocumentos = async () => {
    try {
      const response = await documentoService.listar()
      setDocumentos(response.documentos)
    } catch (error) {
      toast.error('Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Deseja realmente excluir o documento "${nome}"?`)) {
      return
    }

    try {
      await documentoService.excluir(id)
      toast.success('Documento excluído')
      loadDocumentos()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir documento')
    }
  }

  const getDocumentosByTipo = () => {
    const grouped: Record<string, Documento[]> = {}
    
    documentos.forEach(doc => {
      if (!grouped[doc.tipo]) {
        grouped[doc.tipo] = []
      }
      grouped[doc.tipo].push(doc)
    })

    return grouped
  }

  const getTipoLabel = (tipo: string) => {
    return TIPOS_DOCUMENTO.find(t => t.value === tipo)?.label || tipo
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Carregando documentos...</p>
      </div>
    )
  }

  const documentosAgrupados = getDocumentosByTipo()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Meus Documentos</h1>
          <p>Documentos enviados nas seções do seu cadastro</p>
        </div>
      </header>

      {/* Dica */}
      <div className={styles.tipCard}>
        <strong>💡 Dica:</strong> Mantenha seus documentos atualizados na seção de Cadastro. 
        Documentos aprovados podem ser reutilizados em múltiplos editais.
      </div>

      {/* Lista de Documentos */}
      {documentos.length === 0 ? (
        <Card>
          <div className={styles.emptyState}>
            <FiFile size={48} />
            <h3>Nenhum documento enviado</h3>
            <p>Seus documentos aparecerão aqui após serem enviados na seção de Cadastro.</p>
          </div>
        </Card>
      ) : (
        <div className={styles.documentosGrid}>
          {Object.entries(documentosAgrupados).map(([tipo, docs]) => (
            <Card key={tipo} title={getTipoLabel(tipo)} className={styles.tipoCard}>
              {docs.map((doc) => {
                const statusConfig = STATUS_CONFIG[doc.status]
                return (
                  <div key={doc.id} className={styles.documentoItem}>
                    <div className={styles.docInfo}>
                      <FiFile size={20} />
                      <div>
                        <span className={styles.docNome}>{doc.nome}</span>
                        <span className={styles.docData}>
                          Enviado em {formatDate(doc.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.docActions}>
                      <span className={`${styles.status} ${styles[statusConfig.class]}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(doc.url, '_blank')}
                      >
                        <FiDownload size={16} />
                      </Button>
                      {doc.status !== 'APROVADO' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(doc.id, doc.nome)}
                        >
                          <FiTrash2 size={16} />
                        </Button>
                      )}
                    </div>
                    {doc.observacao && doc.status === 'REJEITADO' && (
                      <div className={styles.observacao}>
                        <strong>Motivo:</strong> {doc.observacao}
                      </div>
                    )}
                  </div>
                )
              })}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
