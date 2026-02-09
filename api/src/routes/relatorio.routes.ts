import { FastifyInstance } from 'fastify'
import {
  dashboardAdmin,
  dashboardInstituicao,
  relatorioCandidaturas,
  estatisticasAssistente,
  estatisticasAdvogado,
} from '../controllers/relatorio.controller'
import { verificarRole } from '../middlewares/auth'

export async function relatorioRoutes(app: FastifyInstance) {
  app.get('/relatorios/admin', { preHandler: verificarRole('ADMIN') }, dashboardAdmin)
  app.get('/relatorios/instituicao', { preHandler: verificarRole('INSTITUICAO', 'SUPERVISAO', 'CONTROLE') }, dashboardInstituicao)
  app.get('/relatorios/candidaturas', { preHandler: verificarRole('INSTITUICAO', 'ADMIN', 'SUPERVISAO', 'CONTROLE') }, relatorioCandidaturas)
  app.get('/relatorios/assistente', { preHandler: verificarRole('ASSISTENTE_SOCIAL', 'SUPERVISAO') }, estatisticasAssistente)
  app.get('/relatorios/advogado', { preHandler: verificarRole('ADVOGADO', 'SUPERVISAO') }, estatisticasAdvogado)
}
