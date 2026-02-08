import { FastifyInstance } from 'fastify'
import {
  listarCandidatos,
  buscarCandidato,
  criarCandidato,
  atualizarCandidato,
  excluirCandidato,
  meuPerfil,
} from '../controllers/candidato.controller'
import { verificarJWT, verificarRole } from '../middlewares/auth'

export async function candidatoRoutes(app: FastifyInstance) {
  // Rotas para o próprio candidato
  app.get('/candidato/meu-perfil', { preHandler: [verificarRole('CANDIDATO')] }, meuPerfil)
  app.post('/candidato', { preHandler: [verificarRole('CANDIDATO')] }, criarCandidato)
  
  // Rotas para admin e instituição
  app.get('/candidatos', { preHandler: [verificarRole('ADMIN', 'INSTITUICAO', 'ASSISTENTE_SOCIAL')] }, listarCandidatos)
  app.get('/candidatos/:id', { preHandler: [verificarJWT] }, buscarCandidato)
  app.put('/candidatos/:id', { preHandler: [verificarJWT] }, atualizarCandidato)
  app.delete('/candidatos/:id', { preHandler: [verificarRole('ADMIN')] }, excluirCandidato)
}
