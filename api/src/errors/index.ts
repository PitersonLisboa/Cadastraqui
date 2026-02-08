// ===========================================
// ERROS CUSTOMIZADOS DO CADASTRAQUI
// ===========================================

export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode = 400, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }
}

// Erros de Autenticação
export class CredenciaisInvalidasError extends AppError {
  constructor() {
    super('Email ou senha inválidos', 401)
  }
}

export class TokenInvalidoError extends AppError {
  constructor() {
    super('Token de autenticação inválido ou expirado', 401)
  }
}

export class NaoAutorizadoError extends AppError {
  constructor(message = 'Você não tem permissão para realizar esta ação') {
    super(message, 403)
  }
}

// Erros de Recursos
export class RecursoNaoEncontradoError extends AppError {
  constructor(recurso: string) {
    super(`${recurso} não encontrado(a)`, 404)
  }
}

export class UsuarioNaoEncontradoError extends AppError {
  constructor() {
    super('Usuário não encontrado', 404)
  }
}

export class CandidatoNaoEncontradoError extends AppError {
  constructor() {
    super('Candidato não encontrado', 404)
  }
}

export class InstituicaoNaoEncontradaError extends AppError {
  constructor() {
    super('Instituição não encontrada', 404)
  }
}

export class EditalNaoEncontradoError extends AppError {
  constructor() {
    super('Edital não encontrado', 404)
  }
}

export class CandidaturaNaoEncontradaError extends AppError {
  constructor() {
    super('Candidatura não encontrada', 404)
  }
}

// Erros de Conflito
export class EmailJaCadastradoError extends AppError {
  constructor() {
    super('Este email já está cadastrado', 409)
  }
}

export class CpfJaCadastradoError extends AppError {
  constructor() {
    super('Este CPF já está cadastrado', 409)
  }
}

export class CnpjJaCadastradoError extends AppError {
  constructor() {
    super('Este CNPJ já está cadastrado', 409)
  }
}

export class CandidaturaJaExisteError extends AppError {
  constructor() {
    super('Já existe uma candidatura para este edital', 409)
  }
}

// Erros de Validação
export class DadosInvalidosError extends AppError {
  constructor(message = 'Dados inválidos') {
    super(message, 400)
  }
}

export class ArquivoInvalidoError extends AppError {
  constructor(message = 'Arquivo inválido ou não suportado') {
    super(message, 400)
  }
}

// Erros de Negócio
export class EditalEncerradoError extends AppError {
  constructor() {
    super('Este edital já foi encerrado', 400)
  }
}

export class VagasEsgotadasError extends AppError {
  constructor() {
    super('Não há mais vagas disponíveis neste edital', 400)
  }
}
