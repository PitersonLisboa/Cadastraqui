// ===========================================
// OCR.SPACE API — Configuração
// Substitui o Google Vision para OCR de documentos
// Docs: https://ocr.space/OCRAPI
//
// Envia imagem como FILE (multipart), não base64.
// Mais confiável e eficiente no Node.js.
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
 * Envia imagem (buffer) para o OCR.space API e retorna o texto detectado com posições.
 * Usa Engine 2 + português + scale + isTable para melhor resultado em RG brasileiro.
 *
 * @param imageBuffer - Buffer da imagem (não base64)
 * @param mimeType - Tipo MIME (image/jpeg, image/png, etc.)
 * @param filename - Nome do arquivo para o upload
 */
export async function detectarTexto(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg',
  filename: string = 'document.jpg'
): Promise<{ textoCompleto: string; palavras: OcrWord[]; linhas: OcrLine[] }> {
  if (!OCR_SPACE_API_KEY) {
    throw new Error('OCR_SPACE_API_KEY não configurada. Defina a variável de ambiente no Railway.')
  }

  console.log(`🔍 OCR.space — Enviando imagem "${filename}" (${(imageBuffer.length / 1024).toFixed(0)}KB, ${mimeType})...`)
  const inicio = Date.now()

  // Montar FormData com arquivo (não base64)
  const blob = new Blob([imageBuffer], { type: mimeType })
  const formData = new FormData()
  formData.append('file', blob, filename)
  formData.append('language', 'por')
  formData.append('isOverlayRequired', 'true')
  formData.append('OCREngine', '2')
  formData.append('scale', 'true')
  formData.append('isTable', 'true')
  formData.append('detectOrientation', 'true')
  formData.append('filetype', mimeType.includes('png') ? 'PNG' : 'JPG')

  let response: Response
  try {
    response = await fetch(OCR_SPACE_URL, {
      method: 'POST',
      headers: {
        'apikey': OCR_SPACE_API_KEY,
        // NÃO setar Content-Type — fetch define automaticamente com boundary correto
      },
      body: formData,
    })
  } catch (fetchErr: any) {
    console.error('❌ OCR.space — Erro de rede:', fetchErr.message)
    throw new Error(`Falha de conexão com OCR.space: ${fetchErr.message}`)
  }

  const tempoMs = Date.now() - inicio

  // Ler resposta como texto primeiro (para logging em caso de erro)
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

  console.log(`⏱️ OCR.space respondeu em ${tempoMs}ms — ExitCode: ${data.OCRExitCode}, Erro: ${data.IsErroredOnProcessing}`)

  // Log completo se houver erro
  if (data.IsErroredOnProcessing || data.ErrorMessage) {
    console.error('❌ OCR.space resposta completa:', JSON.stringify(data, null, 2).substring(0, 1000))
  }

  // Verificar erros no nível da API
  if (data.IsErroredOnProcessing) {
    const msg = data.ErrorMessage || 'Erro de processamento'
    const details = data.ErrorDetails || ''
    throw new Error(`OCR.space: ${msg} ${details}`.trim())
  }

  const ocrExitCode = Number(data.OCRExitCode)
  if (ocrExitCode === 3 || ocrExitCode === 4) {
    const msg = data.ErrorMessage || data.ParsedResults?.[0]?.ErrorMessage || 'Falha no parse'
    throw new Error(`OCR.space: ${msg}`)
  }

  // Extrair resultado da primeira página/imagem
  const resultado = data.ParsedResults?.[0]
  if (!resultado) {
    console.error('❌ OCR.space — Sem ParsedResults:', JSON.stringify(data).substring(0, 500))
    throw new Error('OCR.space não retornou resultado')
  }

  // FileParseExitCode: 1 = sucesso (API retorna como número, não string)
  const exitCode = Number(resultado.FileParseExitCode)
  if (exitCode !== 1) {
    const msg = resultado.ErrorMessage || resultado.ErrorDetails || `ExitCode: ${exitCode}`
    console.error(`❌ OCR.space FileParseExitCode ${exitCode}:`, msg)
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
    console.log(`📝 Texto extraído (primeiros 400 chars):\n${textoCompleto.substring(0, 400)}`)
  } else {
    console.warn('⚠️ OCR.space — Nenhum texto extraído da imagem')
  }

  return { textoCompleto, palavras, linhas }
}
