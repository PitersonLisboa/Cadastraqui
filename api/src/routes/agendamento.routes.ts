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
} from '../controllers/agendamento.controller'
import { verificarRole } from '../middlewares/auth'
import { ROLES_GERENCIAR_AGENDAMENTOS } from '../config/permissions'

export async function agendamentoRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verificarRole(...ROLES_GERENCIAR_AGENDAMENTOS))

  app.get('/agendamentos', listarMeusAgendamentos)
  app.post('/agendamentos', criarAgendamento)
  app.get('/agendamentos/horarios', horariosDisponiveis)
  app.get('/agendamentos/candidato/:candidatoId', listarAgendamentosCandidato)
  app.get('/agendamentos/:id', buscarAgendamento)
  app.put('/agendamentos/:id', atualizarAgendamento)
  app.delete('/agendamentos/:id', excluirAgendamento)
  app.post('/agendamentos/:id/realizado', marcarRealizado)
}
