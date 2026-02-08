import { FastifyInstance } from 'fastify'
import {
  listarInstituicoes,
  buscarInstituicao,
  criarInstituicao,
  atualizarInstituicao,
  excluirInstituicao,
  meuPerfilInstituicao,
  dashboardInstituicao,
  listarCandidaturasInstituicao,
  buscarCandidaturaInstituicao,
  listarDocumentosInstituicao,
  uploadDocumentoInstituicao,
  excluirDocumentoInstituicao,
} from '../controllers/instituicao.controller.js'
import { verificarJWT, verificarRole } from '../middlewares/auth.js'

export async function instituicaoRoutes(app: FastifyInstance) {
  // Rotas para a própria instituição
  app.get('/instituicao/meu-perfil', { preHandler: [verificarRole('INSTITUICAO')] }, meuPerfilInstituicao)
  app.get('/instituicao/dashboard', { preHandler: [verificarRole('INSTITUICAO')] }, dashboardInstituicao)
  app.post('/instituicao', { preHandler: [verificarRole('INSTITUICAO')] }, criarInstituicao)
  
  // Candidaturas da instituição
  app.get('/instituicao/candidaturas', { preHandler: [verificarRole('INSTITUICAO')] }, listarCandidaturasInstituicao)
  app.get('/instituicao/candidaturas/:id', { preHandler: [verificarRole('INSTITUICAO')] }, buscarCandidaturaInstituicao)
  
  // Documentos da instituição
  app.get('/instituicao/documentos', { preHandler: [verificarRole('INSTITUICAO')] }, listarDocumentosInstituicao)
  app.post('/instituicao/documentos', { preHandler: [verificarRole('INSTITUICAO')] }, uploadDocumentoInstituicao)
  app.delete('/instituicao/documentos/:id', { preHandler: [verificarRole('INSTITUICAO')] }, excluirDocumentoInstituicao)
  
  // Rotas administrativas
  app.get('/instituicoes', { preHandler: [verificarRole('ADMIN')] }, listarInstituicoes)
  app.get('/instituicoes/:id', { preHandler: [verificarJWT] }, buscarInstituicao)
  app.put('/instituicoes/:id', { preHandler: [verificarJWT] }, atualizarInstituicao)
  app.delete('/instituicoes/:id', { preHandler: [verificarRole('ADMIN')] }, excluirInstituicao)
}
