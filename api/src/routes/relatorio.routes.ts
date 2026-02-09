import { FastifyInstance } from 'fastify'
import {
  relatorioGeral,
  relatorioInstituicao,
  relatorioCandidaturas,
  relatorioAssistente,
  relatorioAdvogado,
} from '../controllers/relatorio.controller'
import { verificarRole } from '../middlewares/auth'
import { ROLES_RELATORIOS_INSTITUICAO } from '../config/permissions'

export async function relatorioRoutes(app: FastifyInstance) {
  // Relatório geral - apenas ADMIN
  app.get('/relatorios/geral', { 
    preHandler: [verificarRole('ADMIN')] 
  }, relatorioGeral)

  // Relatório da instituição - INSTITUICAO, SUPERVISAO, CONTROLE
  app.get('/relatorios/instituicao', { 
    preHandler: [verificarRole(...ROLES_RELATORIOS_INSTITUICAO)] 
  }, relatorioInstituicao)

  // Relatório de candidaturas - INSTITUICAO, SUPERVISAO, CONTROLE, ADMIN
  app.get('/relatorios/candidaturas', { 
    preHandler: [verificarRole(...ROLES_RELATORIOS_INSTITUICAO)] 
  }, relatorioCandidaturas)

  // Relatório do assistente social
  app.get('/relatorios/assistente', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL', 'SUPERVISAO')] 
  }, relatorioAssistente)

  // Relatório do advogado (limitado a docs institucionais)
  app.get('/relatorios/advogado', { 
    preHandler: [verificarRole('ADVOGADO', 'INSTITUICAO')] 
  }, relatorioAdvogado)
}
