import { FastifyInstance } from 'fastify'
import {
  listarEquipe,
  adicionarMembro,
  removerMembro,
  reativarMembro,
  atualizarMembro,
  buscarMembro,
} from '../controllers/equipe.controller'
import { verificarRole } from '../middlewares/auth'
import { ROLES_GERENCIAR_EQUIPE } from '../config/permissions'

export async function equipeRoutes(app: FastifyInstance) {
  // Todas rotas de equipe - apenas INSTITUICAO e ADMIN
  app.addHook('preHandler', verificarRole(...ROLES_GERENCIAR_EQUIPE))

  app.get('/equipe', listarEquipe)
  app.post('/equipe', adicionarMembro)
  app.get('/equipe/:id', buscarMembro)
  app.put('/equipe/:id', atualizarMembro)
  app.delete('/equipe/:id', removerMembro)
  app.post('/equipe/:id/reativar', reativarMembro)
}
