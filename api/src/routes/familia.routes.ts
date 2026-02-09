import { FastifyInstance } from 'fastify'
import {
  listarMembros,
  adicionarMembro,
  buscarMembro,
  atualizarMembro,
  excluirMembro,
  composicaoFamiliar,
} from '../controllers/familia.controller'
import { verificarRole } from '../middlewares/auth'

export async function familiaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verificarRole('CANDIDATO', 'ASSISTENTE_SOCIAL', 'ADMIN', 'SUPERVISAO', 'OPERACIONAL'))

  app.get('/familia', listarMembros)
  app.post('/familia', adicionarMembro)
  app.get('/familia/composicao', composicaoFamiliar)
  app.get('/familia/:id', buscarMembro)
  app.put('/familia/:id', atualizarMembro)
  app.delete('/familia/:id', excluirMembro)
}
