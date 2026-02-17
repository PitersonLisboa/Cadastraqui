import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma'
import {
  CandidatoNaoEncontradoError,
  RecursoNaoEncontradoError,
  NaoAutorizadoError,
  ArquivoInvalidoError,
} from '../errors/index'
import { UPLOADS_DIR, gerarNomeArquivo, validarTipoArquivo } from '../config/upload'

// ===========================================
// HELPERS
// ===========================================

async function getCandidatoDoUsuario(usuarioId: string) {
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId },
  })
  if (!candidato) throw new CandidatoNaoEncontradoError()
  return candidato
}

async function verificarPropriedadeMembro(membroId: string, candidatoId: string) {
  const membro = await prisma.membroFamilia.findUnique({
    where: { id: membroId },
  })
  if (!membro) throw new RecursoNaoEncontradoError('Membro da família')
  if (membro.candidatoId !== candidatoId) throw new NaoAutorizadoError()
  return membro
}

// ===========================================
// LISTAR SAÚDE DE TODAS AS PESSOAS DO GRUPO
// GET /saude
// ===========================================

export async function listarSaude(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await getCandidatoDoUsuario(request.usuario.id)

  // Saúde do candidato
  const saudeCandidato = await prisma.saudeFamiliar.findFirst({
    where: { candidatoId: candidato.id },
  })

  // Saúde dos membros
  const membros = await prisma.membroFamilia.findMany({
    where: { candidatoId: candidato.id },
    orderBy: { criadoEm: 'asc' },
    include: {
      saude: true,
    },
  })

  return reply.status(200).send({
    candidato: {
      id: candidato.id,
      nome: candidato.nome,
      saude: saudeCandidato || null,
    },
    membros: membros.map(m => ({
      id: m.id,
      nome: m.nome,
      parentesco: m.parentesco,
      saude: m.saude[0] || null,
    })),
  })
}

// ===========================================
// BUSCAR SAÚDE DE UMA PESSOA ESPECÍFICA
// GET /saude/candidato         (saúde do próprio candidato)
// GET /saude/membro/:membroId  (saúde de um membro)
// ===========================================

export async function buscarSaudeCandidato(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await getCandidatoDoUsuario(request.usuario.id)

  const saude = await prisma.saudeFamiliar.findFirst({
    where: { candidatoId: candidato.id },
  })

  return reply.status(200).send({ saude: saude || null })
}

export async function buscarSaudeMembro(request: FastifyRequest, reply: FastifyReply) {
  const { membroId } = z.object({ membroId: z.string().uuid() }).parse(request.params)
  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  await verificarPropriedadeMembro(membroId, candidato.id)

  const saude = await prisma.saudeFamiliar.findFirst({
    where: { membroFamiliaId: membroId },
  })

  return reply.status(200).send({ saude: saude || null })
}

// ===========================================
// SALVAR / ATUALIZAR SAÚDE (JSON, sem arquivo)
// PUT /saude/candidato
// PUT /saude/membro/:membroId
// ===========================================

const saudeSchema = z.object({
  possuiDoenca: z.boolean().optional().default(false),
  doenca: z.string().nullable().optional(),
  possuiRelatorioMedico: z.boolean().optional().default(false),
  tomaMedicamentoControlado: z.boolean().optional().default(false),
  nomeMedicamento: z.string().nullable().optional(),
  obtemRedePublica: z.boolean().optional().default(false),
  especifiqueRedePublica: z.string().nullable().optional(),
})

export async function salvarSaudeCandidato(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  const dados = saudeSchema.parse(request.body)

  const existente = await prisma.saudeFamiliar.findFirst({
    where: { candidatoId: candidato.id },
  })

  let saude
  if (existente) {
    saude = await prisma.saudeFamiliar.update({
      where: { id: existente.id },
      data: {
        possuiDoenca: dados.possuiDoenca,
        doenca: dados.possuiDoenca ? dados.doenca : null,
        possuiRelatorioMedico: dados.possuiDoenca ? dados.possuiRelatorioMedico : false,
        tomaMedicamentoControlado: dados.tomaMedicamentoControlado,
        nomeMedicamento: dados.tomaMedicamentoControlado ? dados.nomeMedicamento : null,
        obtemRedePublica: dados.tomaMedicamentoControlado ? dados.obtemRedePublica : false,
        especifiqueRedePublica: (dados.tomaMedicamentoControlado && dados.obtemRedePublica) ? dados.especifiqueRedePublica : null,
      },
    })
  } else {
    saude = await prisma.saudeFamiliar.create({
      data: {
        candidatoId: candidato.id,
        possuiDoenca: dados.possuiDoenca,
        doenca: dados.possuiDoenca ? dados.doenca : null,
        possuiRelatorioMedico: dados.possuiDoenca ? dados.possuiRelatorioMedico : false,
        tomaMedicamentoControlado: dados.tomaMedicamentoControlado,
        nomeMedicamento: dados.tomaMedicamentoControlado ? dados.nomeMedicamento : null,
        obtemRedePublica: dados.tomaMedicamentoControlado ? dados.obtemRedePublica : false,
        especifiqueRedePublica: (dados.tomaMedicamentoControlado && dados.obtemRedePublica) ? dados.especifiqueRedePublica : null,
      },
    })
  }

  return reply.status(200).send({ saude })
}

export async function salvarSaudeMembro(request: FastifyRequest, reply: FastifyReply) {
  const { membroId } = z.object({ membroId: z.string().uuid() }).parse(request.params)
  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  await verificarPropriedadeMembro(membroId, candidato.id)
  const dados = saudeSchema.parse(request.body)

  const existente = await prisma.saudeFamiliar.findFirst({
    where: { membroFamiliaId: membroId },
  })

  let saude
  if (existente) {
    saude = await prisma.saudeFamiliar.update({
      where: { id: existente.id },
      data: {
        possuiDoenca: dados.possuiDoenca,
        doenca: dados.possuiDoenca ? dados.doenca : null,
        possuiRelatorioMedico: dados.possuiDoenca ? dados.possuiRelatorioMedico : false,
        tomaMedicamentoControlado: dados.tomaMedicamentoControlado,
        nomeMedicamento: dados.tomaMedicamentoControlado ? dados.nomeMedicamento : null,
        obtemRedePublica: dados.tomaMedicamentoControlado ? dados.obtemRedePublica : false,
        especifiqueRedePublica: (dados.tomaMedicamentoControlado && dados.obtemRedePublica) ? dados.especifiqueRedePublica : null,
      },
    })
  } else {
    saude = await prisma.saudeFamiliar.create({
      data: {
        membroFamiliaId: membroId,
        possuiDoenca: dados.possuiDoenca,
        doenca: dados.possuiDoenca ? dados.doenca : null,
        possuiRelatorioMedico: dados.possuiDoenca ? dados.possuiRelatorioMedico : false,
        tomaMedicamentoControlado: dados.tomaMedicamentoControlado,
        nomeMedicamento: dados.tomaMedicamentoControlado ? dados.nomeMedicamento : null,
        obtemRedePublica: dados.tomaMedicamentoControlado ? dados.obtemRedePublica : false,
        especifiqueRedePublica: (dados.tomaMedicamentoControlado && dados.obtemRedePublica) ? dados.especifiqueRedePublica : null,
      },
    })
  }

  return reply.status(200).send({ saude })
}

// ===========================================
// UPLOAD LAUDO MÉDICO
// POST /saude/candidato/laudo
// POST /saude/membro/:membroId/laudo
// ===========================================

async function processarUploadLaudo(saudeId: string, request: FastifyRequest, reply: FastifyReply) {
  const data = await request.file()
  if (!data) {
    return reply.status(400).send({ message: 'Nenhum arquivo enviado' })
  }

  if (!validarTipoArquivo(data.mimetype, data.filename || '')) {
    throw new ArquivoInvalidoError('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.')
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

  const buffer = Buffer.concat(chunks)
  const dir = path.join(UPLOADS_DIR, 'saude', saudeId)
  fs.mkdirSync(dir, { recursive: true })

  const nomeArquivo = gerarNomeArquivo(data.filename || 'laudo.pdf')
  const filePath = path.join(dir, nomeArquivo)
  fs.writeFileSync(filePath, buffer)

  const saude = await prisma.saudeFamiliar.update({
    where: { id: saudeId },
    data: {
      laudoUrl: filePath,
      laudoNome: data.filename || nomeArquivo,
      laudoTamanho: totalSize,
      laudoMimeType: data.mimetype,
    },
  })

  return reply.status(200).send({ saude })
}

export async function uploadLaudoCandidato(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  let saude = await prisma.saudeFamiliar.findFirst({ where: { candidatoId: candidato.id } })
  if (!saude) {
    saude = await prisma.saudeFamiliar.create({ data: { candidatoId: candidato.id, possuiDoenca: true, possuiRelatorioMedico: true } })
  }
  return processarUploadLaudo(saude.id, request, reply)
}

export async function uploadLaudoMembro(request: FastifyRequest, reply: FastifyReply) {
  const { membroId } = z.object({ membroId: z.string().uuid() }).parse(request.params)
  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  await verificarPropriedadeMembro(membroId, candidato.id)

  let saude = await prisma.saudeFamiliar.findFirst({ where: { membroFamiliaId: membroId } })
  if (!saude) {
    saude = await prisma.saudeFamiliar.create({ data: { membroFamiliaId: membroId, possuiDoenca: true, possuiRelatorioMedico: true } })
  }
  return processarUploadLaudo(saude.id, request, reply)
}

// ===========================================
// UPLOAD RECEITA MÉDICA
// POST /saude/candidato/receita
// POST /saude/membro/:membroId/receita
// ===========================================

async function processarUploadReceita(saudeId: string, request: FastifyRequest, reply: FastifyReply) {
  const data = await request.file()
  if (!data) {
    return reply.status(400).send({ message: 'Nenhum arquivo enviado' })
  }

  if (!validarTipoArquivo(data.mimetype, data.filename || '')) {
    throw new ArquivoInvalidoError('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.')
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

  const buffer = Buffer.concat(chunks)
  const dir = path.join(UPLOADS_DIR, 'saude', saudeId)
  fs.mkdirSync(dir, { recursive: true })

  const nomeArquivo = gerarNomeArquivo(data.filename || 'receita.pdf')
  const filePath = path.join(dir, nomeArquivo)
  fs.writeFileSync(filePath, buffer)

  const saude = await prisma.saudeFamiliar.update({
    where: { id: saudeId },
    data: {
      receitaUrl: filePath,
      receitaNome: data.filename || nomeArquivo,
      receitaTamanho: totalSize,
      receitaMimeType: data.mimetype,
    },
  })

  return reply.status(200).send({ saude })
}

export async function uploadReceitaCandidato(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  let saude = await prisma.saudeFamiliar.findFirst({ where: { candidatoId: candidato.id } })
  if (!saude) {
    saude = await prisma.saudeFamiliar.create({ data: { candidatoId: candidato.id, tomaMedicamentoControlado: true } })
  }
  return processarUploadReceita(saude.id, request, reply)
}

export async function uploadReceitaMembro(request: FastifyRequest, reply: FastifyReply) {
  const { membroId } = z.object({ membroId: z.string().uuid() }).parse(request.params)
  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  await verificarPropriedadeMembro(membroId, candidato.id)

  let saude = await prisma.saudeFamiliar.findFirst({ where: { membroFamiliaId: membroId } })
  if (!saude) {
    saude = await prisma.saudeFamiliar.create({ data: { membroFamiliaId: membroId, tomaMedicamentoControlado: true } })
  }
  return processarUploadReceita(saude.id, request, reply)
}

// ===========================================
// DOWNLOAD ARQUIVO DE SAÚDE (laudo ou receita)
// GET /saude/:saudeId/download/:tipo  (tipo = 'laudo' | 'receita')
// ===========================================

export async function downloadArquivoSaude(request: FastifyRequest, reply: FastifyReply) {
  const params = z.object({
    saudeId: z.string().uuid(),
    tipo: z.enum(['laudo', 'receita']),
  }).parse(request.params)

  const candidato = await getCandidatoDoUsuario(request.usuario.id)

  const saude = await prisma.saudeFamiliar.findUnique({
    where: { id: params.saudeId },
    include: { membroFamilia: true },
  })

  if (!saude) throw new RecursoNaoEncontradoError('Registro de saúde')

  // Verificar propriedade
  if (saude.candidatoId && saude.candidatoId !== candidato.id) {
    throw new NaoAutorizadoError()
  }
  if (saude.membroFamiliaId && saude.membroFamilia?.candidatoId !== candidato.id) {
    throw new NaoAutorizadoError()
  }

  const filePath = params.tipo === 'laudo' ? saude.laudoUrl : saude.receitaUrl
  const fileName = params.tipo === 'laudo' ? saude.laudoNome : saude.receitaNome
  const mimeType = params.tipo === 'laudo' ? saude.laudoMimeType : saude.receitaMimeType

  if (!filePath || !fs.existsSync(filePath)) {
    return reply.status(404).send({ message: 'Arquivo não encontrado' })
  }

  const stream = fs.createReadStream(filePath)
  return reply
    .header('Content-Type', mimeType || 'application/octet-stream')
    .header('Content-Disposition', `inline; filename="${fileName || 'arquivo'}"`)
    .send(stream)
}

// ===========================================
// EXCLUIR ARQUIVO (laudo ou receita)
// DELETE /saude/:saudeId/arquivo/:tipo
// ===========================================

export async function excluirArquivoSaude(request: FastifyRequest, reply: FastifyReply) {
  const params = z.object({
    saudeId: z.string().uuid(),
    tipo: z.enum(['laudo', 'receita']),
  }).parse(request.params)

  const candidato = await getCandidatoDoUsuario(request.usuario.id)

  const saude = await prisma.saudeFamiliar.findUnique({
    where: { id: params.saudeId },
    include: { membroFamilia: true },
  })

  if (!saude) throw new RecursoNaoEncontradoError('Registro de saúde')

  if (saude.candidatoId && saude.candidatoId !== candidato.id) {
    throw new NaoAutorizadoError()
  }
  if (saude.membroFamiliaId && saude.membroFamilia?.candidatoId !== candidato.id) {
    throw new NaoAutorizadoError()
  }

  const filePath = params.tipo === 'laudo' ? saude.laudoUrl : saude.receitaUrl

  // Remover arquivo físico
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (e) {
    console.warn('Erro ao remover arquivo:', e)
  }

  if (params.tipo === 'laudo') {
    await prisma.saudeFamiliar.update({
      where: { id: saude.id },
      data: { laudoUrl: null, laudoNome: null, laudoTamanho: null, laudoMimeType: null },
    })
  } else {
    await prisma.saudeFamiliar.update({
      where: { id: saude.id },
      data: { receitaUrl: null, receitaNome: null, receitaTamanho: null, receitaMimeType: null },
    })
  }

  return reply.status(204).send()
}
