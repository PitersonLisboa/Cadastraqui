import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { 
  UsuarioNaoEncontradoError, 
  EmailJaCadastradoError,
  RecursoNaoEncontradoError 
} from '../errors/index'
import { Role } from '@prisma/client'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const listarUsuariosSchema = z.object({
  pagina: z.coerce.number().min(1).default(1),
  limite: z.coerce.number().min(1).max(100).default(20),
  busca: z.string().optional(),
  role: z.string().optional(),
  ativo: z.string().optional(),
})

const criarUsuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  role: z.nativeEnum(Role),
  nome: z.string().optional(),
})

const atualizarUsuarioSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  role: z.nativeEnum(Role).optional(),
  ativo: z.boolean().optional(),
  nome: z.string().optional(),
})

const listarInstituicoesSchema = z.object({
  pagina: z.coerce.number().min(1).default(1),
  limite: z.coerce.number().min(1).max(100).default(20),
  busca: z.string().optional(),
  status: z.string().optional(),
})

const listarLogsSchema = z.object({
  pagina: z.coerce.number().min(1).default(1),
  limite: z.coerce.number().min(1).max(100).default(50),
  usuarioId: z.string().uuid().optional(),
  acao: z.string().optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
})

// ===========================================
// GESTÃO DE USUÁRIOS
// ===========================================

export async function listarUsuarios(request: FastifyRequest, reply: FastifyReply) {
  const { pagina, limite, busca, role, ativo } = listarUsuariosSchema.parse(request.query)

  const where: any = {}

  if (busca) {
    where.OR = [
      { email: { contains: busca, mode: 'insensitive' } },
      { nome: { contains: busca, mode: 'insensitive' } },
    ]
  }

  if (role) {
    where.role = role
  }

  if (ativo !== undefined) {
    where.ativo = ativo === 'true'
  }

  const [usuarios, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      select: {
        id: true,
        email: true,
        nome: true,
        role: true,
        ativo: true,
        primeiroAcesso: true,
        criadoEm: true,
        atualizadoEm: true,
        candidato: { select: { id: true, nome: true, cpf: true } },
        instituicao: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        assistenteSocial: { select: { id: true, nome: true, cress: true } },
        advogado: { select: { id: true, nome: true, oab: true } },
      },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.usuario.count({ where }),
  ])

  return reply.status(200).send({
    usuarios,
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  })
}

export async function buscarUsuario(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      nome: true,
      role: true,
      ativo: true,
      primeiroAcesso: true,
      criadoEm: true,
      atualizadoEm: true,
      candidato: true,
      instituicao: true,
      assistenteSocial: true,
      advogado: true,
      sessoes: {
        select: { id: true, ip: true, userAgent: true, criadoEm: true },
        orderBy: { criadoEm: 'desc' },
        take: 10,
      },
    },
  })

  if (!usuario) {
    throw new UsuarioNaoEncontradoError()
  }

  return reply.status(200).send({ usuario })
}

export async function criarUsuario(request: FastifyRequest, reply: FastifyReply) {
  const { email, senha, role, nome } = criarUsuarioSchema.parse(request.body)

  const existente = await prisma.usuario.findUnique({ where: { email } })
  if (existente) {
    throw new EmailJaCadastradoError()
  }

  const senhaHash = await bcrypt.hash(senha, 10)

  const usuario = await prisma.usuario.create({
    data: {
      email,
      senha: senhaHash,
      role,
      nome,
    },
    select: {
      id: true,
      email: true,
      nome: true,
      role: true,
      ativo: true,
      criadoEm: true,
    },
  })

  // Log de atividade
  await prisma.logAtividade.create({
    data: {
      usuarioId: request.usuario.id,
      acao: 'CRIAR_USUARIO',
      entidade: 'Usuario',
      entidadeId: usuario.id,
      detalhes: { email, role },
      ip: request.ip,
    },
  })

  return reply.status(201).send({ usuario })
}

export async function atualizarUsuario(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const dados = atualizarUsuarioSchema.parse(request.body)

  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) {
    throw new UsuarioNaoEncontradoError()
  }

  // Verificar email duplicado
  if (dados.email && dados.email !== usuario.email) {
    const existente = await prisma.usuario.findUnique({ where: { email: dados.email } })
    if (existente) {
      throw new EmailJaCadastradoError()
    }
  }

  const usuarioAtualizado = await prisma.usuario.update({
    where: { id },
    data: dados,
    select: {
      id: true,
      email: true,
      nome: true,
      role: true,
      ativo: true,
      atualizadoEm: true,
    },
  })

  // Log de atividade
  await prisma.logAtividade.create({
    data: {
      usuarioId: request.usuario.id,
      acao: 'ATUALIZAR_USUARIO',
      entidade: 'Usuario',
      entidadeId: id,
      detalhes: dados,
      ip: request.ip,
    },
  })

  return reply.status(200).send({ usuario: usuarioAtualizado })
}

export async function alternarStatusUsuario(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) {
    throw new UsuarioNaoEncontradoError()
  }

  // Não permitir desativar a si mesmo
  if (id === request.usuario.id) {
    return reply.status(400).send({ message: 'Você não pode desativar seu próprio usuário' })
  }

  const usuarioAtualizado = await prisma.usuario.update({
    where: { id },
    data: { ativo: !usuario.ativo },
    select: { id: true, email: true, ativo: true },
  })

  // Log de atividade
  await prisma.logAtividade.create({
    data: {
      usuarioId: request.usuario.id,
      acao: usuarioAtualizado.ativo ? 'ATIVAR_USUARIO' : 'DESATIVAR_USUARIO',
      entidade: 'Usuario',
      entidadeId: id,
      ip: request.ip,
    },
  })

  return reply.status(200).send({ usuario: usuarioAtualizado })
}

export async function resetarSenha(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const { novaSenha } = z.object({ novaSenha: z.string().min(6) }).parse(request.body)

  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) {
    throw new UsuarioNaoEncontradoError()
  }

  const senhaHash = await bcrypt.hash(novaSenha, 10)

  await prisma.usuario.update({
    where: { id },
    data: { 
      senha: senhaHash,
      primeiroAcesso: true, // Força troca de senha no próximo login
    },
  })

  // Invalidar todas as sessões do usuário
  await prisma.sessao.deleteMany({ where: { usuarioId: id } })

  // Log de atividade
  await prisma.logAtividade.create({
    data: {
      usuarioId: request.usuario.id,
      acao: 'RESETAR_SENHA',
      entidade: 'Usuario',
      entidadeId: id,
      ip: request.ip,
    },
  })

  return reply.status(200).send({ message: 'Senha resetada com sucesso' })
}

// ===========================================
// GESTÃO DE INSTITUIÇÕES
// ===========================================

export async function listarInstituicoesAdmin(request: FastifyRequest, reply: FastifyReply) {
  const { pagina, limite, busca, status } = listarInstituicoesSchema.parse(request.query)

  const where: any = {}

  if (busca) {
    where.OR = [
      { razaoSocial: { contains: busca, mode: 'insensitive' } },
      { nomeFantasia: { contains: busca, mode: 'insensitive' } },
      { cnpj: { contains: busca } },
    ]
  }

  if (status) {
    where.status = status
  }

  const [instituicoes, total] = await Promise.all([
    prisma.instituicao.findMany({
      where,
      include: {
        usuario: { select: { email: true, ativo: true, criadoEm: true } },
        _count: { select: { editais: true, membrosEquipe: true } },
      },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.instituicao.count({ where }),
  ])

  return reply.status(200).send({
    instituicoes,
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  })
}

export async function buscarInstituicaoAdmin(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  try {
    const instituicao = await prisma.instituicao.findUnique({
      where: { id },
      include: {
        usuario: { select: { email: true, ativo: true, criadoEm: true } },
        editais: {
          select: { id: true, titulo: true, ativo: true, dataInicio: true, dataFim: true },
          orderBy: { criadoEm: 'desc' },
          take: 10,
        },
        _count: { select: { editais: true } },
      },
    })

    if (!instituicao) {
      throw new RecursoNaoEncontradoError('Instituição')
    }

    // Estatísticas de candidaturas (com tratamento de erro)
    let estatisticas: any[] = []
    try {
      const stats = await prisma.candidatura.groupBy({
        by: ['status'],
        where: { edital: { instituicaoId: id } },
        _count: true,
      })
      estatisticas = stats.map(e => ({ status: e.status, total: e._count }))
    } catch (e) {
      console.log('Erro ao buscar estatísticas:', e)
    }

    return reply.status(200).send({ 
      instituicao,
      estatisticas,
    })
  } catch (error: any) {
    console.error('Erro ao buscar instituição:', error)
    if (error.message?.includes('não encontrad')) {
      throw error
    }
    return reply.status(500).send({ message: 'Erro ao buscar detalhes da instituição' })
  }
}

export async function atualizarStatusInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const { status } = z.object({ status: z.string() }).parse(request.body)

  const instituicao = await prisma.instituicao.findUnique({ where: { id } })
  if (!instituicao) {
    throw new RecursoNaoEncontradoError('Instituição')
  }

  const instituicaoAtualizada = await prisma.instituicao.update({
    where: { id },
    data: { status },
  })

  // Log de atividade
  await prisma.logAtividade.create({
    data: {
      usuarioId: request.usuario.id,
      acao: 'ATUALIZAR_STATUS_INSTITUICAO',
      entidade: 'Instituicao',
      entidadeId: id,
      detalhes: { statusAnterior: instituicao.status, novoStatus: status },
      ip: request.ip,
    },
  })

  return reply.status(200).send({ instituicao: instituicaoAtualizada })
}

// ===========================================
// LOGS DE ATIVIDADE
// ===========================================

export async function listarLogs(request: FastifyRequest, reply: FastifyReply) {
  const { pagina, limite, usuarioId, acao, dataInicio, dataFim } = listarLogsSchema.parse(request.query)

  const where: any = {}

  if (usuarioId) where.usuarioId = usuarioId
  if (acao) where.acao = { contains: acao, mode: 'insensitive' }
  if (dataInicio || dataFim) {
    where.criadoEm = {}
    if (dataInicio) where.criadoEm.gte = dataInicio
    if (dataFim) where.criadoEm.lte = dataFim
  }

  const [logs, total] = await Promise.all([
    prisma.logAtividade.findMany({
      where,
      include: {
        usuario: { select: { email: true, nome: true, role: true } },
      },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.logAtividade.count({ where }),
  ])

  return reply.status(200).send({
    logs,
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  })
}

// ===========================================
// ESTATÍSTICAS GERAIS
// ===========================================

export async function estatisticasGerais(request: FastifyRequest, reply: FastifyReply) {
  const [
    totalUsuarios,
    usuariosPorRole,
    totalInstituicoes,
    totalCandidatos,
    totalEditais,
    totalCandidaturas,
    candidaturasPorStatus,
    usuariosRecentes,
    candidaturasRecentes,
  ] = await Promise.all([
    prisma.usuario.count(),
    prisma.usuario.groupBy({ by: ['role'], _count: true }),
    prisma.instituicao.count(),
    prisma.candidato.count(),
    prisma.edital.count(),
    prisma.candidatura.count(),
    prisma.candidatura.groupBy({ by: ['status'], _count: true }),
    prisma.usuario.count({
      where: { criadoEm: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.candidatura.count({
      where: { criadoEm: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
  ])

  return reply.status(200).send({
    resumo: {
      totalUsuarios,
      totalInstituicoes,
      totalCandidatos,
      totalEditais,
      totalCandidaturas,
      usuariosRecentes,
      candidaturasRecentes,
    },
    usuariosPorRole: usuariosPorRole.map(u => ({ role: u.role, total: u._count })),
    candidaturasPorStatus: candidaturasPorStatus.map(c => ({ status: c.status, total: c._count })),
  })
}
