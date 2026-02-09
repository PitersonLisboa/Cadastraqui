import { FastifyInstance } from 'fastify'
import {
  listarEditais,
  buscarEdital,
  criarEdital,
  atualizarEdital,
  excluirEdital,
  meusEditais,
  listarEditaisDisponiveis,
  buscarEditalPublico,
} from '../controllers/edital.controller'
import { verificarRole } from '../middlewares/auth'
import { ROLES_EDITAIS } from '../config/permissions'

export async function editalRoutes(app: FastifyInstance) {
  // Rotas públicas
  app.get('/editais/disponiveis', listarEditaisDisponiveis)
  app.get('/editais/publico/:id', buscarEditalPublico)

  // Rotas autenticadas
  app.get('/editais', { preHandler: verificarRole(...ROLES_EDITAIS) }, listarEditais)
  app.get('/editais/meus', { preHandler: verificarRole(...ROLES_EDITAIS) }, meusEditais)
  app.get('/editais/:id', { preHandler: verificarRole(...ROLES_EDITAIS) }, buscarEdital)
  app.post('/editais', { preHandler: verificarRole('INSTITUICAO', 'ADMIN') }, criarEdital)
  app.put('/editais/:id', { preHandler: verificarRole('INSTITUICAO', 'ADMIN') }, atualizarEdital)
  app.delete('/editais/:id', { preHandler: verificarRole('INSTITUICAO', 'ADMIN') }, excluirEdital)
}
