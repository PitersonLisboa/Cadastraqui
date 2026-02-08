import { FastifyInstance } from 'fastify'
import {
  listarConfiguracoes,
  salvarConfiguracoes,
  testarEmail,
  obterEstatisticasSistema,
} from '../controllers/configuracao.controller'
import { verificarRole } from '../middlewares/auth'

export async function configuracaoRoutes(app: FastifyInstance) {
  const adminOnly = { preHandler: [verificarRole('ADMIN')] }

  app.get('/admin/configuracoes', adminOnly, listarConfiguracoes)
  app.post('/admin/configuracoes', adminOnly, salvarConfiguracoes)
  app.post('/admin/configuracoes/testar-email', adminOnly, testarEmail)
  app.get('/admin/sistema/estatisticas', adminOnly, obterEstatisticasSistema)
}
