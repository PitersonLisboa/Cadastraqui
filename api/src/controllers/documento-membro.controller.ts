import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { NaoAutorizadoError, RecursoNaoEncontradoError } from '../errors/index'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

// ===========================================
// HELPERS
// ===========================================

/** Verifica se o membro pertence ao candidato do usuário logado */
async function verificarPropriedadeMembro(membroId: string, usuarioId: string) {
  const membro = await prisma.membroFamilia.findUnique({
    where: { id: membroId },
    include: { candidato: true },
  })
  if (!membro) throw new RecursoNaoEncontradoError('Membro da família')
  if (membro.candidato.usuarioId !== usuarioId) throw new NaoAutorizadoError()
  return membro
}

// ===========================================
// LISTAR documentos de um membro
// GET /familia/membros/:membroId/documentos
// ===========================================

export async function listarDocumentosMembro(request: FastifyRequest, reply: FastifyReply) {
  const { membroId } = z.object({ membroId: z.string().uuid() }).parse(request.params)

  await verificarPropriedadeMembro(membroId, request.usuario.id)

  const documentos = await prisma.documentoMembro.findMany({
    where: { membroFamiliaId: membroId },
    orderBy: { criadoEm: 'asc' },
  })

  return reply.status(200).send({ documentos })
}

// ===========================================
// UPLOAD documento para um membro
// POST /familia/membros/:membroId/documentos
// ===========================================

export async function uploadDocumentoMembro(request: FastifyRequest, reply: FastifyReply) {
  const { membroId } = z.object({ membroId: z.string().uuid() }).parse(request.params)

  await verificarPropriedadeMembro(membroId, request.usuario.id)

  const data = await request.file()
  if (!data) {
    return reply.status(400).send({ message: 'Nenhum arquivo enviado' })
  }

  // Extrair tipo do campo "tipo" no multipart
  const fields = data.fields as any
  const tipo = fields?.tipo?.value || 'OUTROS'

  // Limites: 1 doc por tipo (exceto OUTROS que aceita até 5)
  const existentes = await prisma.documentoMembro.findMany({
    where: { membroFamiliaId: membroId, tipo },
  })

  if (tipo !== 'OUTROS' && existentes.length >= 1) {
    return reply.status(400).send({ message: 'Já existe um documento deste tipo para este membro. Exclua o atual para enviar outro.' })
  }
  if (tipo === 'OUTROS' && existentes.length >= 5) {
    return reply.status(400).send({ message: 'Limite de 5 documentos do tipo "Outros" por membro.' })
  }

  // Tamanho máximo 10MB
  const maxSize = 10 * 1024 * 1024
  const chunks: Buffer[] = []
  let totalSize = 0

  for await (const chunk of data.file) {
    totalSize += chunk.length
    if (totalSize > maxSize) {
      return reply.status(400).send({ message: 'Arquivo excede o limite de 10MB' })
    }
    chunks.push(chunk)
  }

  const buffer = Buffer.concat(chunks)

  // Salvar arquivo
  const membroDir = path.join(UPLOAD_DIR, 'membros', membroId)
  fs.mkdirSync(membroDir, { recursive: true })

  const ext = path.extname(data.filename || '.bin')
  const nomeArquivo = `${tipo}_${Date.now()}${ext}`
  const filePath = path.join(membroDir, nomeArquivo)

  fs.writeFileSync(filePath, buffer)

  // Criar registro no banco
  const documento = await prisma.documentoMembro.create({
    data: {
      tipo,
      nome: data.filename || nomeArquivo,
      url: filePath,
      tamanho: totalSize,
      mimeType: data.mimetype || 'application/octet-stream',
      membroFamilia: { connect: { id: membroId } },
    },
  })

  return reply.status(201).send({ documento })
}

// ===========================================
// DOWNLOAD documento de membro
// GET /familia/membros/:membroId/documentos/:docId/download
// ===========================================

export async function downloadDocumentoMembro(request: FastifyRequest, reply: FastifyReply) {
  const params = z.object({
    membroId: z.string().uuid(),
    docId: z.string().uuid(),
  }).parse(request.params)

  await verificarPropriedadeMembro(params.membroId, request.usuario.id)

  const doc = await prisma.documentoMembro.findUnique({
    where: { id: params.docId },
  })

  if (!doc || doc.membroFamiliaId !== params.membroId) {
    throw new RecursoNaoEncontradoError('Documento')
  }

  if (!fs.existsSync(doc.url)) {
    return reply.status(404).send({ message: 'Arquivo não encontrado no servidor' })
  }

  const stream = fs.createReadStream(doc.url)
  return reply
    .header('Content-Type', doc.mimeType || 'application/octet-stream')
    .header('Content-Disposition', `inline; filename="${doc.nome}"`)
    .send(stream)
}

// ===========================================
// EXCLUIR documento de membro
// DELETE /familia/membros/:membroId/documentos/:docId
// ===========================================

export async function excluirDocumentoMembro(request: FastifyRequest, reply: FastifyReply) {
  const params = z.object({
    membroId: z.string().uuid(),
    docId: z.string().uuid(),
  }).parse(request.params)

  await verificarPropriedadeMembro(params.membroId, request.usuario.id)

  const doc = await prisma.documentoMembro.findUnique({
    where: { id: params.docId },
  })

  if (!doc || doc.membroFamiliaId !== params.membroId) {
    throw new RecursoNaoEncontradoError('Documento')
  }

  // Remover arquivo físico
  try {
    if (fs.existsSync(doc.url)) {
      fs.unlinkSync(doc.url)
    }
  } catch (e) {
    console.warn('Erro ao remover arquivo físico:', e)
  }

  await prisma.documentoMembro.delete({ where: { id: params.docId } })

  return reply.status(204).send()
}
