import { FastifyInstance } from 'fastify'
import {
  listarDocumentos,
  uploadDocumento,
  excluirDocumento,
  downloadDocumento,
  atualizarStatusDocumento,
} from '../controllers/documento.controller'
import { verificarRole } from '../middlewares/auth'
import { ROLES_DOCUMENTOS } from '../config/permissions'

export async function documentoRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verificarRole(...ROLES_DOCUMENTOS))

  app.get('/documentos', listarDocumentos)
  app.post('/documentos', uploadDocumento)
  app.get('/documentos/:id/download', downloadDocumento)
  app.put('/documentos/:id/status', atualizarStatusDocumento)
  app.delete('/documentos/:id', excluirDocumento)
}
