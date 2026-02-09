import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { 
  InstituicaoNaoEncontradaError, 
  NaoAutorizadoError,
  EmailJaCadastradoError 
} from '../errors/index'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const criarAssistenteSchema = z.object({
  tipo: z.literal('ASSISTENTE_SOCIAL'),
  email: z.string().email(),
  senha: z.string().min(6),
  nome: z.string().min(3),
  cress: z.string().min(3),
  telefone: z.string().optional(),
})

const criarAdvogadoSchema = z.object({
  tipo: z.literal('ADVOGADO'),
  email: z.string().email(),
  senha: z.string().min(6),
  nome: z.string().min(3),
  oab: z.string().min(3),
  oabUf: z.string().length(2),
  telefone: z.string().optional(),
})

const criarGenericoSchema = z.object({
  tipo: z.enum(['SUPERVISAO', 'CONTROLE', 'OPERACIONAL']),
  email: z.string().email(),
  senha: z.string().min(6),
  nome: z.string().min(3),
  cargo: z.string().optional(),
  telefone: z.string().optional(),
})

const criarMembroSchema = z.discriminatedUnion('tipo', [
  criarAssistenteSchema,
  criarAdvogadoSchema,
  criarGenericoSchema,
])

// ===========================================
// HELPERS
// ===========================================

async function obterInstituicao(usuarioId: string) {
  const instituicao = await prisma.instituicao.findUnique({
    where: { usuarioId },
  })
  if (!instituicao) throw new InstituicaoNaoEncontradaError()
  return instituicao
}

async function verificarEmailDisponivel(email: string) {
  const existente = await prisma.usuario.findUnique({ where: { email } })
  if (existente) throw new EmailJaCadastradoError()
}

// ===========================================
// CONTROLLERS
// ===========================================

// Listar equipe da instituição (todos os tipos)
export async function listarEquipe(request: FastifyRequest, reply: FastifyReply) {
  const instituicao = await obterInstituicao(request.usuario.id)

  const [assistentes, advogados, supervisores, membrosControle, membrosOperacional] = await Promise.all([
    prisma.assistenteSocial.findMany({
      where: { instituicaoId: instituicao.id },
      include: {
        usuario: { select: { email: true, ativo: true, criadoEm: true } },
        _count: { select: { pareceres: true, agendamentos: true } },
      },
    }),
    prisma.advogado.findMany({
      where: { instituicaoId: instituicao.id },
      include: {
        usuario: { select: { email: true, ativo: true, criadoEm: true } },
        _count: { select: { pareceresJuridicos: true } },
      },
    }),
    prisma.supervisor.findMany({
      where: { instituicaoId: instituicao.id },
      include: {
        usuario: { select: { email: true, ativo: true, criadoEm: true } },
      },
    }),
    prisma.membroControle.findMany({
      where: { instituicaoId: instituicao.id },
      include: {
        usuario: { select: { email: true, ativo: true, criadoEm: true } },
      },
    }),
    prisma.membroOperacional.findMany({
      where: { instituicaoId: instituicao.id },
      include: {
        usuario: { select: { email: true, ativo: true, criadoEm: true } },
      },
    }),
  ])

  const total = assistentes.length + advogados.length + supervisores.length + membrosControle.length + membrosOperacional.length

  return reply.status(200).send({
    assistentes,
    advogados,
    supervisores,
    membrosControle,
    membrosOperacional,
    total,
  })
}

// Adicionar membro (qualquer tipo)
export async function adicionarMembro(request: FastifyRequest, reply: FastifyReply) {
  const dados = criarMembroSchema.parse(request.body)
  const instituicao = await obterInstituicao(request.usuario.id)
  await verificarEmailDisponivel(dados.email)

  const senhaHash = await bcrypt.hash(dados.senha, 10)

  const resultado = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        email: dados.email,
        senha: senhaHash,
        role: dados.tipo,
      },
    })

    switch (dados.tipo) {
      case 'ASSISTENTE_SOCIAL':
        return tx.assistenteSocial.create({
          data: {
            nome: dados.nome,
            cress: dados.cress,
            telefone: dados.telefone,
            usuarioId: usuario.id,
            instituicaoId: instituicao.id,
          },
          include: { usuario: { select: { email: true, ativo: true } } },
        })

      case 'ADVOGADO':
        return tx.advogado.create({
          data: {
            nome: dados.nome,
            oab: dados.oab,
            oabUf: dados.oabUf as any,
            telefone: dados.telefone,
            usuarioId: usuario.id,
            instituicaoId: instituicao.id,
          },
          include: { usuario: { select: { email: true, ativo: true } } },
        })

      case 'SUPERVISAO':
        return tx.supervisor.create({
          data: {
            nome: dados.nome,
            registro: dados.cargo,
            telefone: dados.telefone,
            usuarioId: usuario.id,
            instituicaoId: instituicao.id,
          },
          include: { usuario: { select: { email: true, ativo: true } } },
        })

      case 'CONTROLE':
        return tx.membroControle.create({
          data: {
            nome: dados.nome,
            cargo: dados.cargo,
            telefone: dados.telefone,
            usuarioId: usuario.id,
            instituicaoId: instituicao.id,
          },
          include: { usuario: { select: { email: true, ativo: true } } },
        })

      case 'OPERACIONAL':
        return tx.membroOperacional.create({
          data: {
            nome: dados.nome,
            cargo: dados.cargo,
            telefone: dados.telefone,
            usuarioId: usuario.id,
            instituicaoId: instituicao.id,
          },
          include: { usuario: { select: { email: true, ativo: true } } },
        })
    }
  })

  return reply.status(201).send({ membro: resultado })
}

// Buscar membro por ID
export async function buscarMembro(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const instituicao = await obterInstituicao(request.usuario.id)

  const tabelas = [
    { model: prisma.assistenteSocial, tipo: 'ASSISTENTE_SOCIAL' },
    { model: prisma.advogado, tipo: 'ADVOGADO' },
    { model: prisma.supervisor, tipo: 'SUPERVISAO' },
    { model: prisma.membroControle, tipo: 'CONTROLE' },
    { model: prisma.membroOperacional, tipo: 'OPERACIONAL' },
  ]

  for (const tabela of tabelas) {
    const membro = await (tabela.model as any).findUnique({ where: { id } })
    if (membro && membro.instituicaoId === instituicao.id) {
      return reply.send({ tipo: tabela.tipo, membro })
    }
  }

  throw new NaoAutorizadoError()
}

// Atualizar membro
export async function atualizarMembro(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const dados = z.object({
    nome: z.string().min(3).optional(),
    telefone: z.string().optional(),
    cress: z.string().optional(),
    oab: z.string().optional(),
    cargo: z.string().optional(),
    registro: z.string().optional(),
  }).parse(request.body)

  const instituicao = await obterInstituicao(request.usuario.id)

  const updates: Array<{ model: any; data: any }> = [
    { model: prisma.assistenteSocial, data: { nome: dados.nome, telefone: dados.telefone, cress: dados.cress } },
    { model: prisma.advogado, data: { nome: dados.nome, telefone: dados.telefone, oab: dados.oab } },
    { model: prisma.supervisor, data: { nome: dados.nome, telefone: dados.telefone, registro: dados.registro } },
    { model: prisma.membroControle, data: { nome: dados.nome, telefone: dados.telefone, cargo: dados.cargo } },
    { model: prisma.membroOperacional, data: { nome: dados.nome, telefone: dados.telefone, cargo: dados.cargo } },
  ]

  for (const { model, data } of updates) {
    const membro = await model.findUnique({ where: { id } })
    if (membro && membro.instituicaoId === instituicao.id) {
      // Remove undefined values
      const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined))
      const atualizado = await model.update({ where: { id }, data: cleanData })
      return reply.send({ membro: atualizado })
    }
  }

  throw new NaoAutorizadoError()
}

// Desativar/Remover membro
export async function removerMembro(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const instituicao = await obterInstituicao(request.usuario.id)

  const tabelas = [
    prisma.assistenteSocial,
    prisma.advogado,
    prisma.supervisor,
    prisma.membroControle,
    prisma.membroOperacional,
  ]

  for (const model of tabelas) {
    const membro = await (model as any).findUnique({ where: { id } })
    if (membro && membro.instituicaoId === instituicao.id) {
      await prisma.usuario.update({
        where: { id: membro.usuarioId },
        data: { ativo: false },
      })
      return reply.send({ message: 'Membro desativado com sucesso' })
    }
  }

  throw new NaoAutorizadoError()
}

// Reativar membro
export async function reativarMembro(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const instituicao = await obterInstituicao(request.usuario.id)

  const tabelas = [
    prisma.assistenteSocial,
    prisma.advogado,
    prisma.supervisor,
    prisma.membroControle,
    prisma.membroOperacional,
  ]

  for (const model of tabelas) {
    const membro = await (model as any).findUnique({ where: { id } })
    if (membro && membro.instituicaoId === instituicao.id) {
      await prisma.usuario.update({
        where: { id: membro.usuarioId },
        data: { ativo: true },
      })
      return reply.send({ message: 'Membro reativado com sucesso' })
    }
  }

  throw new NaoAutorizadoError()
}
