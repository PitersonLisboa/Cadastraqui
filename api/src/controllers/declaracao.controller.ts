import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { CandidatoNaoEncontradoError, RecursoNaoEncontradoError, NaoAutorizadoError } from '../errors/index'
import { gerarPdfDeclaracoes } from '../services/declaracao-pdf.service'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

// ===========================================
// SCHEMAS
// ===========================================

const declaracaoUpsertSchema = z.object({
  tipo: z.string().min(1),
  resposta: z.boolean().nullable().optional(),
  dados: z.any().optional(),
  confirmado: z.boolean().optional(),
})

const declaracaoMembroUpsertSchema = z.object({
  tipo: z.string().min(1),
  membroId: z.string().uuid(),
  resposta: z.boolean().nullable().optional(),
  dados: z.any().optional(),
  confirmado: z.boolean().optional(),
})

// ===========================================
// HELPERS
// ===========================================

async function getCandidato(usuarioId: string) {
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId },
    include: {
      membrosFamilia: { select: { id: true, nome: true, parentesco: true, cpf: true } },
      usuario: { select: { email: true } },
      veiculos: true,
    },
  })
  return candidato
}

// ===========================================
// LISTAR declarações do candidato
// ===========================================

export async function listarDeclaracoes(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await getCandidato(request.usuario.id)
  if (!candidato) return reply.status(200).send({ declaracoes: [], candidato: null })

  const declaracoes = await prisma.$queryRaw<any[]>`
    SELECT d.*
    FROM declaracoes d
    WHERE d.candidato_id = ${candidato.id}
      AND d.membro_id IS NULL
    ORDER BY d.criado_em ASC
  `

  return reply.status(200).send({
    declaracoes: declaracoes.map(normalizeRow),
    candidato: {
      id: candidato.id,
      nome: candidato.nome,
      cpf: candidato.cpf,
      rg: candidato.rg,
      rgOrgao: candidato.rgOrgao,
      rgEstado: candidato.rgEstado,
      nacionalidade: candidato.nacionalidade,
      estadoCivil: candidato.estadoCivil,
      profissao: candidato.profissao,
      cep: candidato.cep,
      endereco: candidato.endereco,
      numero: candidato.numero,
      complemento: candidato.complemento,
      bairro: candidato.bairro,
      cidade: candidato.cidade,
      uf: candidato.uf,
      email: candidato.usuario.email,
      membrosFamilia: candidato.membrosFamilia,
      veiculos: candidato.veiculos,
    },
  })
}

// ===========================================
// LISTAR declarações de um membro familiar
// ===========================================

export async function listarDeclaracoesMembro(request: FastifyRequest, reply: FastifyReply) {
  const { membroId } = z.object({ membroId: z.string().uuid() }).parse(request.params)

  const candidato = await getCandidato(request.usuario.id)
  if (!candidato) throw new CandidatoNaoEncontradoError()

  // Verificar se o membro pertence ao candidato
  const membro = candidato.membrosFamilia.find(m => m.id === membroId)
  if (!membro) throw new RecursoNaoEncontradoError('Membro familiar')

  const declaracoes = await prisma.$queryRaw<any[]>`
    SELECT d.*
    FROM declaracoes d
    WHERE d.membro_id = ${membroId}
    ORDER BY d.criado_em ASC
  `

  return reply.status(200).send({
    declaracoes: declaracoes.map(normalizeRow),
  })
}

// ===========================================
// UPSERT declaração do candidato
// ===========================================

export async function upsertDeclaracao(request: FastifyRequest, reply: FastifyReply) {
  const dados = declaracaoUpsertSchema.parse(request.body)
  const candidato = await getCandidato(request.usuario.id)
  if (!candidato) throw new CandidatoNaoEncontradoError()

  const existing = await prisma.$queryRaw<any[]>`
    SELECT id FROM declaracoes
    WHERE candidato_id = ${candidato.id}
      AND membro_id IS NULL
      AND tipo = ${dados.tipo}
    LIMIT 1
  `

  let result: any
  if (existing.length > 0) {
    await prisma.$executeRaw`
      UPDATE declaracoes SET
        resposta = ${dados.resposta ?? null}::boolean,
        dados = ${JSON.stringify(dados.dados || {})}::jsonb,
        confirmado = ${dados.confirmado ?? false}::boolean,
        atualizado_em = NOW()
      WHERE id = ${existing[0].id}::uuid
    `
    result = { id: existing[0].id }
  } else {
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO declaracoes (candidato_id, tipo, resposta, dados, confirmado)
      VALUES (${candidato.id}, ${dados.tipo}, ${dados.resposta ?? null}::boolean,
              ${JSON.stringify(dados.dados || {})}::jsonb, ${dados.confirmado ?? false}::boolean)
      RETURNING id
    `
    result = { id: rows[0].id }
  }

  return reply.status(200).send({ declaracao: result })
}

// ===========================================
// UPSERT declaração de membro familiar
// ===========================================

export async function upsertDeclaracaoMembro(request: FastifyRequest, reply: FastifyReply) {
  const dados = declaracaoMembroUpsertSchema.parse(request.body)
  const candidato = await getCandidato(request.usuario.id)
  if (!candidato) throw new CandidatoNaoEncontradoError()

  // Verificar se o membro pertence ao candidato
  const membro = candidato.membrosFamilia.find(m => m.id === dados.membroId)
  if (!membro) throw new RecursoNaoEncontradoError('Membro familiar')

  const existing = await prisma.$queryRaw<any[]>`
    SELECT id FROM declaracoes
    WHERE membro_id = ${dados.membroId}
      AND tipo = ${dados.tipo}
    LIMIT 1
  `

  let result: any
  if (existing.length > 0) {
    await prisma.$executeRaw`
      UPDATE declaracoes SET
        resposta = ${dados.resposta ?? null}::boolean,
        dados = ${JSON.stringify(dados.dados || {})}::jsonb,
        confirmado = ${dados.confirmado ?? false}::boolean,
        atualizado_em = NOW()
      WHERE id = ${existing[0].id}::uuid
    `
    result = { id: existing[0].id }
  } else {
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO declaracoes (candidato_id, membro_id, tipo, resposta, dados, confirmado)
      VALUES (${candidato.id}, ${dados.membroId}, ${dados.tipo},
              ${dados.resposta ?? null}::boolean,
              ${JSON.stringify(dados.dados || {})}::jsonb,
              ${dados.confirmado ?? false}::boolean)
      RETURNING id
    `
    result = { id: rows[0].id }
  }

  return reply.status(200).send({ declaracao: result })
}

// ===========================================
// UPLOAD de arquivo para declaração
// ===========================================

export async function uploadArquivoDeclaracao(request: FastifyRequest, reply: FastifyReply) {
  const { tipo } = z.object({ tipo: z.string() }).parse(request.params)
  const candidato = await getCandidato(request.usuario.id)
  if (!candidato) throw new CandidatoNaoEncontradoError()

  const data = await request.file()
  if (!data) return reply.status(400).send({ message: 'Nenhum arquivo enviado' })

  const buffer = await data.toBuffer()
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (buffer.length > maxSize) {
    return reply.status(400).send({ message: 'Arquivo excede 10MB' })
  }

  // Salvar no storage
  const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads', 'declaracoes')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

  const ext = path.extname(data.filename || '.pdf')
  const nomeArquivo = `${candidato.id}_${tipo}_${crypto.randomUUID()}${ext}`
  const filePath = path.join(uploadsDir, nomeArquivo)
  fs.writeFileSync(filePath, buffer)

  const fileUrl = `/uploads/declaracoes/${nomeArquivo}`

  // Upsert na declaração
  const existing = await prisma.$queryRaw<any[]>`
    SELECT id FROM declaracoes
    WHERE candidato_id = ${candidato.id}
      AND membro_id IS NULL
      AND tipo = ${tipo}
    LIMIT 1
  `

  if (existing.length > 0) {
    await prisma.$executeRaw`
      UPDATE declaracoes SET
        arquivo_url = ${fileUrl},
        arquivo_nome = ${data.filename || nomeArquivo},
        arquivo_tamanho = ${buffer.length},
        arquivo_mime_type = ${data.mimetype || 'application/octet-stream'},
        atualizado_em = NOW()
      WHERE id = ${existing[0].id}::uuid
    `
  } else {
    await prisma.$executeRaw`
      INSERT INTO declaracoes (candidato_id, tipo, arquivo_url, arquivo_nome, arquivo_tamanho, arquivo_mime_type)
      VALUES (${candidato.id}, ${tipo}, ${fileUrl}, ${data.filename || nomeArquivo},
              ${buffer.length}, ${data.mimetype || 'application/octet-stream'})
    `
  }

  return reply.status(200).send({
    arquivo: {
      url: fileUrl,
      nome: data.filename || nomeArquivo,
      tamanho: buffer.length,
    },
  })
}

// ===========================================
// UPLOAD de arquivo para declaração de membro
// ===========================================

export async function uploadArquivoDeclaracaoMembro(request: FastifyRequest, reply: FastifyReply) {
  const { membroId, tipo } = z.object({
    membroId: z.string().uuid(),
    tipo: z.string(),
  }).parse(request.params)

  const candidato = await getCandidato(request.usuario.id)
  if (!candidato) throw new CandidatoNaoEncontradoError()

  const membro = candidato.membrosFamilia.find(m => m.id === membroId)
  if (!membro) throw new RecursoNaoEncontradoError('Membro familiar')

  const data = await request.file()
  if (!data) return reply.status(400).send({ message: 'Nenhum arquivo enviado' })

  const buffer = await data.toBuffer()
  const maxSize = 10 * 1024 * 1024
  if (buffer.length > maxSize) {
    return reply.status(400).send({ message: 'Arquivo excede 10MB' })
  }

  const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads', 'declaracoes')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

  const ext = path.extname(data.filename || '.pdf')
  const nomeArquivo = `${membroId}_${tipo}_${crypto.randomUUID()}${ext}`
  const filePath = path.join(uploadsDir, nomeArquivo)
  fs.writeFileSync(filePath, buffer)

  const fileUrl = `/uploads/declaracoes/${nomeArquivo}`

  const existing = await prisma.$queryRaw<any[]>`
    SELECT id FROM declaracoes
    WHERE membro_id = ${membroId} AND tipo = ${tipo}
    LIMIT 1
  `

  if (existing.length > 0) {
    await prisma.$executeRaw`
      UPDATE declaracoes SET
        arquivo_url = ${fileUrl},
        arquivo_nome = ${data.filename || nomeArquivo},
        arquivo_tamanho = ${buffer.length},
        arquivo_mime_type = ${data.mimetype || 'application/octet-stream'},
        atualizado_em = NOW()
      WHERE id = ${existing[0].id}::uuid
    `
  } else {
    await prisma.$executeRaw`
      INSERT INTO declaracoes (candidato_id, membro_id, tipo, arquivo_url, arquivo_nome, arquivo_tamanho, arquivo_mime_type)
      VALUES (${candidato.id}, ${membroId}, ${tipo}, ${fileUrl},
              ${data.filename || nomeArquivo}, ${buffer.length},
              ${data.mimetype || 'application/octet-stream'})
    `
  }

  return reply.status(200).send({
    arquivo: {
      url: fileUrl,
      nome: data.filename || nomeArquivo,
      tamanho: buffer.length,
    },
  })
}

// ===========================================
// DOWNLOAD do arquivo de declaração
// ===========================================

export async function downloadArquivoDeclaracao(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const rows = await prisma.$queryRaw<any[]>`
    SELECT d.*, c.usuario_id
    FROM declaracoes d
    LEFT JOIN candidatos c ON d.candidato_id = c.id
    WHERE d.id = ${id}::uuid
    LIMIT 1
  `

  if (rows.length === 0) throw new RecursoNaoEncontradoError('Declaração')
  const decl = rows[0]

  // Verificar permissão (simplificado: dono ou admin)
  if (decl.usuario_id && decl.usuario_id !== request.usuario.id && request.usuario.role !== 'ADMIN') {
    throw new NaoAutorizadoError()
  }

  if (!decl.arquivo_url) {
    return reply.status(404).send({ message: 'Arquivo não encontrado' })
  }

  const baseDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads', 'declaracoes')
  const fileName = path.basename(decl.arquivo_url)
  const filePath = path.join(baseDir, fileName)

  if (!fs.existsSync(filePath)) {
    return reply.status(404).send({ message: 'Arquivo não encontrado no disco' })
  }

  const stream = fs.createReadStream(filePath)
  return reply
    .header('Content-Type', decl.arquivo_mime_type || 'application/octet-stream')
    .header('Content-Disposition', `attachment; filename="${decl.arquivo_nome || fileName}"`)
    .send(stream)
}

// ===========================================
// GERAR PDF das declarações
// ===========================================

export async function gerarPdf(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
    include: {
      membrosFamilia: true,
      usuario: { select: { email: true } },
      veiculos: true,
    },
  })
  if (!candidato) throw new CandidatoNaoEncontradoError()

  const declaracoes = await prisma.$queryRaw<any[]>`
    SELECT d.*
    FROM declaracoes d
    WHERE d.candidato_id = ${candidato.id}
      AND d.membro_id IS NULL
    ORDER BY d.criado_em ASC
  `

  const buffer = await gerarPdfDeclaracoes(
    candidato,
    declaracoes.map(normalizeRow),
  )

  const filename = `declaracao_${candidato.cpf.replace(/\D/g, '')}_${Date.now()}.pdf`

  return reply
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(buffer)
}

// ===========================================
// ENVIAR por e-mail (placeholder)
// ===========================================

export async function enviarPorEmail(request: FastifyRequest, reply: FastifyReply) {
  // ══════════════════════════════════════════════════════════════
  // PROVISION FOR: Integração futura com serviço de e-mail
  // ──────────────────────────────────────────────────────────────
  // Quando configurar o envio de e-mail, usar:
  //   1. Gerar o PDF via gerarPdfDeclaracoes()
  //   2. Anexar o buffer no e-mail como attachment
  //   3. Enviar para candidato.usuario.email
  //
  // Opções de serviço (a definir):
  //   - SendGrid (API key via SENDGRID_API_KEY)
  //   - SMTP genérico (via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
  //   - Nodemailer (já instalado no projeto)
  //
  // Env vars necessárias:
  //   EMAIL_SERVICE=sendgrid|smtp
  //   EMAIL_FROM=noreply@cadastraqui.com.br
  //   SENDGRID_API_KEY=...
  //   SMTP_HOST=... SMTP_PORT=... SMTP_USER=... SMTP_PASS=...
  // ══════════════════════════════════════════════════════════════
  return reply.status(200).send({
    message: '🚧 Funcionalidade de envio por e-mail em construção. Em breve estará disponível.',
    emConstrucao: true,
  })
}

// ===========================================
// HELPER: normalizar row do queryRaw
// ===========================================

function normalizeRow(row: any) {
  return {
    id: row.id,
    candidatoId: row.candidato_id,
    membroId: row.membro_id,
    tipo: row.tipo,
    resposta: row.resposta,
    dados: row.dados || {},
    confirmado: row.confirmado,
    arquivoUrl: row.arquivo_url,
    arquivoNome: row.arquivo_nome,
    arquivoTamanho: row.arquivo_tamanho,
    arquivoMimeType: row.arquivo_mime_type,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  }
}
