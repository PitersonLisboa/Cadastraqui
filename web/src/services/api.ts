import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

// Prioridade de resolução da URL da API:
// 1. import.meta.env.VITE_API_URL (substituída em build time pelo Vite)
// 2. window.__ENV__?.VITE_API_URL (injetada em runtime via script no index.html)
// 3. Fallback para localhost (desenvolvimento)
const API_URL = 
  import.meta.env.VITE_API_URL || 
  (window as any).__ENV__?.VITE_API_URL || 
  'http://localhost:3333'

console.log('[CadastrAQUI] API URL:', API_URL)

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const storage = localStorage.getItem('cadastraqui-persist')
    
    if (storage) {
      try {
        const { authState } = JSON.parse(storage)
        if (authState?.token) {
          config.headers.Authorization = `Bearer ${authState.token}`
        }
      } catch (e) {
        console.error('Erro ao parsear storage:', e)
      }
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('cadastraqui-persist')
      // Preservar tenant slug no redirect
      const path = window.location.pathname
      const slugMatch = path.match(/^\/([^/]+)\//)
      const knownNonTenant = ['admin', 'login', 'registrar', 'esqueci-senha', 'redefinir-senha']
      if (slugMatch && !knownNonTenant.includes(slugMatch[1])) {
        window.location.href = `/${slugMatch[1]}/login`
      } else {
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// ===========================================
// SERVIÇOS DE AUTENTICAÇÃO
// ===========================================

export const authService = {
  login: async (email: string, senha: string) => {
    const response = await api.post('/auth/login', { email, senha })
    return response.data
  },
  
  registrar: async (data: { 
    email: string
    senha: string
    confirmarSenha: string
    role: string
    codigoConvite?: string
    nome?: string
    registro?: string
    tenantSlug?: string
  }) => {
    const response = await api.post('/auth/registrar', data)
    return response.data
  },
  
  perfil: async () => {
    const response = await api.get('/auth/perfil')
    return response.data
  },
  
  alterarSenha: async (data: { senhaAtual: string; novaSenha: string; confirmarNovaSenha: string }) => {
    const response = await api.post('/auth/alterar-senha', data)
    return response.data
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout')
    return response.data
  },
  
  verificarToken: async () => {
    const response = await api.get('/auth/verificar')
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE CANDIDATO
// ===========================================

export const candidatoService = {
  meuPerfil: async () => {
    const response = await api.get('/candidato/meu-perfil')
    return response.data
  },
  
  criar: async (data: any) => {
    const response = await api.post('/candidato', data)
    return response.data
  },
  
  listar: async (params?: { pagina?: number; limite?: number; busca?: string }) => {
    const response = await api.get('/candidatos', { params })
    return response.data
  },
  
  buscar: async (id: string) => {
    const response = await api.get(`/candidatos/${id}`)
    return response.data
  },
  
  atualizar: async (id: string, data: any) => {
    const response = await api.put(`/candidatos/${id}`, data)
    return response.data
  },
  
  excluir: async (id: string) => {
    const response = await api.delete(`/candidatos/${id}`)
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE INSTITUIÇÃO
// ===========================================

export const instituicaoService = {
  meuPerfil: async () => {
    const response = await api.get('/instituicao/meu-perfil')
    return response.data
  },
  
  dashboard: async () => {
    const response = await api.get('/instituicao/dashboard')
    return response.data
  },
  
  criar: async (data: any) => {
    const response = await api.post('/instituicao', data)
    return response.data
  },
  
  listar: async (params?: { pagina?: number; limite?: number; busca?: string }) => {
    const response = await api.get('/instituicoes', { params })
    return response.data
  },
  
  buscar: async (id: string) => {
    const response = await api.get(`/instituicoes/${id}`)
    return response.data
  },
  
  atualizar: async (id: string, data: any) => {
    const response = await api.put(`/instituicoes/${id}`, data)
    return response.data
  },
  
  excluir: async (id: string) => {
    const response = await api.delete(`/instituicoes/${id}`)
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE EDITAL
// ===========================================

export const editalService = {
  listar: async (params?: { 
    pagina?: number
    limite?: number
    busca?: string
    apenasAtivos?: boolean
    anoLetivo?: number
    instituicaoId?: string
  }) => {
    const response = await api.get('/editais', { params })
    return response.data
  },
  
  listarDisponiveis: async (params?: { 
    pagina?: number
    limite?: number
    busca?: string
    uf?: string
  }) => {
    const response = await api.get('/editais/disponiveis', { params })
    return response.data
  },
  
  meusEditais: async (params?: { pagina?: number; limite?: number; busca?: string }) => {
    const response = await api.get('/instituicao/editais', { params })
    return response.data
  },
  
  buscar: async (id: string) => {
    const response = await api.get(`/editais/${id}`)
    return response.data
  },
  
  buscarPublico: async (id: string) => {
    const response = await api.get(`/editais/${id}/publico`)
    return response.data
  },
  
  criar: async (data: any) => {
    const response = await api.post('/editais', data)
    return response.data
  },
  
  atualizar: async (id: string, data: any) => {
    const response = await api.put(`/editais/${id}`, data)
    return response.data
  },
  
  excluir: async (id: string) => {
    const response = await api.delete(`/editais/${id}`)
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE CANDIDATURA
// ===========================================

export const candidaturaService = {
  minhasCandidaturas: async () => {
    const response = await api.get('/candidaturas/minhas')
    return response.data
  },
  
  buscar: async (id: string) => {
    const response = await api.get(`/candidaturas/${id}`)
    return response.data
  },
  
  inscrever: async (editalId: string) => {
    const response = await api.post('/candidaturas', { editalId })
    return response.data
  },
  
  verificarInscricao: async (editalId: string) => {
    const response = await api.get(`/candidaturas/verificar/${editalId}`)
    return response.data
  },
  
  cancelar: async (id: string) => {
    const response = await api.post(`/candidaturas/${id}/cancelar`)
    return response.data
  },
  
  // Métodos para instituição/assistente social
  listar: async (params?: { 
    pagina?: number
    limite?: number
    editalId?: string
    status?: string
  }) => {
    const response = await api.get('/candidaturas', { params })
    return response.data
  },
  
  atualizarStatus: async (id: string, data: { status: string; observacao?: string }) => {
    const response = await api.put(`/candidaturas/${id}/status`, data)
    return response.data
  },
  
  // Método para assistente social listar candidaturas para análise
  listarParaAnalise: async (params?: { 
    pagina?: number
    limite?: number
    editalId?: string
    status?: string
  }) => {
    const response = await api.get('/candidaturas', { params })
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE DOCUMENTO
// ===========================================

export const documentoService = {
  listar: async () => {
    const response = await api.get('/documentos')
    return response.data
  },
  
  upload: async (formData: FormData) => {
    const response = await api.post('/documentos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  
  excluir: async (id: string) => {
    const response = await api.delete(`/documentos/${id}`)
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE PARECER
// ===========================================

export const parecerService = {
  emitirParecerSocial: async (candidaturaId: string, data: { parecer: string; recomendacao?: string }) => {
    const response = await api.post(`/pareceres/social/${candidaturaId}`, data)
    return response.data
  },
  
  emitirParecerJuridico: async (candidaturaId: string, data: { parecer: string; fundamentacao?: string }) => {
    const response = await api.post(`/pareceres/juridico/${candidaturaId}`, data)
    return response.data
  },
  
  listarMeusPareceres: async (tipo: 'social' | 'juridico') => {
    const response = await api.get(`/pareceres/${tipo}/meus`)
    return response.data
  },
}

// ===========================================
// SERVIÇOS DO ASSISTENTE SOCIAL
// ===========================================

export const assistenteSocialService = {
  dashboard: async () => {
    const response = await api.get('/assistente-social/dashboard')
    return response.data
  },
}

// ===========================================
// SERVIÇOS DO ADVOGADO
// ===========================================

export const advogadoService = {
  dashboard: async () => {
    const response = await api.get('/advogado/dashboard')
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE AGENDAMENTO
// ===========================================

export const agendamentoService = {
  listar: async (params?: { pagina?: number; limite?: number; dataInicio?: string; dataFim?: string; realizado?: boolean }) => {
    const response = await api.get('/agendamentos', { params })
    return response.data
  },
  
  buscar: async (id: string) => {
    const response = await api.get(`/agendamentos/${id}`)
    return response.data
  },
  
  criar: async (data: {
    candidaturaId: string
    titulo: string
    descricao?: string
    dataHora: string
    duracao?: number
    local?: string
    linkOnline?: string
  }) => {
    const response = await api.post('/agendamentos', data)
    return response.data
  },
  
  atualizar: async (id: string, data: any) => {
    const response = await api.put(`/agendamentos/${id}`, data)
    return response.data
  },
  
  excluir: async (id: string) => {
    const response = await api.delete(`/agendamentos/${id}`)
    return response.data
  },
  
  marcarRealizado: async (id: string, observacoes?: string) => {
    const response = await api.post(`/agendamentos/${id}/realizado`, { observacoes })
    return response.data
  },
  
  listarCandidato: async () => {
    const response = await api.get('/agendamentos/candidato')
    return response.data
  },
  
  horariosDisponiveis: async (data: string, assistenteId?: string) => {
    const response = await api.get('/agendamentos/horarios-disponiveis', { 
      params: { data, assistenteId } 
    })
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE NOTIFICAÇÃO
// ===========================================

export const notificacaoService = {
  listar: async (params?: { pagina?: number; limite?: number; apenasNaoLidas?: boolean }) => {
    const response = await api.get('/notificacoes', { params })
    return response.data
  },
  
  contarNaoLidas: async () => {
    const response = await api.get('/notificacoes/count')
    return response.data
  },
  
  marcarComoLida: async (id: string) => {
    const response = await api.put(`/notificacoes/${id}/lida`)
    return response.data
  },
  
  marcarTodasComoLidas: async () => {
    const response = await api.put('/notificacoes/marcar-todas-lidas')
    return response.data
  },
  
  excluir: async (id: string) => {
    const response = await api.delete(`/notificacoes/${id}`)
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE EQUIPE
// ===========================================

export const equipeService = {
  listar: async () => {
    const response = await api.get('/equipe')
    return response.data
  },
  
  // Endpoint unificado - envia tipo no body
  adicionarMembro: async (data: {
    tipo: string
    email: string
    senha: string
    nome: string
    cress?: string
    oab?: string
    oabUf?: string
    cargo?: string
    telefone?: string
  }) => {
    const response = await api.post('/equipe', data)
    return response.data
  },

  // Compatibilidade com código existente
  adicionarAssistente: async (data: {
    email: string
    senha: string
    nome: string
    cress: string
    telefone?: string
  }) => {
    const response = await api.post('/equipe', { ...data, tipo: 'ASSISTENTE_SOCIAL' })
    return response.data
  },
  
  adicionarAdvogado: async (data: {
    email: string
    senha: string
    nome: string
    oab: string
    oabUf: string
    telefone?: string
  }) => {
    const response = await api.post('/equipe', { ...data, tipo: 'ADVOGADO' })
    return response.data
  },
  
  atualizar: async (id: string, data: any) => {
    const response = await api.put(`/equipe/${id}`, data)
    return response.data
  },
  
  desativar: async (tipo: string, id: string) => {
    const response = await api.delete(`/equipe/${id}`)
    return response.data
  },
  
  reativar: async (tipo: string, id: string) => {
    const response = await api.post(`/equipe/${id}/reativar`)
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE PERFIL
// ===========================================

export const perfilService = {
  obter: async () => {
    const response = await api.get('/perfil')
    return response.data
  },
  
  atualizarCandidato: async (data: any) => {
    const response = await api.put('/perfil/candidato', data)
    return response.data
  },
  
  atualizarInstituicao: async (data: any) => {
    const response = await api.put('/perfil/instituicao', data)
    return response.data
  },
  
  alterarSenha: async (data: { senhaAtual: string; novaSenha: string; confirmarSenha: string }) => {
    const response = await api.put('/perfil/senha', data)
    return response.data
  },
  
  alterarEmail: async (data: { novoEmail: string; senha: string }) => {
    const response = await api.put('/perfil/email', data)
    return response.data
  },
  
  desativarConta: async (senha: string) => {
    const response = await api.post('/perfil/desativar', { senha })
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE RELATÓRIO
// ===========================================

export const relatorioService = {
  dashboardAdmin: async () => {
    const response = await api.get('/relatorios/dashboard/admin')
    return response.data
  },
  
  dashboardInstituicao: async () => {
    const response = await api.get('/relatorios/dashboard/instituicao')
    return response.data
  },
  
  candidaturas: async (params?: { dataInicio?: string; dataFim?: string; status?: string; editalId?: string }) => {
    const response = await api.get('/relatorios/candidaturas', { params })
    return response.data
  },
  
  estatisticasAssistente: async () => {
    const response = await api.get('/relatorios/estatisticas/assistente')
    return response.data
  },
  
  estatisticasAdvogado: async () => {
    const response = await api.get('/relatorios/estatisticas/advogado')
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE FAMÍLIA
// ===========================================

export const familiaService = {
  listar: async () => {
    const response = await api.get('/familia/membros')
    return response.data
  },
  
  buscar: async (id: string) => {
    const response = await api.get(`/familia/membros/${id}`)
    return response.data
  },
  
  criar: async (data: any) => {
    const response = await api.post('/familia/membros', data)
    return response.data
  },
  
  atualizar: async (id: string, data: any) => {
    const response = await api.put(`/familia/membros/${id}`, data)
    return response.data
  },
  
  excluir: async (id: string) => {
    const response = await api.delete(`/familia/membros/${id}`)
    return response.data
  },
  
  composicao: async (candidatoId: string) => {
    const response = await api.get(`/familia/composicao/${candidatoId}`)
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE TENANT
// ===========================================

export const tenantService = {
  buscarPorSlug: async (slug: string) => {
    const response = await api.get(`/tenant/${slug}`)
    return response.data
  },
  
  listarAtivos: async () => {
    const response = await api.get('/tenants')
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE RENDA
// ===========================================

export const rendaService = {
  listar: async (params?: { mes?: number; ano?: number }) => {
    const response = await api.get('/rendas', { params })
    return response.data
  },

  salvar: async (data: {
    membroId: string
    mes: number
    ano: number
    valor: number
    fonte?: string
    descricao?: string
  }) => {
    const response = await api.post('/rendas', data)
    return response.data
  },

  excluir: async (id: string) => {
    const response = await api.delete(`/rendas/${id}`)
    return response.data
  },

  doMembro: async (membroId: string) => {
    const response = await api.get(`/rendas/membro/${membroId}`)
    return response.data
  },
}

// ===========================================
// SERVIÇOS DE DESPESA
// ===========================================

export const despesaService = {
  listar: async (params?: { mes?: number; ano?: number }) => {
    const response = await api.get('/despesas', { params })
    return response.data
  },

  criar: async (data: {
    mes: number
    ano: number
    categoria: string
    descricao?: string
    valor: number
  }) => {
    const response = await api.post('/despesas', data)
    return response.data
  },

  atualizar: async (id: string, data: any) => {
    const response = await api.put(`/despesas/${id}`, data)
    return response.data
  },

  excluir: async (id: string) => {
    const response = await api.delete(`/despesas/${id}`)
    return response.data
  },

  resumoMes: async (ano: number, mes: number) => {
    const response = await api.get(`/despesas/${ano}/${mes}`)
    return response.data
  },
}
