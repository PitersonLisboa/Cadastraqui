import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { 
  exportarCandidaturasPDF, 
  exportarCandidaturasExcel,
  exportarEditaisExcel,
  exportarRelatorioPDF 
} from '../services/export.service.js'

// ===========================================
// SCHEMAS
// ===========================================

const exportCandidaturasSchema = z.object({
  formato: z.enum(['pdf', 'excel']).default('excel'),
  editalId: z.string().uuid().optional(),
  status: z.string().optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
})

const exportEditaisSchema = z.object({
  formato: z.enum(['pdf', 'excel']).default('excel'),
  status: z.string().optional(),
})

// ===========================================
// CONTROLLERS
// ===========================================

export async function exportarCandidaturas(request: FastifyRequest, reply: FastifyReply) {
  const { formato, editalId, status, dataInicio, dataFim } = exportCandidaturasSchema.parse(request.query)

  // Construir filtro
  const where: any = {}

  // Se for instituição, filtrar pelos editais dela
  if (request.usuario.role === 'INSTITUICAO') {
    const instituicao = await prisma.instituicao.findUnique({
      where: { usuarioId: request.usuario.id },
    })

    if (!instituicao) {
      return reply.status(400).send({ message: 'Instituição não encontrada' })
    }

    where.edital = { instituicaoId: instituicao.id }
  }

  if (editalId) where.editalId = editalId
  if (status) where.status = status
  if (dataInicio || dataFim) {
    where.dataInscricao = {}
    if (dataInicio) where.dataInscricao.gte = dataInicio
    if (dataFim) where.dataInscricao.lte = dataFim
  }

  // Buscar candidaturas
  const candidaturas = await prisma.candidatura.findMany({
    where,
    include: {
      candidato: {
        include: {
          usuario: { select: { email: true } },
        },
      },
      edital: {
        select: { titulo: true, anoLetivo: true },
      },
    },
    orderBy: { dataInscricao: 'desc' },
  })

  // Preparar dados para exportação
  const dados = candidaturas.map(c => ({
    id: c.id,
    candidato: {
      nome: c.candidato.nome,
      cpf: c.candidato.cpf,
      email: c.candidato.usuario.email,
      telefone: c.candidato.telefone,
    },
    edital: {
      titulo: c.edital.titulo,
      anoLetivo: c.edital.anoLetivo,
    },
    status: c.status,
    dataInscricao: c.dataInscricao,
  }))

  // Buscar nome da instituição
  let instituicaoNome = 'Cadastraqui'
  if (request.usuario.role === 'INSTITUICAO') {
    const inst = await prisma.instituicao.findUnique({
      where: { usuarioId: request.usuario.id },
      select: { nomeFantasia: true, razaoSocial: true },
    })
    if (inst) instituicaoNome = inst.nomeFantasia || inst.razaoSocial
  }

  const config = {
    titulo: 'Relatório de Candidaturas',
    subtitulo: editalId ? `Edital: ${candidaturas[0]?.edital.titulo || 'N/A'}` : 'Todos os Editais',
    instituicao: instituicaoNome,
    dataGeracao: new Date(),
  }

  let buffer: Buffer
  let contentType: string
  let filename: string

  if (formato === 'pdf') {
    buffer = await exportarCandidaturasPDF(dados, config)
    contentType = 'application/pdf'
    filename = `candidaturas_${Date.now()}.pdf`
  } else {
    buffer = await exportarCandidaturasExcel(dados, config)
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    filename = `candidaturas_${Date.now()}.xlsx`
  }

  return reply
    .header('Content-Type', contentType)
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(buffer)
}

export async function exportarEditais(request: FastifyRequest, reply: FastifyReply) {
  const { formato, status } = exportEditaisSchema.parse(request.query)

  const where: any = {}

  // Se for instituição, filtrar pelos editais dela
  if (request.usuario.role === 'INSTITUICAO') {
    const instituicao = await prisma.instituicao.findUnique({
      where: { usuarioId: request.usuario.id },
    })

    if (!instituicao) {
      return reply.status(400).send({ message: 'Instituição não encontrada' })
    }

    where.instituicaoId = instituicao.id
  }

  if (status) where.status = status

  const editais = await prisma.edital.findMany({
    where,
    include: {
      _count: { select: { candidaturas: true } },
    },
    orderBy: { criadoEm: 'desc' },
  })

  const dados = editais.map(e => ({
    id: e.id,
    titulo: e.titulo,
    anoLetivo: e.anoLetivo,
    vagas: e.vagas,
    status: e.status,
    dataInicio: e.dataInicio,
    dataFim: e.dataFim,
    totalCandidaturas: e._count.candidaturas,
  }))

  const config = {
    titulo: 'Relatório de Editais',
    dataGeracao: new Date(),
  }

  const buffer = await exportarEditaisExcel(dados, config)
  const filename = `editais_${Date.now()}.xlsx`

  return reply
    .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(buffer)
}

export async function exportarRelatorioDashboard(request: FastifyRequest, reply: FastifyReply) {
  const { formato } = z.object({
    formato: z.enum(['pdf', 'excel']).default('pdf'),
  }).parse(request.query)

  let dados: any = {}
  let config: any = {
    titulo: 'Relatório do Dashboard',
    dataGeracao: new Date(),
  }

  if (request.usuario.role === 'ADMIN') {
    const [
      totalUsuarios,
      totalInstituicoes,
      totalCandidatos,
      totalEditais,
      totalCandidaturas,
      candidaturasPorStatus,
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
    ])

    dados = {
      resumo: {
        totalUsuarios,
        totalInstituicoes,
        totalCandidatos,
        totalEditais,
        totalCandidaturas,
      },
      candidaturasPorStatus: candidaturasPorStatus.map(c => ({
        status: c.status,
        total: c._count,
      })),
    }
    config.titulo = 'Relatório Administrativo'
  } else if (request.usuario.role === 'INSTITUICAO') {
    const instituicao = await prisma.instituicao.findUnique({
      where: { usuarioId: request.usuario.id },
    })

    if (!instituicao) {
      return reply.status(400).send({ message: 'Instituição não encontrada' })
    }

    const [
      totalEditais,
      totalCandidaturas,
      totalVagas,
      candidaturasPorStatus,
    ] = await Promise.all([
      prisma.edital.count({ where: { instituicaoId: instituicao.id } }),
      prisma.candidatura.count({ where: { edital: { instituicaoId: instituicao.id } } }),
      prisma.edital.aggregate({
        where: { instituicaoId: instituicao.id },
        _sum: { vagas: true },
      }),
      prisma.candidatura.groupBy({
        by: ['status'],
        where: { edital: { instituicaoId: instituicao.id } },
        _count: true,
      }),
    ])

    dados = {
      resumo: {
        totalEditais,
        totalCandidaturas,
        totalVagas: totalVagas._sum.vagas || 0,
      },
      candidaturasPorStatus: candidaturasPorStatus.map(c => ({
        status: c.status,
        total: c._count,
      })),
    }
    config.titulo = 'Relatório da Instituição'
    config.instituicao = instituicao.nomeFantasia || instituicao.razaoSocial
  }

  const buffer = await exportarRelatorioPDF(dados, config)
  const filename = `relatorio_dashboard_${Date.now()}.pdf`

  return reply
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(buffer)
}
