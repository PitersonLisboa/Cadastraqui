import { FastifyInstance } from 'fastify'
import {
  emitirParecerSocial,
  listarPareceresSociais,
  emitirParecerJuridico,
  listarPareceresJuridicos,
} from '../controllers/parecer.controller'
import { verificarRole } from '../middlewares/auth'
import { ROLES_EMITIR_PARECER_SOCIAL } from '../config/permissions'

export async function parecerRoutes(app: FastifyInstance) {
  // Parecer Social - apenas ASSISTENTE_SOCIAL pode emitir (deferir/indeferir)
  // SUPERVISAO pode visualizar mas NÃO emitir
  app.post('/pareceres/social', { 
    preHandler: [verificarRole(...ROLES_EMITIR_PARECER_SOCIAL)] 
  }, emitirParecerSocial)
  
  app.get('/pareceres/social', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL', 'SUPERVISAO', 'ADMIN')] 
  }, listarPareceresSociais)

  // Parecer Jurídico - ADVOGADO (para documentos de certificação institucional)
  app.post('/pareceres/juridico', { 
    preHandler: [verificarRole('ADVOGADO')] 
  }, emitirParecerJuridico)
  
  app.get('/pareceres/juridico', { 
    preHandler: [verificarRole('ADVOGADO', 'INSTITUICAO', 'ADMIN')] 
  }, listarPareceresJuridicos)
}
