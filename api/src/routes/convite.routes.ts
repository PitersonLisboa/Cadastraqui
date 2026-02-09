import { FastifyInstance } from 'fastify'
import {
  criarConvite,
  listarConvites,
  revogarConvite,
  validarConvite,
} from '../controllers/convite.controller'
import { verificarRole } from '../middlewares/auth'
import { ROLES_GERENCIAR_EQUIPE } from '../config/permissions'

export async function conviteRoutes(app: FastifyInstance) {
  // Rota pública para validar convite (usada na tela de registro)
  app.get('/convites/validar', validarConvite)

  // Rotas para gerenciar convites - apenas INSTITUICAO e ADMIN
  app.post('/convites', { preHandler: [verificarRole(...ROLES_GERENCIAR_EQUIPE)] }, criarConvite)
  app.get('/convites', { preHandler: [verificarRole(...ROLES_GERENCIAR_EQUIPE)] }, listarConvites)
  app.delete('/convites/:id', { preHandler: [verificarRole(...ROLES_GERENCIAR_EQUIPE)] }, revogarConvite)
}
