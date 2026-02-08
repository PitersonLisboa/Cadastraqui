import { useRef, useState, useCallback } from 'react'
import { FiUpload, FiFile, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi'
import styles from './FileUpload.module.scss'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number // em MB
  label?: string
  hint?: string
  disabled?: boolean
  error?: string
}

export function FileUpload({
  onFileSelect,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 5,
  label,
  hint,
  disabled = false,
  error,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const validateFile = (file: File): boolean => {
    setFileError(null)

    // Verificar tamanho
    const maxBytes = maxSize * 1024 * 1024
    if (file.size > maxBytes) {
      setFileError(`Arquivo muito grande. Máximo: ${maxSize}MB`)
      return false
    }

    // Verificar tipo
    const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase())
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const mimeType = file.type.toLowerCase()

    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type
      }
      return mimeType.includes(type.replace('*', ''))
    })

    if (!isValidType) {
      setFileError('Tipo de arquivo não permitido')
      return false
    }

    return true
  }

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file)
      onFileSelect(file)
    }
  }, [onFileSelect, maxSize, accept])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [disabled, handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFile(null)
    setFileError(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className={styles.container}>
      {label && <label className={styles.label}>{label}</label>}
      
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''} ${(error || fileError) ? styles.error : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className={styles.input}
        />

        {selectedFile ? (
          <div className={styles.selectedFile}>
            <div className={styles.fileInfo}>
              <FiFile size={24} />
              <div>
                <span className={styles.fileName}>{selectedFile.name}</span>
                <span className={styles.fileSize}>{formatFileSize(selectedFile.size)}</span>
              </div>
            </div>
            <button 
              type="button" 
              className={styles.removeButton}
              onClick={handleRemove}
            >
              <FiX size={18} />
            </button>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <FiUpload size={32} />
            <p>
              <strong>Clique para enviar</strong> ou arraste o arquivo aqui
            </p>
            <span>
              {accept.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')} até {maxSize}MB
            </span>
          </div>
        )}
      </div>

      {hint && !error && !fileError && (
        <span className={styles.hint}>{hint}</span>
      )}

      {(error || fileError) && (
        <span className={styles.errorMessage}>
          <FiAlertCircle size={14} />
          {error || fileError}
        </span>
      )}
    </div>
  )
}

// Componente para exibir arquivo já enviado
interface FileItemProps {
  name: string
  size?: number
  status?: 'pending' | 'approved' | 'rejected'
  statusLabel?: string
  onDownload?: () => void
  onRemove?: () => void
}

export function FileItem({ 
  name, 
  size, 
  status, 
  statusLabel,
  onDownload, 
  onRemove 
}: FileItemProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className={styles.fileItem}>
      <div className={styles.fileItemInfo}>
        <FiFile size={20} />
        <div>
          <span className={styles.fileItemName}>{name}</span>
          {size && <span className={styles.fileItemSize}>{formatFileSize(size)}</span>}
        </div>
      </div>
      <div className={styles.fileItemActions}>
        {status && (
          <span className={`${styles.fileStatus} ${styles[status]}`}>
            {status === 'approved' && <FiCheck size={12} />}
            {status === 'rejected' && <FiX size={12} />}
            {statusLabel || status}
          </span>
        )}
        {onDownload && (
          <button type="button" onClick={onDownload} className={styles.actionButton}>
            Download
          </button>
        )}
        {onRemove && (
          <button type="button" onClick={onRemove} className={styles.removeButton}>
            <FiX size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
