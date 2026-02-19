import { FastifyReply, FastifyRequest } from 'fastify'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma'
import { CandidatoNaoEncontradoError, ArquivoInvalidoError } from '../errors/index'
import { UPLOADS_DIR, gerarNomeArquivo } from '../config/upload'
import { detectarTexto } from '../config/google-vision'
import { parsearRG, PalavraOCR, LinhaOCR } from '../services/rg-parser'
import { parsearEndereco } from '../services/endereco-parser'
import { parsearCertidao } from '../services/certidao-parser'

// ===========================================
// ESCANEAR RG (frente ou verso)
// POST /ocr/rg
// Recebe imagem, chama OCR.space, extrai dados,
// salva imagem como documento e retorna campos preenchidos.
// Permite até 2 documentos RG (frente + verso).
// ===========================================

const MAX_RG_DOCS = 2
const MAX_IMAGE_SIZE_OCR = 950 * 1024  // ~950KB (free plan = 1MB, margem)

/**
 * Redimensiona imagem se necessário para caber no limite do OCR.space.
 * Se sharp não estiver disponível, retorna a imagem original.
 */
async function prepararImagemParaOCR(
  buffer: Buffer,
  mimetype: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (buffer.length <= MAX_IMAGE_SIZE_OCR) {
    return { buffer, mimeType: mimetype }
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

    return { buffer: bufferReduzido, mimeType: 'image/jpeg' }
  } catch (sharpErr: any) {
    console.warn(`⚠️ Sharp indisponível (${sharpErr.message}) — enviando imagem original`)
    return { buffer, mimeType: mimetype }
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
  const nomeOriginal = data.filename || 'rg-scan.jpg'

  console.log('📸 OCR RG - Imagem recebida:', nomeOriginal, `(${(totalSize / 1024).toFixed(1)}KB)`)

  // Preparar imagem (redimensionar se necessário)
  const { buffer: bufferOCR, mimeType: ocrMimeType } =
    await prepararImagemParaOCR(bufferOriginal, data.mimetype)

  // Chamar OCR.space API — agora passando Buffer direto
  let textoCompleto: string
  let palavrasOCR: PalavraOCR[] = []
  let linhasOCR: LinhaOCR[] = []

  try {
    const resultado = await detectarTexto(bufferOCR, ocrMimeType, nomeOriginal)
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

  // Parsear campos do RG
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

        const nomeArquivo = gerarNomeArquivo(nomeOriginal)
        const filePath = path.join(UPLOADS_DIR, nomeArquivo)
        fs.writeFileSync(filePath, bufferOriginal)

        await prisma.documento.create({
          data: {
            tipo: 'RG',
            nome: `RG ${qualLado === 'frente' ? '(Frente)' : '(Verso)'} - escaneado`,
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

// ===========================================
// ESCANEAR COMPROVANTE DE ENDEREÇO
// POST /ocr/comprovante
// Recebe imagem, chama OCR.space, extrai endereço,
// salva imagem como documento e retorna campos preenchidos.
// ===========================================

export async function escanearComprovante(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  const data = await request.file()
  if (!data) {
    return reply.status(400).send({ message: 'Nenhum arquivo enviado' })
  }

  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedMimes.includes(data.mimetype)) {
    throw new ArquivoInvalidoError('Tipo de arquivo não permitido. Use JPG, PNG ou WebP.')
  }

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
  const nomeOriginal = data.filename || 'comprovante-scan.jpg'

  console.log('📸 OCR Comprovante - Imagem recebida:', nomeOriginal, `(${(totalSize / 1024).toFixed(1)}KB)`)

  const { buffer: bufferOCR, mimeType: ocrMimeType } =
    await prepararImagemParaOCR(bufferOriginal, data.mimetype)

  let textoCompleto: string

  try {
    const resultado = await detectarTexto(bufferOCR, ocrMimeType, nomeOriginal)
    textoCompleto = resultado.textoCompleto
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

  // Parsear campos de endereço
  const dados = parsearEndereco(textoCompleto)

  // Salvar imagem como documento COMPROVANTE_RESIDENCIA
  let documentoSalvo = false

  if (candidato) {
    try {
      const compExistentes = await prisma.documento.count({
        where: { candidatoId: candidato.id, tipo: 'COMPROVANTE_RESIDENCIA' },
      })

      if (compExistentes < 1) {
        const nomeArquivo = gerarNomeArquivo(nomeOriginal)
        const filePath = path.join(UPLOADS_DIR, nomeArquivo)
        fs.writeFileSync(filePath, bufferOriginal)

        await prisma.documento.create({
          data: {
            tipo: 'COMPROVANTE_RESIDENCIA',
            nome: `Comprovante - escaneado`,
            url: `/uploads/${nomeArquivo}`,
            tamanho: totalSize,
            mimeType: data.mimetype,
            status: 'ENVIADO',
            candidato: { connect: { id: candidato.id } },
          },
        })
        documentoSalvo = true
        console.log('💾 Comprovante de residência salvo automaticamente')
      } else {
        console.log(`⚠️ Já existe comprovante — máximo atingido`)
      }
    } catch (docErr: any) {
      console.warn('⚠️ Não foi possível salvar documento automaticamente:', docErr.message)
    }
  }

  return reply.status(200).send({
    dados,
    documentoSalvo,
    textoOriginal: textoCompleto,
    camposExtraidos: Object.entries(dados.confianca).filter(([, v]) => v).map(([k]) => k).length,
  })
}

// ===========================================
// ESCANEAR CERTIDÃO (Estado Civil)
// POST /ocr/certidao
// Recebe imagem, chama OCR, extrai estado civil,
// salva imagem como documento e retorna campo preenchido.
// ===========================================

export async function escanearCertidao(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  const data = await request.file()
  if (!data) {
    return reply.status(400).send({ message: 'Nenhum arquivo enviado' })
  }

  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedMimes.includes(data.mimetype)) {
    throw new ArquivoInvalidoError('Tipo de arquivo não permitido. Use JPG, PNG ou WebP.')
  }

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
  const nomeOriginal = data.filename || 'certidao-scan.jpg'

  console.log('📸 OCR Certidão - Imagem recebida:', nomeOriginal, `(${(totalSize / 1024).toFixed(1)}KB)`)

  const { buffer: bufferOCR, mimeType: ocrMimeType } =
    await prepararImagemParaOCR(bufferOriginal, data.mimetype)

  let textoCompleto: string

  try {
    const resultado = await detectarTexto(bufferOCR, ocrMimeType, nomeOriginal)
    textoCompleto = resultado.textoCompleto
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

  // Parsear campos da certidão
  const dados = parsearCertidao(textoCompleto)

  // Salvar imagem como documento CERTIDAO_CASAMENTO
  let documentoSalvo = false

  if (candidato) {
    try {
      const certExistentes = await prisma.documento.count({
        where: { candidatoId: candidato.id, tipo: 'CERTIDAO_CASAMENTO' },
      })

      if (certExistentes < 1) {
        const nomeArquivo = gerarNomeArquivo(nomeOriginal)
        const filePath = path.join(UPLOADS_DIR, nomeArquivo)
        fs.writeFileSync(filePath, bufferOriginal)

        await prisma.documento.create({
          data: {
            tipo: 'CERTIDAO_CASAMENTO',
            nome: `Certidão - escaneada`,
            url: `/uploads/${nomeArquivo}`,
            tamanho: totalSize,
            mimeType: data.mimetype,
            status: 'ENVIADO',
            candidato: { connect: { id: candidato.id } },
          },
        })
        documentoSalvo = true
        console.log('💾 Certidão salva automaticamente')
      } else {
        console.log('⚠️ Já existe certidão — máximo atingido')
      }
    } catch (docErr: any) {
      console.warn('⚠️ Não foi possível salvar documento automaticamente:', docErr.message)
    }
  }

  return reply.status(200).send({
    dados,
    documentoSalvo,
    textoOriginal: textoCompleto,
    camposExtraidos: Object.entries(dados.confianca).filter(([, v]) => v).map(([k]) => k).length,
  })
}


// ===========================================
// OCR PARA MEMBROS DA FAMÍLIA
// Mesmos parsers, mas salva em documentos_membros
// ===========================================

import { z } from 'zod'
import { NaoAutorizadoError, RecursoNaoEncontradoError } from '../errors/index'

/** Verifica se o membro pertence ao candidato do usuário logado */
async function verificarPropriedadeMembroOCR(membroId: string, usuarioId: string) {
  const membro = await prisma.membroFamilia.findUnique({
    where: { id: membroId },
    include: { candidato: true },
  })
  if (!membro) throw new RecursoNaoEncontradoError('Membro da família')
  if (membro.candidato.usuarioId !== usuarioId) throw new NaoAutorizadoError()
  return membro
}

/** Salva imagem como documento do membro (tabela documentos_membros) */
async function salvarDocumentoMembro(
  membroId: string,
  buffer: Buffer,
  filename: string,
  mimetype: string,
  tipo: string,
  nomeExibicao: string,
  totalSize: number,
  maxDocs = 1
) {
  const existentes = await prisma.documentoMembro.count({
    where: { membroFamiliaId: membroId, tipo },
  })

  if (existentes >= maxDocs) {
    console.log(`⚠️ Já existem ${existentes} documentos do tipo ${tipo} para membro — máximo atingido`)
    return false
  }

  const membroDir = path.join(UPLOADS_DIR, 'membros', membroId)
  fs.mkdirSync(membroDir, { recursive: true })

  const ext = path.extname(filename || '.jpg')
  const nomeArquivo = `${tipo}_${Date.now()}${ext}`
  const filePath = path.join(membroDir, nomeArquivo)

  fs.writeFileSync(filePath, buffer)

  await prisma.documentoMembro.create({
    data: {
      tipo,
      nome: nomeExibicao,
      url: filePath,
      tamanho: totalSize,
      mimeType: mimetype,
      membroFamilia: { connect: { id: membroId } },
    },
  })

  console.log(`💾 Documento ${tipo} do membro salvo automaticamente`)
  return true
}

// POST /ocr/membro/:membroId/rg
export async function escanearRGMembro(request: FastifyRequest, reply: FastifyReply) {
  const { membroId } = z.object({ membroId: z.string().uuid() }).parse(request.params)
  await verificarPropriedadeMembroOCR(membroId, request.usuario.id)

  const data = await request.file()
  if (!data) return reply.status(400).send({ message: 'Nenhum arquivo enviado' })

  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedMimes.includes(data.mimetype)) {
    throw new ArquivoInvalidoError('Tipo de arquivo não permitido. Use JPG, PNG ou WebP.')
  }

  const chunks: Buffer[] = []
  let totalSize = 0
  const maxSize = 10 * 1024 * 1024

  for await (const chunk of data.file) {
    totalSize += chunk.length
    if (totalSize > maxSize) return reply.status(400).send({ message: 'Arquivo excede o limite de 10MB' })
    chunks.push(chunk)
  }

  const bufferOriginal = Buffer.concat(chunks)
  const nomeOriginal = data.filename || 'rg-membro-scan.jpg'

  console.log('📸 OCR RG Membro - Imagem recebida:', nomeOriginal, `(${(totalSize / 1024).toFixed(1)}KB)`)

  const { buffer: bufferOCR, mimeType: ocrMimeType } = await prepararImagemParaOCR(bufferOriginal, data.mimetype)

  let textoCompleto: string
  let palavrasOCR: PalavraOCR[] = []
  let linhasOCR: LinhaOCR[] = []

  try {
    const resultado = await detectarTexto(bufferOCR, ocrMimeType, nomeOriginal)
    textoCompleto = resultado.textoCompleto
    for (const linha of resultado.linhas) {
      const palavrasDaLinha: PalavraOCR[] = []
      if (linha.Words) {
        for (const word of linha.Words) {
          const p: PalavraOCR = { text: word.WordText, left: word.Left, top: word.Top, width: word.Width, height: word.Height }
          palavrasOCR.push(p)
          palavrasDaLinha.push(p)
        }
      }
      linhasOCR.push({ palavras: palavrasDaLinha, minTop: linha.MinTop, maxHeight: linha.MaxHeight })
    }
  } catch (err: any) {
    console.error('❌ Erro no OCR:', err.message)
    return reply.status(502).send({ message: 'Erro ao processar imagem com OCR. Tente novamente.', detalhe: err.message })
  }

  if (!textoCompleto || textoCompleto.trim().length === 0) {
    return reply.status(422).send({ message: 'Não foi possível detectar texto na imagem. Tente com uma foto mais nítida.' })
  }

  const dados = parsearRG(textoCompleto, palavrasOCR, linhasOCR)

  let documentoSalvo = false
  let qualLado: 'frente' | 'verso' | null = null

  try {
    const rgExistentes = await prisma.documentoMembro.count({
      where: { membroFamiliaId: membroId, tipo: 'RG_MEMBRO' },
    })

    if (rgExistentes < 2) {
      qualLado = rgExistentes === 0 ? 'frente' : 'verso'
      documentoSalvo = await salvarDocumentoMembro(
        membroId, bufferOriginal, nomeOriginal, data.mimetype,
        'RG_MEMBRO', `RG ${qualLado === 'frente' ? '(Frente)' : '(Verso)'} - escaneado`,
        totalSize, 2
      )
    }
  } catch (docErr: any) {
    console.warn('⚠️ Não foi possível salvar documento automaticamente:', docErr.message)
  }

  return reply.status(200).send({ dados, documentoSalvo, qualLado, textoOriginal: textoCompleto,
    camposExtraidos: Object.entries(dados.confianca).filter(([, v]) => v).map(([k]) => k).length, totalCampos: 6 })
}

// POST /ocr/membro/:membroId/certidao
export async function escanearCertidaoMembro(request: FastifyRequest, reply: FastifyReply) {
  const { membroId } = z.object({ membroId: z.string().uuid() }).parse(request.params)
  await verificarPropriedadeMembroOCR(membroId, request.usuario.id)

  const data = await request.file()
  if (!data) return reply.status(400).send({ message: 'Nenhum arquivo enviado' })

  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedMimes.includes(data.mimetype)) {
    throw new ArquivoInvalidoError('Tipo de arquivo não permitido. Use JPG, PNG ou WebP.')
  }

  const chunks: Buffer[] = []
  let totalSize = 0
  const maxSize = 10 * 1024 * 1024

  for await (const chunk of data.file) {
    totalSize += chunk.length
    if (totalSize > maxSize) return reply.status(400).send({ message: 'Arquivo excede o limite de 10MB' })
    chunks.push(chunk)
  }

  const bufferOriginal = Buffer.concat(chunks)
  const nomeOriginal = data.filename || 'certidao-membro-scan.jpg'

  console.log('📸 OCR Certidão Membro - Imagem recebida:', nomeOriginal, `(${(totalSize / 1024).toFixed(1)}KB)`)

  const { buffer: bufferOCR, mimeType: ocrMimeType } = await prepararImagemParaOCR(bufferOriginal, data.mimetype)

  let textoCompleto: string
  try {
    const resultado = await detectarTexto(bufferOCR, ocrMimeType, nomeOriginal)
    textoCompleto = resultado.textoCompleto
  } catch (err: any) {
    console.error('❌ Erro no OCR:', err.message)
    return reply.status(502).send({ message: 'Erro ao processar imagem com OCR. Tente novamente.', detalhe: err.message })
  }

  if (!textoCompleto || textoCompleto.trim().length === 0) {
    return reply.status(422).send({ message: 'Não foi possível detectar texto na imagem. Tente com uma foto mais nítida.' })
  }

  const dados = parsearCertidao(textoCompleto)

  let documentoSalvo = false
  try {
    documentoSalvo = await salvarDocumentoMembro(
      membroId, bufferOriginal, nomeOriginal, data.mimetype,
      'CERTIDAO_CASAMENTO', 'Certidão - escaneada', totalSize, 1
    )
  } catch (docErr: any) {
    console.warn('⚠️ Não foi possível salvar documento automaticamente:', docErr.message)
  }

  return reply.status(200).send({ dados, documentoSalvo, textoOriginal: textoCompleto,
    camposExtraidos: Object.entries(dados.confianca).filter(([, v]) => v).map(([k]) => k).length })
}
