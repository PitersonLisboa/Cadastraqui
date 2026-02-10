import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { UsuarioNaoEncontradoError, CredenciaisInvalidasError } from '../errors/index'

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

const atualizarCandidatoSchema = z.object({
  nome: z.string().min(3).optional(),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  estadoCivil: z.string().optional(),
  profissao: z.string().optional(),
})

const atualizarInstituicaoSchema = z.object({
  nomeFantasia: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
})

const alterarSenhaSchema = z.object({
  senhaAtual: z.string(),
  novaSenha: z.string().min(6),
  confirmarSenha: z.string(),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: 'As senhas não conferem',
  path: ['confirmarSenha'],
})

// ===========================================
// CONTROLLERS
// ===========================================

// Obter perfil completo
export async function obterPerfil(request: FastifyRequest, reply: FastifyReply) {
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
      instituicaoAdmin: true,
      instituicaoId: true,
      assistenteSocial: {
        include: {
          instituicao: {
            select: { razaoSocial: true, nomeFantasia: true },
          },
        },
      },
      advogado: {
        include: {
          instituicao: {
            select: { razaoSocial: true, nomeFantasia: true },
          },
        },
      },
      responsavelLegal: true,
    },
  })

  if (!usuario) {
    throw new UsuarioNaoEncontradoError()
  }

  // Retornar dados específicos do role
  let perfilEspecifico = null
  switch (usuario.role) {
    case 'CANDIDATO':
      perfilEspecifico = usuario.candidato
      break
    case 'INSTITUICAO':
      perfilEspecifico = usuario.instituicaoAdmin
      break
    case 'ASSISTENTE_SOCIAL':
      perfilEspecifico = usuario.assistenteSocial
      break
    case 'ADVOGADO':
      perfilEspecifico = usuario.advogado
      break
  }

  return reply.status(200).send({
    usuario: {
      id: usuario.id,
      email: usuario.email,
      role: usuario.role,
      ativo: usuario.ativo,
      primeiroAcesso: usuario.primeiroAcesso,
      criadoEm: usuario.criadoEm,
    },
    perfil: perfilEspecifico,
  })
}

// Atualizar perfil do candidato
export async function atualizarPerfilCandidato(request: FastifyRequest, reply: FastifyReply) {
  const dados = atualizarCandidatoSchema.parse(request.body)

  const candidato = await prisma.candidato.findUnique({
    where: { usuarioId: request.usuario.id },
  })

  if (!candidato) {
    throw new UsuarioNaoEncontradoError()
  }

  const atualizado = await prisma.candidato.update({
    where: { id: candidato.id },
    data: dados as any,
  })

  return reply.status(200).send({ candidato: atualizado })
}

// Atualizar perfil da instituição
export async function atualizarPerfilInstituicao(request: FastifyRequest, reply: FastifyReply) {
  const dados = atualizarInstituicaoSchema.parse(request.body)

  const instituicao = await prisma.instituicao.findUnique({
    where: { id: request.usuario.instituicaoId! },
  })

  if (!instituicao) {
    throw new UsuarioNaoEncontradoError()
  }

  const atualizado = await prisma.instituicao.update({
    where: { id: instituicao.id },
    data: dados as any,
  })

  return reply.status(200).send({ instituicao: atualizado })
}

// Alterar senha
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

// Alterar email
export async function alterarEmail(request: FastifyRequest, reply: FastifyReply) {
  const { novoEmail, senha } = z.object({
    novoEmail: z.string().email(),
    senha: z.string(),
  }).parse(request.body)

  const usuario = await prisma.usuario.findUnique({
    where: { id: request.usuario.id },
  })

  if (!usuario) {
    throw new UsuarioNaoEncontradoError()
  }

  // Verificar senha
  const senhaCorreta = await bcrypt.compare(senha, usuario.senha)

  if (!senhaCorreta) {
    throw new CredenciaisInvalidasError()
  }

  // Verificar se email já existe
  const emailExistente = await prisma.usuario.findUnique({
    where: { email: novoEmail },
  })

  if (emailExistente) {
    return reply.status(400).send({ message: 'Este email já está em uso' })
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { email: novoEmail },
  })

  return reply.status(200).send({ message: 'Email alterado com sucesso' })
}

// Desativar conta (soft delete)
export async function desativarConta(request: FastifyRequest, reply: FastifyReply) {
  const { senha } = z.object({
    senha: z.string(),
  }).parse(request.body)

  const usuario = await prisma.usuario.findUnique({
    where: { id: request.usuario.id },
  })

  if (!usuario) {
    throw new UsuarioNaoEncontradoError()
  }

  // Verificar senha
  const senhaCorreta = await bcrypt.compare(senha, usuario.senha)

  if (!senhaCorreta) {
    throw new CredenciaisInvalidasError()
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ativo: false },
  })

  // Remover todas as sessões
  await prisma.sessao.deleteMany({
    where: { usuarioId: usuario.id },
  })

  return reply.status(200).send({ message: 'Conta desativada com sucesso' })
}
