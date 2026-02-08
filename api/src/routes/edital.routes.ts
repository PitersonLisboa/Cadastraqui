import { FastifyInstance } from 'fastify'
import {
  listarEditais,
  listarEditaisDisponiveis,
  buscarEdital,
  buscarEditalPublico,
  criarEdital,
  atualizarEdital,
  excluirEdital,
  meusEditais,
} from '../controllers/edital.controller'
import { verificarJWT, verificarRole } from '../middlewares/auth'

export async function editalRoutes(app: FastifyInstance) {
  // Rotas públicas (para candidatos verem editais disponíveis)
  app.get('/editais', listarEditais)
  app.get('/editais/disponiveis', listarEditaisDisponiveis)
  app.get('/editais/:id', buscarEdital)
  app.get('/editais/:id/publico', buscarEditalPublico)
  
  // Rotas da instituição
  app.get('/instituicao/editais', { preHandler: [verificarRole('INSTITUICAO')] }, meusEditais)
  app.post('/editais', { preHandler: [verificarRole('INSTITUICAO')] }, criarEdital)
  app.put('/editais/:id', { preHandler: [verificarRole('INSTITUICAO', 'ADMIN')] }, atualizarEdital)
  app.delete('/editais/:id', { preHandler: [verificarRole('INSTITUICAO', 'ADMIN')] }, excluirEdital)
}
