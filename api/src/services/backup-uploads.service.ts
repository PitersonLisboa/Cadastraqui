// ============================================================================
// CADASTRAQUI — Backup de Uploads para Supabase Storage
// Arquivo: api/src/services/backup-uploads.service.ts
// ============================================================================
//
// Este módulo:
//   1. Compacta a pasta /app/uploads em um .tar.gz
//   2. Envia para o Supabase Storage (bucket "backups")
//   3. Remove backups remotos antigos (retenção configurável)
//   4. Roda automaticamente via node-cron (diário às 3:30 BRT)
//
// As variáveis de ambiente necessárias são:
//   SUPABASE_PROJECT_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_BUCKET (opcional, padrão: "backups")
//   UPLOADS_BACKUP_CRON (opcional, padrão: "30 3 * * *")
//   UPLOADS_BACKUP_RETENTION_DAYS (opcional, padrão: 30)
//
// ============================================================================

import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import cron from 'node-cron'

const execAsync = promisify(exec)

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads'
const BACKUP_TEMP_DIR = '/tmp/uploads-backup'

const SUPABASE_PROJECT_URL = process.env.SUPABASE_PROJECT_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'backups'

const CRON_SCHEDULE = process.env.UPLOADS_BACKUP_CRON || '30 3 * * *' // 3:30 BRT
const RETENTION_DAYS = parseInt(process.env.UPLOADS_BACKUP_RETENTION_DAYS || '30', 10)

// ---------------------------------------------------------------------------
// Logger simples
// ---------------------------------------------------------------------------

function log(message: string) {
  const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  console.log(`[BACKUP-UPLOADS ${timestamp}] ${message}`)
}

function logError(message: string, error?: unknown) {
  const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  console.error(`[BACKUP-UPLOADS ${timestamp}] ERRO: ${message}`, error || '')
}

// ---------------------------------------------------------------------------
// Verificar se a pasta de uploads existe e tem arquivos
// ---------------------------------------------------------------------------

function uploadsExist(): boolean {
  if (!fs.existsSync(UPLOADS_DIR)) {
    log(`Pasta de uploads não encontrada: ${UPLOADS_DIR}`)
    return false
  }

  const files = fs.readdirSync(UPLOADS_DIR, { recursive: true }) as string[]
  const realFiles = files.filter((f) => {
    const fullPath = path.join(UPLOADS_DIR, f)
    return fs.statSync(fullPath).isFile() && f !== '.gitkeep'
  })

  if (realFiles.length === 0) {
    log('Pasta de uploads está vazia, pulando backup.')
    return false
  }

  log(`Encontrados ${realFiles.length} arquivos para backup.`)
  return true
}

// ---------------------------------------------------------------------------
// Compactar uploads em .tar.gz
// ---------------------------------------------------------------------------

async function compactUploads(): Promise<{ filePath: string; fileName: string; sizeFormatted: string }> {
  // Cria diretório temporário
  if (!fs.existsSync(BACKUP_TEMP_DIR)) {
    fs.mkdirSync(BACKUP_TEMP_DIR, { recursive: true })
  }

  const now = new Date()
  const timestamp = now.toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').substring(0, 15)
  // Formato: uploads_YYYYMMDDHHMMSS.tar.gz
  const formattedTimestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '_',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')

  const fileName = `uploads_${formattedTimestamp}.tar.gz`
  const filePath = path.join(BACKUP_TEMP_DIR, fileName)

  log('Compactando uploads...')

  // Usa tar nativo (disponível no container Alpine/Debian do Railway)
  await execAsync(`tar -czf "${filePath}" -C "${path.dirname(UPLOADS_DIR)}" "${path.basename(UPLOADS_DIR)}"`)

  const stats = fs.statSync(filePath)
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
  const sizeFormatted = stats.size > 1024 * 1024 ? `${sizeMB} MB` : `${(stats.size / 1024).toFixed(1)} KB`

  log(`Compactado: ${fileName} (${sizeFormatted})`)

  return { filePath, fileName, sizeFormatted }
}

// ---------------------------------------------------------------------------
// Upload para Supabase Storage
// ---------------------------------------------------------------------------

async function uploadToSupabase(filePath: string, fileName: string): Promise<boolean> {
  log(`Enviando para Supabase Storage (bucket: ${SUPABASE_BUCKET})...`)

  const fileBuffer = fs.readFileSync(filePath)
  const url = `${SUPABASE_PROJECT_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: fileBuffer,
  })

  if (response.ok) {
    log(`Upload OK (HTTP ${response.status}) → ${SUPABASE_BUCKET}/${fileName}`)
    return true
  } else {
    const errorText = await response.text()
    logError(`Upload falhou (HTTP ${response.status}): ${errorText}`)
    return false
  }
}

// ---------------------------------------------------------------------------
// Limpar backups antigos no Supabase
// ---------------------------------------------------------------------------

async function cleanOldBackups(): Promise<void> {
  log(`Verificando backups de uploads antigos (> ${RETENTION_DAYS} dias)...`)

  try {
    const listUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/list/${SUPABASE_BUCKET}`

    const listResponse = await fetch(listUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prefix: 'uploads_',
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' },
      }),
    })

    if (!listResponse.ok) {
      logError(`Falha ao listar backups remotos (HTTP ${listResponse.status})`)
      return
    }

    const files = (await listResponse.json()) as Array<{ name: string; created_at?: string }>

    if (!Array.isArray(files) || files.length === 0) {
      log('Nenhum backup remoto de uploads encontrado.')
      return
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS)

    const oldFiles: string[] = []

    for (const file of files) {
      if (!file.name.startsWith('uploads_')) continue

      // Extrai timestamp do nome: uploads_YYYYMMDD_HHMMSS.tar.gz
      const match = file.name.match(/^uploads_(\d{8})_(\d{6})\.tar\.gz$/)
      if (!match) continue

      const dateStr = match[1] // YYYYMMDD
      const timeStr = match[2] // HHMMSS
      const fileDate = new Date(
        parseInt(dateStr.substring(0, 4)),
        parseInt(dateStr.substring(4, 6)) - 1,
        parseInt(dateStr.substring(6, 8)),
        parseInt(timeStr.substring(0, 2)),
        parseInt(timeStr.substring(2, 4)),
        parseInt(timeStr.substring(4, 6))
      )

      if (fileDate < cutoffDate) {
        oldFiles.push(file.name)
      }
    }

    if (oldFiles.length === 0) {
      log('Nenhum backup de uploads antigo para remover.')
      return
    }

    const deleteUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/${SUPABASE_BUCKET}`

    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: oldFiles }),
    })

    if (deleteResponse.ok) {
      log(`Removidos ${oldFiles.length} backups de uploads antigos.`)
    } else {
      logError(`Falha ao remover backups antigos (HTTP ${deleteResponse.status})`)
    }
  } catch (error) {
    logError('Erro ao limpar backups antigos:', error)
  }
}

// ---------------------------------------------------------------------------
// Executar backup completo
// ---------------------------------------------------------------------------

export async function runUploadsBackup(): Promise<void> {
  log('========== INÍCIO DO BACKUP DE UPLOADS ==========')

  try {
    // 1. Verificar se existem uploads
    if (!uploadsExist()) {
      log('========== BACKUP PULADO (sem arquivos) ==========')
      return
    }

    // 2. Compactar
    const { filePath, fileName, sizeFormatted } = await compactUploads()

    try {
      // 3. Upload para Supabase
      const success = await uploadToSupabase(filePath, fileName)

      if (success) {
        // 4. Limpar antigos
        await cleanOldBackups()

        log('========== BACKUP DE UPLOADS CONCLUÍDO ==========')
        log(`  Arquivo: ${fileName}`)
        log(`  Tamanho: ${sizeFormatted}`)
        log(`  Destino: ${SUPABASE_BUCKET}/${fileName}`)
        log('=================================================')
      }
    } finally {
      // Limpa arquivo temporário
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }
  } catch (error) {
    logError('Backup de uploads falhou:', error)
  }
}

// ---------------------------------------------------------------------------
// Inicializar cron job
// ---------------------------------------------------------------------------

export function initUploadsBackup(): void {
  // Validar configuração
  if (!SUPABASE_PROJECT_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    log('AVISO: Variáveis SUPABASE_PROJECT_URL e/ou SUPABASE_SERVICE_ROLE_KEY não definidas.')
    log('Backup de uploads DESABILITADO.')
    return
  }

  if (!cron.validate(CRON_SCHEDULE)) {
    logError(`Expressão cron inválida: ${CRON_SCHEDULE}`)
    return
  }

  log(`Backup de uploads agendado: ${CRON_SCHEDULE}`)
  log(`Pasta monitorada: ${UPLOADS_DIR}`)
  log(`Destino: ${SUPABASE_PROJECT_URL} → bucket "${SUPABASE_BUCKET}"`)
  log(`Retenção: ${RETENTION_DAYS} dias`)

  cron.schedule(CRON_SCHEDULE, () => {
    runUploadsBackup().catch((err) => {
      logError('Erro não tratado no backup de uploads:', err)
    })
  }, {
    timezone: 'America/Sao_Paulo',
  })
}
