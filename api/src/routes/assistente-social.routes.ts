import { FastifyInstance } from 'fastify'
import { dashboardAssistenteSocial, meusPareceresSociais } from '../controllers/assistente-social.controller'
import { verificarRole } from '../middlewares/auth'

export async function assistenteSocialRoutes(app: FastifyInstance) {
  app.get('/assistente-social/dashboard', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL')] 
  }, dashboardAssistenteSocial)
  
  app.get('/assistente-social/meus-pareceres', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL')] 
  }, meusPareceresSociais)
}
