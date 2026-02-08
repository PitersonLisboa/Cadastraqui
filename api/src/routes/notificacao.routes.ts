import { FastifyInstance } from 'fastify'
import {
  listarNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  excluirNotificacao,
  contarNaoLidas,
} from '../controllers/notificacao.controller'
import { verificarJWT } from '../middlewares/auth'

export async function notificacaoRoutes(app: FastifyInstance) {
  // Todas as rotas requerem autenticação
  app.addHook('preHandler', verificarJWT)

  app.get('/notificacoes', listarNotificacoes)
  app.get('/notificacoes/count', contarNaoLidas)
  app.put('/notificacoes/:id/lida', marcarComoLida)
  app.put('/notificacoes/marcar-todas-lidas', marcarTodasComoLidas)
  app.delete('/notificacoes/:id', excluirNotificacao)
}
