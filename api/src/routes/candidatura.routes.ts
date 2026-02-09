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
import {
  ROLES_VISUALIZAR_CANDIDATURAS,
  ROLES_ALTERAR_STATUS_CANDIDATURA,
} from '../config/permissions'

export async function candidaturaRoutes(app: FastifyInstance) {
  // Rotas do candidato
  app.get('/candidaturas/minhas', { preHandler: [verificarRole('CANDIDATO')] }, minhasCandidaturas)
  app.get('/candidaturas/verificar/:editalId', { preHandler: [verificarRole('CANDIDATO')] }, verificarInscricao)
  app.post('/candidaturas', { preHandler: [verificarRole('CANDIDATO')] }, inscrever)
  app.post('/candidaturas/:id/cancelar', { preHandler: [verificarRole('CANDIDATO')] }, cancelarCandidatura)
  
  // Rotas para visualizar candidatura (candidato, instituição, analistas)
  app.get('/candidaturas/:id', { preHandler: [verificarJWT] }, buscarCandidatura)
  
  // Listar candidaturas - ADVOGADO NÃO tem acesso (apenas docs institucionais)
  app.get('/candidaturas', { 
    preHandler: [verificarRole(...ROLES_VISUALIZAR_CANDIDATURAS)] 
  }, listarCandidaturas)
  
  // Alterar status - apenas quem pode deferir/indeferir
  app.put('/candidaturas/:id/status', { 
    preHandler: [verificarRole(...ROLES_ALTERAR_STATUS_CANDIDATURA)] 
  }, atualizarStatusCandidatura)
}
