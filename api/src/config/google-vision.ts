// ===========================================
// GOOGLE VISION API — Configuração
// Substitui o OCR.space para OCR de documentos
// Docs: https://cloud.google.com/vision/docs/ocr
//
// Variável de ambiente: GOOGLE_VISION_API_KEY
// Custo: ~$1.50 por 1000 imagens (primeiras 1000/mês grátis)
// ===========================================

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || ''
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate'
const TIMEOUT_MS = 30000 // 30s

/** Palavra individual com posição (mesma interface do OCR.space) */
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

/** Bloco de texto do Google Vision */
interface VisionVertex {
  x: number
  y: number
}

interface VisionTextAnnotation {
  description: string
  boundingPoly?: {
    vertices: VisionVertex[]
  }
}

interface VisionResponse {
  responses: Array<{
    textAnnotations?: VisionTextAnnotation[]
    fullTextAnnotation?: {
      text: string
    }
    error?: {
      code: number
      message: string
    }
  }>
}

/**
 * Converte boundingPoly do Google Vision em left/top/width/height.
 */
function boundingToRect(vertices: VisionVertex[]): { left: number; top: number; width: number; height: number } {
  if (!vertices || vertices.length < 4) {
    return { left: 0, top: 0, width: 0, height: 0 }
  }

  const xs = vertices.map(v => v.x || 0)
  const ys = vertices.map(v => v.y || 0)

  const left = Math.min(...xs)
  const top = Math.min(...ys)
  const right = Math.max(...xs)
  const bottom = Math.max(...ys)

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
}

/**
 * Agrupa palavras em linhas baseado na posição Y (top).
 * Palavras com top similar (dentro de tolerância) ficam na mesma linha.
 */
function agruparEmLinhas(palavras: OcrWord[]): OcrLine[] {
  if (palavras.length === 0) return []

  // Ordenar por top, depois left
  const sorted = [...palavras].sort((a, b) => a.Top !== b.Top ? a.Top - b.Top : a.Left - b.Left)

  const linhas: OcrLine[] = []
  let linhaAtual: OcrWord[] = [sorted[0]]
  let topAtual = sorted[0].Top

  for (let i = 1; i < sorted.length; i++) {
    const palavra = sorted[i]
    // Tolerância: se o top está dentro de 60% da altura da palavra, mesma linha
    const tolerancia = Math.max(palavra.Height * 0.6, 10)

    if (Math.abs(palavra.Top - topAtual) <= tolerancia) {
      linhaAtual.push(palavra)
    } else {
      // Nova linha
      linhaAtual.sort((a, b) => a.Left - b.Left)
      const tops = linhaAtual.map(p => p.Top)
      const heights = linhaAtual.map(p => p.Height)
      linhas.push({
        Words: linhaAtual,
        MinTop: Math.min(...tops),
        MaxHeight: Math.max(...heights),
      })
      linhaAtual = [palavra]
      topAtual = palavra.Top
    }
  }

  // Última linha
  if (linhaAtual.length > 0) {
    linhaAtual.sort((a, b) => a.Left - b.Left)
    const tops = linhaAtual.map(p => p.Top)
    const heights = linhaAtual.map(p => p.Height)
    linhas.push({
      Words: linhaAtual,
      MinTop: Math.min(...tops),
      MaxHeight: Math.max(...heights),
    })
  }

  return linhas
}

/**
 * Envia imagem para o Google Vision API e retorna texto detectado com posições.
 * Mesma assinatura do OCR.space para drop-in replacement.
 *
 * @param imageBuffer - Buffer da imagem
 * @param mimeType - Tipo MIME (não usado pelo Google Vision, mas mantido para compatibilidade)
 * @param filename - Nome do arquivo (para logs)
 */
export async function detectarTexto(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg',
  filename: string = 'document.jpg'
): Promise<{ textoCompleto: string; palavras: OcrWord[]; linhas: OcrLine[] }> {
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('GOOGLE_VISION_API_KEY não configurada. Defina a variável de ambiente no Railway.')
  }

  const imageBase64 = imageBuffer.toString('base64')
  const tamanhoKB = (imageBuffer.length / 1024).toFixed(0)

  console.log(`🔍 Google Vision — Enviando "${filename}" (${tamanhoKB}KB, ${mimeType})...`)
  const inicio = Date.now()

  const body = {
    requests: [
      {
        image: { content: imageBase64 },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
        ],
      },
    ],
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${VISION_API_URL}?key=${GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timer)
  } catch (err: any) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      throw new Error(`Google Vision timeout após ${TIMEOUT_MS / 1000}s`)
    }
    throw new Error(`Google Vision fetch error: ${err.message}`)
  }

  const ms = Date.now() - inicio

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`❌ Google Vision API error (${ms}ms):`, response.status, errorText.substring(0, 300))
    throw new Error(`Google Vision API retornou ${response.status}`)
  }

  const data = (await response.json()) as VisionResponse
  const resultado = data.responses?.[0]

  console.log(`⏱️ Google Vision respondeu em ${ms}ms`)

  if (resultado?.error) {
    console.error(`❌ Google Vision error:`, resultado.error)
    throw new Error(`Vision API: ${resultado.error.message}`)
  }

  const textoCompleto = resultado?.fullTextAnnotation?.text || ''
  const annotations = resultado?.textAnnotations || []

  // Primeiro annotation é o texto completo, os demais são palavras individuais
  const palavras: OcrWord[] = []
  for (let i = 1; i < annotations.length; i++) {
    const ann = annotations[i]
    if (!ann.boundingPoly?.vertices) continue

    const rect = boundingToRect(ann.boundingPoly.vertices)
    palavras.push({
      WordText: ann.description,
      Left: rect.left,
      Top: rect.top,
      Width: rect.width,
      Height: rect.height,
    })
  }

  // Agrupar em linhas
  const linhas = agruparEmLinhas(palavras)

  console.log(`📝 Google Vision — ${linhas.length} linhas, ${palavras.length} palavras (${ms}ms)`)
  if (textoCompleto) {
    console.log(`📝 Texto (primeiros 400 chars):\n${textoCompleto.substring(0, 400)}`)
  } else {
    console.warn('⚠️ Google Vision — Nenhum texto extraído da imagem')
  }

  return { textoCompleto, palavras, linhas }
}

/**
 * Envia PDF para o Google Vision API (endpoint files:annotate) e retorna texto.
 * Suporta até 5 páginas (limite do modo síncrono).
 *
 * @param pdfBuffer - Buffer do PDF
 * @param filename - Nome do arquivo (para logs)
 */
export async function detectarTextoPDF(
  pdfBuffer: Buffer,
  filename: string = 'document.pdf'
): Promise<{ textoCompleto: string; palavras: OcrWord[]; linhas: OcrLine[] }> {
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('GOOGLE_VISION_API_KEY não configurada. Defina a variável de ambiente no Railway.')
  }

  const pdfBase64 = pdfBuffer.toString('base64')
  const tamanhoKB = (pdfBuffer.length / 1024).toFixed(0)

  console.log(`🔍 Google Vision PDF — Enviando "${filename}" (${tamanhoKB}KB)...`)
  const inicio = Date.now()

  const body = {
    requests: [
      {
        inputConfig: {
          content: pdfBase64,
          mimeType: 'application/pdf',
        },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION' },
        ],
        // Processar até 5 páginas (limite síncrono)
        pages: [1, 2, 3, 4, 5],
      },
    ],
  }

  const FILES_API_URL = 'https://vision.googleapis.com/v1/files:annotate'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${FILES_API_URL}?key=${GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timer)
  } catch (err: any) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      throw new Error(`Google Vision PDF timeout após ${TIMEOUT_MS / 1000}s`)
    }
    throw new Error(`Google Vision PDF fetch error: ${err.message}`)
  }

  const ms = Date.now() - inicio

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`❌ Google Vision PDF API error (${ms}ms):`, response.status, errorText.substring(0, 300))
    throw new Error(`Google Vision PDF API retornou ${response.status}`)
  }

  const data = await response.json() as any
  const fileResponses = data.responses?.[0]?.responses || []

  console.log(`⏱️ Google Vision PDF respondeu em ${ms}ms — ${fileResponses.length} página(s)`)

  // Concatenar texto de todas as páginas
  const textosPaginas: string[] = []
  const todasPalavras: OcrWord[] = []

  for (let pageIdx = 0; pageIdx < fileResponses.length; pageIdx++) {
    const pageResult = fileResponses[pageIdx]

    if (pageResult?.error) {
      console.warn(`⚠️ Erro na página ${pageIdx + 1}:`, pageResult.error.message)
      continue
    }

    const textoPagina = pageResult?.fullTextAnnotation?.text || ''
    if (textoPagina) textosPaginas.push(textoPagina)

    // Extrair palavras com posições (annotations[0] = texto completo da página)
    const annotations = pageResult?.textAnnotations || []
    for (let i = 1; i < annotations.length; i++) {
      const ann = annotations[i]
      if (!ann.boundingPoly?.vertices) continue

      const rect = boundingToRect(ann.boundingPoly.vertices)
      todasPalavras.push({
        WordText: ann.description,
        Left: rect.left,
        Top: rect.top + (pageIdx * 10000), // Offset vertical por página para não misturar linhas
        Width: rect.width,
        Height: rect.height,
      })
    }
  }

  const textoCompleto = textosPaginas.join('\n')
  const linhas = agruparEmLinhas(todasPalavras)

  console.log(`📝 Google Vision PDF — ${fileResponses.length} páginas, ${linhas.length} linhas, ${todasPalavras.length} palavras (${ms}ms)`)
  if (textoCompleto) {
    console.log(`📝 Texto PDF (primeiros 400 chars):\n${textoCompleto.substring(0, 400)}`)
  } else {
    console.warn('⚠️ Google Vision PDF — Nenhum texto extraído do PDF')
  }

  return { textoCompleto, palavras: todasPalavras, linhas }
}
