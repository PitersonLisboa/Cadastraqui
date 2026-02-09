import { FastifyInstance } from 'fastify'
import {
  listarMembros,
  adicionarMembro,
  buscarMembro,
  atualizarMembro,
  excluirMembro,
  listarMembrosCandidato,
} from '../controllers/familia.controller'
import { verificarRole, verificarJWT } from '../middlewares/auth'
import { ROLES_VER_FAMILIA } from '../config/permissions'

export async function familiaRoutes(app: FastifyInstance) {
  // Rotas do candidato
  app.get('/familia', { preHandler: [verificarRole('CANDIDATO')] }, listarMembros)
  app.post('/familia', { preHandler: [verificarRole('CANDIDATO')] }, adicionarMembro)
  app.get('/familia/:id', { preHandler: [verificarRole('CANDIDATO')] }, buscarMembro)
  app.put('/familia/:id', { preHandler: [verificarRole('CANDIDATO')] }, atualizarMembro)
  app.delete('/familia/:id', { preHandler: [verificarRole('CANDIDATO')] }, excluirMembro)

  // Visualizar família de um candidato - ADVOGADO NÃO tem acesso
  app.get('/candidatos/:candidatoId/familia', { 
    preHandler: [verificarRole(...ROLES_VER_FAMILIA)] 
  }, listarMembrosCandidato)
}
