import { FastifyInstance } from 'fastify'
import { buscarTenantPorSlug, listarTenantsAtivos } from '../controllers/tenant.controller'

export async function tenantRoutes(app: FastifyInstance) {
  // Públicas - sem autenticação
  app.get('/tenant/:slug', buscarTenantPorSlug)
  app.get('/tenants', listarTenantsAtivos)
}
