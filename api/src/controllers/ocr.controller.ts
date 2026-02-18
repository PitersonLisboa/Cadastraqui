import { FastifyReply, FastifyRequest } from 'fastify'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma'
import { CandidatoNaoEncontradoError, ArquivoInvalidoError } from '../errors/index'
import { UPLOADS_DIR, gerarNomeArquivo, validarTipoArquivo } from '../config/upload'
import { detectarTexto } from '../config/google-vision'
import { parsearRG } from '../services/rg-parser'

// ===========================================
// ESCANEAR RG (frente ou verso)
// POST /ocr/rg
// Recebe imagem, chama Google Vision, extrai dados,
// salva imagem como documento e retorna campos preenchidos.
// Permite até 2 documentos RG (frente + verso).
// ===========================================

const MAX_RG_DOCS = 2

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

  const buffer = Buffer.concat(chunks)
  const imageBase64 = buffer.toString('base64')

  console.log('📸 OCR RG - Imagem recebida:', data.filename, `(${(totalSize / 1024).toFixed(1)}KB)`)

  // Chamar Google Vision API
  let textoCompleto: string
  let blocos: any[]
  try {
    const resultado = await detectarTexto(imageBase64)
    textoCompleto = resultado.textoCompleto
    blocos = resultado.blocos
  } catch (err: any) {
    console.error('❌ Erro no Google Vision:', err.message)
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

  // Parsear campos do RG — agora passando os blocos com posição
  const dados = parsearRG(textoCompleto, blocos)

  // Se existe candidato, salvar imagem como documento RG
  let documentoSalvo = false
  let qualLado: 'frente' | 'verso' | null = null

  if (candidato) {
    try {
      // Contar quantos RG já existem
      const rgExistentes = await prisma.documento.count({
        where: { candidatoId: candidato.id, tipo: 'RG' },
      })

      if (rgExistentes < MAX_RG_DOCS) {
        qualLado = rgExistentes === 0 ? 'frente' : 'verso'

        // Salvar arquivo
        const nomeArquivo = gerarNomeArquivo(data.filename || `rg-${qualLado}-scan.jpg`)
        const filePath = path.join(UPLOADS_DIR, nomeArquivo)
        fs.writeFileSync(filePath, buffer)

        // Criar registro no banco
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
