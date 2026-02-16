import { FastifyInstance } from 'fastify'
import { verificarJWT } from '../middlewares/auth'
import {
  listarDocumentosMembro,
  uploadDocumentoMembro,
  downloadDocumentoMembro,
  excluirDocumentoMembro,
} from '../controllers/documento-membro.controller'

export async function documentoMembroRoutes(app: FastifyInstance) {
  // Todas as rotas requerem autenticação
  app.addHook('onRequest', verificarJWT)

  // GET /familia/membros/:membroId/documentos
  app.get('/familia/membros/:membroId/documentos', listarDocumentosMembro)

  // POST /familia/membros/:membroId/documentos
  app.post('/familia/membros/:membroId/documentos', uploadDocumentoMembro)

  // GET /familia/membros/:membroId/documentos/:docId/download
  app.get('/familia/membros/:membroId/documentos/:docId/download', downloadDocumentoMembro)

  // DELETE /familia/membros/:membroId/documentos/:docId
  app.delete('/familia/membros/:membroId/documentos/:docId', excluirDocumentoMembro)
}
