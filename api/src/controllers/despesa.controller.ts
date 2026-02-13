import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { CandidatoNaoEncontradoError, RecursoNaoEncontradoError, NaoAutorizadoError } from '../errors/index'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const criarDespesaSchema = z.object({
  mes: z.number().min(1).max(12),
  ano: z.number().min(2020).max(2100),
  categoria: z.string(),
  descricao: z.string().optional(),
  valor: z.number().min(0),
})

const atualizarDespesaSchema = criarDespesaSchema.partial()

const CATEGORIAS_DESPESA = [
  'MORADIA', 'ALIMENTACAO', 'TRANSPORTE', 'SAUDE',
  'EDUCACAO', 'LAZER', 'VESTUARIO', 'OUTROS',
]

// ===========================================
// CONTROLLERS
// ===========================================

// Listar despesas do candidato (com filtro por mês/ano)
export async function listarDespesas(request: FastifyRequest, reply: FastifyReply) {
  const { mes, ano } = z.object({
    mes: z.coerce.number().min(1).max(12).optional(),
    ano: z.coerce.number().min(2020).max(2100).optional(),
  }).parse(request.query)

  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) throw new CandidatoNaoEncontradoError()

  const where: any = { candidatoId: candidato.id }
  if (mes) where.mes = mes
  if (ano) where.ano = ano

  const despesas = await prisma.despesaMensal.findMany({
    where,
    orderBy: [{ ano: 'desc' }, { mes: 'desc' }, { categoria: 'asc' }],
  })

  // Calcular totais
  const totalGeral = despesas.reduce((acc, d) => acc + d.valor.toNumber(), 0)
  
  // Agrupar por mês/ano
  const porMes: Record<string, { despesas: typeof despesas; total: number }> = {}
  despesas.forEach(d => {
    const chave = `${d.ano}-${String(d.mes).padStart(2, '0')}`
    if (!porMes[chave]) porMes[chave] = { despesas: [], total: 0 }
    porMes[chave].despesas.push(d)
    porMes[chave].total += d.valor.toNumber()
  })

  // Calcular média trimestral (últimos 3 meses)
  const now = new Date()
  const mesesRecentes: number[] = []
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const mesData = porMes[chave]
    mesesRecentes.push(mesData ? mesData.total : 0)
  }
  const mediaTrimestre = mesesRecentes.reduce((a, b) => a + b, 0) / 3

  return reply.status(200).send({
    despesas,
    resumo: {
      totalGeral: Math.round(totalGeral * 100) / 100,
      mediaTrimestre: Math.round(mediaTrimestre * 100) / 100,
      ultimoMes: mesesRecentes[0] || 0,
      porMes,
    },
    categorias: CATEGORIAS_DESPESA,
  })
}

// Criar despesa
export async function criarDespesa(request: FastifyRequest, reply: FastifyReply) {
  const dados = criarDespesaSchema.parse(request.body)

  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) throw new CandidatoNaoEncontradoError()

  const despesa = await prisma.despesaMensal.create({
    data: {
      ...dados,
      candidatoId: candidato.id,
    } as any,
  })

  return reply.status(201).send({ despesa })
}

// Atualizar despesa
export async function atualizarDespesa(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const dados = atualizarDespesaSchema.parse(request.body)

  const despesa = await prisma.despesaMensal.findUnique({
    where: { id },
    include: { candidato: true },
  })

  if (!despesa) throw new RecursoNaoEncontradoError('Despesa')
  if (despesa.candidato.usuarioId !== request.usuario.id) throw new NaoAutorizadoError()

  const despesaAtualizada = await prisma.despesaMensal.update({
    where: { id },
    data: dados,
  })

  return reply.status(200).send({ despesa: despesaAtualizada })
}

// Excluir despesa
export async function excluirDespesa(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const despesa = await prisma.despesaMensal.findUnique({
    where: { id },
    include: { candidato: true },
  })

  if (!despesa) throw new RecursoNaoEncontradoError('Despesa')
  if (despesa.candidato.usuarioId !== request.usuario.id) throw new NaoAutorizadoError()

  await prisma.despesaMensal.delete({ where: { id } })

  return reply.status(204).send()
}

// Resumo de despesas por mês (para a tela de gastos)
export async function resumoDespesas(request: FastifyRequest, reply: FastifyReply) {
  const { mes, ano } = z.object({
    mes: z.coerce.number().min(1).max(12),
    ano: z.coerce.number().min(2020).max(2100),
  }).parse(request.params)

  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) throw new CandidatoNaoEncontradoError()

  const despesas = await prisma.despesaMensal.findMany({
    where: { candidatoId: candidato.id, mes, ano },
    orderBy: { categoria: 'asc' },
  })

  const total = despesas.reduce((acc, d) => acc + d.valor.toNumber(), 0)

  // Agrupar por categoria
  const porCategoria: Record<string, { itens: typeof despesas; total: number }> = {}
  despesas.forEach(d => {
    if (!porCategoria[d.categoria]) porCategoria[d.categoria] = { itens: [], total: 0 }
    porCategoria[d.categoria].itens.push(d)
    porCategoria[d.categoria].total += d.valor.toNumber()
  })

  return reply.status(200).send({
    despesas,
    total: Math.round(total * 100) / 100,
    porCategoria,
  })
}
