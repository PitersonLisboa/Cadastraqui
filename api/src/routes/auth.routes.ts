import { FastifyInstance } from 'fastify'
import {
  login,
  registrar,
  perfil,
  alterarSenha,
  logout,
  verificarToken,
  solicitarRecuperacaoSenha,
  validarTokenRecuperacao,
  redefinirSenha,
} from '../controllers/auth.controller'
import { verificarJWT } from '../middlewares/auth'

export async function authRoutes(app: FastifyInstance) {
  // Rotas públicas
  app.post('/auth/login', login)
  app.post('/auth/registrar', registrar)
  
  // Recuperação de senha (públicas)
  app.post('/auth/recuperar-senha', solicitarRecuperacaoSenha)
  app.get('/auth/validar-token-recuperacao', validarTokenRecuperacao)
  app.post('/auth/redefinir-senha', redefinirSenha)

  // Rotas autenticadas
  app.get('/auth/perfil', { preHandler: [verificarJWT] }, perfil)
  app.post('/auth/alterar-senha', { preHandler: [verificarJWT] }, alterarSenha)
  app.post('/auth/logout', { preHandler: [verificarJWT] }, logout)
  app.get('/auth/verificar', { preHandler: [verificarJWT] }, verificarToken)
}
