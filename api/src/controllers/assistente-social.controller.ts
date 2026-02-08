import { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma'

export async function dashboardAssistenteSocial(request: FastifyRequest, reply: FastifyReply) {
  const assistenteSocial = await prisma.assistenteSocial.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  // Estatísticas
  const [candidaturasPendentes, candidaturasEmAnalise, pareceresEmitidos, agendamentosHoje] = await Promise.all([
    prisma.candidatura.count({
      where: { status: 'PENDENTE' },
    }),
    prisma.candidatura.count({
      where: { status: 'EM_ANALISE' },
    }),
    assistenteSocial 
      ? prisma.parecerSocial.count({
          where: { assistenteId: assistenteSocial.id },
        })
      : 0,
    assistenteSocial
      ? prisma.agendamento.count({
          where: {
            assistenteId: assistenteSocial.id,
            dataHora: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        })
      : 0,
  ])

  // Candidaturas recentes pendentes
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
    },
    orderBy: { dataInscricao: 'desc' },
    take: 5,
  })

  // Próximos agendamentos
  const proximosAgendamentos = assistenteSocial
    ? await prisma.agendamento.findMany({
        where: {
          assistenteId: assistenteSocial.id,
          dataHora: { gte: new Date() },
          realizado: false,
        },
        include: {
          candidatura: {
            include: {
              candidato: {
                include: { usuario: { select: { nome: true } } },
              },
            },
          },
        },
        orderBy: { dataHora: 'asc' },
        take: 5,
      })
    : []

  return reply.status(200).send({
    estatisticas: {
      candidaturasPendentes,
      candidaturasEmAnalise,
      pareceresEmitidos,
      agendamentosHoje,
    },
    candidaturasRecentes,
    proximosAgendamentos,
  })
}

export async function meusPareceresSociais(request: FastifyRequest, reply: FastifyReply) {
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
