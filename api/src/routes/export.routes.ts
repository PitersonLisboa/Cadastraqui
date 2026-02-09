import { FastifyInstance } from 'fastify'
import {
  exportarCandidaturas,
  exportarEditais,
  exportarRelatorioDashboard,
} from '../controllers/export.controller'
import { verificarRole } from '../middlewares/auth'

export async function exportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verificarRole('INSTITUICAO', 'ADMIN', 'SUPERVISAO', 'CONTROLE'))

  app.get('/export/candidaturas', exportarCandidaturas)
  app.get('/export/editais', exportarEditais)
  app.get('/export/relatorio', exportarRelatorioDashboard)
}
