import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { RecursoNaoEncontradoError, NaoAutorizadoError } from '../errors/index'

// ===========================================
// SERVIÇO DE NOTIFICAÇÕES (para uso interno)
// ===========================================

interface CriarNotificacaoParams {
  usuarioId: string
  tipo?: 'INFO' | 'SUCESSO' | 'ALERTA' | 'ERRO'
  titulo: string
  mensagem: string
  link?: string
}

export async function criarNotificacao(params: CriarNotificacaoParams) {
  const { usuarioId, tipo = 'INFO', titulo, mensagem, link } = params

  return prisma.notificacao.create({
    data: {
      usuarioId,
      tipo,
      titulo,
      mensagem,
      link,
    },
  })
}

// Notificar mudança de status de candidatura
export async function notificarMudancaStatus(
  candidaturaId: string, 
  novoStatus: string,
  observacao?: string
) {
  const candidatura = await prisma.candidatura.findUnique({
    where: { id: candidaturaId },
    include: {
      candidato: true,
      edital: { select: { titulo: true } },
    },
  })

  if (!candidatura) return

  const statusTexto: Record<string, string> = {
    PENDENTE: 'Pendente',
    EM_ANALISE: 'Em Análise',
    DOCUMENTACAO_PENDENTE: 'Documentação Pendente',
    APROVADO: 'Aprovada',
    REPROVADO: 'Reprovada',
    CANCELADO: 'Cancelada',
  }

  await criarNotificacao({
    usuarioId: candidatura.candidato.usuarioId,
    tipo: novoStatus === 'APROVADO' ? 'SUCESSO' : novoStatus === 'REPROVADO' ? 'ERRO' : 'INFO',
    titulo: `Candidatura ${statusTexto[novoStatus] || novoStatus}`,
    mensagem: `Sua candidatura para "${candidatura.edital.titulo}" foi atualizada para: ${statusTexto[novoStatus]}${observacao ? `. ${observacao}` : ''}`,
    link: `/candidato/candidaturas/${candidaturaId}`,
  })
}

// Notificar novo agendamento
export async function notificarNovoAgendamento(agendamentoId: string) {
  const agendamento = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: {
      candidatura: {
        include: {
          candidato: true,
          edital: { select: { titulo: true } },
        },
      },
    },
  })

  if (!agendamento) return

  const dataFormatada = agendamento.dataHora.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  await criarNotificacao({
    usuarioId: agendamento.candidatura.candidato.usuarioId,
    tipo: 'INFO',
    titulo: 'Novo Agendamento',
    mensagem: `Você tem um agendamento marcado para ${dataFormatada}: ${agendamento.titulo}`,
    link: `/candidato/agendamentos`,
  })
}

// ===========================================
// CONTROLLERS
// ===========================================

// Listar notificações do usuário
export async function listarNotificacoes(request: FastifyRequest, reply: FastifyReply) {
  const { pagina, limite, apenasNaoLidas } = z.object({
    pagina: z.coerce.number().min(1).default(1),
    limite: z.coerce.number().min(1).max(50).default(20),
    apenasNaoLidas: z.coerce.boolean().optional(),
  }).parse(request.query)

  const where: any = { usuarioId: request.usuario.id }

  if (apenasNaoLidas) {
    where.lida = false
  }

  const [notificacoes, total, naoLidas] = await Promise.all([
    prisma.notificacao.findMany({
      where,
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.notificacao.count({ where }),
    prisma.notificacao.count({
      where: { usuarioId: request.usuario.id, lida: false },
    }),
  ])

  return reply.status(200).send({
    notificacoes,
    naoLidas,
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  })
}

// Marcar como lida
export async function marcarComoLida(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const notificacao = await prisma.notificacao.findUnique({
    where: { id },
  })

  if (!notificacao) {
    throw new RecursoNaoEncontradoError('Notificação')
  }

  if (notificacao.usuarioId !== request.usuario.id) {
    throw new NaoAutorizadoError()
  }

  await prisma.notificacao.update({
    where: { id },
    data: { lida: true },
  })

  return reply.status(200).send({ message: 'Notificação marcada como lida' })
}

// Marcar todas como lidas
export async function marcarTodasComoLidas(request: FastifyRequest, reply: FastifyReply) {
  await prisma.notificacao.updateMany({
    where: {
      usuarioId: request.usuario.id,
      lida: false,
    },
    data: { lida: true },
  })

  return reply.status(200).send({ message: 'Todas notificações marcadas como lidas' })
}

// Excluir notificação
export async function excluirNotificacao(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const notificacao = await prisma.notificacao.findUnique({
    where: { id },
  })

  if (!notificacao) {
    throw new RecursoNaoEncontradoError('Notificação')
  }

  if (notificacao.usuarioId !== request.usuario.id) {
    throw new NaoAutorizadoError()
  }

  await prisma.notificacao.delete({ where: { id } })

  return reply.status(204).send()
}

// Contagem de não lidas (para badge)
export async function contarNaoLidas(request: FastifyRequest, reply: FastifyReply) {
  const count = await prisma.notificacao.count({
    where: {
      usuarioId: request.usuario.id,
      lida: false,
    },
  })

  return reply.status(200).send({ count })
}
