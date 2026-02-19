import { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'
import { env } from '../env/index'
import { TokenInvalidoError, NaoAutorizadoError } from '../errors/index'
import { Role } from '@prisma/client'

interface JwtPayload {
  sub: string
  email: string
  role: Role
  instituicaoId: string | null
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyRequest {
    usuario: {
      id: string
      email: string
      role: Role
      instituicaoId: string | null
    }
  }
}

export async function verificarJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    let token: string | undefined

    // 1. Tentar extrair do header Authorization
    const authHeader = request.headers.authorization
    if (authHeader) {
      const parts = authHeader.split(' ')
      token = parts[1]
    }

    // 2. Fallback: query param ?token= (para downloads diretos em nova aba)
    if (!token) {
      const queryToken = (request.query as any)?.token
      if (typeof queryToken === 'string' && queryToken.length > 0) {
        token = queryToken
      }
    }

    if (!token) {
      throw new TokenInvalidoError()
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload

    request.usuario = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      instituicaoId: decoded.instituicaoId || null,
    }
  } catch (error) {
    if (error instanceof TokenInvalidoError) {
      throw error
    }
    throw new TokenInvalidoError()
  }
}

export function verificarRole(...rolesPermitidas: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await verificarJWT(request, reply)

    if (!rolesPermitidas.includes(request.usuario.role)) {
      throw new NaoAutorizadoError(
        `Acesso restrito para: ${rolesPermitidas.join(', ')}`
      )
    }
  }
}

export function gerarToken(payload: { sub: string; email: string; role: Role; instituicaoId: string | null }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
  })
}
