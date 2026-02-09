import { FastifyInstance } from 'fastify'
import {
  criarCandidato,
  meuPerfil,
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
  app.post('/candidato', { preHandler: [verificarRole('CANDIDATO')] }, criarCandidato)

  // Rotas administrativas - ADVOGADO não tem acesso a dados de candidatos
  app.get('/candidatos', { preHandler: [verificarRole(...ROLES_VISUALIZAR_CANDIDATURAS)] }, listarCandidatos)
  app.get('/candidatos/:id', { preHandler: [verificarJWT] }, buscarCandidato)
  app.put('/candidatos/:id', { preHandler: [verificarJWT] }, atualizarCandidato)
  app.delete('/candidatos/:id', { preHandler: [verificarRole('ADMIN')] }, excluirCandidato)
}
