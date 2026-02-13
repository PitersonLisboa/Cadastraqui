import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import {
  CandidatoNaoEncontradoError,
  CpfJaCadastradoError,
  NaoAutorizadoError,
} from '../errors/index'
import { UF } from '@prisma/client'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const criarCandidatoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos'),
  dataNascimento: z.coerce.date(),
  telefone: z.string(),
  celular: z.string().optional(),
  cep: z.string(),
  endereco: z.string(),
  numero: z.string(),
  complemento: z.string().optional(),
  bairro: z.string(),
  cidade: z.string(),
  uf: z.nativeEnum(UF),
  estadoCivil: z.string().optional(),
  profissao: z.string().optional(),
  rendaFamiliar: z.coerce.number().optional(),
  rg: z.string().optional(),
  rgEstado: z.string().optional(),
  rgOrgao: z.string().optional(),
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
  const dados = atualizarCandidatoSchema.parse(request.body)

  let candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) {
    // Candidato não existe ainda — criar com os dados disponíveis + defaults
    if (!dados.nome || !dados.cpf) {
      return reply.status(400).send({ message: 'Nome e CPF são obrigatórios para o primeiro cadastro' })
    }

    // Verificar CPF
    const cpfExistente = await prisma.candidato.findUnique({ where: { cpf: dados.cpf } })
    if (cpfExistente) throw new CpfJaCadastradoError()

    candidato = await prisma.candidato.create({
      data: {
        nome: dados.nome,
        cpf: dados.cpf,
        dataNascimento: dados.dataNascimento || new Date('2000-01-01'),
        telefone: dados.telefone || '',
        celular: dados.celular || undefined,
        cep: dados.cep || '00000000',
        endereco: dados.endereco || '',
        numero: dados.numero || '',
        bairro: dados.bairro || '',
        cidade: dados.cidade || '',
        uf: dados.uf || 'SP',
        complemento: dados.complemento || undefined,
        estadoCivil: dados.estadoCivil || undefined,
        profissao: dados.profissao || undefined,
        rendaFamiliar: dados.rendaFamiliar || undefined,
        usuarioId: request.usuario.id,
        instituicaoId: request.usuario.instituicaoId || undefined,
      } as any,
    })

    await prisma.usuario.update({
      where: { id: request.usuario.id },
      data: { primeiroAcesso: false },
    })

    return reply.status(201).send(candidato)
  }

  // Se alterando CPF, verificar duplicidade
  if (dados.cpf && dados.cpf !== candidato.cpf) {
    const cpfExistente = await prisma.candidato.findUnique({ where: { cpf: dados.cpf } })
    if (cpfExistente) throw new CpfJaCadastradoError()
  }

  const atualizado = await prisma.candidato.update({
    where: { id: candidato.id },
    data: dados,
  })

  return reply.status(200).send(atualizado)
}
