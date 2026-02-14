import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { prisma } from '../lib/prisma'
import { 
  CandidatoNaoEncontradoError, 
  RecursoNaoEncontradoError, 
  NaoAutorizadoError,
  ArquivoInvalidoError 
} from '../errors/index'
import { 
  UPLOADS_DIR, 
  gerarNomeArquivo, 
  validarTipoArquivo,
  TIPOS_DOCUMENTO 
} from '../config/upload'

// Listar documentos do candidato
export async function listarDocumentos(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) {
    return reply.status(200).send({ documentos: [] })
  }

  const documentos = await prisma.documento.findMany({
    where: { candidatoId: candidato.id },
    orderBy: { criadoEm: 'desc' },
  })

  return reply.status(200).send({ documentos })
}

// Upload de documento
export async function uploadDocumento(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) {
    throw new CandidatoNaoEncontradoError()
  }

  // Processar multipart
  const data = await request.file()

  if (!data) {
    throw new ArquivoInvalidoError('Nenhum arquivo enviado')
  }

  const { file, filename, mimetype, fields } = data

  // Validar tipo de arquivo
  if (!validarTipoArquivo(mimetype, filename)) {
    throw new ArquivoInvalidoError('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.')
  }

  // Obter tipo do documento do campo do form
  const tipoField = fields.tipo as any
  let tipo = 'OUTROS'
  if (typeof tipoField === 'string') {
    tipo = tipoField
  } else if (tipoField?.value) {
    tipo = tipoField.value
  } else if (Array.isArray(tipoField) && tipoField[0]?.value) {
    tipo = tipoField[0].value
  }

  console.log('📄 Upload doc - tipo extraído:', tipo, '| tipoField raw:', JSON.stringify(tipoField))

  if (!TIPOS_DOCUMENTO.includes(tipo)) {
    throw new ArquivoInvalidoError('Tipo de documento inválido')
  }

  // Gerar nome único e salvar arquivo
  const nomeArquivo = gerarNomeArquivo(filename)
  const caminhoArquivo = path.join(UPLOADS_DIR, nomeArquivo)

  // Salvar arquivo no disco
  await pipeline(file, fs.createWriteStream(caminhoArquivo))

  // Obter tamanho do arquivo
  const stats = fs.statSync(caminhoArquivo)

  // Salvar no banco
  const documento = await prisma.documento.create({
    data: {
      tipo,
      nome: filename,
      url: `/uploads/${nomeArquivo}`,
      tamanho: stats.size,
      mimeType: mimetype,
      status: 'ENVIADO',
      candidato: { connect: { id: candidato.id } },
    },
  })

  return reply.status(201).send({ documento })
}

// Excluir documento
export async function excluirDocumento(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const documento = await prisma.documento.findUnique({
    where: { id },
    include: { candidato: true },
  })

  if (!documento) {
    throw new RecursoNaoEncontradoError('Documento')
  }

  if (documento.candidato.usuarioId !== request.usuario.id) {
    throw new NaoAutorizadoError()
  }

  if (documento.status === 'APROVADO') {
    return reply.status(400).send({ message: 'Documentos aprovados não podem ser excluídos' })
  }

  // Remover arquivo do disco
  const caminhoArquivo = path.join(UPLOADS_DIR, path.basename(documento.url))
  if (fs.existsSync(caminhoArquivo)) {
    fs.unlinkSync(caminhoArquivo)
  }

  // Remover do banco
  await prisma.documento.delete({ where: { id } })

  return reply.status(204).send()
}

// Download de documento (para visualização)
export async function downloadDocumento(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const documento = await prisma.documento.findUnique({
    where: { id },
    include: { candidato: true },
  })

  if (!documento) {
    throw new RecursoNaoEncontradoError('Documento')
  }

  // Verificar permissão (dono, instituição, analistas ou admin)
  const isOwner = documento.candidato.usuarioId === request.usuario.id
  const isAdmin = request.usuario.role === 'ADMIN'
  const isStaff = ['ASSISTENTE_SOCIAL', 'ADVOGADO', 'INSTITUICAO', 'SUPERVISAO', 'OPERACIONAL'].includes(request.usuario.role)

  if (!isOwner && !isAdmin && !isStaff) {
    throw new NaoAutorizadoError()
  }

  const caminhoArquivo = path.join(UPLOADS_DIR, path.basename(documento.url))
  
  if (!fs.existsSync(caminhoArquivo)) {
    throw new RecursoNaoEncontradoError('Arquivo')
  }

  const stream = fs.createReadStream(caminhoArquivo)
  const mimeType = documento.mimeType || 'application/octet-stream'
  
  return reply
    .header('Content-Type', mimeType)
    .header('Content-Disposition', `inline; filename="${documento.nome}"`)
    .send(stream)
}

// Atualizar status do documento (para analistas)
export async function atualizarStatusDocumento(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const { status, observacao } = z.object({
    status: z.enum(['APROVADO', 'REJEITADO']),
    observacao: z.string().optional(),
  }).parse(request.body)

  const documento = await prisma.documento.findUnique({
    where: { id },
  })

  if (!documento) {
    throw new RecursoNaoEncontradoError('Documento')
  }

  const documentoAtualizado = await prisma.documento.update({
    where: { id },
    data: { status, observacao },
  })

  return reply.status(200).send({ documento: documentoAtualizado })
}
