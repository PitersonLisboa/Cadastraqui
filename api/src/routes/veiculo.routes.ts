import { FastifyInstance } from 'fastify'
import { listarVeiculos, criarVeiculo, excluirVeiculo } from '../controllers/veiculo.controller'
import { verificarRole } from '../middlewares/auth'

export async function veiculoRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verificarRole('CANDIDATO', 'ASSISTENTE_SOCIAL', 'ADMIN', 'SUPERVISAO', 'OPERACIONAL'))

  app.get('/veiculos', listarVeiculos)
  app.post('/veiculos', criarVeiculo)
  app.delete('/veiculos/:id', excluirVeiculo)
}
