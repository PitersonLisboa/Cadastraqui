import { FastifyInstance } from 'fastify'
import {
  criarCandidato,
  meuPerfil,
  meusDados,
  atualizarMeusDados,
  listarCandidatos,
  buscarCandidato,
  atualizarCandidato,
  excluirCandidato,
} from '../controllers/candidato.controller'
import { verificarJWT, verificarRole } from '../middlewares/auth'
import { ROLES_VISUALIZAR_CANDIDATURAS } from '../config/permissions'

export async function candidatoRoutes(app: FastifyInstance) {
  // Rotas do próprio candidato
  app.get('/candidato/meu-perfil', { preHandler: [verificarRole('CANDIDATO')] }, meuPerfil)
  app.get('/candidatos/me', { preHandler: [verificarRole('CANDIDATO')] }, meusDados)
  app.put('/candidatos/me', { preHandler: [verificarRole('CANDIDATO')] }, atualizarMeusDados)
  app.post('/candidato', { preHandler: [verificarRole('CANDIDATO')] }, criarCandidato)

  // Rotas administrativas - ADVOGADO não tem acesso a dados de candidatos
  app.get('/candidatos', { preHandler: [verificarRole(...ROLES_VISUALIZAR_CANDIDATURAS)] }, listarCandidatos)
  app.get('/candidatos/:id', { preHandler: [verificarJWT] }, buscarCandidato)
  app.put('/candidatos/:id', { preHandler: [verificarJWT] }, atualizarCandidato)
  app.delete('/candidatos/:id', { preHandler: [verificarRole('ADMIN')] }, excluirCandidato)
}
