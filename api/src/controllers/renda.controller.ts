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

const salvarRendaMensalSchema = z.object({
  fonteRendaId: z.string().uuid(),
  mes: z.number().min(1).max(12),
  ano: z.number().min(2020).max(2100),
  rendaBruta: z.number().min(0),
  auxilioAlimentacao: z.number().min(0).default(0),
  auxilioTransporte: z.number().min(0).default(0),
  adiantamentos: z.number().min(0).default(0),
  indenizacoes: z.number().min(0).default(0),
  estornosCompensacoes: z.number().min(0).default(0),
  pensaoAlimenticiaPaga: z.number().min(0).default(0),
})

const salvarRendasBatchSchema = z.object({
  fonteRendaId: z.string().uuid(),
  rendas: z.array(z.object({
    mes: z.number().min(1).max(12),
    ano: z.number().min(2020).max(2100),
    rendaBruta: z.number().min(0),
    auxilioAlimentacao: z.number().min(0).default(0),
    auxilioTransporte: z.number().min(0).default(0),
    adiantamentos: z.number().min(0).default(0),
    indenizacoes: z.number().min(0).default(0),
    estornosCompensacoes: z.number().min(0).default(0),
    pensaoAlimenticiaPaga: z.number().min(0).default(0),
  })),
})

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

async function recalcularRendaFamiliar(candidatoId: string) {
  const fontesCandidato = await prisma.fonteRenda.findMany({
    where: { candidatoId },
    select: { id: true },
  })
  const fontesMembros = await prisma.fonteRenda.findMany({
    where: { membroFamilia: { candidatoId } },
    select: { id: true },
  })

  const todasFontesIds = [
    ...fontesCandidato.map(f => f.id),
    ...fontesMembros.map(f => f.id),
  ]

  if (todasFontesIds.length === 0) {
    await prisma.candidato.update({ where: { id: candidatoId }, data: { rendaFamiliar: 0 } })
    return
  }

  const todasRendas = await prisma.rendaMensal.findMany({
    where: { fonteRendaId: { in: todasFontesIds } },
  })

  const now = new Date()
  let somaLiquida = 0
  let mesesComDados = 0

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mesRef = d.getMonth() + 1
    const anoRef = d.getFullYear()
    const rendasMes = todasRendas.filter(r => r.mes === mesRef && r.ano === anoRef)

    if (rendasMes.length > 0) {
      const totalBruto = rendasMes.reduce((acc, r) => acc + (r.rendaBruta?.toNumber() || r.valor.toNumber()), 0)
      const totalPensao = rendasMes.reduce((acc, r) => acc + (r.pensaoAlimenticiaPaga?.toNumber() || 0), 0)
      somaLiquida += (totalBruto - totalPensao)
      mesesComDados++
    }
  }

  const media = mesesComDados > 0 ? somaLiquida / mesesComDados : 0
  await prisma.candidato.update({
    where: { id: candidatoId },
    data: { rendaFamiliar: Math.round(media * 100) / 100 },
  })
}

// ===========================================
// CONTROLLERS
// ===========================================

export async function listarRendas(request: FastifyRequest, reply: FastifyReply) {
  const { mes, ano } = z.object({
    mes: z.coerce.number().min(1).max(12).optional(),
    ano: z.coerce.number().min(2020).max(2100).optional(),
  }).parse(request.query)

  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) {
    return reply.status(200).send({
      membros: [],
      resumo: { rendaMediaMensal: 0, rendaPerCapita: 0, totalPessoas: 1, totalMembros: 0, mesesAnalisados: 6 },
    })
  }

  const membros = await prisma.membroFamilia.findMany({
    where: { candidatoId: candidato.id },
    include: {
      rendaMensal: {
        where: { ...(mes ? { mes } : {}), ...(ano ? { ano } : {}) },
        orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
      },
    },
    orderBy: { criadoEm: 'asc' },
  })

  const todasRendas = membros.flatMap(m => m.rendaMensal)
  const now = new Date()
  let somaSemestre = 0
  let mesesComDados = 0
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mesRef = d.getMonth() + 1
    const anoRef = d.getFullYear()
    const rendasMes = todasRendas.filter(r => r.mes === mesRef && r.ano === anoRef)
    const totalMes = rendasMes.reduce((acc, r) => acc + (r.rendaBruta?.toNumber() || r.valor.toNumber()), 0)
    somaSemestre += totalMes
    if (rendasMes.length > 0) mesesComDados++
  }
  const mediaRendaMensal = mesesComDados > 0 ? somaSemestre / mesesComDados : 0
  const totalPessoas = membros.length + 1
  const rendaPerCapita = totalPessoas > 0 ? mediaRendaMensal / totalPessoas : 0

  return reply.status(200).send({
    membros: membros.map(m => ({
      id: m.id,
      nome: m.nome,
      parentesco: m.parentesco,
      ocupacao: m.ocupacao,
      rendaFixa: m.renda?.toNumber() || 0,
      rendaMensal: m.rendaMensal.map(r => ({
        ...r,
        valor: r.valor.toNumber(),
        rendaBruta: r.rendaBruta?.toNumber() || 0,
      })),
    })),
    resumo: {
      rendaMediaMensal: Math.round(mediaRendaMensal * 100) / 100,
      rendaPerCapita: Math.round(rendaPerCapita * 100) / 100,
      totalPessoas,
      totalMembros: membros.length,
      mesesAnalisados: 6,
    },
  })
}

export async function salvarRenda(request: FastifyRequest, reply: FastifyReply) {
  const dados = salvarRendaMensalSchema.parse(request.body)
  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  const fonte = await verificarPropriedadeFonte(dados.fonteRendaId, candidato.id)

  const existente = await prisma.rendaMensal.findFirst({
    where: { fonteRendaId: dados.fonteRendaId, mes: dados.mes, ano: dados.ano },
  })

  const rendaData = {
    rendaBruta: dados.rendaBruta, valor: dados.rendaBruta,
    auxilioAlimentacao: dados.auxilioAlimentacao, auxilioTransporte: dados.auxilioTransporte,
    adiantamentos: dados.adiantamentos, indenizacoes: dados.indenizacoes,
    estornosCompensacoes: dados.estornosCompensacoes, pensaoAlimenticiaPaga: dados.pensaoAlimenticiaPaga,
  }

  let renda
  if (existente) {
    renda = await prisma.rendaMensal.update({ where: { id: existente.id }, data: rendaData })
  } else {
    renda = await prisma.rendaMensal.create({
      data: {
        mes: dados.mes, ano: dados.ano, ...rendaData,
        fonteRenda: { connect: { id: dados.fonteRendaId } },
        ...(fonte.membroFamiliaId ? { membro: { connect: { id: fonte.membroFamiliaId } } } : {}),
        ...(fonte.candidatoId ? { candidato: { connect: { id: fonte.candidatoId } } } : {}),
      },
    })
  }

  await recalcularRendaFamiliar(candidato.id)

  return reply.status(201).send({
    renda: {
      ...renda, valor: renda.valor.toNumber(), rendaBruta: renda.rendaBruta?.toNumber() || 0,
      auxilioAlimentacao: renda.auxilioAlimentacao?.toNumber() || 0,
      auxilioTransporte: renda.auxilioTransporte?.toNumber() || 0,
      adiantamentos: renda.adiantamentos?.toNumber() || 0,
      indenizacoes: renda.indenizacoes?.toNumber() || 0,
      estornosCompensacoes: renda.estornosCompensacoes?.toNumber() || 0,
      pensaoAlimenticiaPaga: renda.pensaoAlimenticiaPaga?.toNumber() || 0,
    },
  })
}

export async function salvarRendasBatch(request: FastifyRequest, reply: FastifyReply) {
  const dados = salvarRendasBatchSchema.parse(request.body)
  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  const fonte = await verificarPropriedadeFonte(dados.fonteRendaId, candidato.id)

  const resultados = []
  for (const renda of dados.rendas) {
    const existente = await prisma.rendaMensal.findFirst({
      where: { fonteRendaId: dados.fonteRendaId, mes: renda.mes, ano: renda.ano },
    })
    const rendaData = {
      rendaBruta: renda.rendaBruta, valor: renda.rendaBruta,
      auxilioAlimentacao: renda.auxilioAlimentacao, auxilioTransporte: renda.auxilioTransporte,
      adiantamentos: renda.adiantamentos, indenizacoes: renda.indenizacoes,
      estornosCompensacoes: renda.estornosCompensacoes, pensaoAlimenticiaPaga: renda.pensaoAlimenticiaPaga,
    }
    if (existente) {
      resultados.push(await prisma.rendaMensal.update({ where: { id: existente.id }, data: rendaData }))
    } else {
      resultados.push(await prisma.rendaMensal.create({
        data: {
          mes: renda.mes, ano: renda.ano, ...rendaData,
          fonteRenda: { connect: { id: dados.fonteRendaId } },
          ...(fonte.membroFamiliaId ? { membro: { connect: { id: fonte.membroFamiliaId } } } : {}),
          ...(fonte.candidatoId ? { candidato: { connect: { id: fonte.candidatoId } } } : {}),
        },
      }))
    }
  }

  await recalcularRendaFamiliar(candidato.id)
  return reply.status(201).send({
    rendas: resultados.map(r => ({ ...r, valor: r.valor.toNumber(), rendaBruta: r.rendaBruta?.toNumber() || 0 })),
    total: resultados.length,
  })
}

export async function excluirRenda(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const renda = await prisma.rendaMensal.findUnique({
    where: { id },
    include: {
      membro: { include: { candidato: true } },
      fonteRenda: { include: { membroFamilia: { include: { candidato: true } } } },
      candidato: true,
    },
  })
  if (!renda) throw new RecursoNaoEncontradoError('Renda')

  let candidatoId: string | null = null
  if (renda.candidatoId) candidatoId = renda.candidatoId
  else if (renda.membro?.candidato?.id) candidatoId = renda.membro.candidato.id
  else if (renda.fonteRenda?.candidatoId) candidatoId = renda.fonteRenda.candidatoId
  else if (renda.fonteRenda?.membroFamilia?.candidato?.id) candidatoId = renda.fonteRenda.membroFamilia.candidato.id

  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  if (candidatoId !== candidato.id) throw new NaoAutorizadoError()

  await prisma.rendaMensal.delete({ where: { id } })
  await recalcularRendaFamiliar(candidato.id)
  return reply.status(204).send()
}

export async function rendasDoMembro(request: FastifyRequest, reply: FastifyReply) {
  const { membroId } = z.object({ membroId: z.string().uuid() }).parse(request.params)
  const candidato = await getCandidatoDoUsuario(request.usuario.id)

  const membro = await prisma.membroFamilia.findUnique({
    where: { id: membroId },
    include: { rendaMensal: { orderBy: [{ ano: 'desc' }, { mes: 'desc' }] } },
  })
  if (!membro || membro.candidatoId !== candidato.id) throw new NaoAutorizadoError()

  const totalRendas = membro.rendaMensal.reduce((acc, r) => acc + (r.rendaBruta?.toNumber() || r.valor.toNumber()), 0)
  const mediaRenda = membro.rendaMensal.length > 0 ? totalRendas / membro.rendaMensal.length : 0

  return reply.status(200).send({
    membro: { id: membro.id, nome: membro.nome, parentesco: membro.parentesco, ocupacao: membro.ocupacao },
    rendas: membro.rendaMensal.map(r => ({ ...r, valor: r.valor.toNumber(), rendaBruta: r.rendaBruta?.toNumber() || 0 })),
    resumo: { totalRegistros: membro.rendaMensal.length, mediaRenda: Math.round(mediaRenda * 100) / 100 },
  })
}

export async function uploadComprovante(request: FastifyRequest, reply: FastifyReply) {
  const params = z.object({
    fonteRendaId: z.string().uuid(),
    mes: z.coerce.number().min(1).max(12),
    ano: z.coerce.number().min(2020).max(2100),
  }).parse(request.params)

  const candidato = await getCandidatoDoUsuario(request.usuario.id)
  await verificarPropriedadeFonte(params.fonteRendaId, candidato.id)

  const data = await request.file()
  if (!data) return reply.status(400).send({ message: 'Nenhum arquivo enviado' })
  if (!validarTipoArquivo(data.mimetype, data.filename || '')) {
    throw new ArquivoInvalidoError('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.')
  }

  const chunks: Buffer[] = []
  let totalSize = 0
  for await (const chunk of data.file) {
    totalSize += chunk.length
    if (totalSize > 10 * 1024 * 1024) return reply.status(400).send({ message: 'Arquivo excede 10MB' })
    chunks.push(chunk)
  }

  const buffer = Buffer.concat(chunks)
  const dir = path.join(UPLOADS_DIR, 'comprovantes-renda', params.fonteRendaId)
  fs.mkdirSync(dir, { recursive: true })
  const nomeArquivo = gerarNomeArquivo(data.filename || 'comprovante.pdf')
  const filePath = path.join(dir, nomeArquivo)
  fs.writeFileSync(filePath, buffer)

  let renda = await prisma.rendaMensal.findFirst({
    where: { fonteRendaId: params.fonteRendaId, mes: params.mes, ano: params.ano },
  })

  if (renda) {
    renda = await prisma.rendaMensal.update({
      where: { id: renda.id },
      data: { comprovanteUrl: filePath, comprovanteNome: data.filename || nomeArquivo },
    })
  } else {
    const fonte = await prisma.fonteRenda.findUnique({ where: { id: params.fonteRendaId } })
    renda = await prisma.rendaMensal.create({
      data: {
        mes: params.mes, ano: params.ano, valor: 0, rendaBruta: 0,
        comprovanteUrl: filePath, comprovanteNome: data.filename || nomeArquivo,
        fonteRenda: { connect: { id: params.fonteRendaId } },
        ...(fonte?.membroFamiliaId ? { membro: { connect: { id: fonte.membroFamiliaId } } } : {}),
        ...(fonte?.candidatoId ? { candidato: { connect: { id: fonte.candidatoId } } } : {}),
      },
    })
  }

  return reply.status(200).send({
    renda: { ...renda, valor: renda.valor.toNumber(), rendaBruta: renda.rendaBruta?.toNumber() || 0 },
  })
}
