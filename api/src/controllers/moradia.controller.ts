import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { CandidatoNaoEncontradoError } from '../errors/index'

const moradiaSchema = z.object({
  statusMoradia: z.string().optional(),
  tipoMoradia: z.string().optional(),
  tempoMoradia: z.string().optional(),
  qtdComodos: z.string().optional(),
  qtdDormitorios: z.coerce.number().optional(),
})

export async function buscarMoradia(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await prisma.candidato.findUnique({ where: { usuarioId: request.usuario.id } })
  if (!candidato) return reply.status(200).send(null)

  const moradia = await prisma.moradia.findUnique({ where: { candidatoId: candidato.id } })
  return reply.status(200).send(moradia)
}

export async function salvarMoradia(request: FastifyRequest, reply: FastifyReply) {
  const dados = moradiaSchema.parse(request.body)
  const candidato = await prisma.candidato.findUnique({ where: { usuarioId: request.usuario.id } })
  if (!candidato) throw new CandidatoNaoEncontradoError()

  const moradia = await prisma.moradia.upsert({
    where: { candidatoId: candidato.id },
    update: dados,
    create: { ...dados, candidatoId: candidato.id },
  })

  return reply.status(200).send(moradia)
}
