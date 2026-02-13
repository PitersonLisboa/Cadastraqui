import { FastifyInstance } from 'fastify'
import {
  listarMembros,
  adicionarMembro,
  buscarMembro,
  atualizarMembro,
  excluirMembro,
  composicaoFamiliar,
} from '../controllers/familia.controller'
import { verificarRole } from '../middlewares/auth'

export async function familiaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verificarRole('CANDIDATO', 'ASSISTENTE_SOCIAL', 'ADMIN', 'SUPERVISAO', 'OPERACIONAL'))

  // Rotas estáticas primeiro (evita conflito com :id)
  app.get('/familia/composicao', composicaoFamiliar)
  app.get('/familia/composicao/:candidatoId', composicaoFamiliar)

  // Rotas com /membros (padrão usado pelo frontend)
  app.get('/familia/membros', listarMembros)
  app.post('/familia/membros', adicionarMembro)
  app.get('/familia/membros/:id', buscarMembro)
  app.put('/familia/membros/:id', atualizarMembro)
  app.delete('/familia/membros/:id', excluirMembro)

  // Rotas raiz (compatibilidade)
  app.get('/familia', listarMembros)
  app.post('/familia', adicionarMembro)
}
