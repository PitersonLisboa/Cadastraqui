import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { CandidatoNaoEncontradoError, RecursoNaoEncontradoError, NaoAutorizadoError } from '../errors/index'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const criarMembroSchema = z.object({
  // Step 1 - Parentesco
  parentesco: z.string().min(1),
  // Step 2 - Dados Pessoais
  nome: z.string().min(2),
  cpf: z.string().optional(),
  dataNascimento: z.coerce.date().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  rg: z.string().optional(),
  rgEstado: z.string().optional(),
  rgOrgao: z.string().optional(),
  // Step 3 - Info Adicionais
  nomeSocial: z.string().optional(),
  sexo: z.string().optional(),
  profissao: z.string().optional(),
  nacionalidade: z.string().optional(),
  naturalidade: z.string().optional(),
  estado: z.string().optional(),
  // Step 4 - Estado Civil
  estadoCivil: z.string().optional(),
  // Step 5 - Info Pessoais
  corRaca: z.string().optional(),
  escolaridade: z.string().optional(),
  religiao: z.string().optional(),
  necessidadesEspeciais: z.boolean().optional(),
  tipoNecessidadesEspeciais: z.string().optional(),
  descricaoNecessidadesEspeciais: z.string().optional(),
  // Step 8 - Benefícios
  cadastroUnico: z.boolean().optional(),
  escolaPublica: z.boolean().optional(),
  bolsaCebasBasica: z.boolean().optional(),
  bolsaCebasProfissional: z.boolean().optional(),
  // Campos originais
  renda: z.number().min(0).optional(),
  ocupacao: z.string().optional(),
  fonteRenda: z.string().optional(),
})

const atualizarMembroSchema = criarMembroSchema.partial()

// ===========================================
// CONTROLLERS
// ===========================================

// Listar membros da família
export async function listarMembros(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) {
    return reply.status(200).send({
      membros: [],
      resumo: { totalMembros: 0, rendaTotal: 0, rendaPerCapita: 0 },
    })
  }

  const membros = await prisma.membroFamilia.findMany({
    where: { candidatoId: candidato.id },
    orderBy: { criadoEm: 'asc' },
  })

  // Calcular renda total
  const rendaTotal = membros.reduce((acc, m) => acc + (m.renda?.toNumber() || 0), 0)
  const rendaPerCapita = membros.length > 0 ? rendaTotal / (membros.length + 1) : 0

  return reply.status(200).send({ 
    membros,
    resumo: {
      totalMembros: membros.length,
      rendaTotal,
      rendaPerCapita: Math.round(rendaPerCapita * 100) / 100,
    }
  })
}

// Adicionar membro
export async function adicionarMembro(request: FastifyRequest, reply: FastifyReply) {
  let dados: any
  try {
    dados = criarMembroSchema.parse(request.body)
  } catch (err: any) {
    const issues = err.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`) || []
    return reply.status(400).send({ message: 'Erro de validação', errors: issues })
  }

  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) {
    throw new CandidatoNaoEncontradoError()
  }

  try {
    const membro = await prisma.membroFamilia.create({
      data: {
        nome: dados.nome,
        parentesco: dados.parentesco,
        cpf: dados.cpf || undefined,
        dataNascimento: dados.dataNascimento || undefined,
        telefone: dados.telefone || undefined,
        email: dados.email || undefined,
        rg: dados.rg || undefined,
        rgEstado: dados.rgEstado || undefined,
        rgOrgao: dados.rgOrgao || undefined,
        nomeSocial: dados.nomeSocial || undefined,
        sexo: dados.sexo || undefined,
        profissao: dados.profissao || undefined,
        nacionalidade: dados.nacionalidade || undefined,
        naturalidade: dados.naturalidade || undefined,
        estado: dados.estado || undefined,
        estadoCivil: dados.estadoCivil || undefined,
        corRaca: dados.corRaca || undefined,
        escolaridade: dados.escolaridade || undefined,
        religiao: dados.religiao || undefined,
        necessidadesEspeciais: dados.necessidadesEspeciais ?? false,
        tipoNecessidadesEspeciais: dados.tipoNecessidadesEspeciais || undefined,
        descricaoNecessidadesEspeciais: dados.descricaoNecessidadesEspeciais || undefined,
        cadastroUnico: dados.cadastroUnico ?? false,
        escolaPublica: dados.escolaPublica ?? false,
        bolsaCebasBasica: dados.bolsaCebasBasica ?? false,
        bolsaCebasProfissional: dados.bolsaCebasProfissional ?? false,
        renda: dados.renda != null ? dados.renda : undefined,
        ocupacao: dados.ocupacao || undefined,
        fonteRenda: dados.fonteRenda || undefined,
        candidato: { connect: { id: candidato.id } },
      },
    })

    return reply.status(201).send({ membro })
  } catch (error: any) {
    console.error('Erro ao adicionar membro:', error.message, error.code, error.meta)
    return reply.status(500).send({ message: 'Erro ao adicionar membro', detail: error.message })
  }
}

// Buscar membro
export async function buscarMembro(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const membro = await prisma.membroFamilia.findUnique({
    where: { id },
    include: { candidato: true },
  })

  if (!membro) {
    throw new RecursoNaoEncontradoError('Membro da família')
  }

  if (membro.candidato.usuarioId !== request.usuario.id) {
    throw new NaoAutorizadoError()
  }

  return reply.status(200).send(membro)
}

// Atualizar membro
export async function atualizarMembro(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  
  let dados: any
  try {
    dados = atualizarMembroSchema.parse(request.body)
  } catch (err: any) {
    const issues = err.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`) || []
    return reply.status(400).send({ message: 'Erro de validação', errors: issues })
  }

  const membro = await prisma.membroFamilia.findUnique({
    where: { id },
    include: { candidato: true },
  })

  if (!membro) {
    throw new RecursoNaoEncontradoError('Membro da família')
  }

  if (membro.candidato.usuarioId !== request.usuario.id) {
    throw new NaoAutorizadoError()
  }

  const membroAtualizado = await prisma.membroFamilia.update({
    where: { id },
    data: dados,
  })

  return reply.status(200).send({ membro: membroAtualizado })
}

// Excluir membro
export async function excluirMembro(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const membro = await prisma.membroFamilia.findUnique({
    where: { id },
    include: { candidato: true },
  })

  if (!membro) {
    throw new RecursoNaoEncontradoError('Membro da família')
  }

  if (membro.candidato.usuarioId !== request.usuario.id) {
    throw new NaoAutorizadoError()
  }

  await prisma.membroFamilia.delete({ where: { id } })

  return reply.status(204).send()
}

// Composição familiar completa (para análise)
export async function composicaoFamiliar(request: FastifyRequest, reply: FastifyReply) {
  const { candidatoId } = z.object({ candidatoId: z.string().uuid() }).parse(request.params)

  const candidato = await prisma.candidato.findUnique({
    where: { id: candidatoId },
    include: {
      usuario: { select: { email: true } },
      membrosFamilia: {
        orderBy: { dataNascimento: 'asc' },
      },
    },
  })

  if (!candidato) {
    throw new CandidatoNaoEncontradoError()
  }

  // Calcular estatísticas
  const membros = candidato.membrosFamilia
  const rendaTotal = membros.reduce((acc, m) => acc + (m.renda?.toNumber() || 0), 0)
  const rendaCandidato = 0
  const rendaFamiliar = rendaTotal + rendaCandidato
  const totalPessoas = membros.length + 1
  const rendaPerCapita = rendaFamiliar / totalPessoas

  // Faixas etárias
  const hoje = new Date()
  const menores = membros.filter(m => {
    if (!m.dataNascimento) return false
    const idade = Math.floor((hoje.getTime() - m.dataNascimento.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    return idade < 18
  }).length

  const idosos = membros.filter(m => {
    if (!m.dataNascimento) return false
    const idade = Math.floor((hoje.getTime() - m.dataNascimento.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    return idade >= 60
  }).length

  return reply.status(200).send({
    candidato: {
      id: candidato.id,
      nome: candidato.nome,
      cpf: candidato.cpf,
      renda: rendaCandidato,
    },
    membros,
    estatisticas: {
      totalMembros: membros.length,
      totalPessoas,
      menores,
      idosos,
      rendaFamiliar: Math.round(rendaFamiliar * 100) / 100,
      rendaPerCapita: Math.round(rendaPerCapita * 100) / 100,
    },
  })
}
