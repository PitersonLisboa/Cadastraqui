import { FastifyInstance } from 'fastify'
import {
  criarAgendamento,
  listarAgendamentos,
  buscarAgendamento,
  atualizarAgendamento,
  cancelarAgendamento,
  registrarPresenca,
  meusAgendamentos,
  detalhesAgendamento,
} from '../controllers/agendamento.controller'
import { verificarRole, verificarJWT } from '../middlewares/auth'
import { ROLES_GERENCIAR_AGENDAMENTOS } from '../config/permissions'

export async function agendamentoRoutes(app: FastifyInstance) {
  // Criar agendamento - AS, Supervisão e Operacional podem criar
  app.post('/agendamentos', { 
    preHandler: [verificarRole(...ROLES_GERENCIAR_AGENDAMENTOS)] 
  }, criarAgendamento)
  
  // Listar agendamentos
  app.get('/agendamentos', { 
    preHandler: [verificarRole(...ROLES_GERENCIAR_AGENDAMENTOS)] 
  }, listarAgendamentos)
  
  // Buscar agendamento específico
  app.get('/agendamentos/:id', { preHandler: [verificarJWT] }, buscarAgendamento)
  
  // Atualizar agendamento
  app.put('/agendamentos/:id', { 
    preHandler: [verificarRole(...ROLES_GERENCIAR_AGENDAMENTOS)] 
  }, atualizarAgendamento)
  
  // Cancelar agendamento
  app.delete('/agendamentos/:id', { 
    preHandler: [verificarRole(...ROLES_GERENCIAR_AGENDAMENTOS)] 
  }, cancelarAgendamento)
  
  // Registrar presença
  app.post('/agendamentos/:id/presenca', { 
    preHandler: [verificarRole('ASSISTENTE_SOCIAL')] 
  }, registrarPresenca)
  
  // Rotas do candidato
  app.get('/candidato/agendamentos', { 
    preHandler: [verificarRole('CANDIDATO')] 
  }, meusAgendamentos)
  
  // Detalhes (qualquer autenticado, controller valida)
  app.get('/agendamentos/:id/detalhes', { preHandler: [verificarJWT] }, detalhesAgendamento)
}
