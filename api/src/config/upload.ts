import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Diretório de uploads
export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads')

// Garantir que o diretório existe
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

// Configurações de upload
export const uploadConfig = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
}

// Tipos de documento permitidos
export const TIPOS_DOCUMENTO = [
  'RG',
  'CPF',
  'COMPROVANTE_RESIDENCIA',
  'COMPROVANTE_RENDA',
  'CERTIDAO_NASCIMENTO',
  'HISTORICO_ESCOLAR',
  'DECLARACAO_ESCOLAR',
  'CARTEIRA_TRABALHO',
  'IMPOSTO_RENDA',
  'OUTROS',
] as const

export type TipoDocumento = typeof TIPOS_DOCUMENTO[number]

// Gerar nome único para arquivo
export function gerarNomeArquivo(originalName: string): string {
  const ext = path.extname(originalName)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}${ext}`
}

// Validar tipo de arquivo
export function validarTipoArquivo(mimetype: string, filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return (
    uploadConfig.allowedMimeTypes.includes(mimetype) &&
    uploadConfig.allowedExtensions.includes(ext)
  )
}
