// ===========================================
// OCR.SPACE API — Configuração
// Substitui o Google Vision para OCR de documentos
// Docs: https://ocr.space/OCRAPI
//
// Estratégia de engines:
//   1º) Engine 2 — melhor para docs com fundo variado (RG brasileiro)
//   2º) Engine 1 — fallback mais leve quando Engine 2 retorna E500
// ===========================================

const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || ''
const OCR_SPACE_URL = 'https://api.ocr.space/parse/image'
const TIMEOUT_MS = 30000 // 30s

/** Palavra individual com posição */
export interface OcrWord {
  WordText: string
  Left: number
  Top: number
  Height: number
  Width: number
}

/** Linha de texto com palavras */
export interface OcrLine {
  Words: OcrWord[]
  MaxHeight: number
  MinTop: number
}

/** Resultado parseado de uma página/imagem */
export interface OcrParsedResult {
  TextOverlay: {
    Lines: OcrLine[]
    HasOverlay: boolean
    Message: string | null
  } | null
  FileParseExitCode: number | string
  ParsedText: string
  ErrorMessage: string | null
  ErrorDetails: string | null
}

/** Resposta completa da API */
export interface OcrSpaceResponse {
  ParsedResults: OcrParsedResult[]
  OCRExitCode: number | string
  IsErroredOnProcessing: boolean
  ErrorMessage: string | string[] | null
  ErrorDetails: string | null
  ProcessingTimeInMilliseconds: string
}

/**
 * Faz uma chamada ao OCR.space com a engine especificada.
 */
async function chamarOcrSpace(
  imageBuffer: Buffer,
  mimeType: string,
  filename: string,
  engine: '1' | '2',
): Promise<OcrSpaceResponse> {
  const blob = new Blob([imageBuffer], { type: mimeType })
  const formData = new FormData()
  formData.append('file', blob, filename)
  formData.append('language', 'por')
  formData.append('isOverlayRequired', 'true')
  formData.append('OCREngine', engine)
  formData.append('scale', 'true')
  formData.append('isTable', 'true')
  formData.append('detectOrientation', 'true')
  formData.append('filetype', mimeType.includes('png') ? 'PNG' : 'JPG')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(OCR_SPACE_URL, {
      method: 'POST',
      headers: { 'apikey': OCR_SPACE_API_KEY },
      body: formData,
      signal: controller.signal,
    })
    clearTimeout(timer)

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 200)}`)
    }

    return JSON.parse(responseText) as OcrSpaceResponse
  } catch (err: any) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      throw new Error(`Timeout após ${TIMEOUT_MS / 1000}s`)
    }
    throw err
  }
}

/**
 * Verifica se a resposta do OCR.space indica erro recuperável (servidor sobrecarregado).
 * Nesses casos, vale tentar Engine 1 como fallback.
 */
function isErroRecuperavel(data: OcrSpaceResponse): boolean {
  const exitCode = Number(data.OCRExitCode)
  // ExitCode 6 = Timed out, 99 = System Resource Exhaustion
  if (exitCode === 6 || exitCode === 99) return true

  const msg = Array.isArray(data.ErrorMessage)
    ? data.ErrorMessage.join(' ')
    : data.ErrorMessage || ''
  if (/E500|Resource Exhaustion|Timed out/i.test(msg)) return true

  return false
}

/**
 * Envia imagem para o OCR.space API e retorna o texto detectado com posições.
 * Tenta Engine 2 primeiro; se falhar com erro de servidor, tenta Engine 1.
 *
 * @param imageBuffer - Buffer da imagem
 * @param mimeType - Tipo MIME (image/jpeg, image/png, etc.)
 * @param filename - Nome do arquivo
 */
export async function detectarTexto(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg',
  filename: string = 'document.jpg'
): Promise<{ textoCompleto: string; palavras: OcrWord[]; linhas: OcrLine[] }> {
  if (!OCR_SPACE_API_KEY) {
    throw new Error('OCR_SPACE_API_KEY não configurada. Defina a variável de ambiente no Railway.')
  }

  console.log(`🔍 OCR.space — Enviando "${filename}" (${(imageBuffer.length / 1024).toFixed(0)}KB, ${mimeType})...`)
  const inicio = Date.now()

  // ── Tentativa 1: Engine 2 (melhor para RG) ──
  let data: OcrSpaceResponse
  try {
    data = await chamarOcrSpace(imageBuffer, mimeType, filename, '2')
    const ms = Date.now() - inicio
    console.log(`⏱️ OCR.space Engine 2 respondeu em ${ms}ms — ExitCode: ${data.OCRExitCode}`)
  } catch (err: any) {
    console.warn(`⚠️ OCR.space Engine 2 falhou: ${err.message}`)
    // Ir direto para Engine 1
    data = { ParsedResults: [], OCRExitCode: 99, IsErroredOnProcessing: true, ErrorMessage: err.message, ErrorDetails: null, ProcessingTimeInMilliseconds: '0' }
  }

  // ── Se Engine 2 falhou com erro recuperável, tentar Engine 1 ──
  if (data.IsErroredOnProcessing || isErroRecuperavel(data)) {
    const msgOriginal = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join('; ') : data.ErrorMessage
    console.log(`🔄 Engine 2 falhou (${msgOriginal}). Tentando Engine 1 como fallback...`)

    try {
      const inicio2 = Date.now()
      data = await chamarOcrSpace(imageBuffer, mimeType, filename, '1')
      const ms2 = Date.now() - inicio2
      console.log(`⏱️ OCR.space Engine 1 respondeu em ${ms2}ms — ExitCode: ${data.OCRExitCode}`)
    } catch (err2: any) {
      console.error(`❌ OCR.space Engine 1 também falhou: ${err2.message}`)
      throw new Error('OCR.space indisponível no momento. Tente novamente em alguns instantes.')
    }

    // Se Engine 1 também deu erro
    if (data.IsErroredOnProcessing) {
      const msg2 = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join('; ') : data.ErrorMessage || 'Erro desconhecido'
      console.error(`❌ OCR.space Engine 1 erro: ${msg2}`)
      throw new Error('OCR.space indisponível no momento. Tente novamente em alguns instantes.')
    }
  }

  const tempoTotal = Date.now() - inicio

  // Extrair resultado
  const resultado = data.ParsedResults?.[0]
  if (!resultado) {
    console.error('❌ OCR.space — Sem ParsedResults')
    throw new Error('OCR.space não retornou resultado')
  }

  const exitCode = Number(resultado.FileParseExitCode)
  if (exitCode !== 1) {
    const msg = resultado.ErrorMessage || resultado.ErrorDetails || `ExitCode: ${exitCode}`
    console.error(`❌ OCR.space FileParseExitCode ${exitCode}:`, msg)
    throw new Error(`OCR.space parse error: ${msg}`)
  }

  const textoCompleto = resultado.ParsedText || ''
  const linhas = resultado.TextOverlay?.Lines || []

  const palavras: OcrWord[] = []
  for (const linha of linhas) {
    if (linha.Words) {
      for (const word of linha.Words) {
        palavras.push(word)
      }
    }
  }

  console.log(`📝 OCR.space — ${linhas.length} linhas, ${palavras.length} palavras (${tempoTotal}ms total)`)
  if (textoCompleto) {
    console.log(`📝 Texto (primeiros 400 chars):\n${textoCompleto.substring(0, 400)}`)
  } else {
    console.warn('⚠️ OCR.space — Nenhum texto extraído da imagem')
  }

  return { textoCompleto, palavras, linhas }
}
