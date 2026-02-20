import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { CandidatoNaoEncontradoError, RecursoNaoEncontradoError, NaoAutorizadoError, ArquivoInvalidoError } from '../errors/index'
import { UPLOADS_DIR, gerarNomeArquivo, validarTipoArquivo } from '../config/upload'
import path from 'path'
import fs from 'fs'

// ===========================================
// SCHEMAS
// ===========================================

const TIPOS_FONTE = [
  'EMPREGADO_PRIVADO', 'EMPREGADO_PUBLICO', 'EMPREGADO_DOMESTICO',
  'EMPREGADO_RURAL_TEMPORARIO', 'EMPRESARIO_SIMPLES', 'EMPRESARIO',
  'EMPREENDEDOR_INDIVIDUAL', 'AUTONOMO', 'APOSENTADO', 'PENSIONISTA',
  'PROGRAMAS_TRANSFERENCIA', 'APRENDIZ', 'VOLUNTARIO', 'RENDA_ALUGUEL',
  'ESTUDANTE', 'TRABALHADOR_INFORMAL', 'DESEMPREGADO',
  'BENEFICIO_INCAPACIDADE', 'PROFISSIONAL_LIBERAL', 'AJUDA_TERCEIROS',
  'PENSAO_ALIMENTICIA', 'PREVIDENCIA_PRIVADA',
] as const

const criarFonteSchema = z.object({
  membroFamiliaId: z.string().uuid().optional(),
  tipo: z.enum(TIPOS_FONTE),
  documentoEmpregador: z.string().optional(),
  nomeFontePagadora: z.string().optional(),
  telefoneFonte: z.string().optional(),
  atividadeExercida: z.string().optional(),
  dataInicio: z.string().optional(),
  descricaoBeneficio: z.string().optional(),
  numeroBeneficio: z.string().optional(),
  instituicaoEnsino: z.string().optional(),
  cursoSerie: z.string().optional(),
})

const atualizarFonteSchema = criarFonteSchema.partial().omit({ membroFamiliaId: true })

// ===========================================
// HELPERS
// ===========================================

async function getCandidatoDoUsuario(usuarioId: string) {
  const candidato = await prisma.candidato.findUnique({ where: { usuarioId } })
  if (!candidato) throw new CandidatoNaoEncontradoError()
  return candidato
}

async function verificarPropriedadeFonte(fonteId: string, candidatoId: string) {
  const fonte = await prisma.fonteRenda.findUnique({
    where: { id: fonteId },
    include: { membroFamilia: true },
  })
  if (!fonte) throw new RecursoNaoEncontradoError('Fonte de renda')
  if (fonte.candidatoId === candidatoId) return fonte
  if (fonte.membroFamiliaId && fonte.membroFamilia?.candidatoId === candidatoId) return fonte
  throw new NaoAutorizadoError()
}

// ===========================================
// CONTROLLERS
// ===========================================

/**
 * GET /fontes-renda
 * Lista todas as fontes de renda do grupo familiar (candidato + membros)
 */
export async function listarFontesRenda(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await getCandidatoDoUsuario(request.usuario.id)

  const fontesCandidato = await prisma.fonteRenda.findMany({
    where: { candidatoId: candidato.id },
    include: {
      rendasMensais: { orderBy: [{ ano: 'desc' }, { mes: 'desc' }] },
    },
    orderBy: { criadoEm: 'asc' },
  })

  const membros = await prisma.membroFamilia.findMany({
    where: { candidatoId: candidato.id },
    include: {
      fontesRenda: {
        include: {
          rendasMensais: { orderBy: [{ ano: 'desc' }, { mes: 'desc' }] },
        },
        orderBy: { criadoEm: 'asc' },
      },
    },
    orderBy: { criadoEm: 'asc' },
  })

  const serializeRendas = (rendas: any[]) => rendas.map(r => ({
    ...r,
    valor: r.valor?.toNumber() || 0,
    rendaBruta: r.rendaBruta?.toNumber() || 0,
    auxilioAlimentacao: r.auxilioAlimentacao?.toNumber() || 0,
    auxilioTransporte: r.auxilioTransporte?.toNumber() || 0,
    adiantamentos: r.adiantamentos?.toNumber() || 0,
    indenizacoes: r.indenizacoes?.toNumber() || 0,
    estornosCompensacoes: r.estornosCompensacoes?.toNumber() || 0,
    pensaoAlimenticiaPaga: r.pensaoAlimenticiaPaga?.toNumber() || 0,
  }))

  const integrantes = [
    {
      id: candidato.id,
      nome: candidato.nome,
      parentesco: 'Candidato(a)',
      tipo: 'candidato' as const,
      fontes: fontesCandidato.map(f => ({
        ...f,
        rendasMensais: serializeRendas(f.rendasMensais),
      })),
    },
    ...membros.map(m => ({
      id: m.id,
      nome: m.nome,
      parentesco: m.parentesco,
      tipo: 'membro' as const,
      fontes: m.fontesRenda.map(f => ({
        ...f,
        rendasMensais: serializeRendas(f.rendasMensais),
      })),
    })),
  ]

  // Calcular resumo (últimos 6 meses)
  const now = new Date()
  const ultimos6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return { mes: d.getMonth() + 1, ano: d.getFullYear() }
  })

  let somaRendaBruta = 0
  let somaPensaoPaga = 0
  let mesesComDados = 0

  for (const { mes, ano } of ultimos6) {
    let totalMesRendaBruta = 0
    let totalMesPensao = 0
    let temDado = false

    for (const integrante of integrantes) {
      for (const fonte of integrante.fontes) {
        const rendaMes = fonte.rendasMensais.find((r: any) => r.mes === mes && r.ano === ano)
        if (rendaMes) {
          totalMesRendaBruta += rendaMes.rendaBruta || rendaMes.valor || 0
          totalMesPensao += rendaMes.pensaoAlimenticiaPaga || 0
          temDado = true
        }
      }
    }

    somaRendaBruta += totalMesRendaBruta
    somaPensaoPaga += totalMesPensao
    if (temDado) mesesComDados++
  }

  const rendaMediaMensal = mesesComDados > 0 ? (somaRendaBruta - somaPensaoPaga) / mesesComDados : 0
  const totalPessoas = membros.length + 1
  const rendaPerCapita = totalPessoas > 0 ? rendaMediaMensal / totalPessoas : 0

  return reply.status(200).send({
    integrantes,
    resumo: {
      rendaMediaMensal: Math.round(rendaMediaMensal * 100) / 100,
      rendaPerCapita: Math.round(rendaPerCapita * 100) / 100,
      totalPessoas,
      mesesAnalisados: 6,
      mesesComDados,
    },
  })
}

/**
 * POST /fontes-renda
 */
export async function criarFonteRenda(request: FastifyRequest, reply: FastifyReply) {
  const dados = criarFonteSchema.parse(request.body)
  const candidato = await getCandidatoDoUsuario(request.usuario.id)

  let vincData: { candidatoId?: string; membroFamiliaId?: string } = {}

  if (dados.membroFamiliaId) {
    const membro = await prisma.membroFamilia.findUnique({ where: { id: dados.membroFamiliaId } })
    if (!membro || membro.candidatoId !== candidato.id) throw new NaoAutorizadoError()
    vincData = { membroFamiliaId: dados.membroFamiliaId }
  } else {
    vincData = { candidatoId: candidato.id }
  }

  const fonte = await prisma.fonteRenda.create({
    data: {
      ...vincData,
      tipo: dados.tipo,
      documentoEmpregador: dados.documentoEmpregador,
      nomeFontePagadora: dados.nomeFontePagadora,
      telefoneFonte: dados.telefoneFonte,
      atividadeExercida: dados.atividadeExercida,
      dataInicio: dados.dataInicio ? new Date(dados.dataInicio) : undefined,
      descricaoBeneficio: dados.descricaoBeneficio,
      numeroBeneficio: dados.numeroBeneficio,
      instituicaoEnsino: dados.instituicaoEnsino,
      cursoSerie: dados.cursoSerie,
    },
  })

  return reply.status(201).send({ fonte })
}

/**
 * PUT /fontes-renda/:id
 */
export async function atualizarFonteRenda(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const dados = atualizarFonteSchema.parse(request.body)
  const candidato = await getCandidatoDoUsuario(request.usuario.id)

  await verificarPropriedadeFonte(id, candidato.id)

  const fonte = await prisma.fonteRenda.update({
    where: { id },
    data: {
      ...(dados.tipo !== undefined && { tipo: dados.tipo }),
      ...(dados.documentoEmpregador !== undefined && { documentoEmpregador: dados.documentoEmpregador }),
      ...(dados.nomeFontePagadora !== undefined && { nomeFontePagadora: dados.nomeFontePagadora }),
      ...(dados.telefoneFonte !== undefined && { telefoneFonte: dados.telefoneFonte }),
      ...(dados.atividadeExercida !== undefined && { atividadeExercida: dados.atividadeExercida }),
      ...(dados.dataInicio !== undefined && { dataInicio: dados.dataInicio ? new Date(dados.dataInicio) : null }),
      ...(dados.descricaoBeneficio !== undefined && { descricaoBeneficio: dados.descricaoBeneficio }),
      ...(dados.numeroBeneficio !== undefined && { numeroBeneficio: dados.numeroBeneficio }),
      ...(dados.instituicaoEnsino !== undefined && { instituicaoEnsino: dados.instituicaoEnsino }),
      ...(dados.cursoSerie !== undefined && { cursoSerie: dados.cursoSerie }),
    },
  })

  return reply.status(200).send({ fonte })
}

/**
 * DELETE /fontes-renda/:id
 */
export async function excluirFonteRenda(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  await verificarPropriedadeFonte(id, candidato.id)
  await prisma.fonteRenda.delete({ where: { id } })
  return reply.status(204).send()
}

/**
 * GET /fontes-renda/:id
 */
export async function buscarFonteRenda(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  await verificarPropriedadeFonte(id, candidato.id)

  const fonteCompleta = await prisma.fonteRenda.findUnique({
    where: { id },
    include: {
      rendasMensais: { orderBy: [{ ano: 'desc' }, { mes: 'desc' }] },
    },
  })

  return reply.status(200).send({
    fonte: {
      ...fonteCompleta,
      rendasMensais: fonteCompleta?.rendasMensais.map(r => ({
        ...r,
        valor: r.valor?.toNumber() || 0,
        rendaBruta: r.rendaBruta?.toNumber() || 0,
        auxilioAlimentacao: r.auxilioAlimentacao?.toNumber() || 0,
        auxilioTransporte: r.auxilioTransporte?.toNumber() || 0,
        adiantamentos: r.adiantamentos?.toNumber() || 0,
        indenizacoes: r.indenizacoes?.toNumber() || 0,
        estornosCompensacoes: r.estornosCompensacoes?.toNumber() || 0,
        pensaoAlimenticiaPaga: r.pensaoAlimenticiaPaga?.toNumber() || 0,
      })),
    },
  })
}

/**
 * POST /fontes-renda/:id/comprovante-matricula
 */
export async function uploadComprovanteMatricula(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  await verificarPropriedadeFonte(id, candidato.id)

  const data = await request.file()
  if (!data) return reply.status(400).send({ message: 'Nenhum arquivo enviado' })

  if (!validarTipoArquivo(data.mimetype, data.filename || '')) {
    throw new ArquivoInvalidoError('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.')
  }

  const chunks: Buffer[] = []
  let totalSize = 0
  for await (const chunk of data.file) {
    totalSize += chunk.length
    if (totalSize > 10 * 1024 * 1024) {
      return reply.status(400).send({ message: 'Arquivo excede o limite de 10MB' })
    }
    chunks.push(chunk)
  }

  const buffer = Buffer.concat(chunks)
  const dir = path.join(UPLOADS_DIR, 'fontes-renda', id)
  fs.mkdirSync(dir, { recursive: true })

  const nomeArquivo = gerarNomeArquivo(data.filename || 'comprovante.pdf')
  const filePath = path.join(dir, nomeArquivo)
  fs.writeFileSync(filePath, buffer)

  const fonte = await prisma.fonteRenda.update({
    where: { id },
    data: {
      comprovanteMatriculaUrl: filePath,
      comprovanteMatriculaNome: data.filename || nomeArquivo,
    },
  })

  return reply.status(200).send({ fonte })
}
