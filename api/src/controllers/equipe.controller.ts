import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { 
  InstituicaoNaoEncontradaError, 
  RecursoNaoEncontradoError, 
  NaoAutorizadoError,
  EmailJaCadastradoError 
} from '../errors/index.js'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const criarAssistenteSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
  nome: z.string().min(3),
  cress: z.string().min(3),
  telefone: z.string().optional(),
})

const criarAdvogadoSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
  nome: z.string().min(3),
  oab: z.string().min(3),
  oabUf: z.string().length(2),
  telefone: z.string().optional(),
})

const atualizarMembroSchema = z.object({
  nome: z.string().min(3).optional(),
  telefone: z.string().optional(),
  cress: z.string().optional(),
  oab: z.string().optional(),
})

// ===========================================
// CONTROLLERS
// ===========================================

// Listar equipe da instituição
export async function listarEquipe(request: FastifyRequest, reply: FastifyReply) {
  const instituicao = await prisma.instituicao.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  const [assistentes, advogados] = await Promise.all([
    prisma.assistenteSocial.findMany({
      where: { instituicaoId: instituicao.id },
      include: {
        usuario: {
          select: { email: true, ativo: true, criadoEm: true },
        },
        _count: {
          select: { pareceres: true, agendamentos: true },
        },
      },
    }),
    prisma.advogado.findMany({
      where: { instituicaoId: instituicao.id },
      include: {
        usuario: {
          select: { email: true, ativo: true, criadoEm: true },
        },
        _count: {
          select: { pareceresJuridicos: true },
        },
      },
    }),
  ])

  return reply.status(200).send({
    assistentes,
    advogados,
    total: assistentes.length + advogados.length,
  })
}

// Adicionar assistente social
export async function adicionarAssistente(request: FastifyRequest, reply: FastifyReply) {
  const dados = criarAssistenteSchema.parse(request.body)

  const instituicao = await prisma.instituicao.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  // Verificar se email já existe
  const emailExistente = await prisma.usuario.findUnique({
    where: { email: dados.email },
  })

  if (emailExistente) {
    throw new EmailJaCadastradoError()
  }

  const senhaHash = await bcrypt.hash(dados.senha, 10)

  // Criar usuário e assistente em transação
  const resultado = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        email: dados.email,
        senha: senhaHash,
        role: 'ASSISTENTE_SOCIAL',
      },
    })

    const assistente = await tx.assistenteSocial.create({
      data: {
        nome: dados.nome,
        cress: dados.cress,
        telefone: dados.telefone,
        usuarioId: usuario.id,
        instituicaoId: instituicao.id,
      },
      include: {
        usuario: {
          select: { email: true, ativo: true },
        },
      },
    })

    return assistente
  })

  return reply.status(201).send({ assistente: resultado })
}

// Adicionar advogado
export async function adicionarAdvogado(request: FastifyRequest, reply: FastifyReply) {
  const dados = criarAdvogadoSchema.parse(request.body)

  const instituicao = await prisma.instituicao.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  // Verificar se email já existe
  const emailExistente = await prisma.usuario.findUnique({
    where: { email: dados.email },
  })

  if (emailExistente) {
    throw new EmailJaCadastradoError()
  }

  const senhaHash = await bcrypt.hash(dados.senha, 10)

  // Criar usuário e advogado em transação
  const resultado = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        email: dados.email,
        senha: senhaHash,
        role: 'ADVOGADO',
      },
    })

    const advogado = await tx.advogado.create({
      data: {
        nome: dados.nome,
        oab: dados.oab,
        oabUf: dados.oabUf as any,
        telefone: dados.telefone,
        usuarioId: usuario.id,
        instituicaoId: instituicao.id,
      },
      include: {
        usuario: {
          select: { email: true, ativo: true },
        },
      },
    })

    return advogado
  })

  return reply.status(201).send({ advogado: resultado })
}

// Atualizar membro da equipe
export async function atualizarMembro(request: FastifyRequest, reply: FastifyReply) {
  const { id, tipo } = z.object({ 
    id: z.string().uuid(),
    tipo: z.enum(['assistente', 'advogado']),
  }).parse(request.params)
  
  const dados = atualizarMembroSchema.parse(request.body)

  const instituicao = await prisma.instituicao.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  if (tipo === 'assistente') {
    const assistente = await prisma.assistenteSocial.findUnique({
      where: { id },
    })

    if (!assistente || assistente.instituicaoId !== instituicao.id) {
      throw new NaoAutorizadoError()
    }

    const atualizado = await prisma.assistenteSocial.update({
      where: { id },
      data: {
        nome: dados.nome,
        telefone: dados.telefone,
        cress: dados.cress,
      },
    })

    return reply.status(200).send({ assistente: atualizado })
  } else {
    const advogado = await prisma.advogado.findUnique({
      where: { id },
    })

    if (!advogado || advogado.instituicaoId !== instituicao.id) {
      throw new NaoAutorizadoError()
    }

    const atualizado = await prisma.advogado.update({
      where: { id },
      data: {
        nome: dados.nome,
        telefone: dados.telefone,
        oab: dados.oab,
      },
    })

    return reply.status(200).send({ advogado: atualizado })
  }
}

// Desativar membro da equipe
export async function desativarMembro(request: FastifyRequest, reply: FastifyReply) {
  const { id, tipo } = z.object({ 
    id: z.string().uuid(),
    tipo: z.enum(['assistente', 'advogado']),
  }).parse(request.params)

  const instituicao = await prisma.instituicao.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  let usuarioId: string

  if (tipo === 'assistente') {
    const assistente = await prisma.assistenteSocial.findUnique({
      where: { id },
    })

    if (!assistente || assistente.instituicaoId !== instituicao.id) {
      throw new NaoAutorizadoError()
    }

    usuarioId = assistente.usuarioId
  } else {
    const advogado = await prisma.advogado.findUnique({
      where: { id },
    })

    if (!advogado || advogado.instituicaoId !== instituicao.id) {
      throw new NaoAutorizadoError()
    }

    usuarioId = advogado.usuarioId
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { ativo: false },
  })

  return reply.status(200).send({ message: 'Membro desativado com sucesso' })
}

// Reativar membro da equipe
export async function reativarMembro(request: FastifyRequest, reply: FastifyReply) {
  const { id, tipo } = z.object({ 
    id: z.string().uuid(),
    tipo: z.enum(['assistente', 'advogado']),
  }).parse(request.params)

  const instituicao = await prisma.instituicao.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  let usuarioId: string

  if (tipo === 'assistente') {
    const assistente = await prisma.assistenteSocial.findUnique({
      where: { id },
    })

    if (!assistente || assistente.instituicaoId !== instituicao.id) {
      throw new NaoAutorizadoError()
    }

    usuarioId = assistente.usuarioId
  } else {
    const advogado = await prisma.advogado.findUnique({
      where: { id },
    })

    if (!advogado || advogado.instituicaoId !== instituicao.id) {
      throw new NaoAutorizadoError()
    }

    usuarioId = advogado.usuarioId
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { ativo: true },
  })

  return reply.status(200).send({ message: 'Membro reativado com sucesso' })
}
