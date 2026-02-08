import { app } from './app.js'
import { env } from './env/index.js'

async function start() {
  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT,
    })

    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 CADASTRAQUI API                                       ║
║                                                            ║
║   Servidor rodando em: http://${env.HOST}:${env.PORT}              ║
║   Ambiente: ${env.NODE_ENV.padEnd(44)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `)
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error)
    process.exit(1)
  }
}

start()
