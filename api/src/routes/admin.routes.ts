import { FastifyInstance } from 'fastify'
import {
  listarUsuarios,
  buscarUsuario,
  criarUsuario,
  atualizarUsuario,
  alternarStatusUsuario,
  resetarSenha,
  listarInstituicoesAdmin,
  buscarInstituicaoAdmin,
  atualizarStatusInstituicao,
  listarLogs,
  estatisticasGerais,
} from '../controllers/admin.controller'
import { verificarRole } from '../middlewares/auth'

export async function adminRoutes(app: FastifyInstance) {
  // Todas as rotas requerem role ADMIN
  const adminOnly = { preHandler: [verificarRole('ADMIN')] }

  // Estatísticas gerais
  app.get('/admin/estatisticas', adminOnly, estatisticasGerais)

  // Gestão de Usuários
  app.get('/admin/usuarios', adminOnly, listarUsuarios)
  app.get('/admin/usuarios/:id', adminOnly, buscarUsuario)
  app.post('/admin/usuarios', adminOnly, criarUsuario)
  app.put('/admin/usuarios/:id', adminOnly, atualizarUsuario)
  app.patch('/admin/usuarios/:id/status', adminOnly, alternarStatusUsuario)
  app.post('/admin/usuarios/:id/resetar-senha', adminOnly, resetarSenha)

  // Gestão de Instituições
  app.get('/admin/instituicoes', adminOnly, listarInstituicoesAdmin)
  app.get('/admin/instituicoes/:id', adminOnly, buscarInstituicaoAdmin)
  app.patch('/admin/instituicoes/:id/status', adminOnly, atualizarStatusInstituicao)

  // Logs de Atividade
  app.get('/admin/logs', adminOnly, listarLogs)
}
