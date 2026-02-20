import { FastifyInstance } from 'fastify'
import {
  listarFontesRenda,
  criarFonteRenda,
  atualizarFonteRenda,
  excluirFonteRenda,
  buscarFonteRenda,
  uploadComprovanteMatricula,
} from '../controllers/fonte-renda.controller'
import { verificarRole } from '../middlewares/auth'

export async function fonteRendaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verificarRole('CANDIDATO', 'ASSISTENTE_SOCIAL', 'ADMIN', 'SUPERVISAO', 'OPERACIONAL'))

  app.get('/fontes-renda', listarFontesRenda)
  app.get('/fontes-renda/:id', buscarFonteRenda)
  app.post('/fontes-renda', criarFonteRenda)
  app.put('/fontes-renda/:id', atualizarFonteRenda)
  app.delete('/fontes-renda/:id', excluirFonteRenda)
  app.post('/fontes-renda/:id/comprovante-matricula', uploadComprovanteMatricula)
}
