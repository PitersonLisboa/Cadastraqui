import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { CandidatoNaoEncontradoError, RecursoNaoEncontradoError, NaoAutorizadoError } from '../errors/index'

const veiculoSchema = z.object({
  modelo: z.string().min(1),
  placa: z.string().optional(),
  ano: z.string().optional(),
})

export async function listarVeiculos(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await prisma.candidato.findUnique({ where: { usuarioId: request.usuario.id } })
  if (!candidato) return reply.status(200).send({ veiculos: [] })

  const veiculos = await prisma.veiculo.findMany({
    where: { candidatoId: candidato.id },
    orderBy: { criadoEm: 'asc' },
  })
  return reply.status(200).send({ veiculos })
}

export async function criarVeiculo(request: FastifyRequest, reply: FastifyReply) {
  const dados = veiculoSchema.parse(request.body)
  const candidato = await prisma.candidato.findUnique({ where: { usuarioId: request.usuario.id } })
  if (!candidato) throw new CandidatoNaoEncontradoError()

  const veiculo = await prisma.veiculo.create({
    data: {
      modelo: dados.modelo,
      placa: dados.placa,
      ano: dados.ano,
      candidato: { connect: { id: candidato.id } },
    },
  })
  return reply.status(201).send({ veiculo })
}

export async function excluirVeiculo(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const veiculo = await prisma.veiculo.findUnique({ where: { id }, include: { candidato: true } })
  if (!veiculo) throw new RecursoNaoEncontradoError('Veículo')
  if (veiculo.candidato.usuarioId !== request.usuario.id) throw new NaoAutorizadoError()
  await prisma.veiculo.delete({ where: { id } })
  return reply.status(204).send()
}
