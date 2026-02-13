import { FastifyInstance } from 'fastify'
import {
  buscarTenantPorSlug,
  listarTenantsAtivos,
  uploadLogoTenant,
  removerLogoTenant,
  atualizarTenant,
} from '../controllers/tenant.controller'
import { verificarRole } from '../middlewares/auth'

export async function tenantRoutes(app: FastifyInstance) {
  // ===== PÚBLICAS (sem auth) =====
  app.get('/tenant/:slug', buscarTenantPorSlug)
  app.get('/tenants', listarTenantsAtivos)

  // ===== AUTENTICADAS =====
  // Upload de logo da instituição (multipart)
  app.patch('/tenant/:slug/logo', {
    preHandler: [verificarRole('ADMIN', 'INSTITUICAO')],
  }, uploadLogoTenant)

  // Remover logo
  app.delete('/tenant/:slug/logo', {
    preHandler: [verificarRole('ADMIN', 'INSTITUICAO')],
  }, removerLogoTenant)

  // Atualizar configuração visual (cores, nome, configurações)
  app.put('/tenant/:slug', {
    preHandler: [verificarRole('ADMIN', 'INSTITUICAO')],
  }, atualizarTenant)
}
