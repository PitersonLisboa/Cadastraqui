import { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma'

export async function dashboardAdvogado(request: FastifyRequest, reply: FastifyReply) {
  const advogado = await prisma.advogado.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  // Estatísticas
  const [candidaturasPendentes, candidaturasEmAnalise, pareceresEmitidos] = await Promise.all([
    prisma.candidatura.count({
      where: { 
        status: 'PENDENTE',
        parecerSocial: { isNot: null }, // Já tem parecer social
        parecerJuridico: null, // Não tem parecer jurídico ainda
      },
    }),
    prisma.candidatura.count({
      where: { status: 'EM_ANALISE' },
    }),
    advogado 
      ? prisma.parecerJuridico.count({
          where: { advogadoId: advogado.id },
        })
      : 0,
  ])

  // Candidaturas aguardando análise jurídica (já tem parecer social)
  const candidaturasRecentes = await prisma.candidatura.findMany({
    where: {
      status: { in: ['PENDENTE', 'EM_ANALISE'] },
    },
    include: {
      candidato: {
        include: {
          usuario: { select: { nome: true } },
        },
      },
      edital: {
        select: { titulo: true },
      },
      parecerSocial: {
        select: { id: true },
      },
    },
    orderBy: { dataInscricao: 'desc' },
    take: 10,
  })

  return reply.status(200).send({
    estatisticas: {
      candidaturasPendentes,
      candidaturasEmAnalise,
      pareceresEmitidos,
    },
    candidaturasRecentes,
  })
}

export async function meusPareceresJuridicos(request: FastifyRequest, reply: FastifyReply) {
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
            select: { nome: true, cpf: true }
          },
          edital: {
            select: { titulo: true }
          }
        }
      }
    },
    orderBy: { dataEmissao: 'desc' }
  })

  return reply.status(200).send({ pareceres })
}
