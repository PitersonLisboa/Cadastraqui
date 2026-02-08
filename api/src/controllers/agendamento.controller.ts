import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { 
  CandidaturaNaoEncontradaError, 
  RecursoNaoEncontradoError, 
  NaoAutorizadoError 
} from '../errors/index'
import { enviarEmailAgendamentoCriado } from '../services/email.service'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const criarAgendamentoSchema = z.object({
  candidaturaId: z.string().uuid(),
  titulo: z.string().min(3),
  descricao: z.string().optional(),
  dataHora: z.coerce.date(),
  duracao: z.number().min(15).max(180).default(30),
  local: z.string().optional(),
  linkOnline: z.string().url().optional().or(z.literal('')),
})

const atualizarAgendamentoSchema = z.object({
  titulo: z.string().min(3).optional(),
  descricao: z.string().optional(),
  dataHora: z.coerce.date().optional(),
  duracao: z.number().min(15).max(180).optional(),
  local: z.string().optional(),
  linkOnline: z.string().url().optional().or(z.literal('')),
  realizado: z.boolean().optional(),
  observacoes: z.string().optional(),
})

const listarAgendamentosSchema = z.object({
  pagina: z.coerce.number().min(1).default(1),
  limite: z.coerce.number().min(1).max(100).default(10),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  realizado: z.coerce.boolean().optional(),
})

// ===========================================
// CONTROLLERS DO ASSISTENTE SOCIAL
// ===========================================

// Listar agendamentos do assistente social
export async function listarMeusAgendamentos(request: FastifyRequest, reply: FastifyReply) {
  const { pagina, limite, dataInicio, dataFim, realizado } = listarAgendamentosSchema.parse(request.query)

  const assistente = await prisma.assistenteSocial.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!assistente) {
    return reply.status(200).send({
      agendamentos: [],
      paginacao: { pagina, limite, total: 0, totalPaginas: 0 },
    })
  }

  const where: any = { assistenteId: assistente.id }

  if (dataInicio || dataFim) {
    where.dataHora = {}
    if (dataInicio) where.dataHora.gte = dataInicio
    if (dataFim) where.dataHora.lte = dataFim
  }

  if (realizado !== undefined) {
    where.realizado = realizado
  }

  const [agendamentos, total] = await Promise.all([
    prisma.agendamento.findMany({
      where,
      include: {
        candidatura: {
          include: {
            candidato: {
              include: {
                usuario: { select: { nome: true, email: true } },
              },
            },
            edital: { select: { titulo: true } },
          },
        },
      },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { dataHora: 'asc' },
    }),
    prisma.agendamento.count({ where }),
  ])

  return reply.status(200).send({
    agendamentos,
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  })
}

// Criar agendamento
export async function criarAgendamento(request: FastifyRequest, reply: FastifyReply) {
  const dados = criarAgendamentoSchema.parse(request.body)

  const assistente = await prisma.assistenteSocial.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!assistente) {
    throw new NaoAutorizadoError('Você não está cadastrado como assistente social')
  }

  // Verificar se candidatura existe
  const candidatura = await prisma.candidatura.findUnique({
    where: { id: dados.candidaturaId },
  })

  if (!candidatura) {
    throw new CandidaturaNaoEncontradaError()
  }

  // Verificar conflito de horário
  const conflito = await prisma.agendamento.findFirst({
    where: {
      assistenteId: assistente.id,
      realizado: false,
      dataHora: {
        gte: new Date(dados.dataHora.getTime() - dados.duracao * 60000),
        lte: new Date(dados.dataHora.getTime() + dados.duracao * 60000),
      },
    },
  })

  if (conflito) {
    return reply.status(400).send({
      message: 'Já existe um agendamento neste horário',
    })
  }

  const agendamento = await prisma.agendamento.create({
    data: {
      ...dados,
      linkOnline: dados.linkOnline || null,
      assistenteId: assistente.id,
    },
    include: {
      candidatura: {
        include: {
          candidato: {
            include: { usuario: { select: { nome: true, email: true } } },
          },
        },
      },
    },
  })

  // Registrar no histórico da candidatura
  await prisma.historicoCandidatura.create({
    data: {
      candidaturaId: dados.candidaturaId,
      status: candidatura.status,
      observacao: `Agendamento criado: ${dados.titulo} para ${dados.dataHora.toLocaleString('pt-BR')}`,
      usuarioId: request.usuario.id,
    },
  })

  // Enviar email de confirmação do agendamento (async, não bloqueia)
  enviarEmailAgendamentoCriado({
    nomeCandidato: agendamento.candidatura.candidato.nome,
    emailCandidato: agendamento.candidatura.candidato.usuario.email,
    data: dados.dataHora,
    horario: dados.dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    local: dados.local || dados.linkOnline || undefined,
    tipo: 'ENTREVISTA',
    observacoes: dados.descricao,
  }).catch(console.error)

  return reply.status(201).send({ agendamento })
}

// Buscar agendamento específico
export async function buscarAgendamento(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: {
      candidatura: {
        include: {
          candidato: {
            include: { usuario: { select: { nome: true, email: true } } },
          },
          edital: { select: { titulo: true } },
        },
      },
      assistenteSocial: {
        include: { usuario: { select: { email: true } } },
      },
    },
  })

  if (!agendamento) {
    throw new RecursoNaoEncontradoError('Agendamento')
  }

  return reply.status(200).send({ agendamento })
}

// Atualizar agendamento
export async function atualizarAgendamento(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const dados = atualizarAgendamentoSchema.parse(request.body)

  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: { assistenteSocial: true },
  })

  if (!agendamento) {
    throw new RecursoNaoEncontradoError('Agendamento')
  }

  // Verificar permissão
  if (
    agendamento.assistenteSocial.usuarioId !== request.usuario.id &&
    request.usuario.role !== 'ADMIN'
  ) {
    throw new NaoAutorizadoError()
  }

  const agendamentoAtualizado = await prisma.agendamento.update({
    where: { id },
    data: {
      ...dados,
      linkOnline: dados.linkOnline || null,
    },
  })

  return reply.status(200).send({ agendamento: agendamentoAtualizado })
}

// Cancelar/excluir agendamento
export async function excluirAgendamento(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: { assistenteSocial: true },
  })

  if (!agendamento) {
    throw new RecursoNaoEncontradoError('Agendamento')
  }

  if (
    agendamento.assistenteSocial.usuarioId !== request.usuario.id &&
    request.usuario.role !== 'ADMIN'
  ) {
    throw new NaoAutorizadoError()
  }

  await prisma.agendamento.delete({ where: { id } })

  return reply.status(204).send()
}

// Marcar como realizado
export async function marcarRealizado(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const { observacoes } = z.object({
    observacoes: z.string().optional(),
  }).parse(request.body)

  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: { assistenteSocial: true },
  })

  if (!agendamento) {
    throw new RecursoNaoEncontradoError('Agendamento')
  }

  if (agendamento.assistenteSocial.usuarioId !== request.usuario.id) {
    throw new NaoAutorizadoError()
  }

  const agendamentoAtualizado = await prisma.agendamento.update({
    where: { id },
    data: {
      realizado: true,
      observacoes,
    },
  })

  return reply.status(200).send({ agendamento: agendamentoAtualizado })
}

// ===========================================
// CONTROLLERS DO CANDIDATO
// ===========================================

// Listar agendamentos do candidato
export async function listarAgendamentosCandidato(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) {
    return reply.status(200).send({ agendamentos: [] })
  }

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      candidatura: {
        candidatoId: candidato.id,
      },
    },
    include: {
      candidatura: {
        include: {
          edital: {
            select: { titulo: true },
          },
        },
      },
      assistenteSocial: {
        select: { nome: true },
      },
    },
    orderBy: { dataHora: 'asc' },
  })

  return reply.status(200).send({ agendamentos })
}

// Buscar horários disponíveis (para futura implementação de auto-agendamento)
export async function horariosDisponiveis(request: FastifyRequest, reply: FastifyReply) {
  const { data, assistenteId } = z.object({
    data: z.coerce.date(),
    assistenteId: z.string().uuid().optional(),
  }).parse(request.query)

  // Horários padrão de atendimento (8h às 18h, intervalos de 30min)
  const horarios = []
  const inicio = new Date(data)
  inicio.setHours(8, 0, 0, 0)

  for (let h = 8; h < 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      const horario = new Date(data)
      horario.setHours(h, m, 0, 0)
      horarios.push(horario)
    }
  }

  // Se especificou assistente, filtrar horários ocupados
  if (assistenteId) {
    const agendamentosExistentes = await prisma.agendamento.findMany({
      where: {
        assistenteId,
        realizado: false,
        dataHora: {
          gte: new Date(data.setHours(0, 0, 0, 0)),
          lt: new Date(data.setHours(23, 59, 59, 999)),
        },
      },
      select: { dataHora: true, duracao: true },
    })

    const horariosDisponiveis = horarios.filter(h => {
      return !agendamentosExistentes.some(ag => {
        const inicio = ag.dataHora.getTime()
        const fim = inicio + ag.duracao * 60000
        return h.getTime() >= inicio && h.getTime() < fim
      })
    })

    return reply.status(200).send({ horarios: horariosDisponiveis })
  }

  return reply.status(200).send({ horarios })
}
