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
  // Dashboard Admin
  app.get('/relatorios/dashboard/admin', { 
    preHandler: [verificarRole('ADMIN')] 
  }, dashboardAdmin)

  // Dashboard Instituição
  app.get('/relatorios/dashboard/instituicao', { 
    preHandler: [verificarRole('INSTITUICAO')] 
  }, dashboardInstituicao)

  // Relatório de Candidaturas
  app.get('/relatorios/candidaturas', { 
    preHandler: [verificarRole('ADMIN', 'INSTITUICAO')] 
  }, relatorioCandidaturas)

  // Estatísticas Assistente Social
  app.get('/relatorios/estatisticas/assistente', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL')] 
  }, estatisticasAssistente)

  // Estatísticas Advogado
  app.get('/relatorios/estatisticas/advogado', { 
    preHandler: [verificarRole('ADVOGADO')] 
  }, estatisticasAdvogado)
}
