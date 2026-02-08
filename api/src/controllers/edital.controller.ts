import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import {
  EditalNaoEncontradoError,
  InstituicaoNaoEncontradaError,
  NaoAutorizadoError,
} from '../errors/index.js'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const criarEditalSchema = z.object({
  titulo: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  descricao: z.string().optional(),
  anoLetivo: z.coerce.number().min(2020).max(2100),
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date(),
  vagasDisponiveis: z.coerce.number().min(1),
  requisitos: z.string().optional(),
  documentosExigidos: z.string().optional(),
})

const atualizarEditalSchema = criarEditalSchema.partial().extend({
  ativo: z.boolean().optional(),
})

const listarEditaisSchema = z.object({
  pagina: z.coerce.number().min(1).default(1),
  limite: z.coerce.number().min(1).max(100).default(10),
  busca: z.string().optional(),
  apenasAtivos: z.coerce.boolean().optional().default(false),
  anoLetivo: z.coerce.number().optional(),
  instituicaoId: z.string().uuid().optional(),
  ordenarPor: z.string().optional().default('criadoEm'),
  ordem: z.enum(['asc', 'desc']).optional().default('desc'),
})

// ===========================================
// CONTROLLERS
// ===========================================

export async function listarEditais(request: FastifyRequest, reply: FastifyReply) {
  const {
    pagina,
    limite,
    busca,
    apenasAtivos,
    anoLetivo,
    instituicaoId,
    ordenarPor,
    ordem,
  } = listarEditaisSchema.parse(request.query)

  const where: any = {}

  if (busca) {
    where.OR = [
      { titulo: { contains: busca, mode: 'insensitive' } },
      { descricao: { contains: busca, mode: 'insensitive' } },
    ]
  }

  if (apenasAtivos) {
    where.ativo = true
    where.dataFim = { gte: new Date() }
  }

  if (anoLetivo) {
    where.anoLetivo = anoLetivo
  }

  if (instituicaoId) {
    where.instituicaoId = instituicaoId
  }

  const [editais, total] = await Promise.all([
    prisma.edital.findMany({
      where,
      include: {
        instituicao: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
            cidade: true,
            uf: true,
          },
        },
        _count: {
          select: { candidaturas: true },
        },
      },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { [ordenarPor]: ordem },
    }),
    prisma.edital.count({ where }),
  ])

  return reply.status(200).send({
    editais,
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  })
}

export async function buscarEdital(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const edital = await prisma.edital.findUnique({
    where: { id },
    include: {
      instituicao: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          email: true,
          telefone: true,
          cidade: true,
          uf: true,
        },
      },
      _count: {
        select: { candidaturas: true },
      },
    },
  })

  if (!edital) {
    throw new EditalNaoEncontradoError()
  }

  return reply.status(200).send({ edital })
}

export async function criarEdital(request: FastifyRequest, reply: FastifyReply) {
  const dados = criarEditalSchema.parse(request.body)

  // Buscar instituição do usuário logado
  const instituicao = await prisma.instituicao.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  const edital = await prisma.edital.create({
    data: {
      ...dados,
      instituicaoId: instituicao.id,
    },
    include: {
      instituicao: {
        select: {
          id: true,
          razaoSocial: true,
        },
      },
    },
  })

  return reply.status(201).send({ edital })
}

export async function atualizarEdital(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const dados = atualizarEditalSchema.parse(request.body)

  const edital = await prisma.edital.findUnique({
    where: { id },
    include: { instituicao: true },
  })

  if (!edital) {
    throw new EditalNaoEncontradoError()
  }

  // Verificar permissão
  if (
    edital.instituicao.usuarioId !== request.usuario.id &&
    request.usuario.role !== 'ADMIN'
  ) {
    throw new NaoAutorizadoError()
  }

  const editalAtualizado = await prisma.edital.update({
    where: { id },
    data: dados,
    include: {
      instituicao: {
        select: {
          id: true,
          razaoSocial: true,
        },
      },
    },
  })

  return reply.status(200).send({ edital: editalAtualizado })
}

export async function excluirEdital(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const edital = await prisma.edital.findUnique({
    where: { id },
    include: { instituicao: true },
  })

  if (!edital) {
    throw new EditalNaoEncontradoError()
  }

  // Verificar permissão
  if (
    edital.instituicao.usuarioId !== request.usuario.id &&
    request.usuario.role !== 'ADMIN'
  ) {
    throw new NaoAutorizadoError()
  }

  await prisma.edital.delete({
    where: { id },
  })

  return reply.status(204).send()
}

// Editais da instituição logada
export async function meusEditais(request: FastifyRequest, reply: FastifyReply) {
  const { pagina, limite, busca, apenasAtivos, anoLetivo, ordenarPor, ordem } =
    listarEditaisSchema.parse(request.query)

  const instituicao = await prisma.instituicao.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  const where: any = { instituicaoId: instituicao.id }

  if (busca) {
    where.OR = [
      { titulo: { contains: busca, mode: 'insensitive' } },
      { descricao: { contains: busca, mode: 'insensitive' } },
    ]
  }

  if (apenasAtivos) {
    where.ativo = true
  }

  if (anoLetivo) {
    where.anoLetivo = anoLetivo
  }

  const [editais, total] = await Promise.all([
    prisma.edital.findMany({
      where,
      include: {
        _count: {
          select: { candidaturas: true },
        },
      },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { [ordenarPor]: ordem },
    }),
    prisma.edital.count({ where }),
  ])

  return reply.status(200).send({
    editais,
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  })
}

// Listar editais disponíveis para candidatos
export async function listarEditaisDisponiveis(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    pagina: z.coerce.number().min(1).default(1),
    limite: z.coerce.number().min(1).max(100).default(12),
    busca: z.string().optional(),
    uf: z.string().optional(),
  })

  const { pagina, limite, busca, uf } = schema.parse(request.query)

  const where: any = {
    ativo: true,
    dataInicio: { lte: new Date() },
    dataFim: { gte: new Date() },
  }

  if (busca) {
    where.OR = [
      { titulo: { contains: busca, mode: 'insensitive' } },
      { descricao: { contains: busca, mode: 'insensitive' } },
      { instituicao: { razaoSocial: { contains: busca, mode: 'insensitive' } } },
      { instituicao: { nomeFantasia: { contains: busca, mode: 'insensitive' } } },
    ]
  }

  if (uf) {
    where.instituicao = { ...where.instituicao, uf }
  }

  const [editais, total] = await Promise.all([
    prisma.edital.findMany({
      where,
      include: {
        instituicao: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
            cidade: true,
            uf: true,
          },
        },
      },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { dataFim: 'asc' }, // Mostrar os que vão encerrar primeiro
    }),
    prisma.edital.count({ where }),
  ])

  return reply.status(200).send({
    editais,
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  })
}

// Buscar edital público (para candidato ver detalhes)
export async function buscarEditalPublico(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const edital = await prisma.edital.findUnique({
    where: { id },
    include: {
      instituicao: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          email: true,
          telefone: true,
          endereco: true,
          cidade: true,
          uf: true,
        },
      },
    },
  })

  if (!edital) {
    throw new EditalNaoEncontradoError()
  }

  return reply.status(200).send({ edital })
}
