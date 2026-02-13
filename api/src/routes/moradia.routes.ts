import { FastifyInstance } from 'fastify'
import { buscarMoradia, salvarMoradia } from '../controllers/moradia.controller'
import { verificarRole } from '../middlewares/auth'

export async function moradiaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verificarRole('CANDIDATO', 'ASSISTENTE_SOCIAL', 'ADMIN', 'SUPERVISAO', 'OPERACIONAL'))

  app.get('/moradia', buscarMoradia)
  app.put('/moradia', salvarMoradia)
}
