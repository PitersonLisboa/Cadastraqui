import { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'
import { env } from '../env/index.js'
import { TokenInvalidoError, NaoAutorizadoError } from '../errors/index.js'
import { Role } from '@prisma/client'

interface JwtPayload {
  sub: string
  email: string
  role: Role
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyRequest {
    usuario: {
      id: string
      email: string
      role: Role
    }
  }
}

export async function verificarJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader) {
      throw new TokenInvalidoError()
    }

    const [, token] = authHeader.split(' ')

    if (!token) {
      throw new TokenInvalidoError()
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload

    request.usuario = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
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

export function gerarToken(payload: { sub: string; email: string; role: Role }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  })
}
