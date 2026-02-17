// ===========================================
// GOOGLE VISION API — Configuração
// ===========================================

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || ''
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate'

export interface VisionTextBlock {
  description: string
  boundingPoly?: {
    vertices: Array<{ x: number; y: number }>
  }
}

export interface VisionResponse {
  responses: Array<{
    textAnnotations?: VisionTextBlock[]
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
 * Envia imagem para o Google Vision API e retorna o texto detectado.
 * @param imageBase64 - Imagem em base64 (sem o prefixo data:image/...)
 */
export async function detectarTexto(imageBase64: string): Promise<{ textoCompleto: string; blocos: VisionTextBlock[] }> {
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('GOOGLE_VISION_API_KEY não configurada')
  }

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

  const response = await fetch(`${VISION_API_URL}?key=${GOOGLE_VISION_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Google Vision API error:', response.status, errorText)
    throw new Error(`Google Vision API retornou ${response.status}`)
  }

  const data = (await response.json()) as VisionResponse
  const resultado = data.responses?.[0]

  if (resultado?.error) {
    throw new Error(`Vision API: ${resultado.error.message}`)
  }

  const textoCompleto = resultado?.fullTextAnnotation?.text || ''
  const blocos = resultado?.textAnnotations || []

  return { textoCompleto, blocos }
}
