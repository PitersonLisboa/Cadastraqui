import { FastifyInstance } from 'fastify'
import { dashboardAssistenteSocial, meusPareceresSociais } from '../controllers/assistente-social.controller.js'
import { verificarRole } from '../middlewares/auth.js'

export async function assistenteSocialRoutes(app: FastifyInstance) {
  app.get('/assistente-social/dashboard', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL')] 
  }, dashboardAssistenteSocial)
  
  app.get('/assistente-social/meus-pareceres', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL')] 
  }, meusPareceresSociais)
}
