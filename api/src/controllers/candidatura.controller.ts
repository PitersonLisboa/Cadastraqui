import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import {
  CandidatoNaoEncontradoError,
  EditalNaoEncontradoError,
  CandidaturaNaoEncontradaError,
  NaoAutorizadoError,
} from '../errors/index'
import { enviarEmailCandidaturaRealizada, enviarEmailMudancaStatus } from '../services/email.service'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const inscreverSchema = z.object({
  editalId: z.string().uuid(),
})

const atualizarStatusSchema = z.object({
  status: z.enum([
    'PENDENTE',
    'EM_ANALISE',
    'DOCUMENTACAO_PENDENTE',
    'APROVADO',
    'REPROVADO',
    'CANCELADO',
  ]),
  observacao: z.string().optional(),
})

const listarCandidaturasSchema = z.object({
  pagina: z.coerce.number().min(1).default(1),
  limite: z.coerce.number().min(1).max(100).default(10),
  editalId: z.string().uuid().optional(),
  status: z.string().optional(),
})

// ===========================================
// CONTROLLERS PARA CANDIDATO
// ===========================================

// Listar candidaturas do candidato logado
export async function minhasCandidaturas(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) {
    throw new CandidatoNaoEncontradoError()
  }

  const candidaturas = await prisma.candidatura.findMany({
    where: { candidatoId: candidato.id },
    include: {
      edital: {
        include: {
          instituicao: {
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
              cidade: true,
              uf: true,
            },
          },
        },
      },
    },
    orderBy: { dataInscricao: 'desc' },
  })

  return reply.status(200).send({ candidaturas })
}

// Buscar candidatura específica
export async function buscarCandidatura(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const candidatura = await prisma.candidatura.findUnique({
    where: { id },
    include: {
      edital: {
        include: {
          instituicao: {
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
              cidade: true,
              uf: true,
            },
          },
        },
      },
      candidato: {
        include: {
          usuario: {
            select: { nome: true, email: true },
          },
          documentos: true, // Documentos gerais do candidato
          membrosFamilia: true, // Membros da família do candidato
        },
      },
      documentos: true, // Documentos específicos da candidatura (DocumentoCandidatura)
      parecerSocial: {
        include: {
          assistenteSocial: {
            select: { nome: true },
          },
        },
      },
      parecerJuridico: {
        include: {
          advogado: {
            select: { nome: true },
          },
        },
      },
      historico: {
        include: {
          usuario: {
            select: { nome: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!candidatura) {
    throw new CandidaturaNaoEncontradaError()
  }

  // Verificar permissão (candidato dono, instituição do edital, ou admin)
  const isOwner = candidatura.candidato.usuarioId === request.usuario.id
  const isInstitution = candidatura.edital.instituicao.id === request.usuario.id
  const isAdmin = request.usuario.role === 'ADMIN'
  const isAnalyst = ['ASSISTENTE_SOCIAL', 'ADVOGADO'].includes(request.usuario.role)

  if (!isOwner && !isInstitution && !isAdmin && !isAnalyst) {
    throw new NaoAutorizadoError()
  }

  // Combinar documentos da candidatura com documentos do candidato
  // para facilitar a visualização na interface
  const todosDocumentos = [
    ...candidatura.documentos, // DocumentoCandidatura
    ...candidatura.candidato.documentos, // Documento do candidato
  ]

  return reply.status(200).send({ 
    candidatura: {
      ...candidatura,
      documentos: todosDocumentos,
      membrosFamilia: candidatura.candidato.membrosFamilia,
    }
  })
}

// Realizar inscrição em edital
export async function inscrever(request: FastifyRequest, reply: FastifyReply) {
  const { editalId } = inscreverSchema.parse(request.body)

  // Buscar candidato
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) {
    throw new CandidatoNaoEncontradoError()
  }

  // Buscar edital
  const edital = await prisma.edital.findUnique({
    where: { id: editalId },
  })

  if (!edital) {
    throw new EditalNaoEncontradoError()
  }

  // Verificar se edital está ativo e dentro do prazo
  const agora = new Date()
  if (!edital.ativo || agora < edital.dataInicio || agora > edital.dataFim) {
    return reply.status(400).send({
      message: 'Este edital não está disponível para inscrições',
    })
  }

  // Verificar se já está inscrito
  const inscricaoExistente = await prisma.candidatura.findFirst({
    where: {
      candidatoId: candidato.id,
      editalId,
      status: { not: 'CANCELADO' },
    },
  })

  if (inscricaoExistente) {
    return reply.status(400).send({
      message: 'Você já está inscrito neste edital',
    })
  }

  // Criar candidatura
  const candidatura = await prisma.candidatura.create({
    data: {
      candidatoId: candidato.id,
      editalId,
      status: 'PENDENTE',
      dataInscricao: new Date(),
    },
    include: {
      edital: {
        include: {
          instituicao: {
            select: { razaoSocial: true },
          },
        },
      },
    },
  })

  // Criar registro no histórico
  await prisma.historicoCandidatura.create({
    data: {
      candidaturaId: candidatura.id,
      status: 'PENDENTE',
      observacao: 'Inscrição realizada',
      usuarioId: request.usuario.id,
    },
  })

  // Enviar email de confirmação (async, não bloqueia)
  enviarEmailCandidaturaRealizada({
    nomeCanditato: candidato.nome,
    emailCandidato: request.usuario.email,
    editalTitulo: candidatura.edital.titulo,
    instituicaoNome: candidatura.edital.instituicao.razaoSocial,
  }).catch(console.error)

  return reply.status(201).send({ candidatura })
}

// Verificar se candidato já está inscrito
export async function verificarInscricao(request: FastifyRequest, reply: FastifyReply) {
  const { editalId } = z.object({ editalId: z.string().uuid() }).parse(request.params)

  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) {
    return reply.status(200).send({ inscrito: false })
  }

  const inscricao = await prisma.candidatura.findFirst({
    where: {
      candidatoId: candidato.id,
      editalId,
      status: { not: 'CANCELADO' },
    },
  })

  return reply.status(200).send({
    inscrito: !!inscricao,
    candidaturaId: inscricao?.id || null,
  })
}

// Cancelar candidatura
export async function cancelarCandidatura(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const candidatura = await prisma.candidatura.findUnique({
    where: { id },
    include: { candidato: true },
  })

  if (!candidatura) {
    throw new CandidaturaNaoEncontradaError()
  }

  // Verificar se é o dono
  if (candidatura.candidato.usuarioId !== request.usuario.id) {
    throw new NaoAutorizadoError()
  }

  // Verificar se pode cancelar
  if (['APROVADO', 'REPROVADO', 'CANCELADO'].includes(candidatura.status)) {
    return reply.status(400).send({
      message: 'Esta candidatura não pode ser cancelada',
    })
  }

  // Atualizar status
  const candidaturaAtualizada = await prisma.candidatura.update({
    where: { id },
    data: { status: 'CANCELADO' },
  })

  // Registrar no histórico
  await prisma.historicoCandidatura.create({
    data: {
      candidaturaId: id,
      status: 'CANCELADO',
      observacao: 'Candidatura cancelada pelo candidato',
      usuarioId: request.usuario.id,
    },
  })

  return reply.status(200).send({ candidatura: candidaturaAtualizada })
}

// ===========================================
// CONTROLLERS PARA INSTITUIÇÃO/ANALISTAS
// ===========================================

// Listar candidaturas (para instituição/analistas)
export async function listarCandidaturas(request: FastifyRequest, reply: FastifyReply) {
  const { pagina, limite, editalId, status } = listarCandidaturasSchema.parse(request.query)

  const where: any = {}

  // Se for instituição, filtrar pelos editais dela
  if (request.usuario.role === 'INSTITUICAO') {
    const instituicao = await prisma.instituicao.findUnique({
      where: { usuarioId: request.usuario.id },
    })

    if (!instituicao) {
      return reply.status(200).send({
        candidaturas: [],
        paginacao: { pagina, limite, total: 0, totalPaginas: 0 },
      })
    }

    where.edital = { instituicaoId: instituicao.id }
  }

  if (editalId) {
    where.editalId = editalId
  }

  if (status) {
    where.status = status
  }

  const [candidaturas, total] = await Promise.all([
    prisma.candidatura.findMany({
      where,
      include: {
        candidato: {
          include: {
            usuario: {
              select: { nome: true, email: true },
            },
          },
        },
        edital: {
          select: {
            id: true,
            titulo: true,
            anoLetivo: true,
          },
        },
      },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { dataInscricao: 'desc' },
    }),
    prisma.candidatura.count({ where }),
  ])

  return reply.status(200).send({
    candidaturas,
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  })
}

// Atualizar status da candidatura
export async function atualizarStatusCandidatura(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const { status, observacao } = atualizarStatusSchema.parse(request.body)

  const candidatura = await prisma.candidatura.findUnique({
    where: { id },
    include: {
      edital: {
        include: { instituicao: true },
      },
    },
  })

  if (!candidatura) {
    throw new CandidaturaNaoEncontradaError()
  }

  // Verificar permissão
  const isInstitution = candidatura.edital.instituicao.usuarioId === request.usuario.id
  const isAdmin = request.usuario.role === 'ADMIN'
  const isAnalyst = ['ASSISTENTE_SOCIAL', 'ADVOGADO'].includes(request.usuario.role)

  if (!isInstitution && !isAdmin && !isAnalyst) {
    throw new NaoAutorizadoError()
  }

  // Atualizar status
  const candidaturaAtualizada = await prisma.candidatura.update({
    where: { id },
    data: { status },
    include: {
      candidato: {
        include: {
          usuario: { select: { email: true } },
        },
      },
      edital: {
        include: {
          instituicao: { select: { razaoSocial: true } },
        },
      },
    },
  })

  // Registrar no histórico
  await prisma.historicoCandidatura.create({
    data: {
      candidaturaId: id,
      status,
      observacao,
      usuarioId: request.usuario.id,
    },
  })

  // Enviar email de mudança de status (async, não bloqueia)
  enviarEmailMudancaStatus({
    nomeCanditato: candidaturaAtualizada.candidato.nome,
    emailCandidato: candidaturaAtualizada.candidato.usuario.email,
    editalTitulo: candidaturaAtualizada.edital.titulo,
    instituicaoNome: candidaturaAtualizada.edital.instituicao.razaoSocial,
    status,
    motivo: observacao,
  }).catch(console.error)

  return reply.status(200).send({ candidatura: candidaturaAtualizada })
}
