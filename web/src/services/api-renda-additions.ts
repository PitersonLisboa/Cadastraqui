// ===========================================
// ADICIONAR ao arquivo web/src/services/api.ts
// (após o rendaService existente ou SUBSTITUIR o rendaService)
// ===========================================

// NOVO: Serviço de Fontes de Renda
export const fonteRendaService = {
  listar: async () => {
    const response = await api.get('/fontes-renda')
    return response.data
  },

  buscar: async (id: string) => {
    const response = await api.get(`/fontes-renda/${id}`)
    return response.data
  },

  criar: async (data: {
    membroFamiliaId?: string
    tipo: string
    documentoEmpregador?: string
    nomeFontePagadora?: string
    telefoneFonte?: string
    atividadeExercida?: string
    dataInicio?: string
    descricaoBeneficio?: string
    numeroBeneficio?: string
    instituicaoEnsino?: string
    cursoSerie?: string
  }) => {
    const response = await api.post('/fontes-renda', data)
    return response.data
  },

  atualizar: async (id: string, data: Record<string, any>) => {
    const response = await api.put(`/fontes-renda/${id}`, data)
    return response.data
  },

  excluir: async (id: string) => {
    const response = await api.delete(`/fontes-renda/${id}`)
    return response.data
  },

  uploadComprovanteMatricula: async (fonteId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(`/fontes-renda/${fonteId}/comprovante-matricula`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

// ATUALIZADO: rendaService (manter métodos antigos + adicionar novos)
export const rendaService = {
  // Métodos existentes (backward compat)
  listar: async (params?: { mes?: number; ano?: number }) => {
    const response = await api.get('/rendas', { params })
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

  // Novos métodos 2.x
  salvar: async (data: {
    fonteRendaId: string
    mes: number
    ano: number
    rendaBruta: number
    auxilioAlimentacao?: number
    auxilioTransporte?: number
    adiantamentos?: number
    indenizacoes?: number
    estornosCompensacoes?: number
    pensaoAlimenticiaPaga?: number
  }) => {
    const response = await api.post('/rendas', data)
    return response.data
  },

  salvarBatch: async (data: {
    fonteRendaId: string
    rendas: Array<{
      mes: number
      ano: number
      rendaBruta: number
      auxilioAlimentacao?: number
      auxilioTransporte?: number
      adiantamentos?: number
      indenizacoes?: number
      estornosCompensacoes?: number
      pensaoAlimenticiaPaga?: number
    }>
  }) => {
    const response = await api.post('/rendas/batch', data)
    return response.data
  },

  uploadComprovante: async (fonteRendaId: string, mes: number, ano: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(`/rendas/${fonteRendaId}/comprovante/${mes}/${ano}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}
