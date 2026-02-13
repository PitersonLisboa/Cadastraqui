import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { CandidatoNaoEncontradoError, RecursoNaoEncontradoError, NaoAutorizadoError } from '../errors/index'

// ===========================================
// SCHEMAS
// ===========================================

const criarRendaSchema = z.object({
  membroId: z.string().uuid(),
  mes: z.number().min(1).max(12),
  ano: z.number().min(2020).max(2100),
  valor: z.number().min(0),
  fonte: z.string().optional(),
  descricao: z.string().optional(),
})

// ===========================================
// CONTROLLERS
// ===========================================

export async function listarRendas(request: FastifyRequest, reply: FastifyReply) {
  const { mes, ano } = z.object({
    mes: z.coerce.number().min(1).max(12).optional(),
    ano: z.coerce.number().min(2020).max(2100).optional(),
  }).parse(request.query)

  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  // Candidato ainda não completou cadastro — retornar vazio
  if (!candidato) {
    return reply.status(200).send({
      membros: [],
      resumo: { rendaMediaMensal: 0, rendaPerCapita: 0, totalPessoas: 1, totalMembros: 0 },
    })
  }

  const membros = await prisma.membroFamilia.findMany({
    where: { candidatoId: candidato.id },
    include: {
      rendaMensal: {
        where: {
          ...(mes ? { mes } : {}),
          ...(ano ? { ano } : {}),
        },
        orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
      },
    },
    orderBy: { criadoEm: 'asc' },
  })

  const todasRendas = membros.flatMap(m => m.rendaMensal)
  const now = new Date()
  let somaTrimestre = 0
  let mesesComDados = 0
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mesRef = d.getMonth() + 1
    const anoRef = d.getFullYear()
    const rendasMes = todasRendas.filter(r => r.mes === mesRef && r.ano === anoRef)
    const totalMes = rendasMes.reduce((acc, r) => acc + r.valor.toNumber(), 0)
    somaTrimestre += totalMes
    if (rendasMes.length > 0) mesesComDados++
  }
  const mediaRendaMensal = mesesComDados > 0 ? somaTrimestre / mesesComDados : 0
  const totalPessoas = membros.length + 1
  const rendaPerCapita = totalPessoas > 0 ? mediaRendaMensal / totalPessoas : 0

  return reply.status(200).send({
    membros: membros.map(m => ({
      id: m.id,
      nome: m.nome,
      parentesco: m.parentesco,
      ocupacao: m.ocupacao,
      rendaFixa: m.renda?.toNumber() || 0,
      rendaMensal: m.rendaMensal,
    })),
    resumo: {
      rendaMediaMensal: Math.round(mediaRendaMensal * 100) / 100,
      rendaPerCapita: Math.round(rendaPerCapita * 100) / 100,
      totalPessoas,
      totalMembros: membros.length,
    },
  })
}

export async function salvarRenda(request: FastifyRequest, reply: FastifyReply) {
  const dados = criarRendaSchema.parse(request.body)

  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })
  if (!candidato) throw new CandidatoNaoEncontradoError()

  const membro = await prisma.membroFamilia.findUnique({ where: { id: dados.membroId } })
  if (!membro || membro.candidatoId !== candidato.id) throw new NaoAutorizadoError()

  const renda = await prisma.rendaMensal.upsert({
    where: {
      membroId_mes_ano: {
        membroId: dados.membroId,
        mes: dados.mes,
        ano: dados.ano,
      },
    },
    update: { valor: dados.valor, fonte: dados.fonte, descricao: dados.descricao },
    create: {
      membroId: dados.membroId,
      mes: dados.mes,
      ano: dados.ano,
      valor: dados.valor,
      fonte: dados.fonte,
      descricao: dados.descricao,
    },
  })

  // Recalcular rendaFamiliar
  const todasRendas = await prisma.rendaMensal.findMany({
    where: { membro: { candidatoId: candidato.id } },
  })
  const now = new Date()
  let somaTrimestre = 0
  let mesesComDados = 0
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const rendasMes = todasRendas.filter(r => r.mes === d.getMonth() + 1 && r.ano === d.getFullYear())
    const totalMes = rendasMes.reduce((acc, r) => acc + r.valor.toNumber(), 0)
    somaTrimestre += totalMes
    if (rendasMes.length > 0) mesesComDados++
  }
  await prisma.candidato.update({
    where: { id: candidato.id },
    data: { rendaFamiliar: mesesComDados > 0 ? somaTrimestre / mesesComDados : 0 },
  })

  return reply.status(201).send({ renda })
}

export async function excluirRenda(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const renda = await prisma.rendaMensal.findUnique({
    where: { id },
    include: { membro: { include: { candidato: true } } },
  })
  if (!renda) throw new RecursoNaoEncontradoError('Renda')
  if (renda.membro.candidato.usuarioId !== request.usuario.id) throw new NaoAutorizadoError()
  await prisma.rendaMensal.delete({ where: { id } })
  return reply.status(204).send()
}

export async function rendasDoMembro(request: FastifyRequest, reply: FastifyReply) {
  const { membroId } = z.object({ membroId: z.string().uuid() }).parse(request.params)

  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })
  if (!candidato) throw new CandidatoNaoEncontradoError()

  const membro = await prisma.membroFamilia.findUnique({
    where: { id: membroId },
    include: { rendaMensal: { orderBy: [{ ano: 'desc' }, { mes: 'desc' }] } },
  })
  if (!membro || membro.candidatoId !== candidato.id) throw new NaoAutorizadoError()

  const totalRendas = membro.rendaMensal.reduce((acc, r) => acc + r.valor.toNumber(), 0)
  const mediaRenda = membro.rendaMensal.length > 0 ? totalRendas / membro.rendaMensal.length : 0

  return reply.status(200).send({
    membro: { id: membro.id, nome: membro.nome, parentesco: membro.parentesco, ocupacao: membro.ocupacao },
    rendas: membro.rendaMensal,
    resumo: { totalRegistros: membro.rendaMensal.length, mediaRenda: Math.round(mediaRenda * 100) / 100 },
  })
}
