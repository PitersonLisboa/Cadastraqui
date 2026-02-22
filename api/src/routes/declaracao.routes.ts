import { FastifyInstance } from 'fastify'
import { verificarJWT } from '../middlewares/auth'
import {
  listarDeclaracoes,
  listarDeclaracoesMembro,
  upsertDeclaracao,
  upsertDeclaracaoMembro,
  uploadArquivoDeclaracao,
  uploadArquivoDeclaracaoMembro,
  downloadArquivoDeclaracao,
  gerarPdf,
  enviarPorEmail,
} from '../controllers/declaracao.controller'

export async function declaracaoRoutes(app: FastifyInstance) {
  // Todas as rotas requerem autenticação
  app.addHook('onRequest', verificarJWT)

  // === Candidato ===
  // Listar todas as declarações do candidato logado
  app.get('/declaracoes', listarDeclaracoes)

  // Upsert (criar ou atualizar) uma declaração do candidato
  app.put('/declaracoes', upsertDeclaracao)

  // Upload de arquivo em uma declaração do candidato
  app.post('/declaracoes/upload/:tipo', uploadArquivoDeclaracao)

  // === Membro familiar ===
  // Listar declarações de um membro familiar
  app.get('/declaracoes/membro/:membroId', listarDeclaracoesMembro)

  // Upsert declaração de membro
  app.put('/declaracoes/membro', upsertDeclaracaoMembro)

  // Upload de arquivo em declaração de membro
  app.post('/declaracoes/membro/:membroId/upload/:tipo', uploadArquivoDeclaracaoMembro)

  // === Arquivo ===
  // Download de arquivo de declaração
  app.get('/declaracoes/:id/download', downloadArquivoDeclaracao)

  // === PDF ===
  // Gerar PDF completo das declarações
  app.get('/declaracoes/pdf', gerarPdf)

  // Enviar PDF por e-mail
  app.post('/declaracoes/email', enviarPorEmail)
}
