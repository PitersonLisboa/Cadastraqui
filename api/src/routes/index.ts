import { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.routes'
import { candidatoRoutes } from './candidato.routes'
import { instituicaoRoutes } from './instituicao.routes'
import { editalRoutes } from './edital.routes'
import { candidaturaRoutes } from './candidatura.routes'
import { documentoRoutes } from './documento.routes'
import { parecerRoutes } from './parecer.routes'
import { assistenteSocialRoutes } from './assistente-social.routes'
import { advogadoRoutes } from './advogado.routes'
import { agendamentoRoutes } from './agendamento.routes'
import { notificacaoRoutes } from './notificacao.routes'
import { equipeRoutes } from './equipe.routes'
import { perfilRoutes } from './perfil.routes'
import { relatorioRoutes } from './relatorio.routes'
import { exportRoutes } from './export.routes'
import { adminRoutes } from './admin.routes'
import { configuracaoRoutes } from './configuracao.routes'
import { familiaRoutes } from './familia.routes'
import { conviteRoutes } from './convite.routes'
import { tenantRoutes } from './tenant.routes'

export async function registerRoutes(app: FastifyInstance) {
  // Rota de health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Rotas públicas (sem auth)
  await app.register(tenantRoutes)

  // Registrar todas as rotas
  await app.register(authRoutes)
  await app.register(candidatoRoutes)
  await app.register(instituicaoRoutes)
  await app.register(editalRoutes)
  await app.register(candidaturaRoutes)
  await app.register(documentoRoutes)
  await app.register(parecerRoutes)
  await app.register(assistenteSocialRoutes)
  await app.register(advogadoRoutes)
  await app.register(agendamentoRoutes)
  await app.register(notificacaoRoutes)
  await app.register(equipeRoutes)
  await app.register(perfilRoutes)
  await app.register(relatorioRoutes)
  await app.register(exportRoutes)
  await app.register(adminRoutes)
  await app.register(configuracaoRoutes)
  await app.register(familiaRoutes)
  await app.register(conviteRoutes)
}
