import { FastifyInstance } from 'fastify'
import {
  obterPerfil,
  atualizarPerfilCandidato,
  atualizarPerfilInstituicao,
  alterarSenha,
  alterarEmail,
  desativarConta,
} from '../controllers/perfil.controller.js'
import { verificarJWT, verificarRole } from '../middlewares/auth.js'

export async function perfilRoutes(app: FastifyInstance) {
  // Todas as rotas requerem autenticação
  app.addHook('preHandler', verificarJWT)

  // Rotas gerais
  app.get('/perfil', obterPerfil)
  app.put('/perfil/senha', alterarSenha)
  app.put('/perfil/email', alterarEmail)
  app.post('/perfil/desativar', desativarConta)

  // Rotas específicas por role
  app.put('/perfil/candidato', { preHandler: [verificarRole('CANDIDATO')] }, atualizarPerfilCandidato)
  app.put('/perfil/instituicao', { preHandler: [verificarRole('INSTITUICAO')] }, atualizarPerfilInstituicao)
}
