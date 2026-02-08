import { FastifyInstance } from 'fastify'
import {
  listarEquipe,
  adicionarAssistente,
  adicionarAdvogado,
  atualizarMembro,
  desativarMembro,
  reativarMembro,
} from '../controllers/equipe.controller.js'
import { verificarRole } from '../middlewares/auth.js'

export async function equipeRoutes(app: FastifyInstance) {
  // Todas as rotas requerem role INSTITUICAO
  app.addHook('preHandler', verificarRole('INSTITUICAO'))

  app.get('/equipe', listarEquipe)
  app.post('/equipe/assistente', adicionarAssistente)
  app.post('/equipe/advogado', adicionarAdvogado)
  app.put('/equipe/:tipo/:id', atualizarMembro)
  app.post('/equipe/:tipo/:id/desativar', desativarMembro)
  app.post('/equipe/:tipo/:id/reativar', reativarMembro)
}
