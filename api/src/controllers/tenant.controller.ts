import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

// ===========================================
// ENDPOINT PÚBLICO - Buscar tenant pelo slug
// ===========================================

export async function buscarTenantPorSlug(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = z.object({ slug: z.string() }).parse(request.params)

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      instituicao: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          email: true,
          telefone: true,
          cidade: true,
          uf: true,
        },
      },
    },
  })

  if (!tenant || !tenant.ativo) {
    return reply.status(404).send({
      message: 'Instituição não encontrada',
    })
  }

  return reply.status(200).send({
    tenant: {
      slug: tenant.slug,
      nome: tenant.nome,
      logoUrl: tenant.logoUrl,
      corPrimaria: tenant.corPrimaria,
      corSecundaria: tenant.corSecundaria,
      instituicaoId: tenant.instituicaoId,
      configuracoes: tenant.configuracoes,
      instituicao: tenant.instituicao,
    },
  })
}

// ===========================================
// ENDPOINT PÚBLICO - Listar tenants ativos
// ===========================================

export async function listarTenantsAtivos(request: FastifyRequest, reply: FastifyReply) {
  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: {
      slug: true,
      nome: true,
      logoUrl: true,
      corPrimaria: true,
      instituicao: {
        select: {
          cidade: true,
          uf: true,
        },
      },
    },
    orderBy: { nome: 'asc' },
  })

  return reply.status(200).send({ tenants })
}
