import { FastifyInstance } from 'fastify'
import {
  listarEditaisPublicos,
  buscarEditalPublico,
  meusEditais,
  criarEdital,
  atualizarEdital,
  excluirEdital,
} from '../controllers/edital.controller'
import { verificarJWT, verificarRole } from '../middlewares/auth'
import { ROLES_GERENCIAR_EDITAIS } from '../config/permissions'

export async function editalRoutes(app: FastifyInstance) {
  // Rotas públicas (para candidatos buscarem editais)
  app.get('/editais', listarEditaisPublicos)
  app.get('/editais/:id', buscarEditalPublico)

  // Rotas da instituição - apenas INSTITUICAO e ADMIN gerenciam editais
  app.get('/instituicao/editais', { preHandler: [verificarRole('INSTITUICAO')] }, meusEditais)
  app.post('/editais', { preHandler: [verificarRole(...ROLES_GERENCIAR_EDITAIS)] }, criarEdital)
  app.put('/editais/:id', { preHandler: [verificarRole(...ROLES_GERENCIAR_EDITAIS)] }, atualizarEdital)
  app.delete('/editais/:id', { preHandler: [verificarRole(...ROLES_GERENCIAR_EDITAIS)] }, excluirEdital)
}
