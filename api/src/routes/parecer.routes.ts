import { FastifyInstance } from 'fastify'
import {
  emitirParecerSocial,
  emitirParecerJuridico,
  listarMeusPareceresSociais,
  listarMeusPareceresJuridicos,
} from '../controllers/parecer.controller'
import { verificarRole } from '../middlewares/auth'

export async function parecerRoutes(app: FastifyInstance) {
  // Rotas do Assistente Social
  app.post('/pareceres/social/:candidaturaId', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL')] 
  }, emitirParecerSocial)
  
  app.get('/pareceres/social/meus', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL')] 
  }, listarMeusPareceresSociais)

  // Rotas do Advogado
  app.post('/pareceres/juridico/:candidaturaId', { 
    preHandler: [verificarRole('ADVOGADO')] 
  }, emitirParecerJuridico)
  
  app.get('/pareceres/juridico/meus', { 
    preHandler: [verificarRole('ADVOGADO')] 
  }, listarMeusPareceresJuridicos)
}
