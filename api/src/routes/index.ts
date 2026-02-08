import { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.routes.js'
import { candidatoRoutes } from './candidato.routes.js'
import { instituicaoRoutes } from './instituicao.routes.js'
import { editalRoutes } from './edital.routes.js'
import { candidaturaRoutes } from './candidatura.routes.js'
import { documentoRoutes } from './documento.routes.js'
import { parecerRoutes } from './parecer.routes.js'
import { assistenteSocialRoutes } from './assistente-social.routes.js'
import { advogadoRoutes } from './advogado.routes.js'
import { agendamentoRoutes } from './agendamento.routes.js'
import { notificacaoRoutes } from './notificacao.routes.js'
import { equipeRoutes } from './equipe.routes.js'
import { perfilRoutes } from './perfil.routes.js'
import { relatorioRoutes } from './relatorio.routes.js'
import { exportRoutes } from './export.routes.js'
import { adminRoutes } from './admin.routes.js'
import { configuracaoRoutes } from './configuracao.routes.js'
import { familiaRoutes } from './familia.routes.js'
import { conviteRoutes } from './convite.routes.js'

export async function registerRoutes(app: FastifyInstance) {
  // Rota de health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

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
