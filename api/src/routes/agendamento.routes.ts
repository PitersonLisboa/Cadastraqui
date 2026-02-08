import { FastifyInstance } from 'fastify'
import {
  listarMeusAgendamentos,
  criarAgendamento,
  buscarAgendamento,
  atualizarAgendamento,
  excluirAgendamento,
  marcarRealizado,
  listarAgendamentosCandidato,
  horariosDisponiveis,
} from '../controllers/agendamento.controller.js'
import { verificarRole, verificarJWT } from '../middlewares/auth.js'

export async function agendamentoRoutes(app: FastifyInstance) {
  // Rotas do Assistente Social
  app.get('/agendamentos', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL')] 
  }, listarMeusAgendamentos)
  
  app.post('/agendamentos', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL')] 
  }, criarAgendamento)
  
  app.get('/agendamentos/:id', { 
    preHandler: [verificarJWT] 
  }, buscarAgendamento)
  
  app.put('/agendamentos/:id', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL', 'ADMIN')] 
  }, atualizarAgendamento)
  
  app.delete('/agendamentos/:id', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL', 'ADMIN')] 
  }, excluirAgendamento)
  
  app.post('/agendamentos/:id/realizado', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL')] 
  }, marcarRealizado)

  // Rotas do Candidato
  app.get('/agendamentos/candidato', { 
    preHandler: [verificarRole('CANDIDATO')] 
  }, listarAgendamentosCandidato)

  // Horários disponíveis
  app.get('/agendamentos/horarios-disponiveis', { 
    preHandler: [verificarJWT] 
  }, horariosDisponiveis)
}
