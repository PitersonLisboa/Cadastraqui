import nodemailer from 'nodemailer'
import { env } from '../env'

// Configuração do transporter
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
})

// Verificar conexão
transporter.verify((error) => {
  if (error) {
    console.log('⚠️  Servidor de email não configurado:', error.message)
  } else {
    console.log('📧 Servidor de email conectado')
  }
})

// ===========================================
// TEMPLATES DE EMAIL
// ===========================================

function getBaseTemplate(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 8px;
          padding: 32px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 24px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
        }
        .content {
          margin-bottom: 24px;
        }
        h1 {
          font-size: 20px;
          color: #111827;
          margin-bottom: 16px;
        }
        p {
          margin: 0 0 16px;
          color: #4b5563;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #3b82f6;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
        }
        .button:hover {
          background-color: #2563eb;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }
        .info-box {
          background-color: #f3f4f6;
          border-radius: 6px;
          padding: 16px;
          margin: 16px 0;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .info-label {
          font-weight: 500;
          color: #6b7280;
        }
        .info-value {
          color: #111827;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }
        .status-aprovado { background: #dcfce7; color: #166534; }
        .status-reprovado { background: #fee2e2; color: #991b1b; }
        .status-pendente { background: #fef3c7; color: #92400e; }
        .status-analise { background: #dbeafe; color: #1e40af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <div class="logo">📚 CADASTRAQUI</div>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>Este é um email automático, não responda.</p>
            <p>© ${new Date().getFullYear()} Cadastraqui - Gestão de Bolsas de Estudo</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

// ===========================================
// TIPOS
// ===========================================

interface EmailOptions {
  to: string
  subject: string
  html: string
}

interface CandidaturaEmailData {
  nomeCanditato: string
  emailCandidato: string
  editalTitulo: string
  instituicaoNome: string
  status?: string
  motivo?: string
}

interface AgendamentoEmailData {
  nomeCandidato: string
  emailCandidato: string
  data: Date
  horario: string
  local?: string
  tipo: string
  observacoes?: string
}

// ===========================================
// FUNÇÕES DE ENVIO
// ===========================================

async function enviarEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      console.log('📧 Email não enviado (SMTP não configurado):', options.subject)
      return false
    }

    await transporter.sendMail({
      from: `"Cadastraqui" <${env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    console.log('📧 Email enviado:', options.subject, '→', options.to)
    return true
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error)
    return false
  }
}

// ===========================================
// EMAILS DE AUTENTICAÇÃO
// ===========================================

export async function enviarEmailBoasVindas(email: string, nome: string, role: string): Promise<boolean> {
  const roleLabel = {
    CANDIDATO: 'Candidato',
    INSTITUICAO: 'Instituição',
    ASSISTENTE_SOCIAL: 'Assistente Social',
    ADVOGADO: 'Advogado',
  }[role] || role

  const content = `
    <h1>Bem-vindo ao Cadastraqui! 🎉</h1>
    <p>Olá <strong>${nome}</strong>,</p>
    <p>Sua conta foi criada com sucesso como <strong>${roleLabel}</strong>.</p>
    <p>Agora você pode acessar a plataforma e começar a utilizar nossos serviços.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
        Acessar Plataforma
      </a>
    </div>
    <p>Se você não criou esta conta, por favor ignore este email.</p>
  `

  return enviarEmail({
    to: email,
    subject: '🎉 Bem-vindo ao Cadastraqui!',
    html: getBaseTemplate(content, 'Bem-vindo'),
  })
}

export async function enviarEmailRecuperacaoSenha(email: string, linkRecuperacao: string): Promise<boolean> {
  const content = `
    <h1>Recuperação de Senha</h1>
    <p>Olá,</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
    <p>Clique no botão abaixo para criar uma nova senha:</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${linkRecuperacao}" class="button">
        Redefinir Senha
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280;">
      Este link é válido por 1 hora. Se você não solicitou a recuperação de senha, ignore este email.
    </p>
    <p style="font-size: 12px; color: #9ca3af;">
      Se o botão não funcionar, copie e cole este link no seu navegador:<br/>
      <span style="word-break: break-all;">${linkRecuperacao}</span>
    </p>
  `

  return enviarEmail({
    to: email,
    subject: '🔐 Recuperação de Senha - Cadastraqui',
    html: getBaseTemplate(content, 'Recuperação de Senha'),
  })
}

// ===========================================
// EMAILS DE CANDIDATURA
// ===========================================

export async function enviarEmailCandidaturaRealizada(data: CandidaturaEmailData): Promise<boolean> {
  const content = `
    <h1>Candidatura Realizada com Sucesso! ✅</h1>
    <p>Olá <strong>${data.nomeCanditato}</strong>,</p>
    <p>Sua candidatura foi registrada com sucesso!</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Edital:</span>
        <span class="info-value">${data.editalTitulo}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Instituição:</span>
        <span class="info-value">${data.instituicaoNome}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="status-badge status-pendente">Pendente</span>
      </div>
    </div>
    <p>Acompanhe o andamento da sua candidatura através da plataforma.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${env.FRONTEND_URL || 'http://localhost:5173'}/candidato/candidaturas" class="button">
        Ver Minhas Candidaturas
      </a>
    </div>
  `

  return enviarEmail({
    to: data.emailCandidato,
    subject: '✅ Candidatura Realizada - ' + data.editalTitulo,
    html: getBaseTemplate(content, 'Candidatura Realizada'),
  })
}

export async function enviarEmailMudancaStatus(data: CandidaturaEmailData): Promise<boolean> {
  const statusConfig: Record<string, { label: string; class: string; emoji: string }> = {
    APROVADO: { label: 'Aprovada', class: 'status-aprovado', emoji: '🎉' },
    REPROVADO: { label: 'Reprovada', class: 'status-reprovado', emoji: '😔' },
    EM_ANALISE: { label: 'Em Análise', class: 'status-analise', emoji: '🔍' },
    DOCUMENTACAO_PENDENTE: { label: 'Documentação Pendente', class: 'status-pendente', emoji: '📄' },
  }

  const status = statusConfig[data.status || ''] || { label: data.status, class: 'status-pendente', emoji: '📋' }

  let mensagemAdicional = ''
  if (data.status === 'APROVADO') {
    mensagemAdicional = `
      <p style="color: #166534; font-weight: 500;">
        Parabéns! Sua candidatura foi aprovada. Entre na plataforma para mais informações sobre os próximos passos.
      </p>
    `
  } else if (data.status === 'REPROVADO' && data.motivo) {
    mensagemAdicional = `
      <div class="info-box" style="background: #fee2e2;">
        <p style="margin: 0; color: #991b1b;"><strong>Motivo:</strong> ${data.motivo}</p>
      </div>
    `
  } else if (data.status === 'DOCUMENTACAO_PENDENTE') {
    mensagemAdicional = `
      <p style="color: #92400e;">
        Existem documentos pendentes na sua candidatura. Acesse a plataforma para verificar quais documentos são necessários.
      </p>
    `
  }

  const content = `
    <h1>${status.emoji} Atualização da Candidatura</h1>
    <p>Olá <strong>${data.nomeCanditato}</strong>,</p>
    <p>Houve uma atualização no status da sua candidatura:</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Edital:</span>
        <span class="info-value">${data.editalTitulo}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Instituição:</span>
        <span class="info-value">${data.instituicaoNome}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Novo Status:</span>
        <span class="status-badge ${status.class}">${status.label}</span>
      </div>
    </div>
    ${mensagemAdicional}
    <div style="text-align: center; margin: 24px 0;">
      <a href="${env.FRONTEND_URL || 'http://localhost:5173'}/candidato/candidaturas" class="button">
        Ver Detalhes
      </a>
    </div>
  `

  return enviarEmail({
    to: data.emailCandidato,
    subject: `${status.emoji} Candidatura ${status.label} - ${data.editalTitulo}`,
    html: getBaseTemplate(content, 'Atualização de Candidatura'),
  })
}

// ===========================================
// EMAILS DE AGENDAMENTO
// ===========================================

export async function enviarEmailAgendamentoCriado(data: AgendamentoEmailData): Promise<boolean> {
  const dataFormatada = new Date(data.data).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const content = `
    <h1>📅 Agendamento Confirmado</h1>
    <p>Olá <strong>${data.nomeCandidato}</strong>,</p>
    <p>Seu agendamento foi confirmado com sucesso!</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Tipo:</span>
        <span class="info-value">${data.tipo === 'VISITA' ? 'Visita Domiciliar' : 'Entrevista'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Data:</span>
        <span class="info-value">${dataFormatada}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Horário:</span>
        <span class="info-value">${data.horario}</span>
      </div>
      ${data.local ? `
        <div class="info-row">
          <span class="info-label">Local:</span>
          <span class="info-value">${data.local}</span>
        </div>
      ` : ''}
    </div>
    ${data.observacoes ? `
      <p><strong>Observações:</strong> ${data.observacoes}</p>
    ` : ''}
    <p style="color: #6b7280; font-size: 14px;">
      Em caso de impossibilidade de comparecimento, entre em contato o mais rápido possível.
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${env.FRONTEND_URL || 'http://localhost:5173'}/candidato/agendamentos" class="button">
        Ver Meus Agendamentos
      </a>
    </div>
  `

  return enviarEmail({
    to: data.emailCandidato,
    subject: '📅 Agendamento Confirmado - Cadastraqui',
    html: getBaseTemplate(content, 'Agendamento Confirmado'),
  })
}

export async function enviarEmailLembreteAgendamento(data: AgendamentoEmailData): Promise<boolean> {
  const dataFormatada = new Date(data.data).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  const content = `
    <h1>⏰ Lembrete de Agendamento</h1>
    <p>Olá <strong>${data.nomeCandidato}</strong>,</p>
    <p>Este é um lembrete do seu agendamento <strong>amanhã</strong>:</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Tipo:</span>
        <span class="info-value">${data.tipo === 'VISITA' ? 'Visita Domiciliar' : 'Entrevista'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Data:</span>
        <span class="info-value">${dataFormatada}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Horário:</span>
        <span class="info-value">${data.horario}</span>
      </div>
      ${data.local ? `
        <div class="info-row">
          <span class="info-label">Local:</span>
          <span class="info-value">${data.local}</span>
        </div>
      ` : ''}
    </div>
    <p style="color: #6b7280;">
      Não se esqueça de ter em mãos todos os documentos solicitados.
    </p>
  `

  return enviarEmail({
    to: data.emailCandidato,
    subject: '⏰ Lembrete: Agendamento Amanhã - Cadastraqui',
    html: getBaseTemplate(content, 'Lembrete de Agendamento'),
  })
}

// ===========================================
// EMAILS DE EDITAL
// ===========================================

export async function enviarEmailNovoEdital(
  emails: string[],
  editalTitulo: string,
  instituicaoNome: string,
  dataFim: Date
): Promise<boolean> {
  const dataFormatada = new Date(dataFim).toLocaleDateString('pt-BR')

  const content = `
    <h1>📢 Novo Edital Disponível!</h1>
    <p>Um novo edital de bolsa de estudos foi publicado:</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Edital:</span>
        <span class="info-value">${editalTitulo}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Instituição:</span>
        <span class="info-value">${instituicaoNome}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Inscrições até:</span>
        <span class="info-value">${dataFormatada}</span>
      </div>
    </div>
    <p>Não perca essa oportunidade! Acesse a plataforma e faça sua inscrição.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${env.FRONTEND_URL || 'http://localhost:5173'}/candidato/editais" class="button">
        Ver Editais Disponíveis
      </a>
    </div>
  `

  // Enviar para todos os emails (em lote)
  const promises = emails.map((email) =>
    enviarEmail({
      to: email,
      subject: '📢 Novo Edital: ' + editalTitulo,
      html: getBaseTemplate(content, 'Novo Edital'),
    })
  )

  const results = await Promise.all(promises)
  return results.some((r) => r)
}

// ===========================================
// EXPORT DO SERVIÇO
// ===========================================

// Alias para compatibilidade
export const sendEmail = enviarEmail

export const emailService = {
  enviarEmailBoasVindas,
  enviarEmailRecuperacaoSenha,
  enviarEmailCandidaturaRealizada,
  enviarEmailMudancaStatus,
  enviarEmailAgendamentoCriado,
  enviarEmailLembreteAgendamento,
  enviarEmailNovoEdital,
  sendEmail: enviarEmail,
}
