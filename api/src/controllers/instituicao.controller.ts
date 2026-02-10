import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import {
  InstituicaoNaoEncontradaError,
  CnpjJaCadastradoError,
  NaoAutorizadoError,
} from '../errors/index'
import { UF } from '@prisma/client'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const criarInstituicaoSchema = z.object({
  razaoSocial: z.string().min(3, 'Razão social deve ter no mínimo 3 caracteres'),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().length(14, 'CNPJ deve ter 14 dígitos'),
  telefone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido'),
  cep: z.string().length(8, 'CEP deve ter 8 dígitos'),
  endereco: z.string().min(3, 'Endereço inválido'),
  numero: z.string(),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro inválido'),
  cidade: z.string().min(2, 'Cidade inválida'),
  uf: z.nativeEnum(UF),
  codigoMEC: z.string().optional(),
  tipoInstituicao: z.string().optional(),
})

const atualizarInstituicaoSchema = criarInstituicaoSchema.partial()

const listarInstituicoesSchema = z.object({
  pagina: z.coerce.number().min(1).default(1),
  limite: z.coerce.number().min(1).max(100).default(10),
  busca: z.string().optional(),
  ordenarPor: z.string().optional().default('criadoEm'),
  ordem: z.enum(['asc', 'desc']).optional().default('desc'),
})

// ===========================================
// CONTROLLERS
// ===========================================

export async function listarInstituicoes(request: FastifyRequest, reply: FastifyReply) {
  const { pagina, limite, busca, ordenarPor, ordem } = listarInstituicoesSchema.parse(request.query)

  const where = busca
    ? {
        OR: [
          { razaoSocial: { contains: busca, mode: 'insensitive' as const } },
          { nomeFantasia: { contains: busca, mode: 'insensitive' as const } },
          { cnpj: { contains: busca } },
        ],
      }
    : {}

  const [instituicoes, total] = await Promise.all([
    prisma.instituicao.findMany({
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
            editais: true,
            assistentesSociais: true,
            advogados: true,
            unidades: true,
          },
        },
      },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { [ordenarPor]: ordem },
    }),
    prisma.instituicao.count({ where }),
  ])

  return reply.status(200).send({
    instituicoes,
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  })
}

export async function buscarInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const instituicao = await prisma.instituicao.findUnique({
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
      assistentesSociais: {
        include: {
          usuario: {
            select: { email: true },
          },
        },
      },
      advogados: {
        include: {
          usuario: {
            select: { email: true },
          },
        },
      },
      editais: {
        orderBy: { criadoEm: 'desc' },
        take: 10,
      },
      unidades: true,
    },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  return reply.status(200).send({ instituicao })
}

export async function criarInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const dados = criarInstituicaoSchema.parse(request.body)

  // Verificar se CNPJ já existe
  const cnpjExistente = await prisma.instituicao.findUnique({
    where: { cnpj: dados.cnpj },
  })

  if (cnpjExistente) {
    throw new CnpjJaCadastradoError()
  }

  const instituicao = await prisma.instituicao.create({
    data: {
      ...dados,
      usuarioId: request.usuario.id,
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

  // Vincular instituicaoId ao usuário (multi-tenant)
  await prisma.usuario.update({
    where: { id: request.usuario.id },
    data: { 
      primeiroAcesso: false,
      instituicaoId: instituicao.id,
    },
  })

  return reply.status(201).send({ instituicao })
}

export async function atualizarInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const dados = atualizarInstituicaoSchema.parse(request.body)

  const instituicao = await prisma.instituicao.findUnique({
    where: { id },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  // Verificar permissão
  if (instituicao.usuarioId !== request.usuario.id && request.usuario.role !== 'ADMIN') {
    throw new NaoAutorizadoError()
  }

  // Se está alterando CNPJ, verificar se já existe
  if (dados.cnpj && dados.cnpj !== instituicao.cnpj) {
    const cnpjExistente = await prisma.instituicao.findUnique({
      where: { cnpj: dados.cnpj },
    })

    if (cnpjExistente) {
      throw new CnpjJaCadastradoError()
    }
  }

  const instituicaoAtualizada = await prisma.instituicao.update({
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

  return reply.status(200).send({ instituicao: instituicaoAtualizada })
}

export async function excluirInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const instituicao = await prisma.instituicao.findUnique({
    where: { id },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  await prisma.instituicao.delete({
    where: { id },
  })

  return reply.status(204).send()
}

export async function meuPerfilInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const instituicao = await prisma.instituicao.findUnique({
    where: { id: request.usuario.instituicaoId! },
    include: {
      usuario: {
        select: {
          id: true,
          email: true,
          ativo: true,
          criadoEm: true,
        },
      },
      assistentesSociais: true,
      advogados: true,
      editais: {
        orderBy: { criadoEm: 'desc' },
      },
      unidades: true,
    },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  return reply.status(200).send({ instituicao })
}

// ===========================================
// DASHBOARD DA INSTITUIÇÃO
// ===========================================

export async function dashboardInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const instituicao = await prisma.instituicao.findUnique({
    where: { id: request.usuario.instituicaoId! },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  const [
    totalEditais,
    editaisAtivos,
    totalCandidaturas,
    candidaturasPendentes,
    candidaturasAprovadas,
    totalAssistentes,
    totalAdvogados,
  ] = await Promise.all([
    prisma.edital.count({ where: { instituicaoId: instituicao.id } }),
    prisma.edital.count({ where: { instituicaoId: instituicao.id, ativo: true } }),
    prisma.candidatura.count({
      where: { edital: { instituicaoId: instituicao.id } },
    }),
    prisma.candidatura.count({
      where: { edital: { instituicaoId: instituicao.id }, status: 'PENDENTE' },
    }),
    prisma.candidatura.count({
      where: { edital: { instituicaoId: instituicao.id }, status: 'APROVADO' },
    }),
    prisma.assistenteSocial.count({ where: { instituicaoId: instituicao.id } }),
    prisma.advogado.count({ where: { instituicaoId: instituicao.id } }),
  ])

  // Últimos editais
  const ultimosEditais = await prisma.edital.findMany({
    where: { instituicaoId: instituicao.id },
    orderBy: { criadoEm: 'desc' },
    take: 5,
    include: {
      _count: {
        select: { candidaturas: true },
      },
    },
  })

  return reply.status(200).send({
    estatisticas: {
      totalEditais,
      editaisAtivos,
      totalCandidaturas,
      candidaturasPendentes,
      candidaturasAprovadas,
      totalAssistentes,
      totalAdvogados,
    },
    ultimosEditais,
  })
}

// ===========================================
// CANDIDATURAS DA INSTITUIÇÃO
// ===========================================

const listarCandidaturasInstituicaoSchema = z.object({
  pagina: z.coerce.number().min(1).default(1),
  limite: z.coerce.number().min(1).max(100).default(20),
  busca: z.string().optional(),
  status: z.string().optional(),
  editalId: z.string().uuid().optional(),
})

export async function listarCandidaturasInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const { pagina, limite, busca, status, editalId } = listarCandidaturasInstituicaoSchema.parse(request.query)

  const instituicao = await prisma.instituicao.findUnique({
    where: { id: request.usuario.instituicaoId! },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  const where: any = {
    edital: { instituicaoId: instituicao.id }
  }

  if (busca) {
    where.candidato = {
      OR: [
        { nome: { contains: busca, mode: 'insensitive' } },
        { cpf: { contains: busca } },
      ]
    }
  }

  if (status) {
    where.status = status
  }

  if (editalId) {
    where.editalId = editalId
  }

  const [candidaturas, total] = await Promise.all([
    prisma.candidatura.findMany({
      where,
      include: {
        candidato: {
          select: { id: true, nome: true, cpf: true }
        },
        edital: {
          select: { id: true, titulo: true }
        },
        _count: {
          select: { documentos: true }
        },
        parecerSocial: { select: { id: true } },
        parecerJuridico: { select: { id: true } },
      },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { dataInscricao: 'desc' },
    }),
    prisma.candidatura.count({ where }),
  ])

  // Resumo por status
  const resumoStatus = await prisma.candidatura.groupBy({
    by: ['status'],
    where: { edital: { instituicaoId: instituicao.id } },
    _count: true,
  })

  const resumo: Record<string, number> = {}
  resumoStatus.forEach(r => {
    resumo[r.status] = r._count
  })

  return reply.status(200).send({
    candidaturas,
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
    resumo,
  })
}

export async function buscarCandidaturaInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const instituicao = await prisma.instituicao.findUnique({
    where: { id: request.usuario.instituicaoId! },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  const candidatura = await prisma.candidatura.findFirst({
    where: {
      id,
      edital: { instituicaoId: instituicao.id }
    },
    include: {
      candidato: {
        include: {
          documentos: true, // Documentos gerais do candidato
          membrosFamilia: true, // Membros da família
        }
      },
      edital: {
        select: { id: true, titulo: true, dataInicio: true, dataFim: true }
      },
      documentos: true, // DocumentoCandidatura específicos desta candidatura
      parecerSocial: {
        include: {
          assistenteSocial: { select: { nome: true } }
        }
      },
      parecerJuridico: {
        include: {
          advogado: { select: { nome: true } }
        }
      },
      historico: {
        include: {
          usuario: { select: { nome: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      },
    },
  })

  if (!candidatura) {
    return reply.status(404).send({ message: 'Candidatura não encontrada' })
  }

  // Combinar documentos da candidatura com documentos do candidato
  const todosDocumentos = [
    ...candidatura.documentos, // DocumentoCandidatura
    ...candidatura.candidato.documentos, // Documento do candidato
  ]

  return reply.status(200).send({ 
    candidatura: {
      ...candidatura,
      documentos: todosDocumentos,
      membrosFamilia: candidatura.candidato.membrosFamilia,
    }
  })
}

// ===========================================
// DOCUMENTOS DA INSTITUIÇÃO
// ===========================================

export async function listarDocumentosInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const instituicao = await prisma.instituicao.findUnique({
    where: { id: request.usuario.instituicaoId! },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  const documentos = await prisma.documentoInstituicao.findMany({
    where: { instituicaoId: instituicao.id },
    orderBy: { criadoEm: 'desc' },
  })

  return reply.status(200).send({ documentos })
}

export async function uploadDocumentoInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const instituicao = await prisma.instituicao.findUnique({
    where: { id: request.usuario.instituicaoId! },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  const data = await request.file()
  if (!data) {
    return reply.status(400).send({ message: 'Nenhum arquivo enviado' })
  }

  const fields: Record<string, string> = {}
  for (const [key, value] of Object.entries(data.fields)) {
    if (value && typeof value === 'object' && 'value' in value) {
      fields[key] = (value as any).value
    }
  }

  const nome = fields.nome || data.filename
  const categoria = fields.categoria || 'OUTRO'

  // Simular upload (em produção usaria S3 ou similar)
  const buffer = await data.toBuffer()
  const filename = `instituicao_${instituicao.id}_${Date.now()}_${data.filename}`
  const url = `/uploads/${filename}`

  // Em produção, salvaria o arquivo no storage
  // await saveFile(buffer, filename)

  const documento = await prisma.documentoInstituicao.create({
    data: {
      nome,
      tipo: data.mimetype,
      categoria,
      tamanho: buffer.length,
      url,
      instituicaoId: instituicao.id,
    },
  })

  return reply.status(201).send({ documento })
}

export async function excluirDocumentoInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  const instituicao = await prisma.instituicao.findUnique({
    where: { id: request.usuario.instituicaoId! },
  })

  if (!instituicao) {
    throw new InstituicaoNaoEncontradaError()
  }

  const documento = await prisma.documentoInstituicao.findFirst({
    where: { id, instituicaoId: instituicao.id },
  })

  if (!documento) {
    return reply.status(404).send({ message: 'Documento não encontrado' })
  }

  await prisma.documentoInstituicao.delete({ where: { id } })

  return reply.status(204).send()
}
