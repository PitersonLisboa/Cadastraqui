import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { env } from './env'
import { registerRoutes } from './routes'
import { AppError } from './errors'
import { ZodError } from 'zod'

export const app = fastify({
  logger: env.NODE_ENV === 'development',
})

// Plugins
app.register(cors, {
  origin: env.NODE_ENV === 'development' 
    ? true 
    : (origin, cb) => {
        // Aceitar origens configuradas (separadas por vírgula) e subdomínios do Railway
        const allowed = env.FRONTEND_URL.split(',').map(u => u.trim())
        if (!origin || allowed.includes(origin) || origin.endsWith('.railway.app')) {
          cb(null, true)
        } else {
          cb(new Error('Bloqueado pelo CORS'), false)
        }
      },
  credentials: true,
})

app.register(helmet, {
  contentSecurityPolicy: false,
})

app.register(cookie, {
  secret: env.JWT_SECRET,
})

// Multipart para upload de arquivos
app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
})

// Registrar rotas
app.register(registerRoutes)

// Error handler global
app.setErrorHandler((error, request, reply) => {
  // Log do erro
  console.error(`[ERROR] ${error.message}`, {
    url: request.url,
    method: request.method,
    error: error.stack,
  })

  // Erros de validação do Zod
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Erro de validação',
      errors: error.errors.map((err) => ({
        campo: err.path.join('.'),
        mensagem: err.message,
      })),
    })
  }

  // Erros customizados da aplicação
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      message: error.message,
    })
  }

  // Erros do Fastify (validação de schema, etc)
  if (error.validation) {
    return reply.status(400).send({
      message: 'Erro de validação',
      errors: error.validation,
    })
  }

  // Erro interno do servidor
  return reply.status(500).send({
    message: 'Erro interno do servidor',
  })
})

// Not found handler
app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    message: `Rota ${request.method} ${request.url} não encontrada`,
  })
})
