import { FastifyInstance } from 'fastify'
import {
  minhasCandidaturas,
  buscarCandidatura,
  inscrever,
  verificarInscricao,
  cancelarCandidatura,
  listarCandidaturas,
  atualizarStatusCandidatura,
} from '../controllers/candidatura.controller'
import { verificarJWT, verificarRole } from '../middlewares/auth'

export async function candidaturaRoutes(app: FastifyInstance) {
  // Rotas do candidato
  app.get('/candidaturas/minhas', { preHandler: [verificarRole('CANDIDATO')] }, minhasCandidaturas)
  app.get('/candidaturas/verificar/:editalId', { preHandler: [verificarRole('CANDIDATO')] }, verificarInscricao)
  app.post('/candidaturas', { preHandler: [verificarRole('CANDIDATO')] }, inscrever)
  app.post('/candidaturas/:id/cancelar', { preHandler: [verificarRole('CANDIDATO')] }, cancelarCandidatura)
  
  // Rotas para visualizar candidatura (candidato, instituição, analistas)
  app.get('/candidaturas/:id', { preHandler: [verificarJWT] }, buscarCandidatura)
  
  // Rotas para instituição e analistas
  app.get('/candidaturas', { 
    preHandler: [verificarRole('INSTITUICAO', 'ADMIN', 'ASSISTENTE_SOCIAL', 'ADVOGADO')] 
  }, listarCandidaturas)
  
  app.put('/candidaturas/:id/status', { 
    preHandler: [verificarRole('INSTITUICAO', 'ADMIN', 'ASSISTENTE_SOCIAL', 'ADVOGADO')] 
  }, atualizarStatusCandidatura)
}
