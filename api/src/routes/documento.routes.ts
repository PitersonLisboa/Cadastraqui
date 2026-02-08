import { FastifyInstance } from 'fastify'
import {
  listarDocumentos,
  uploadDocumento,
  excluirDocumento,
  downloadDocumento,
  atualizarStatusDocumento,
} from '../controllers/documento.controller.js'
import { verificarRole, verificarJWT } from '../middlewares/auth.js'

export async function documentoRoutes(app: FastifyInstance) {
  // Rotas do candidato
  app.get('/documentos', { preHandler: [verificarRole('CANDIDATO')] }, listarDocumentos)
  app.post('/documentos/upload', { preHandler: [verificarRole('CANDIDATO')] }, uploadDocumento)
  app.delete('/documentos/:id', { preHandler: [verificarRole('CANDIDATO')] }, excluirDocumento)
  
  // Download (qualquer usuário autenticado com permissão)
  app.get('/documentos/:id/download', { preHandler: [verificarJWT] }, downloadDocumento)
  
  // Atualizar status (analistas e admin)
  app.put('/documentos/:id/status', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL', 'ADVOGADO', 'INSTITUICAO', 'ADMIN')] 
  }, atualizarStatusDocumento)
}
