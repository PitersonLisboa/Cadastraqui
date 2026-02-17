import { FastifyInstance } from 'fastify'
import {
  listarDespesas,
  criarDespesa,
  atualizarDespesa,
  excluirDespesa,
  resumoDespesas,
  salvarDespesasLote,
} from '../controllers/despesa.controller'
import { verificarRole } from '../middlewares/auth'

export async function despesaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verificarRole('CANDIDATO', 'ASSISTENTE_SOCIAL', 'ADMIN', 'SUPERVISAO', 'OPERACIONAL'))

  app.get('/despesas', listarDespesas)
  app.post('/despesas', criarDespesa)
  app.post('/despesas/lote', salvarDespesasLote)
  app.put('/despesas/:id', atualizarDespesa)
  app.delete('/despesas/:id', excluirDespesa)
  app.get('/despesas/:ano/:mes', resumoDespesas)
}
