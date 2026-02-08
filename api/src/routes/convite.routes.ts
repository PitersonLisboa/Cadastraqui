import { FastifyInstance } from 'fastify'
import {
  criarConvite,
  listarConvites,
  revogarConvite,
  validarConvite,
} from '../controllers/convite.controller.js'
import { verificarRole } from '../middlewares/auth.js'

export async function conviteRoutes(app: FastifyInstance) {
  // Rota pública para validar convite (usada na tela de registro)
  app.get('/convites/validar', validarConvite)

  // Rotas da instituição
  app.post('/convites', { preHandler: [verificarRole('INSTITUICAO')] }, criarConvite)
  app.get('/convites', { preHandler: [verificarRole('INSTITUICAO')] }, listarConvites)
  app.delete('/convites/:id', { preHandler: [verificarRole('INSTITUICAO')] }, revogarConvite)
}
