import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { CandidatoNaoEncontradoError, RecursoNaoEncontradoError, NaoAutorizadoError } from '../errors/index'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const criarMembroSchema = z.object({
  nome: z.string().min(3),
  parentesco: z.string(),
  dataNascimento: z.coerce.date(),
  cpf: z.string(),
  renda: z.number().min(0).optional(),
  ocupacao: z.string().optional(),
})

const atualizarMembroSchema = criarMembroSchema.partial()

// ===========================================
// CONTROLLERS
// ===========================================

// Listar membros da família
export async function listarMembros(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) {
    throw new CandidatoNaoEncontradoError()
  }

  const membros = await prisma.membroFamilia.findMany({
    where: { candidatoId: candidato.id },
    orderBy: { criadoEm: 'asc' },
  })

  // Calcular renda total
  const rendaTotal = membros.reduce((acc, m) => acc + (m.renda?.toNumber() || 0), 0)
  const rendaPerCapita = membros.length > 0 ? rendaTotal / (membros.length + 1) : 0

  return reply.status(200).send({ 
    membros,
    resumo: {
      totalMembros: membros.length,
      rendaTotal,
      rendaPerCapita: Math.round(rendaPerCapita * 100) / 100,
    }
  })
}

// Adicionar membro
export async function adicionarMembro(request: FastifyRequest, reply: FastifyReply) {
  const dados = criarMembroSchema.parse(request.body)

  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) {
    throw new CandidatoNaoEncontradoError()
  }

  const membro = await prisma.membroFamilia.create({
    data: {
      ...dados,
      candidatoId: candidato.id,
    } as any,
  })

  return reply.status(201).send({ membro })
}

// Buscar membro
export async function buscarMembro(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const membro = await prisma.membroFamilia.findUnique({
    where: { id },
    include: { candidato: true },
  })

  if (!membro) {
    throw new RecursoNaoEncontradoError('Membro da família')
  }

  if (membro.candidato.usuarioId !== request.usuario.id) {
    throw new NaoAutorizadoError()
  }

  return reply.status(200).send({ membro })
}

// Atualizar membro
export async function atualizarMembro(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const dados = atualizarMembroSchema.parse(request.body)

  const membro = await prisma.membroFamilia.findUnique({
    where: { id },
    include: { candidato: true },
  })

  if (!membro) {
    throw new RecursoNaoEncontradoError('Membro da família')
  }

  if (membro.candidato.usuarioId !== request.usuario.id) {
    throw new NaoAutorizadoError()
  }

  const membroAtualizado = await prisma.membroFamilia.update({
    where: { id },
    data: dados,
  })

  return reply.status(200).send({ membro: membroAtualizado })
}

// Excluir membro
export async function excluirMembro(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const membro = await prisma.membroFamilia.findUnique({
    where: { id },
    include: { candidato: true },
  })

  if (!membro) {
    throw new RecursoNaoEncontradoError('Membro da família')
  }

  if (membro.candidato.usuarioId !== request.usuario.id) {
    throw new NaoAutorizadoError()
  }

  await prisma.membroFamilia.delete({ where: { id } })

  return reply.status(204).send()
}

// Composição familiar completa (para análise)
export async function composicaoFamiliar(request: FastifyRequest, reply: FastifyReply) {
  const { candidatoId } = z.object({ candidatoId: z.string().uuid() }).parse(request.params)

  const candidato = await prisma.candidato.findUnique({
    where: { id: candidatoId },
    include: {
      usuario: { select: { email: true } },
      membrosFamilia: {
        orderBy: { dataNascimento: 'asc' },
      },
    },
  })

  if (!candidato) {
    throw new CandidatoNaoEncontradoError()
  }

  // Calcular estatísticas
  const membros = candidato.membrosFamilia
  const rendaTotal = membros.reduce((acc, m) => acc + (m.renda?.toNumber() || 0), 0)
  const rendaCandidato = 0 // Candidato não tem campo renda diretamente
  const rendaFamiliar = rendaTotal + rendaCandidato
  const totalPessoas = membros.length + 1
  const rendaPerCapita = rendaFamiliar / totalPessoas

  // Faixas etárias
  const hoje = new Date()
  const menores = membros.filter(m => {
    const idade = Math.floor((hoje.getTime() - m.dataNascimento.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    return idade < 18
  }).length

  const idosos = membros.filter(m => {
    const idade = Math.floor((hoje.getTime() - m.dataNascimento.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    return idade >= 60
  }).length

  return reply.status(200).send({
    candidato: {
      id: candidato.id,
      nome: candidato.nome,
      cpf: candidato.cpf,
      renda: rendaCandidato,
    },
    membros,
    estatisticas: {
      totalMembros: membros.length,
      totalPessoas,
      menores,
      idosos,
      rendaFamiliar: Math.round(rendaFamiliar * 100) / 100,
      rendaPerCapita: Math.round(rendaPerCapita * 100) / 100,
    },
  })
}
