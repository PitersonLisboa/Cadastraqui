import { FastifyInstance } from 'fastify'
import { verificarRole } from '../middlewares/auth'
import {
  listarSaude,
  buscarSaudeCandidato,
  buscarSaudeMembro,
  salvarSaudeCandidato,
  salvarSaudeMembro,
  uploadLaudoCandidato,
  uploadLaudoMembro,
  uploadReceitaCandidato,
  uploadReceitaMembro,
  downloadArquivoSaude,
  excluirArquivoSaude,
} from '../controllers/saude.controller'

export async function saudeRoutes(app: FastifyInstance) {
  // Todas as rotas exigem autenticação
  app.addHook('preHandler', verificarRole('CANDIDATO', 'ASSISTENTE_SOCIAL', 'ADMIN', 'SUPERVISAO', 'OPERACIONAL'))

  // Listar saúde de todo o grupo familiar
  app.get('/saude', listarSaude)

  // Saúde do candidato
  app.get('/saude/candidato', buscarSaudeCandidato)
  app.put('/saude/candidato', salvarSaudeCandidato)
  app.post('/saude/candidato/laudo', uploadLaudoCandidato)
  app.post('/saude/candidato/receita', uploadReceitaCandidato)

  // Saúde de um membro
  app.get('/saude/membro/:membroId', buscarSaudeMembro)
  app.put('/saude/membro/:membroId', salvarSaudeMembro)
  app.post('/saude/membro/:membroId/laudo', uploadLaudoMembro)
  app.post('/saude/membro/:membroId/receita', uploadReceitaMembro)

  // Download e exclusão de arquivos
  app.get('/saude/:saudeId/download/:tipo', downloadArquivoSaude)
  app.delete('/saude/:saudeId/arquivo/:tipo', excluirArquivoSaude)
}
