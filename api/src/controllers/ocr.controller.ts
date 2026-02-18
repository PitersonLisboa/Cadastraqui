import { FastifyReply, FastifyRequest } from 'fastify'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma'
import { CandidatoNaoEncontradoError, ArquivoInvalidoError } from '../errors/index'
import { UPLOADS_DIR, gerarNomeArquivo } from '../config/upload'
import { detectarTexto } from '../config/ocr-space'
import { parsearRG, PalavraOCR, LinhaOCR } from '../services/rg-parser'

// ===========================================
// ESCANEAR RG (frente ou verso)
// POST /ocr/rg
// Recebe imagem, chama OCR.space, extrai dados,
// salva imagem como documento e retorna campos preenchidos.
// Permite até 2 documentos RG (frente + verso).
// ===========================================

const MAX_RG_DOCS = 2
const MAX_IMAGE_SIZE_OCR = 900 * 1024  // ~900KB (free plan = 1MB, margem)

/**
 * Redimensiona imagem se necessário para caber no limite do OCR.space.
 * Se sharp não estiver disponível, retorna a imagem original.
 */
async function prepararImagemParaOCR(
  buffer: Buffer,
  mimetype: string
): Promise<{ base64: string; mimeType: string }> {
  // Se já está dentro do limite, usar direto
  if (buffer.length <= MAX_IMAGE_SIZE_OCR) {
    return {
      base64: buffer.toString('base64'),
      mimeType: mimetype,
    }
  }

  console.log(`📐 Imagem grande (${(buffer.length / 1024).toFixed(0)}KB) — tentando redimensionar...`)

  try {
    const sharp = (await import('sharp')).default
    let img = sharp(buffer)
    const metadata = await img.metadata()
    const maxDim = 1600

    if (metadata.width && metadata.height) {
      const maior = Math.max(metadata.width, metadata.height)
      if (maior > maxDim) {
        img = img.resize({
          width: metadata.width > metadata.height ? maxDim : undefined,
          height: metadata.height >= metadata.width ? maxDim : undefined,
          fit: 'inside',
          withoutEnlargement: true,
        })
      }
    }

    const bufferReduzido = await img.jpeg({ quality: 75 }).toBuffer()
    console.log(`📐 Reduzido: ${(buffer.length / 1024).toFixed(0)}KB → ${(bufferReduzido.length / 1024).toFixed(0)}KB`)

    return {
      base64: bufferReduzido.toString('base64'),
      mimeType: 'image/jpeg',
    }
  } catch (sharpErr: any) {
    console.warn(`⚠️ Sharp indisponível (${sharpErr.message}) — enviando imagem original`)
    return {
      base64: buffer.toString('base64'),
      mimeType: mimetype,
    }
  }
}

export async function escanearRG(request: FastifyRequest, reply: FastifyReply) {
  // Buscar candidato
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  // Processar multipart
  const data = await request.file()
  if (!data) {
    return reply.status(400).send({ message: 'Nenhum arquivo enviado' })
  }

  // Validar tipo (apenas imagens)
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedMimes.includes(data.mimetype)) {
    throw new ArquivoInvalidoError('Tipo de arquivo não permitido. Use JPG, PNG ou WebP.')
  }

  // Ler arquivo em buffer
  const chunks: Buffer[] = []
  let totalSize = 0
  const maxSize = 10 * 1024 * 1024

  for await (const chunk of data.file) {
    totalSize += chunk.length
    if (totalSize > maxSize) {
      return reply.status(400).send({ message: 'Arquivo excede o limite de 10MB' })
    }
    chunks.push(chunk)
  }

  const bufferOriginal = Buffer.concat(chunks)

  console.log('📸 OCR RG - Imagem recebida:', data.filename, `(${(totalSize / 1024).toFixed(1)}KB)`)

  // Preparar imagem (redimensionar se necessário para o limite do OCR.space)
  const { base64: imageBase64, mimeType: ocrMimeType } =
    await prepararImagemParaOCR(bufferOriginal, data.mimetype)

  // Chamar OCR.space API
  let textoCompleto: string
  let palavrasOCR: PalavraOCR[] = []
  let linhasOCR: LinhaOCR[] = []

  try {
    const resultado = await detectarTexto(imageBase64, ocrMimeType)
    textoCompleto = resultado.textoCompleto

    // Converter formato OCR.space → formato do parser
    for (const linha of resultado.linhas) {
      const palavrasDaLinha: PalavraOCR[] = []
      if (linha.Words) {
        for (const word of linha.Words) {
          const p: PalavraOCR = {
            text: word.WordText,
            left: word.Left,
            top: word.Top,
            width: word.Width,
            height: word.Height,
          }
          palavrasOCR.push(p)
          palavrasDaLinha.push(p)
        }
      }
      linhasOCR.push({
        palavras: palavrasDaLinha,
        minTop: linha.MinTop,
        maxHeight: linha.MaxHeight,
      })
    }
  } catch (err: any) {
    console.error('❌ Erro no OCR:', err.message)
    return reply.status(502).send({
      message: 'Erro ao processar imagem com OCR. Tente novamente.',
      detalhe: err.message,
    })
  }

  if (!textoCompleto || textoCompleto.trim().length === 0) {
    return reply.status(422).send({
      message: 'Não foi possível detectar texto na imagem. Tente com uma foto mais nítida.',
    })
  }

  // Parsear campos do RG — passando palavras e linhas com posição
  const dados = parsearRG(textoCompleto, palavrasOCR, linhasOCR)

  // Se existe candidato, salvar imagem ORIGINAL como documento RG
  let documentoSalvo = false
  let qualLado: 'frente' | 'verso' | null = null

  if (candidato) {
    try {
      const rgExistentes = await prisma.documento.count({
        where: { candidatoId: candidato.id, tipo: 'RG' },
      })

      if (rgExistentes < MAX_RG_DOCS) {
        qualLado = rgExistentes === 0 ? 'frente' : 'verso'

        // Salvar arquivo ORIGINAL (não o reduzido)
        const nomeArquivo = gerarNomeArquivo(data.filename || `rg-${qualLado}-scan.jpg`)
        const filePath = path.join(UPLOADS_DIR, nomeArquivo)
        fs.writeFileSync(filePath, bufferOriginal)

        await prisma.documento.create({
          data: {
            tipo: 'RG',
            nome: data.filename || `RG ${qualLado === 'frente' ? '(Frente)' : '(Verso)'} - escaneado`,
            url: `/uploads/${nomeArquivo}`,
            tamanho: totalSize,
            mimeType: data.mimetype,
            status: 'ENVIADO',
            candidato: { connect: { id: candidato.id } },
          },
        })
        documentoSalvo = true
        console.log(`💾 Documento RG (${qualLado}) salvo automaticamente`)
      } else {
        console.log(`⚠️ Já existem ${rgExistentes} documentos RG — máximo atingido`)
      }
    } catch (docErr: any) {
      console.warn('⚠️ Não foi possível salvar documento automaticamente:', docErr.message)
    }
  }

  return reply.status(200).send({
    dados,
    documentoSalvo,
    qualLado,
    textoOriginal: textoCompleto,
    camposExtraidos: Object.entries(dados.confianca).filter(([, v]) => v).map(([k]) => k).length,
    totalCampos: 6,
  })
}
