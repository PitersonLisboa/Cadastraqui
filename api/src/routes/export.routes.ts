import { FastifyInstance } from 'fastify'
import {
  exportarCandidaturasCSV,
  exportarCandidaturasPDF,
  exportarRelatorioGeral,
} from '../controllers/export.controller'
import { verificarRole } from '../middlewares/auth'
import { ROLES_EXPORTAR } from '../config/permissions'

export async function exportRoutes(app: FastifyInstance) {
  app.get('/export/candidaturas/csv', {
    preHandler: [verificarRole(...ROLES_EXPORTAR)],
  }, exportarCandidaturasCSV)

  app.get('/export/candidaturas/pdf', {
    preHandler: [verificarRole(...ROLES_EXPORTAR)],
  }, exportarCandidaturasPDF)

  app.get('/export/relatorio-geral', {
    preHandler: [verificarRole(...ROLES_EXPORTAR)],
  }, exportarRelatorioGeral)
}
