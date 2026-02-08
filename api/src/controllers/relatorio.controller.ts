import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

// ===========================================
// DASHBOARD GERAL (ADMIN)
// ===========================================

export async function dashboardAdmin(request: FastifyRequest, reply: FastifyReply) {
  const [
    totalUsuarios,
    totalInstituicoes,
    totalCandidatos,
    totalEditais,
    totalCandidaturas,
    candidaturasPorStatus,
    candidaturasPorMes,
    instituicoesRecentes,
  ] = await Promise.all([
    prisma.usuario.count(),
    prisma.instituicao.count(),
    prisma.candidato.count(),
    prisma.edital.count(),
    prisma.candidatura.count(),
    prisma.candidatura.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "criadoEm"), 'YYYY-MM') as mes,
        COUNT(*)::int as total
      FROM candidaturas
      WHERE "criadoEm" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "criadoEm")
      ORDER BY mes ASC
    ` as Promise<{ mes: string; total: number }[]>,
    prisma.instituicao.findMany({
      take: 5,
      orderBy: { criadoEm: 'desc' },
      include: {
        usuario: { select: { email: true } },
        _count: { select: { editais: true } },
      },
    }),
  ])

  return reply.status(200).send({
    resumo: {
      totalUsuarios,
      totalInstituicoes,
      totalCandidatos,
      totalEditais,
      totalCandidaturas,
    },
    candidaturasPorStatus: candidaturasPorStatus.map((c) => ({
      status: c.status,
      total: c._count,
    })),
    candidaturasPorMes,
    instituicoesRecentes: instituicoesRecentes.map((i) => ({
      id: i.id,
      razaoSocial: i.razaoSocial,
      nomeFantasia: i.nomeFantasia,
      email: i.usuario.email,
      totalEditais: i._count.editais,
      criadoEm: i.criadoEm,
    })),
  })
}

// ===========================================
// DASHBOARD INSTITUIÇÃO
// ===========================================

export async function dashboardInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const instituicao = await prisma.instituicao.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!instituicao) {
    return reply.status(200).send({ resumo: null })
  }

  const [
    totalEditais,
    editaisAtivos,
    totalCandidaturas,
    totalVagas,
    candidaturasPorStatus,
    candidaturasPorEdital,
    candidaturasPorMes,
    editaisRecentes,
  ] = await Promise.all([
    prisma.edital.count({ where: { instituicaoId: instituicao.id } }),
    prisma.edital.count({
      where: {
        instituicaoId: instituicao.id,
        ativo: true,
        dataFim: { gte: new Date() },
      },
    }),
    prisma.candidatura.count({
      where: { edital: { instituicaoId: instituicao.id } },
    }),
    prisma.edital.aggregate({
      where: { instituicaoId: instituicao.id },
      _sum: { vagasDisponiveis: true },
    }),
    prisma.candidatura.groupBy({
      by: ['status'],
      where: { edital: { instituicaoId: instituicao.id } },
      _count: true,
    }),
    prisma.edital.findMany({
      where: { instituicaoId: instituicao.id },
      select: {
        id: true,
        titulo: true,
        _count: { select: { candidaturas: true } },
      },
      orderBy: { criadoEm: 'desc' },
      take: 10,
    }),
    prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', c."criadoEm"), 'YYYY-MM') as mes,
        COUNT(*)::int as total
      FROM candidaturas c
      INNER JOIN editais e ON c."editalId" = e.id
      WHERE e."instituicaoId" = ${instituicao.id}
        AND c."criadoEm" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', c."criadoEm")
      ORDER BY mes ASC
    ` as Promise<{ mes: string; total: number }[]>,
    prisma.edital.findMany({
      where: { instituicaoId: instituicao.id },
      take: 5,
      orderBy: { criadoEm: 'desc' },
      select: {
        id: true,
        titulo: true,
        ativo: true,
        vagasDisponiveis: true,
        dataInicio: true,
        dataFim: true,
        _count: { select: { candidaturas: true } },
      },
    }),
  ])

  return reply.status(200).send({
    resumo: {
      totalEditais,
      editaisAtivos,
      totalCandidaturas,
      totalVagas: totalVagas._sum?.vagasDisponiveis || 0,
    },
    candidaturasPorStatus: candidaturasPorStatus.map((c) => ({
      status: c.status,
      total: c._count,
    })),
    candidaturasPorEdital: candidaturasPorEdital.map((e) => ({
      edital: e.titulo,
      total: e._count.candidaturas,
    })),
    candidaturasPorMes,
    editaisRecentes,
  })
}

// ===========================================
// RELATÓRIO DE CANDIDATURAS
// ===========================================

export async function relatorioCandidaturas(request: FastifyRequest, reply: FastifyReply) {
  const { dataInicio, dataFim, status, editalId } = z.object({
    dataInicio: z.coerce.date().optional(),
    dataFim: z.coerce.date().optional(),
    status: z.string().optional(),
    editalId: z.string().uuid().optional(),
  }).parse(request.query)

  // Verificar permissão
  let instituicaoId: string | undefined

  if (request.usuario.role === 'INSTITUICAO') {
    const instituicao = await prisma.instituicao.findUnique({
      where: { usuarioId: request.usuario.id },
    })
    if (instituicao) instituicaoId = instituicao.id
  }

  const where: any = {}

  if (instituicaoId) {
    where.edital = { instituicaoId }
  }

  if (dataInicio || dataFim) {
    where.criadoEm = {}
    if (dataInicio) where.criadoEm.gte = dataInicio
    if (dataFim) where.criadoEm.lte = dataFim
  }

  if (status) {
    where.status = status
  }

  if (editalId) {
    where.editalId = editalId
  }

  const [
    total,
    porStatus,
    porMes,
    tempoMedioAnalise,
  ] = await Promise.all([
    prisma.candidatura.count({ where }),
    prisma.candidatura.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),
    prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "criadoEm"), 'Mon/YY') as mes,
        COUNT(*)::int as total
      FROM candidaturas
      WHERE "criadoEm" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "criadoEm")
      ORDER BY DATE_TRUNC('month', "criadoEm") ASC
    ` as Promise<{ mes: string; total: number }[]>,
    prisma.$queryRaw`
      SELECT 
        AVG(EXTRACT(EPOCH FROM ("atualizadoEm" - "criadoEm")) / 86400)::int as dias
      FROM candidaturas
      WHERE status IN ('APROVADO', 'REPROVADO')
    ` as Promise<{ dias: number }[]>,
  ])

  return reply.status(200).send({
    total,
    porStatus: porStatus.map((c) => ({
      status: c.status,
      total: c._count,
    })),
    porMes,
    tempoMedioAnalise: tempoMedioAnalise[0]?.dias || 0,
  })
}

// ===========================================
// ESTATÍSTICAS DO ASSISTENTE SOCIAL
// ===========================================

export async function estatisticasAssistente(request: FastifyRequest, reply: FastifyReply) {
  const assistente = await prisma.assistenteSocial.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!assistente) {
    return reply.status(200).send({ estatisticas: null })
  }

  const [
    totalPareceres,
    pareceresPorMes,
    totalAgendamentos,
    agendamentosRealizados,
    agendamentosPendentes,
  ] = await Promise.all([
    prisma.parecerSocial.count({ where: { assistenteId: assistente.id } }),
    prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "criadoEm"), 'Mon/YY') as mes,
        COUNT(*)::int as total
      FROM pareceres_sociais
      WHERE "assistenteId" = ${assistente.id}
        AND "criadoEm" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "criadoEm")
      ORDER BY DATE_TRUNC('month', "criadoEm") ASC
    ` as Promise<{ mes: string; total: number }[]>,
    prisma.agendamento.count({ where: { assistenteId: assistente.id } }),
    prisma.agendamento.count({ where: { assistenteId: assistente.id, realizado: true } }),
    prisma.agendamento.count({ where: { assistenteId: assistente.id, realizado: false } }),
  ])

  return reply.status(200).send({
    estatisticas: {
      totalPareceres,
      totalAgendamentos,
      agendamentosRealizados,
      agendamentosPendentes,
      taxaRealizacao: totalAgendamentos > 0 
        ? Math.round((agendamentosRealizados / totalAgendamentos) * 100) 
        : 0,
    },
    pareceresPorMes,
  })
}

// ===========================================
// ESTATÍSTICAS DO ADVOGADO
// ===========================================

export async function estatisticasAdvogado(request: FastifyRequest, reply: FastifyReply) {
  const advogado = await prisma.advogado.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!advogado) {
    return reply.status(200).send({ estatisticas: null })
  }

  const [
    totalPareceres,
    pareceresPorMes,
  ] = await Promise.all([
    prisma.parecerJuridico.count({ where: { advogadoId: advogado.id } }),
    prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "criadoEm"), 'Mon/YY') as mes,
        COUNT(*)::int as total
      FROM pareceres_juridicos
      WHERE "advogadoId" = ${advogado.id}
        AND "criadoEm" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "criadoEm")
      ORDER BY DATE_TRUNC('month', "criadoEm") ASC
    ` as Promise<{ mes: string; total: number }[]>,
  ])

  return reply.status(200).send({
    estatisticas: {
      totalPareceres,
    },
    pareceresPorMes,
  })
}
