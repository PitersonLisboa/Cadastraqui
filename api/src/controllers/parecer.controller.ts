import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { 
  CandidaturaNaoEncontradaError, 
  NaoAutorizadoError,
  RecursoNaoEncontradoError 
} from '../errors/index'

// Emitir parecer social
export async function emitirParecerSocial(request: FastifyRequest, reply: FastifyReply) {
  const { candidaturaId } = z.object({ candidaturaId: z.string().uuid() }).parse(request.params)
  const { parecer, recomendacao } = z.object({
    parecer: z.string().min(10, 'Parecer deve ter no mínimo 10 caracteres'),
    recomendacao: z.string().optional(),
  }).parse(request.body)

  // Buscar assistente social
  const assistenteSocial = await prisma.assistenteSocial.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!assistenteSocial) {
    throw new NaoAutorizadoError('Você não está cadastrado como assistente social')
  }

  // Verificar se candidatura existe
  const candidatura = await prisma.candidatura.findUnique({
    where: { id: candidaturaId },
  })

  if (!candidatura) {
    throw new CandidaturaNaoEncontradaError()
  }

  // Verificar se já existe parecer
  const parecerExistente = await prisma.parecerSocial.findUnique({
    where: { candidaturaId },
  })

  if (parecerExistente) {
    return reply.status(400).send({ message: 'Já existe um parecer social para esta candidatura' })
  }

  const parecerSocial = await prisma.parecerSocial.create({
    data: {
      parecer,
      recomendacao,
      candidaturaId,
      assistenteId: assistenteSocial.id,
    },
  })

  // Registrar no histórico
  await prisma.historicoCandidatura.create({
    data: {
      candidaturaId,
      status: candidatura.status,
      observacao: 'Parecer social emitido',
      usuarioId: request.usuario.id,
    },
  })

  return reply.status(201).send({ parecerSocial })
}

// Emitir parecer jurídico
export async function emitirParecerJuridico(request: FastifyRequest, reply: FastifyReply) {
  const { candidaturaId } = z.object({ candidaturaId: z.string().uuid() }).parse(request.params)
  const { parecer, fundamentacao, recomendacao } = z.object({
    parecer: z.string().min(10, 'Parecer deve ter no mínimo 10 caracteres'),
    fundamentacao: z.string().optional(),
    recomendacao: z.string().min(1, 'Recomendação é obrigatória'),
  }).parse(request.body)

  // Buscar advogado
  const advogado = await prisma.advogado.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!advogado) {
    throw new NaoAutorizadoError('Você não está cadastrado como advogado')
  }

  // Verificar se candidatura existe
  const candidatura = await prisma.candidatura.findUnique({
    where: { id: candidaturaId },
  })

  if (!candidatura) {
    throw new CandidaturaNaoEncontradaError()
  }

  // Verificar se já existe parecer
  const parecerExistente = await prisma.parecerJuridico.findUnique({
    where: { candidaturaId },
  })

  if (parecerExistente) {
    return reply.status(400).send({ message: 'Já existe um parecer jurídico para esta candidatura' })
  }

  const parecerJuridico = await prisma.parecerJuridico.create({
    data: {
      parecer,
      fundamentacao,
      recomendacao,
      candidaturaId,
      advogadoId: advogado.id,
    },
  })

  // Registrar no histórico
  await prisma.historicoCandidatura.create({
    data: {
      candidaturaId,
      status: candidatura.status,
      observacao: `Parecer jurídico emitido: ${recomendacao}`,
      usuarioId: request.usuario.id,
    },
  })

  return reply.status(201).send({ parecerJuridico })
}

// Listar pareceres do assistente social
export async function listarMeusPareceresSociais(request: FastifyRequest, reply: FastifyReply) {
  const assistenteSocial = await prisma.assistenteSocial.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!assistenteSocial) {
    return reply.status(200).send({ pareceres: [] })
  }

  const pareceres = await prisma.parecerSocial.findMany({
    where: { assistenteId: assistenteSocial.id },
    include: {
      candidatura: {
        include: {
          candidato: {
            include: { usuario: { select: { nome: true } } },
          },
          edital: { select: { titulo: true } },
        },
      },
    },
    orderBy: { dataEmissao: 'desc' },
  })

  return reply.status(200).send({ pareceres })
}

// Listar pareceres do advogado
export async function listarMeusPareceresJuridicos(request: FastifyRequest, reply: FastifyReply) {
  const advogado = await prisma.advogado.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!advogado) {
    return reply.status(200).send({ pareceres: [] })
  }

  const pareceres = await prisma.parecerJuridico.findMany({
    where: { advogadoId: advogado.id },
    include: {
      candidatura: {
        include: {
          candidato: {
            include: { usuario: { select: { nome: true } } },
          },
          edital: { select: { titulo: true } },
        },
      },
    },
    orderBy: { dataEmissao: 'desc' },
  })

  return reply.status(200).send({ pareceres })
}
