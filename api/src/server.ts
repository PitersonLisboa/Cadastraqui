import { app } from './app'
import { env } from './env'
import { initUploadsBackup } from './services/backup-uploads.service.js'

async function start() {
  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT,
    })

    // Iniciar backup automático de uploads
    initUploadsBackup()

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
