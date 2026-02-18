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

  console.log(`🔍 OCR.space — Enviando imagem (${(imageBase64.length * 0.75 / 1024).toFixed(0)}KB estimados)...`)
  const inicio = Date.now()

  // Usar FormData (multipart/form-data) — mais confiável que URLSearchParams para base64 grandes
  const formData = new FormData()
  formData.append('base64Image', base64ComPrefixo)
  formData.append('language', 'por')
  formData.append('isOverlayRequired', 'true')
  formData.append('OCREngine', '2')
  formData.append('scale', 'true')
  formData.append('isTable', 'true')
  formData.append('detectOrientation', 'true')

  let response: Response
  try {
    response = await fetch(OCR_SPACE_URL, {
      method: 'POST',
      headers: {
        'apikey': OCR_SPACE_API_KEY,
      },
      body: formData,
    })
  } catch (fetchErr: any) {
    console.error('❌ OCR.space — Erro de rede:', fetchErr.message)
    throw new Error(`Falha de conexão com OCR.space: ${fetchErr.message}`)
  }

  const tempoMs = Date.now() - inicio

  // Ler corpo da resposta como texto primeiro (para logging em caso de erro)
  const responseText = await response.text()

  if (!response.ok) {
    console.error(`❌ OCR.space HTTP ${response.status} (${tempoMs}ms):`, responseText.substring(0, 500))
    throw new Error(`OCR.space API retornou HTTP ${response.status}`)
  }

  // Parsear JSON
  let data: OcrSpaceResponse
  try {
    data = JSON.parse(responseText) as OcrSpaceResponse
  } catch (jsonErr) {
    console.error('❌ OCR.space — Resposta não é JSON válido:', responseText.substring(0, 500))
    throw new Error('OCR.space retornou resposta inválida')
  }

  console.log(`⏱️ OCR.space respondeu em ${tempoMs}ms — ExitCode: ${data.OCRExitCode}`)

  // Verificar erros no nível da API
  if (data.IsErroredOnProcessing) {
    const msg = data.ErrorMessage || 'Erro de processamento'
    const details = data.ErrorDetails || ''
    console.error(`❌ OCR.space erro: ${msg}`, details)
    throw new Error(`OCR.space: ${msg}`)
  }

  if (data.OCRExitCode === '3' || data.OCRExitCode === '4') {
    const msg = data.ErrorMessage || data.ParsedResults?.[0]?.ErrorMessage || 'Falha no parse'
    console.error(`❌ OCR.space ExitCode ${data.OCRExitCode}: ${msg}`)
    throw new Error(`OCR.space: ${msg}`)
  }

  // Extrair resultado da primeira página/imagem
  const resultado = data.ParsedResults?.[0]
  if (!resultado) {
    console.error('❌ OCR.space — ParsedResults vazio:', JSON.stringify(data).substring(0, 500))
    throw new Error('OCR.space não retornou resultado')
  }

  if (resultado.FileParseExitCode !== '1') {
    const msg = resultado.ErrorMessage || resultado.ErrorDetails || `ExitCode: ${resultado.FileParseExitCode}`
    console.error(`❌ OCR.space FileParseExitCode ${resultado.FileParseExitCode}: ${msg}`)
    throw new Error(`OCR.space parse error: ${msg}`)
  }

  const textoCompleto = resultado.ParsedText || ''
  const linhas = resultado.TextOverlay?.Lines || []

  // Coletar todas as palavras com posição
  const palavras: OcrWord[] = []
  for (const linha of linhas) {
    if (linha.Words) {
      for (const word of linha.Words) {
        palavras.push(word)
      }
    }
  }

  console.log(`📝 OCR.space — ${linhas.length} linhas, ${palavras.length} palavras detectadas`)
  if (textoCompleto) {
    console.log(`📝 Texto (primeiros 300 chars):\n${textoCompleto.substring(0, 300)}`)
  } else {
    console.warn('⚠️ OCR.space — Nenhum texto extraído da imagem')
  }

  return { textoCompleto, palavras, linhas }
}
