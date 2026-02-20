import { FastifyInstance } from 'fastify'
import {
  listarRendas,
  salvarRenda,
  salvarRendasBatch,
  excluirRenda,
  rendasDoMembro,
  uploadComprovante,
} from '../controllers/renda.controller'
import { verificarRole } from '../middlewares/auth'

export async function rendaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verificarRole('CANDIDATO', 'ASSISTENTE_SOCIAL', 'ADMIN', 'SUPERVISAO', 'OPERACIONAL'))

  app.get('/rendas', listarRendas)
  app.post('/rendas', salvarRenda)
  app.delete('/rendas/:id', excluirRenda)
  app.get('/rendas/membro/:membroId', rendasDoMembro)

  // Novas rotas 2.x
  app.post('/rendas/batch', salvarRendasBatch)
  app.post('/rendas/:fonteRendaId/comprovante/:mes/:ano', uploadComprovante)
}
