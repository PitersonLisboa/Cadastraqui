import { FastifyInstance } from 'fastify'
import {
  emitirParecerSocial,
  emitirParecerJuridico,
  listarMeusPareceresSociais,
  listarMeusPareceresJuridicos,
} from '../controllers/parecer.controller'
import { verificarRole } from '../middlewares/auth'
import { ROLES_PARECERES } from '../config/permissions'

export async function parecerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verificarRole(...ROLES_PARECERES))

  app.get('/pareceres/sociais', listarMeusPareceresSociais)
  app.post('/pareceres/sociais', emitirParecerSocial)
  app.get('/pareceres/juridicos', listarMeusPareceresJuridicos)
  app.post('/pareceres/juridicos', emitirParecerJuridico)
}
