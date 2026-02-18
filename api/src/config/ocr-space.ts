// ===========================================
// OCR.SPACE API — Configuração
// Substitui o Google Vision para OCR de documentos
// Docs: https://ocr.space/OCRAPI
// ===========================================

const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || ''
const OCR_SPACE_URL = 'https://api.ocr.space/parse/image'

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
  FileParseExitCode: string
  ParsedText: string
  ErrorMessage: string | null
  ErrorDetails: string | null
}

/** Resposta completa da API */
export interface OcrSpaceResponse {
  ParsedResults: OcrParsedResult[]
  OCRExitCode: string
  IsErroredOnProcessing: boolean
  ErrorMessage: string | null
  ErrorDetails: string | null
  ProcessingTimeInMilliseconds: string
}

/**
 * Envia imagem para o OCR.space API e retorna o texto detectado com posições.
 * Usa Engine 2 + português + scale + isTable para melhor resultado em RG brasileiro.
 *
 * @param imageBase64 - Imagem em base64 (sem o prefixo data:image/...)
 * @param mimeType - Tipo MIME da imagem (image/jpeg, image/png, etc.)
 */
export async function detectarTexto(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<{ textoCompleto: string; palavras: OcrWord[]; linhas: OcrLine[] }> {
  if (!OCR_SPACE_API_KEY) {
    throw new Error('OCR_SPACE_API_KEY não configurada. Defina a variável de ambiente no Railway.')
  }

  // OCR.space espera base64 com prefixo data:mime;base64,
  const base64ComPrefixo = `data:${mimeType};base64,${imageBase64}`

  // Montar form data
  const formBody = new URLSearchParams()
  formBody.append('base64Image', base64ComPrefixo)
  formBody.append('language', 'por')             // Português
  formBody.append('isOverlayRequired', 'true')   // Retorna posição das palavras
  formBody.append('OCREngine', '2')              // Engine 2: melhor para docs com fundo confuso
  formBody.append('scale', 'true')               // Upscaling interno (melhora fotos de celular)
  formBody.append('isTable', 'true')             // Retorno linha-a-linha (bom para RG)
  formBody.append('detectOrientation', 'true')   // Auto-rotação

  console.log('🔍 OCR.space — Enviando imagem para análise...')
  const inicio = Date.now()

  const response = await fetch(OCR_SPACE_URL, {
    method: 'POST',
    headers: {
      'apikey': OCR_SPACE_API_KEY,
    },
    body: formBody,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ OCR.space API error:', response.status, errorText)
    throw new Error(`OCR.space API retornou ${response.status}`)
  }

  const data = (await response.json()) as OcrSpaceResponse
  const tempoMs = Date.now() - inicio
  console.log(`⏱️ OCR.space respondeu em ${tempoMs}ms`)

  // Verificar erros
  if (data.IsErroredOnProcessing || data.OCRExitCode === '3' || data.OCRExitCode === '4') {
    const msg = data.ErrorMessage || data.ParsedResults?.[0]?.ErrorMessage || 'Erro desconhecido'
    console.error('❌ OCR.space erro de processamento:', msg, data.ErrorDetails)
    throw new Error(`OCR.space: ${msg}`)
  }

  // Extrair resultado da primeira página/imagem
  const resultado = data.ParsedResults?.[0]
  if (!resultado) {
    throw new Error('OCR.space não retornou resultado')
  }

  if (resultado.FileParseExitCode !== '1') {
    const msg = resultado.ErrorMessage || `Exit code: ${resultado.FileParseExitCode}`
    throw new Error(`OCR.space parse error: ${msg}`)
  }

  const textoCompleto = resultado.ParsedText || ''
  const linhas = resultado.TextOverlay?.Lines || []

  // Coletar todas as palavras com posição
  const palavras: OcrWord[] = []
  for (const linha of linhas) {
    for (const word of linha.Words) {
      palavras.push(word)
    }
  }

  console.log(`📝 OCR.space — ${linhas.length} linhas, ${palavras.length} palavras detectadas`)
  console.log(`📝 Texto (primeiros 300 chars): ${textoCompleto.substring(0, 300)}`)

  return { textoCompleto, palavras, linhas }
}
