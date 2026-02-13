import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { UPLOADS_DIR } from '../config/upload'
import { NaoAutorizadoError } from '../errors/index'
import path from 'path'
import fs from 'fs'
import { pipeline } from 'stream/promises'

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

// ===========================================
// UPLOAD LOGO DO TENANT (multipart)
// PATCH /tenant/:slug/logo
// ===========================================

export async function uploadLogoTenant(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = z.object({ slug: z.string() }).parse(request.params)

  const tenant = await prisma.tenant.findUnique({ where: { slug } })

  if (!tenant) {
    return reply.status(404).send({ message: 'Tenant não encontrado' })
  }

  // Permissão: ADMIN ou INSTITUICAO vinculada
  const { role, instituicaoId } = request.usuario
  if (role !== 'ADMIN' && instituicaoId !== tenant.instituicaoId) {
    throw new NaoAutorizadoError('Sem permissão para alterar o logo desta instituição')
  }

  const data = await request.file()

  if (!data) {
    return reply.status(400).send({ message: 'Nenhum arquivo enviado' })
  }

  const { file, filename, mimetype } = data

  // Apenas imagens
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowedMimes.includes(mimetype)) {
    return reply.status(400).send({
      message: 'Tipo não permitido. Use JPG, PNG, WebP ou SVG.',
    })
  }

  // Criar subdiretório logos
  const logosDir = path.join(UPLOADS_DIR, 'logos')
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true })
  }

  // Remover logo anterior
  if (tenant.logoUrl) {
    const oldPath = path.join(process.cwd(), tenant.logoUrl.replace(/^\//, ''))
    if (fs.existsSync(oldPath)) {
      try { fs.unlinkSync(oldPath) } catch { /* ignora */ }
    }
  }

  // Salvar novo
  const ext = path.extname(filename) || '.png'
  const nomeArquivo = `logo-${slug}-${Date.now()}${ext}`
  const caminhoArquivo = path.join(logosDir, nomeArquivo)

  await pipeline(file, fs.createWriteStream(caminhoArquivo))

  const logoUrl = `/uploads/logos/${nomeArquivo}`

  const tenantAtualizado = await prisma.tenant.update({
    where: { slug },
    data: { logoUrl },
  })

  return reply.status(200).send({
    message: 'Logo atualizado com sucesso',
    logoUrl: tenantAtualizado.logoUrl,
  })
}

// ===========================================
// REMOVER LOGO DO TENANT
// DELETE /tenant/:slug/logo
// ===========================================

export async function removerLogoTenant(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = z.object({ slug: z.string() }).parse(request.params)

  const tenant = await prisma.tenant.findUnique({ where: { slug } })

  if (!tenant) {
    return reply.status(404).send({ message: 'Tenant não encontrado' })
  }

  const { role, instituicaoId } = request.usuario
  if (role !== 'ADMIN' && instituicaoId !== tenant.instituicaoId) {
    throw new NaoAutorizadoError('Sem permissão')
  }

  // Remover arquivo físico
  if (tenant.logoUrl) {
    const filePath = path.join(process.cwd(), tenant.logoUrl.replace(/^\//, ''))
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath) } catch { /* ignora */ }
    }
  }

  await prisma.tenant.update({
    where: { slug },
    data: { logoUrl: null },
  })

  return reply.status(200).send({ message: 'Logo removido com sucesso' })
}

// ===========================================
// ATUALIZAR CONFIGURAÇÃO VISUAL DO TENANT
// PUT /tenant/:slug
// ===========================================

const atualizarTenantSchema = z.object({
  nome: z.string().min(2).optional(),
  corPrimaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida').optional(),
  corSecundaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida').optional(),
  configuracoes: z.record(z.any()).optional(),
})

export async function atualizarTenant(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = z.object({ slug: z.string() }).parse(request.params)
  const dados = atualizarTenantSchema.parse(request.body)

  const tenant = await prisma.tenant.findUnique({ where: { slug } })

  if (!tenant) {
    return reply.status(404).send({ message: 'Tenant não encontrado' })
  }

  const { role, instituicaoId } = request.usuario
  if (role !== 'ADMIN' && instituicaoId !== tenant.instituicaoId) {
    throw new NaoAutorizadoError('Sem permissão')
  }

  const tenantAtualizado = await prisma.tenant.update({
    where: { slug },
    data: dados,
    include: {
      instituicao: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
        },
      },
    },
  })

  return reply.status(200).send({
    message: 'Tenant atualizado com sucesso',
    tenant: tenantAtualizado,
  })
}
