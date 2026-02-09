import { FastifyInstance } from 'fastify'
import {
  emitirParecerSocial,
  emitirParecerJuridico,
  listarMeusPareceresSociais,
  listarMeusPareceresJuridicos,
} from '../controllers/parecer.controller'
import { verificarRole } from '../middlewares/auth'
import { ROLES_EMITIR_PARECER_SOCIAL } from '../config/permissions'

export async function parecerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verificarRole(...ROLES_EMITIR_PARECER_SOCIAL))

  app.get('/pareceres/sociais', listarMeusPareceresSociais)
  app.post('/pareceres/sociais', emitirParecerSocial)
  app.get('/pareceres/juridicos', listarMeusPareceresJuridicos)
  app.post('/pareceres/juridicos', emitirParecerJuridico)
}
