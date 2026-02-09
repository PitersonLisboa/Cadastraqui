import { FastifyInstance } from 'fastify'
import {
  listarDocumentos,
  uploadDocumento,
  excluirDocumento,
  downloadDocumento,
  analisarDocumento,
} from '../controllers/documento.controller'
import { verificarRole, verificarJWT } from '../middlewares/auth'
import { ROLES_DOCUMENTOS_CANDIDATOS } from '../config/permissions'

export async function documentoRoutes(app: FastifyInstance) {
  // Rotas do candidato
  app.get('/documentos', { preHandler: [verificarRole('CANDIDATO')] }, listarDocumentos)
  app.post('/documentos/upload', { preHandler: [verificarRole('CANDIDATO')] }, uploadDocumento)
  app.delete('/documentos/:id', { preHandler: [verificarRole('CANDIDATO')] }, excluirDocumento)

  // Download - qualquer autenticado pode baixar (o controller valida permissão)
  app.get('/documentos/:id/download', { preHandler: [verificarJWT] }, downloadDocumento)

  // Analisar documentos de candidatos - ADVOGADO NÃO pode (apenas docs institucionais)
  app.put('/documentos/:id/analisar', { 
    preHandler: [verificarRole(...ROLES_DOCUMENTOS_CANDIDATOS)] 
  }, analisarDocumento)
}
