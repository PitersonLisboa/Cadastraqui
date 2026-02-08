import { FastifyInstance } from 'fastify'
import {
  listarMembros,
  adicionarMembro,
  buscarMembro,
  atualizarMembro,
  excluirMembro,
  composicaoFamiliar,
} from '../controllers/familia.controller'
import { verificarRole, verificarJWT } from '../middlewares/auth'

export async function familiaRoutes(app: FastifyInstance) {
  // Rotas do candidato
  app.get('/familia', { preHandler: [verificarRole('CANDIDATO')] }, listarMembros)
  app.post('/familia', { preHandler: [verificarRole('CANDIDATO')] }, adicionarMembro)
  app.get('/familia/:id', { preHandler: [verificarRole('CANDIDATO')] }, buscarMembro)
  app.put('/familia/:id', { preHandler: [verificarRole('CANDIDATO')] }, atualizarMembro)
  app.delete('/familia/:id', { preHandler: [verificarRole('CANDIDATO')] }, excluirMembro)

  // Rota para analistas verem composição familiar
  app.get('/familia/candidato/:candidatoId', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL', 'ADVOGADO', 'INSTITUICAO', 'ADMIN')] 
  }, composicaoFamiliar)
}
