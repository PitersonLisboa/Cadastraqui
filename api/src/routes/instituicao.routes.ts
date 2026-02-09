import { FastifyInstance } from 'fastify'
import {
  criarInstituicao,
  meuPerfilInstituicao,
  dashboardInstituicao,
  listarCandidaturasInstituicao,
  buscarCandidaturaInstituicao,
  listarDocumentosInstituicao,
  uploadDocumentoInstituicao,
  excluirDocumentoInstituicao,
  listarInstituicoes,
  buscarInstituicao,
  atualizarInstituicao,
  excluirInstituicao,
} from '../controllers/instituicao.controller'
import { verificarJWT, verificarRole } from '../middlewares/auth'
import {
  ROLES_VISUALIZAR_CANDIDATURAS,
  ROLES_DOCUMENTOS_INSTITUCIONAIS,
  ROLES_RELATORIOS_INSTITUICAO,
} from '../config/permissions'

export async function instituicaoRoutes(app: FastifyInstance) {
  // Rotas do gestor da instituição
  app.get('/instituicao/meu-perfil', { preHandler: [verificarRole('INSTITUICAO')] }, meuPerfilInstituicao)
  app.get('/instituicao/dashboard', { 
    preHandler: [verificarRole('INSTITUICAO', 'SUPERVISAO', 'CONTROLE')] 
  }, dashboardInstituicao)
  app.post('/instituicao', { preHandler: [verificarRole('INSTITUICAO')] }, criarInstituicao)

  // Candidaturas da instituição - ADVOGADO NÃO tem acesso
  app.get('/instituicao/candidaturas', { 
    preHandler: [verificarRole(...ROLES_VISUALIZAR_CANDIDATURAS)] 
  }, listarCandidaturasInstituicao)
  app.get('/instituicao/candidaturas/:id', { 
    preHandler: [verificarRole(...ROLES_VISUALIZAR_CANDIDATURAS)] 
  }, buscarCandidaturaInstituicao)

  // Documentos INSTITUCIONAIS (certificação CEBAS) - ADVOGADO TEM acesso aqui
  app.get('/instituicao/documentos', { 
    preHandler: [verificarRole(...ROLES_DOCUMENTOS_INSTITUCIONAIS)] 
  }, listarDocumentosInstituicao)
  app.post('/instituicao/documentos', { 
    preHandler: [verificarRole('INSTITUICAO', 'ADVOGADO')] 
  }, uploadDocumentoInstituicao)
  app.delete('/instituicao/documentos/:id', { 
    preHandler: [verificarRole('INSTITUICAO')] 
  }, excluirDocumentoInstituicao)

  // Rotas admin
  app.get('/instituicoes', { preHandler: [verificarRole('ADMIN')] }, listarInstituicoes)
  app.get('/instituicoes/:id', { preHandler: [verificarJWT] }, buscarInstituicao)
  app.put('/instituicoes/:id', { preHandler: [verificarJWT] }, atualizarInstituicao)
  app.delete('/instituicoes/:id', { preHandler: [verificarRole('ADMIN')] }, excluirInstituicao)
}
