import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { NaoAutorizadoError } from '../errors/index'
import { UF } from '@prisma/client'

// ===========================================
// HELPER: Verificar se é equipe Cadastraqui
// (role INSTITUICAO sem instituicaoId = gestor do portfólio)
// ===========================================

function verificarEquipeCadastraqui(request: FastifyRequest) {
  const { role, instituicaoId } = request.usuario
  // Equipe Cadastraqui: role INSTITUICAO sem vínculo a instituição
  // OU role ADMIN
  if (role === 'ADMIN') return true
  if (role === 'INSTITUICAO' && !instituicaoId) return true
  throw new NaoAutorizadoError('Acesso restrito à equipe Cadastraqui')
}

// ===========================================
// DASHBOARD PANORÂMICA
// GET /painel/dashboard
// ===========================================

export async function dashboardPainel(request: FastifyRequest, reply: FastifyReply) {
  verificarEquipeCadastraqui(request)

  // Contadores gerais
  const [
    totalInstituicoes,
    totalTenants,
    totalCandidatos,
    totalCandidaturas,
    totalEditais,
    totalUsuarios,
  ] = await Promise.all([
    prisma.instituicao.count(),
    prisma.tenant.count({ where: { ativo: true } }),
    prisma.candidato.count(),
    prisma.candidatura.count(),
    prisma.edital.count(),
    prisma.usuario.count(),
  ])

  // Candidaturas por status
  const candidaturasPorStatus = await prisma.candidatura.groupBy({
    by: ['status'],
    _count: { id: true },
  })

  // Dados por instituição
  const instituicoes = await prisma.instituicao.findMany({
    select: {
      id: true,
      razaoSocial: true,
      nomeFantasia: true,
      cidade: true,
      uf: true,
      status: true,
      criadoEm: true,
      tenant: {
        select: {
          slug: true,
          nome: true,
          logoUrl: true,
          corPrimaria: true,
          ativo: true,
        },
      },
      _count: {
        select: {
          candidatos: true,
          editais: true,

          usuarios: true,
        },
      },
    },
    orderBy: { criadoEm: 'desc' },
  })

  return reply.status(200).send({
    resumo: {
      totalInstituicoes,
      totalTenants,
      totalCandidatos,
      totalCandidaturas,
      totalEditais,
      totalUsuarios,
    },
    candidaturasPorStatus: candidaturasPorStatus.map((c) => ({
      status: c.status,
      total: c._count.id,
    })),
    instituicoes,
  })
}

// ===========================================
// LISTAR INSTITUIÇÕES (detalhado)
// GET /painel/instituicoes
// ===========================================

export async function listarInstituicoesPainel(request: FastifyRequest, reply: FastifyReply) {
  verificarEquipeCadastraqui(request)

  const { busca } = z.object({
    busca: z.string().optional(),
  }).parse(request.query)

  const where = busca
    ? {
        OR: [
          { razaoSocial: { contains: busca, mode: 'insensitive' as const } },
          { nomeFantasia: { contains: busca, mode: 'insensitive' as const } },
          { cnpj: { contains: busca } },
        ],
      }
    : {}

  const instituicoes = await prisma.instituicao.findMany({
    where,
    include: {
      tenant: true,
      _count: {
        select: {
          candidatos: true,
          editais: true,

          usuarios: true,
        },
      },
    },
    orderBy: { criadoEm: 'desc' },
  })

  return reply.status(200).send({ instituicoes })
}

// ===========================================
// DETALHES DE UMA INSTITUIÇÃO
// GET /painel/instituicoes/:id
// ===========================================

export async function detalhesInstituicaoPainel(request: FastifyRequest, reply: FastifyReply) {
  verificarEquipeCadastraqui(request)

  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const instituicao = await prisma.instituicao.findUnique({
    where: { id },
    include: {
      tenant: true,
      editais: {
        orderBy: { criadoEm: 'desc' },
        take: 10,
      },
      _count: {
        select: {
          candidatos: true,
          editais: true,

          usuarios: true,
          assistentesSociais: true,
          advogados: true,
        },
      },
    },
  })

  if (!instituicao) {
    return reply.status(404).send({ message: 'Instituição não encontrada' })
  }

  // Candidaturas por status desta instituição
  const candidaturasPorStatus = await prisma.candidatura.groupBy({
    by: ['status'],
    where: {
      edital: { instituicaoId: id },
    },
    _count: { id: true },
  })

  return reply.status(200).send({
    instituicao,
    candidaturasPorStatus: candidaturasPorStatus.map((c) => ({
      status: c.status,
      total: c._count.id,
    })),
  })
}

// ===========================================
// ALTERAR CREDENCIAIS DA EQUIPE
// PUT /painel/minha-conta
// ===========================================

export async function alterarContaPainel(request: FastifyRequest, reply: FastifyReply) {
  verificarEquipeCadastraqui(request)

  const schema = z.object({
    email: z.string().email().optional(),
    senhaAtual: z.string().optional(),
    novaSenha: z.string().min(6).optional(),
  }).refine(
    (data) => {
      if (data.novaSenha && !data.senhaAtual) return false
      return true
    },
    { message: 'Senha atual é obrigatória para alterar a senha', path: ['senhaAtual'] }
  )

  const dados = schema.parse(request.body)

  const usuario = await prisma.usuario.findUnique({
    where: { id: request.usuario.id },
  })

  if (!usuario) {
    return reply.status(404).send({ message: 'Usuário não encontrado' })
  }

  const updateData: any = {}

  // Alterar email
  if (dados.email && dados.email !== usuario.email) {
    const exists = await prisma.usuario.findUnique({ where: { email: dados.email } })
    if (exists) {
      return reply.status(400).send({ message: 'Este email já está em uso' })
    }
    updateData.email = dados.email
  }

  // Alterar senha
  if (dados.novaSenha && dados.senhaAtual) {
    const senhaCorreta = await bcrypt.compare(dados.senhaAtual, usuario.senha)
    if (!senhaCorreta) {
      return reply.status(400).send({ message: 'Senha atual incorreta' })
    }
    updateData.senha = await bcrypt.hash(dados.novaSenha, 10)
  }

  if (Object.keys(updateData).length === 0) {
    return reply.status(400).send({ message: 'Nenhum dado para atualizar' })
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: updateData,
  })

  return reply.status(200).send({ message: 'Conta atualizada com sucesso' })
}

// ===========================================
// EDITAR DADOS DA INSTITUIÇÃO
// PUT /painel/instituicoes/:id
// ===========================================

const editarInstituicaoSchema = z.object({
  razaoSocial: z.string().min(3).optional(),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.nativeEnum(UF).optional(),
  codigoMEC: z.string().optional(),
  tipoInstituicao: z.string().optional(),
  status: z.string().optional(),
})

export async function editarInstituicaoPainel(request: FastifyRequest, reply: FastifyReply) {
  verificarEquipeCadastraqui(request)

  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const dados = editarInstituicaoSchema.parse(request.body)

  const instituicao = await prisma.instituicao.findUnique({ where: { id } })

  if (!instituicao) {
    return reply.status(404).send({ message: 'Instituição não encontrada' })
  }

  const atualizada = await prisma.instituicao.update({
    where: { id },
    data: dados,
    include: {
      tenant: { select: { slug: true, nome: true, logoUrl: true } },
    },
  })

  return reply.status(200).send({
    message: 'Instituição atualizada com sucesso',
    instituicao: atualizada,
  })
}
