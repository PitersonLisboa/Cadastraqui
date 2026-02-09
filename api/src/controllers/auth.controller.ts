import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { gerarToken } from '../middlewares/auth'
import {
  CredenciaisInvalidasError,
  EmailJaCadastradoError,
  UsuarioNaoEncontradoError,
} from '../errors/index'
import { Role } from '@prisma/client'
import { enviarEmailBoasVindas, enviarEmailRecuperacaoSenha } from '../services/email.service'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

const registrarSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmarSenha: z.string(),
  role: z.nativeEnum(Role).default(Role.CANDIDATO),
  codigoConvite: z.string().optional(), // Obrigatório para roles vinculados a instituição
  // Dados adicionais para profissionais
  nome: z.string().optional(),
  registro: z.string().optional(), // CRESS, OAB ou outro registro
}).refine((data) => data.senha === data.confirmarSenha, {
  message: 'As senhas não conferem',
  path: ['confirmarSenha'],
}).refine((data) => {
  // Se for role vinculado a instituição, código de convite é obrigatório
  if (['ASSISTENTE_SOCIAL', 'ADVOGADO', 'SUPERVISAO', 'CONTROLE', 'OPERACIONAL'].includes(data.role)) {
    return !!data.codigoConvite
  }
  return true
}, {
  message: 'Código de convite é obrigatório para este tipo de cadastro',
  path: ['codigoConvite'],
})

const alterarSenhaSchema = z.object({
  senhaAtual: z.string(),
  novaSenha: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
  confirmarNovaSenha: z.string(),
}).refine((data) => data.novaSenha === data.confirmarNovaSenha, {
  message: 'As senhas não conferem',
  path: ['confirmarNovaSenha'],
})

const solicitarRecuperacaoSchema = z.object({
  email: z.string().email('Email inválido'),
})

const redefinirSenhaSchema = z.object({
  token: z.string(),
  novaSenha: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
  confirmarNovaSenha: z.string(),
}).refine((data) => data.novaSenha === data.confirmarNovaSenha, {
  message: 'As senhas não conferem',
  path: ['confirmarNovaSenha'],
})

// ===========================================
// CONTROLLERS
// ===========================================

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const { email, senha } = loginSchema.parse(request.body)

  const usuario = await prisma.usuario.findUnique({
    where: { email },
  })

  if (!usuario) {
    throw new CredenciaisInvalidasError()
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha)

  if (!senhaCorreta) {
    throw new CredenciaisInvalidasError()
  }

  if (!usuario.ativo) {
    throw new CredenciaisInvalidasError()
  }

  const token = gerarToken({
    sub: usuario.id,
    email: usuario.email,
    role: usuario.role,
  })

  // Registrar sessão
  await prisma.sessao.create({
    data: {
      token,
      usuarioId: usuario.id,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    },
  })

  // Log de atividade
  await prisma.logAtividade.create({
    data: {
      usuarioId: usuario.id,
      acao: 'LOGIN',
      entidade: 'Usuario',
      entidadeId: usuario.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    },
  })

  return reply.status(200).send({
    token,
    usuario: {
      id: usuario.id,
      email: usuario.email,
      role: usuario.role,
      primeiroAcesso: usuario.primeiroAcesso,
    },
  })
}

export async function registrar(request: FastifyRequest, reply: FastifyReply) {
  const { email, senha, role, codigoConvite, nome, registro } = registrarSchema.parse(request.body)

  // Bloquear registro de ADMIN
  if (role === 'ADMIN') {
    return reply.status(403).send({
      message: 'Não é permitido criar conta de administrador',
    })
  }

  // Verificar se email já existe
  const usuarioExistente = await prisma.usuario.findUnique({
    where: { email },
  })

  if (usuarioExistente) {
    throw new EmailJaCadastradoError()
  }

  // Para roles vinculados a instituição, validar código de convite
  let convite = null
  if (['ASSISTENTE_SOCIAL', 'ADVOGADO', 'SUPERVISAO', 'CONTROLE', 'OPERACIONAL'].includes(role)) {
    if (!codigoConvite) {
      return reply.status(400).send({
        message: 'Código de convite é obrigatório para este tipo de cadastro',
      })
    }

    convite = await prisma.conviteEquipe.findUnique({
      where: { codigo: codigoConvite.toUpperCase() },
      include: { instituicao: true },
    })

    if (!convite) {
      return reply.status(400).send({
        message: 'Código de convite inválido',
      })
    }

    if (convite.usado) {
      return reply.status(400).send({
        message: 'Este código de convite já foi utilizado',
      })
    }

    if (convite.expiraEm < new Date()) {
      return reply.status(400).send({
        message: 'Este código de convite expirou',
      })
    }

    if (convite.tipo !== role) {
      const nomesTipos: Record<string, string> = {
        ASSISTENTE_SOCIAL: 'Assistente Social',
        ADVOGADO: 'Advogado',
        SUPERVISAO: 'Supervisão',
        CONTROLE: 'Controle',
        OPERACIONAL: 'Operacional',
      }
      return reply.status(400).send({
        message: `Este código é para ${nomesTipos[convite.tipo] || convite.tipo}`,
      })
    }
  }

  const senhaHash = await bcrypt.hash(senha, 10)

  // Criar usuário e perfil em transação
  const resultado = await prisma.$transaction(async (tx) => {
    // Criar usuário
    const usuario = await tx.usuario.create({
      data: {
        email,
        senha: senhaHash,
        role,
        nome,
      },
    })

    // Se for role com convite, criar perfil e vincular à instituição
    if (convite) {
      const nomeCompleto = nome || email.split('@')[0]
      
      if (role === 'ASSISTENTE_SOCIAL') {
        await tx.assistenteSocial.create({
          data: {
            nome: nomeCompleto,
            cress: registro || '',
            telefone: '',
            usuarioId: usuario.id,
            instituicaoId: convite.instituicaoId,
          },
        })
      } else if (role === 'ADVOGADO') {
        await tx.advogado.create({
          data: {
            nome: nomeCompleto,
            oab: registro || '',
            oabUf: 'SP',
            telefone: '',
            usuarioId: usuario.id,
            instituicaoId: convite.instituicaoId,
          },
        })
      } else if (role === 'SUPERVISAO') {
        await tx.supervisor.create({
          data: {
            nome: nomeCompleto,
            registro: registro || null,
            telefone: '',
            usuarioId: usuario.id,
            instituicaoId: convite.instituicaoId,
          },
        })
      } else if (role === 'CONTROLE') {
        await tx.membroControle.create({
          data: {
            nome: nomeCompleto,
            cargo: registro || null,
            telefone: '',
            usuarioId: usuario.id,
            instituicaoId: convite.instituicaoId,
          },
        })
      } else if (role === 'OPERACIONAL') {
        await tx.membroOperacional.create({
          data: {
            nome: nomeCompleto,
            cargo: registro || null,
            telefone: '',
            usuarioId: usuario.id,
            instituicaoId: convite.instituicaoId,
          },
        })
      }

      // Marcar convite como usado
      await tx.conviteEquipe.update({
        where: { id: convite.id },
        data: {
          usado: true,
          usadoPor: usuario.id,
        },
      })
    }

    return usuario
  })

  const token = gerarToken({
    sub: resultado.id,
    email: resultado.email,
    role: resultado.role,
  })

  // Enviar email de boas-vindas (async, não bloqueia)
  enviarEmailBoasVindas(email, nome || email.split('@')[0], role).catch(console.error)

  return reply.status(201).send({
    token,
    usuario: {
      id: resultado.id,
      email: resultado.email,
      role: resultado.role,
      primeiroAcesso: resultado.primeiroAcesso,
    },
    instituicao: convite ? {
      id: convite.instituicao.id,
      nome: convite.instituicao.razaoSocial,
    } : undefined,
  })
}

export async function perfil(request: FastifyRequest, reply: FastifyReply) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: request.usuario.id },
    select: {
      id: true,
      email: true,
      role: true,
      ativo: true,
      primeiroAcesso: true,
      criadoEm: true,
      candidato: true,
      instituicao: true,
      assistenteSocial: true,
      advogado: true,
      responsavelLegal: true,
    },
  })

  if (!usuario) {
    throw new UsuarioNaoEncontradoError()
  }

  return reply.status(200).send({ usuario })
}

export async function alterarSenha(request: FastifyRequest, reply: FastifyReply) {
  const { senhaAtual, novaSenha } = alterarSenhaSchema.parse(request.body)

  const usuario = await prisma.usuario.findUnique({
    where: { id: request.usuario.id },
  })

  if (!usuario) {
    throw new UsuarioNaoEncontradoError()
  }

  const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha)

  if (!senhaCorreta) {
    throw new CredenciaisInvalidasError()
  }

  const novaSenhaHash = await bcrypt.hash(novaSenha, 10)

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      senha: novaSenhaHash,
      primeiroAcesso: false,
    },
  })

  return reply.status(200).send({ message: 'Senha alterada com sucesso' })
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization
  const token = authHeader?.split(' ')[1]

  if (token) {
    await prisma.sessao.deleteMany({
      where: { token },
    })
  }

  return reply.status(200).send({ message: 'Logout realizado com sucesso' })
}

export async function verificarToken(request: FastifyRequest, reply: FastifyReply) {
  // Se chegou aqui, o middleware já validou o token
  return reply.status(200).send({
    valido: true,
    usuario: request.usuario,
  })
}

export async function solicitarRecuperacaoSenha(request: FastifyRequest, reply: FastifyReply) {
  const { email } = solicitarRecuperacaoSchema.parse(request.body)

  const usuario = await prisma.usuario.findUnique({
    where: { email },
  })

  // Sempre retorna sucesso para não expor se o email existe ou não
  if (!usuario) {
    return reply.status(200).send({
      message: 'Se o email estiver cadastrado, você receberá um link para recuperação de senha.',
    })
  }

  // Invalidar tokens anteriores
  await prisma.tokenRecuperacaoSenha.updateMany({
    where: {
      usuarioId: usuario.id,
      usado: false,
    },
    data: {
      usado: true,
    },
  })

  // Gerar novo token
  const token = crypto.randomBytes(32).toString('hex')
  const expiraEm = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

  await prisma.tokenRecuperacaoSenha.create({
    data: {
      token,
      usuarioId: usuario.id,
      expiraEm,
    },
  })

  // Enviar email (async, não bloqueia)
  const linkRecuperacao = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/redefinir-senha?token=${token}`
  enviarEmailRecuperacaoSenha(email, linkRecuperacao).catch(console.error)

  // Log de atividade
  await prisma.logAtividade.create({
    data: {
      usuarioId: usuario.id,
      acao: 'SOLICITAR_RECUPERACAO_SENHA',
      entidade: 'Usuario',
      entidadeId: usuario.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    },
  })

  return reply.status(200).send({
    message: 'Se o email estiver cadastrado, você receberá um link para recuperação de senha.',
  })
}

export async function validarTokenRecuperacao(request: FastifyRequest, reply: FastifyReply) {
  const { token } = z.object({ token: z.string() }).parse(request.query)

  const tokenRecuperacao = await prisma.tokenRecuperacaoSenha.findUnique({
    where: { token },
  })

  if (!tokenRecuperacao) {
    return reply.status(400).send({
      valido: false,
      message: 'Token inválido ou expirado.',
    })
  }

  if (tokenRecuperacao.usado) {
    return reply.status(400).send({
      valido: false,
      message: 'Este link já foi utilizado.',
    })
  }

  if (tokenRecuperacao.expiraEm < new Date()) {
    return reply.status(400).send({
      valido: false,
      message: 'Este link expirou. Solicite um novo.',
    })
  }

  return reply.status(200).send({
    valido: true,
  })
}

export async function redefinirSenha(request: FastifyRequest, reply: FastifyReply) {
  const { token, novaSenha } = redefinirSenhaSchema.parse(request.body)

  const tokenRecuperacao = await prisma.tokenRecuperacaoSenha.findUnique({
    where: { token },
    include: { usuario: true },
  })

  if (!tokenRecuperacao) {
    return reply.status(400).send({
      message: 'Token inválido ou expirado.',
    })
  }

  if (tokenRecuperacao.usado) {
    return reply.status(400).send({
      message: 'Este link já foi utilizado.',
    })
  }

  if (tokenRecuperacao.expiraEm < new Date()) {
    return reply.status(400).send({
      message: 'Este link expirou. Solicite um novo.',
    })
  }

  const novaSenhaHash = await bcrypt.hash(novaSenha, 10)

  // Atualizar senha e marcar token como usado
  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: tokenRecuperacao.usuarioId },
      data: {
        senha: novaSenhaHash,
        primeiroAcesso: false,
      },
    }),
    prisma.tokenRecuperacaoSenha.update({
      where: { id: tokenRecuperacao.id },
      data: { usado: true },
    }),
    // Invalidar todas as sessões do usuário
    prisma.sessao.deleteMany({
      where: { usuarioId: tokenRecuperacao.usuarioId },
    }),
  ])

  // Log de atividade
  await prisma.logAtividade.create({
    data: {
      usuarioId: tokenRecuperacao.usuarioId,
      acao: 'REDEFINIR_SENHA',
      entidade: 'Usuario',
      entidadeId: tokenRecuperacao.usuarioId,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    },
  })

  return reply.status(200).send({
    message: 'Senha redefinida com sucesso. Faça login com sua nova senha.',
  })
}
