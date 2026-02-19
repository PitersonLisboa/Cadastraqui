import { FastifyInstance } from 'fastify'
import { verificarRole } from '../middlewares/auth'
import { escanearRG, escanearComprovante, escanearCertidao } from '../controllers/ocr.controller'

export async function ocrRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verificarRole('CANDIDATO', 'ASSISTENTE_SOCIAL', 'ADMIN', 'SUPERVISAO', 'OPERACIONAL'))

  // Escanear RG e extrair dados
  app.post('/ocr/rg', escanearRG)

  // Escanear comprovante de endereço e extrair dados
  app.post('/ocr/comprovante', escanearComprovante)

  // Escanear certidão e extrair estado civil
  app.post('/ocr/certidao', escanearCertidao)
}
