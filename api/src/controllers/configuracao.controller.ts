import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { sendEmail } from '../services/email.service.js'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const salvarConfiguracoesSchema = z.object({
  nomeAplicacao: z.string().optional(),
  emailSuporte: z.string().email().optional(),
  urlBase: z.string().url().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  emailRemetente: z.string().email().optional(),
  sessaoExpiracao: z.string().optional(),
  tentativasLogin: z.string().optional(),
  bloqueioMinutos: z.string().optional(),
  manterLogs: z.string().optional(),
  backupAutomatico: z.string().optional(),
  manutencao: z.string().optional(),
})

// ===========================================
// FUNÇÕES
// ===========================================

export async function listarConfiguracoes(request: FastifyRequest, reply: FastifyReply) {
  const configs = await prisma.configuracao.findMany()
  
  const configuracoes: Record<string, string> = {}
  for (const config of configs) {
    configuracoes[config.chave] = config.valor
  }

  return reply.status(200).send({ configuracoes })
}

export async function salvarConfiguracoes(request: FastifyRequest, reply: FastifyReply) {
  const dados = salvarConfiguracoesSchema.parse(request.body)

  // Salvar cada configuração
  for (const [chave, valor] of Object.entries(dados)) {
    if (valor !== undefined && valor !== '') {
      await prisma.configuracao.upsert({
        where: { chave },
        update: { valor },
        create: { chave, valor },
      })
    }
  }

  // Log de atividade
  await prisma.logAtividade.create({
    data: {
      usuarioId: request.usuario.id,
      acao: 'ATUALIZAR_CONFIGURACOES',
      entidade: 'Configuracao',
      detalhes: { chaves: Object.keys(dados) },
      ip: request.ip,
    },
  })

  return reply.status(200).send({ message: 'Configurações salvas com sucesso' })
}

export async function testarEmail(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Buscar configurações de email
    const configs = await prisma.configuracao.findMany({
      where: {
        chave: {
          in: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'emailRemetente']
        }
      }
    })

    const configMap: Record<string, string> = {}
    for (const c of configs) {
      configMap[c.chave] = c.valor
    }

    // Buscar email do admin logado
    const usuario = await prisma.usuario.findUnique({
      where: { id: request.usuario.id },
      select: { email: true }
    })

    if (!usuario) {
      return reply.status(400).send({ message: 'Usuário não encontrado' })
    }

    // Enviar email de teste
    await sendEmail({
      to: usuario.email,
      subject: 'CadastrAQUI - Email de Teste',
      html: `
        <h1>Email de Teste</h1>
        <p>Este é um email de teste do sistema CadastrAQUI.</p>
        <p>Se você recebeu este email, as configurações de SMTP estão funcionando corretamente.</p>
        <hr>
        <p><small>Enviado em: ${new Date().toLocaleString('pt-BR')}</small></p>
      `
    })

    return reply.status(200).send({ message: 'Email de teste enviado com sucesso' })
  } catch (error: any) {
    console.error('Erro ao enviar email de teste:', error)
    return reply.status(500).send({ 
      message: 'Erro ao enviar email de teste: ' + (error.message || 'Erro desconhecido')
    })
  }
}

export async function obterEstatisticasSistema(request: FastifyRequest, reply: FastifyReply) {
  const [
    totalUsuarios,
    totalInstituicoes,
    totalCandidatos,
    totalEditais,
    totalCandidaturas,
    totalLogs,
    logsUltimas24h
  ] = await Promise.all([
    prisma.usuario.count(),
    prisma.instituicao.count(),
    prisma.candidato.count(),
    prisma.edital.count(),
    prisma.candidatura.count(),
    prisma.logAtividade.count(),
    prisma.logAtividade.count({
      where: {
        criadoEm: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
  ])

  return reply.status(200).send({
    estatisticas: {
      totalUsuarios,
      totalInstituicoes,
      totalCandidatos,
      totalEditais,
      totalCandidaturas,
      totalLogs,
      logsUltimas24h
    }
  })
}
