import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import {
  InstituicaoNaoEncontradaError,
  NaoAutorizadoError,
  RecursoNaoEncontradoError,
} from '../errors/index'
import { Role } from '@prisma/client'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const criarConviteSchema = z.object({
  tipo: z.enum(['ASSISTENTE_SOCIAL', 'ADVOGADO', 'SUPERVISAO', 'CONTROLE', 'OPERACIONAL']),
  email: z.string().email().optional(),
  validadeDias: z.number().min(1).max(30).default(7),
})

const validarConviteSchema = z.object({
  codigo: z.string().min(6),
})

// ===========================================
// FUNÇÕES AUXILIARES
// ===========================================

function gerarCodigoConvite(): string {
  // Gera código no formato INV-XXXXXX (6 caracteres alfanuméricos)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Sem I, O, 0, 1 para evitar confusão
  let codigo = 'INV-'
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return codigo
}

// ===========================================
// CONTROLLERS PARA INSTITUIÇÃO
// ===========================================

// Criar convite
export async function criarConvite(request: FastifyRequest, reply: FastifyReply) {
  const { tipo, email, validadeDias } = criarConviteSchema.parse(request.body)

  // Buscar instituição do usuário
  const instituicao = await prisma.instituicao.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  // Gerar código único
  let codigo: string
  let tentativas = 0
  do {
    codigo = gerarCodigoConvite()
    const existe = await prisma.conviteEquipe.findUnique({ where: { codigo } })
    if (!existe) break
    tentativas++
  } while (tentativas < 10)

  if (tentativas >= 10) {
    return reply.status(500).send({ message: 'Erro ao gerar código de convite' })
  }

  // Calcular data de expiração
  const expiraEm = new Date()
  expiraEm.setDate(expiraEm.getDate() + validadeDias)

  // Criar convite
  const convite = await prisma.conviteEquipe.create({
    data: {
      codigo,
      tipo: tipo as Role,
      email,
      instituicaoId: instituicao.id,
      expiraEm,
    },
  })

  return reply.status(201).send({
    convite: {
      id: convite.id,
      codigo: convite.codigo,
      tipo: convite.tipo,
      email: convite.email,
      expiraEm: convite.expiraEm,
    },
    mensagem: `Código de convite gerado: ${convite.codigo}`,
  })
}

// Listar convites da instituição
export async function listarConvites(request: FastifyRequest, reply: FastifyReply) {
  const instituicao = await prisma.instituicao.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  const convites = await prisma.conviteEquipe.findMany({
    where: { instituicaoId: instituicao.id },
    orderBy: { criadoEm: 'desc' },
  })

  return reply.status(200).send({ convites })
}

// Revogar convite
export async function revogarConvite(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const instituicao = await prisma.instituicao.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  const convite = await prisma.conviteEquipe.findFirst({
    where: { id, instituicaoId: instituicao.id },
  })

  if (!convite) {
    throw new RecursoNaoEncontradoError('Convite')
  }

  if (convite.usado) {
    return reply.status(400).send({ message: 'Este convite já foi utilizado' })
  }

  await prisma.conviteEquipe.delete({ where: { id } })

  return reply.status(200).send({ message: 'Convite revogado com sucesso' })
}

// ===========================================
// CONTROLLERS PÚBLICOS (para registro)
// ===========================================

// Validar código de convite (público - usado na tela de registro)
export async function validarConvite(request: FastifyRequest, reply: FastifyReply) {
  const { codigo } = validarConviteSchema.parse(request.query)

  const convite = await prisma.conviteEquipe.findUnique({
    where: { codigo: codigo.toUpperCase() },
    include: {
      instituicao: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
        },
      },
    },
  })

  if (!convite) {
    return reply.status(400).send({
      valido: false,
      message: 'Código de convite inválido',
    })
  }

  if (convite.usado) {
    return reply.status(400).send({
      valido: false,
      message: 'Este código já foi utilizado',
    })
  }

  if (convite.expiraEm < new Date()) {
    return reply.status(400).send({
      valido: false,
      message: 'Este código expirou',
    })
  }

  return reply.status(200).send({
    valido: true,
    convite: {
      tipo: convite.tipo,
      instituicao: convite.instituicao,
    },
  })
}
