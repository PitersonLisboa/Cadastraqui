import { FastifyInstance } from 'fastify'
import {
  dashboardPainel,
  listarInstituicoesPainel,
  detalhesInstituicaoPainel,
  alterarContaPainel,
} from '../controllers/painel.controller'
import {
  uploadLogoTenant,
  removerLogoTenant,
  atualizarTenant,
} from '../controllers/tenant.controller'
import { verificarRole } from '../middlewares/auth'

export async function painelRoutes(app: FastifyInstance) {
  // Todas as rotas requerem INSTITUICAO ou ADMIN
  const auth = { preHandler: [verificarRole('INSTITUICAO', 'ADMIN')] }

  // Dashboard panorâmica
  app.get('/painel/dashboard', auth, dashboardPainel)

  // CRUD de instituições (visão panorâmica)
  app.get('/painel/instituicoes', auth, listarInstituicoesPainel)
  app.get('/painel/instituicoes/:id', auth, detalhesInstituicaoPainel)

  // Gestão visual do tenant (logo + cores)
  app.patch('/painel/tenant/:slug/logo', auth, uploadLogoTenant)
  app.delete('/painel/tenant/:slug/logo', auth, removerLogoTenant)
  app.put('/painel/tenant/:slug', auth, atualizarTenant)

  // Minha conta (alterar email/senha da equipe)
  app.put('/painel/minha-conta', auth, alterarContaPainel)
}
