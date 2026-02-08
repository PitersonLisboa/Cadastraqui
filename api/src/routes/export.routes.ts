import { FastifyInstance } from 'fastify'
import {
  exportarCandidaturas,
  exportarEditais,
  exportarRelatorioDashboard,
} from '../controllers/export.controller.js'
import { verificarRole } from '../middlewares/auth.js'

export async function exportRoutes(app: FastifyInstance) {
  // Exportar candidaturas (PDF/Excel)
  app.get('/export/candidaturas', {
    preHandler: [verificarRole('ADMIN', 'INSTITUICAO')],
  }, exportarCandidaturas)

  // Exportar editais (Excel)
  app.get('/export/editais', {
    preHandler: [verificarRole('ADMIN', 'INSTITUICAO')],
  }, exportarEditais)

  // Exportar relatório do dashboard (PDF)
  app.get('/export/dashboard', {
    preHandler: [verificarRole('ADMIN', 'INSTITUICAO')],
  }, exportarRelatorioDashboard)
}
