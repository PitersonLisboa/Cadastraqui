import { FastifyInstance } from 'fastify'
import { dashboardAdvogado, meusPareceresJuridicos } from '../controllers/advogado.controller'
import { verificarRole } from '../middlewares/auth'

export async function advogadoRoutes(app: FastifyInstance) {
  app.get('/advogado/dashboard', { 
    preHandler: [verificarRole('ADVOGADO')] 
  }, dashboardAdvogado)
  
  app.get('/advogado/meus-pareceres', { 
    preHandler: [verificarRole('ADVOGADO')] 
  }, meusPareceresJuridicos)
}
