import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import {
  CandidatoNaoEncontradoError,
  CpfJaCadastradoError,
  NaoAutorizadoError,
} from '../errors/index'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const criarCandidatoSchema = z.object({
  // Dados pessoais
  nome: z.string().min(2),
  cpf: z.string().min(11).max(14),
  dataNascimento: z.coerce.date().optional(),
  telefone: z.string().optional(),
  celular: z.string().optional(),

  // Endereço
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),

  // Documentos
  rg: z.string().optional(),
  rgEstado: z.string().optional(),
  rgOrgao: z.string().optional(),
  possuiComprovante: z.boolean().optional(),

  // Dados adicionais
  nomeSocial: z.string().optional(),
  sexo: z.string().optional(),
  profissao: z.string().optional(),
  nacionalidade: z.string().optional(),
  naturalidade: z.string().optional(),
  naturalidadeEstado: z.string().optional(),

  // Estado civil
  estadoCivil: z.string().optional(),

  // Informações pessoais extra
  corRaca: z.string().optional(),
  escolaridade: z.string().optional(),
  religiao: z.string().optional(),
  necessidadesEspeciais: z.boolean().optional(),
  tipoNecessidadesEspeciais: z.string().optional(),
  descricaoNecessidadesEspeciais: z.string().optional(),

  // Benefícios
  cadastroUnico: z.boolean().optional(),
  escolaPublica: z.boolean().optional(),
  bolsaCebasBasica: z.boolean().optional(),
  bolsaCebasProfissional: z.boolean().optional(),

  // Renda
  rendaFamiliar: z.coerce.number().optional(),
})

const atualizarCandidatoSchema = criarCandidatoSchema.partial()

const listarCandidatosSchema = z.object({
  pagina: z.coerce.number().min(1).default(1),
  limite: z.coerce.number().min(1).max(100).default(10),
  busca: z.string().optional(),
  ordenarPor: z.string().optional().default('criadoEm'),
  ordem: z.enum(['asc', 'desc']).optional().default('desc'),
})

// ===========================================
// CONTROLLERS
// ===========================================

export async function listarCandidatos(request: FastifyRequest, reply: FastifyReply) {
  const { pagina, limite, busca, ordenarPor, ordem } = listarCandidatosSchema.parse(request.query)

  // Multi-tenant: filtrar por instituição (ADMIN vê todos)
  const tenantFilter = request.usuario.role === 'ADMIN'
    ? {}
    : { instituicaoId: request.usuario.instituicaoId! }

  const where = {
    ...tenantFilter,
    ...(busca
      ? {
          OR: [
            { nome: { contains: busca, mode: 'insensitive' as const } },
            { cpf: { contains: busca } },
            { usuario: { email: { contains: busca, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }

  const [candidatos, total] = await Promise.all([
    prisma.candidato.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
            ativo: true,
          },
        },
        _count: {
          select: {
            candidaturas: true,
            documentos: true,
          },
        },
      },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { [ordenarPor]: ordem },
    }),
    prisma.candidato.count({ where }),
  ])

  return reply.status(200).send({
    candidatos,
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  })
}

export async function buscarCandidato(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const candidato = await prisma.candidato.findUnique({
    where: { id },
    include: {
      usuario: {
        select: {
          id: true,
          email: true,
          ativo: true,
          criadoEm: true,
        },
      },
      responsavelLegal: true,
      membrosFamilia: true,
      documentos: true,
      candidaturas: {
        include: {
          edital: {
            select: {
              id: true,
              titulo: true,
              anoLetivo: true,
            },
          },
        },
      },
    },
  })

  if (!candidato) {
    throw new CandidatoNaoEncontradoError()
  }

  return reply.status(200).send({ candidato })
}

export async function criarCandidato(request: FastifyRequest, reply: FastifyReply) {
  const dados = criarCandidatoSchema.parse(request.body)

  // Verificar se CPF já existe
  const cpfExistente = await prisma.candidato.findUnique({
    where: { cpf: dados.cpf },
  })

  if (cpfExistente) {
    throw new CpfJaCadastradoError()
  }

  const candidato = await prisma.candidato.create({
    data: {
      ...dados,
      usuarioId: request.usuario.id,
      instituicaoId: request.usuario.instituicaoId!,
    } as any,
    include: {
      usuario: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  })

  // Atualizar primeiro acesso
  await prisma.usuario.update({
    where: { id: request.usuario.id },
    data: { primeiroAcesso: false },
  })

  return reply.status(201).send({ candidato })
}

export async function atualizarCandidato(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const dados = atualizarCandidatoSchema.parse(request.body)

  const candidato = await prisma.candidato.findUnique({
    where: { id },
  })

  if (!candidato) {
    throw new CandidatoNaoEncontradoError()
  }

  // Verificar permissão (próprio usuário ou admin)
  if (candidato.usuarioId !== request.usuario.id && request.usuario.role !== 'ADMIN') {
    throw new NaoAutorizadoError()
  }

  // Se está alterando CPF, verificar se já existe
  if (dados.cpf && dados.cpf !== candidato.cpf) {
    const cpfExistente = await prisma.candidato.findUnique({
      where: { cpf: dados.cpf },
    })

    if (cpfExistente) {
      throw new CpfJaCadastradoError()
    }
  }

  const candidatoAtualizado = await prisma.candidato.update({
    where: { id },
    data: dados,
    include: {
      usuario: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  })

  return reply.status(200).send({ candidato: candidatoAtualizado })
}

export async function excluirCandidato(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const candidato = await prisma.candidato.findUnique({
    where: { id },
  })

  if (!candidato) {
    throw new CandidatoNaoEncontradoError()
  }

  await prisma.candidato.delete({
    where: { id },
  })

  return reply.status(204).send()
}

export async function meuPerfil(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
    include: {
      usuario: {
        select: {
          id: true,
          email: true,
          ativo: true,
          criadoEm: true,
        },
      },
      responsavelLegal: true,
      membrosFamilia: true,
      documentos: true,
      candidaturas: {
        include: {
          edital: true,
          parecerSocial: true,
          parecerJuridico: true,
        },
      },
    },
  })

  if (!candidato) {
    throw new CandidatoNaoEncontradoError()
  }

  return reply.status(200).send({ candidato })
}

// GET /candidatos/me — mesma lógica do meuPerfil mas resposta direta (sem wrapper)
export async function meusDados(request: FastifyRequest, reply: FastifyReply) {
  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
    include: {
      usuario: {
        select: { id: true, email: true, ativo: true, criadoEm: true },
      },
      membrosFamilia: true,
    },
  })

  if (!candidato) {
    // Retornar null em vez de erro — permite que o frontend saiba que precisa criar
    return reply.status(200).send(null)
  }

  return reply.status(200).send(candidato)
}

// PUT /candidatos/me — atualizar dados do próprio candidato
export async function atualizarMeusDados(request: FastifyRequest, reply: FastifyReply) {
  let dados: any
  try {
    dados = atualizarCandidatoSchema.parse(request.body)
  } catch (err: any) {
    const issues = err.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`) || []
    return reply.status(400).send({ message: 'Erro de validação', errors: issues })
  }

  // Campos válidos da tabela candidatos (whitelist)
  const CAMPOS_VALIDOS = [
    'nome', 'cpf', 'dataNascimento', 'telefone', 'celular',
    'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
    'rg', 'rgEstado', 'rgOrgao', 'possuiComprovante',
    'nomeSocial', 'sexo', 'profissao', 'nacionalidade', 'naturalidade', 'naturalidadeEstado',
    'estadoCivil', 'corRaca', 'escolaridade', 'religiao', 'necessidadesEspeciais',
    'cadastroUnico', 'escolaPublica', 'bolsaCebasBasica', 'bolsaCebasProfissional',
    'rendaFamiliar', 'tipoNecessidadesEspeciais', 'descricaoNecessidadesEspeciais',
  ]

  // Filtrar: só campos válidos, remover strings vazias (mas manter booleanos e números)
  const filtrar = (obj: any) => {
    const result: any = {}
    for (const key of CAMPOS_VALIDOS) {
      if (obj[key] === undefined || obj[key] === null) continue
      if (typeof obj[key] === 'string' && obj[key] === '') continue
      result[key] = obj[key]
    }
    return result
  }

  try {
    let candidato = await prisma.candidato.findUnique({
      where: { usuarioId: request.usuario.id },
    })

    if (!candidato) {
      if (!dados.nome || !dados.cpf) {
        return reply.status(400).send({ message: 'Nome e CPF são obrigatórios para o primeiro cadastro' })
      }

      const cpfLimpo = dados.cpf.replace(/\D/g, '')
      const cpfExistente = await prisma.candidato.findUnique({ where: { cpf: cpfLimpo } })
      if (cpfExistente) throw new CpfJaCadastradoError()

      const createData = filtrar(dados)
      createData.cpf = cpfLimpo
      createData.usuarioId = request.usuario.id
      if (request.usuario.instituicaoId) createData.instituicaoId = request.usuario.instituicaoId

      candidato = await prisma.candidato.create({ data: createData })

      await prisma.usuario.update({
        where: { id: request.usuario.id },
        data: { primeiroAcesso: false },
      })

      return reply.status(201).send(candidato)
    }

    // Candidato já existe — atualizar
    if (dados.cpf) dados.cpf = dados.cpf.replace(/\D/g, '')
    if (dados.cpf && dados.cpf !== candidato.cpf) {
      const cpfExistente = await prisma.candidato.findUnique({ where: { cpf: dados.cpf } })
      if (cpfExistente) throw new CpfJaCadastradoError()
    }

    const updateData = filtrar(dados)
    console.log('📝 updateData necessidades:', { necessidadesEspeciais: updateData.necessidadesEspeciais, tipoNecessidadesEspeciais: updateData.tipoNecessidadesEspeciais, descricaoNecessidadesEspeciais: updateData.descricaoNecessidadesEspeciais })

    const atualizado = await prisma.candidato.update({
      where: { id: candidato.id },
      data: updateData,
    })

    return reply.status(200).send(atualizado)
  } catch (error: any) {
    // Se já é um erro nosso (CPF duplicado etc), relancar
    if (error.statusCode) throw error
    // Erro do Prisma ou inesperado — logar e retornar detalhes
    console.error('Erro ao salvar candidato:', error.message, error.code, error.meta)
    return reply.status(500).send({
      message: 'Erro ao salvar dados',
      detail: error.message || 'Erro interno',
      code: error.code,
    })
  }
}
