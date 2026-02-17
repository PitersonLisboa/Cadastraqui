// ===========================================
// PARSER DE RG BRASILEIRO
// Extrai campos do texto bruto retornado pelo OCR
// ===========================================

export interface DadosRG {
  nome: string | null
  cpf: string | null
  rg: string | null
  dataNascimento: string | null   // formato ISO yyyy-mm-dd
  orgaoEmissor: string | null     // SSP, DETRAN, etc.
  estadoEmissor: string | null    // SP, RJ, MG, etc.
  confianca: {
    nome: boolean
    cpf: boolean
    rg: boolean
    dataNascimento: boolean
    orgaoEmissor: boolean
    estadoEmissor: boolean
  }
}

// Órgãos emissores conhecidos
const ORGAOS_EMISSORES = [
  'SSP', 'SSSP', 'SDS', 'SESP', 'SEJUSP', 'SEJUSC',
  'DETRAN', 'IFP', 'IGP', 'DGPC', 'POLITEC', 'PC',
  'PCERJ', 'PCMG', 'PCSP', 'PCBA', 'PCGO', 'PCPR',
  'IIRGD', 'ITEP', 'INI', 'GEJUSP', 'SPTC',
  'SJS', 'SJCDH', 'OAB', 'CRM', 'CREA', 'CRC',
]

// UFs brasileiras
const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

// Palavras que NÃO são nomes (para filtrar falsos positivos)
const NAO_NOMES = [
  'REPUBLICA', 'REPÚBLICA', 'FEDERATIVA', 'BRASIL', 'REGISTRO',
  'GERAL', 'IDENTIDADE', 'CARTEIRA', 'DOCUMENTO', 'SECRETARIA',
  'SEGURANCA', 'SEGURANÇA', 'PUBLICA', 'PÚBLICA', 'ESTADO',
  'GOVERNO', 'INSTITUTO', 'IDENTIFICACAO', 'IDENTIFICAÇÃO',
  'NOME', 'FILIACAO', 'FILIAÇÃO', 'NATURALIDADE', 'NASCIMENTO',
  'DATA', 'CPF', 'DOC', 'ORIGEM', 'VALIDADE', 'ASSINATURA',
  'DIGITAL', 'POLEGAR', 'CIVIL', 'LEI', 'MINISTERIO', 'MINISTÉRIO',
  'JUSTICA', 'JUSTIÇA', 'OBSERVACAO', 'OBSERVAÇÃO', 'VIA',
  'HABILITACAO', 'HABILITAÇÃO', 'NACIONAL', 'TRANSITO', 'TRÂNSITO',
]

/**
 * Extrai CPF do texto
 */
function extrairCPF(texto: string): string | null {
  // Formato: 123.456.789-01 ou 12345678901
  const patterns = [
    /(\d{3}[.\s]\d{3}[.\s]\d{3}[-.\s]\d{2})/,
    /CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2})/i,
  ]

  for (const pattern of patterns) {
    const match = texto.match(pattern)
    if (match) {
      const cpfLimpo = match[1].replace(/\D/g, '')
      if (cpfLimpo.length === 11 && !cpfLimpo.match(/^(\d)\1{10}$/)) {
        return cpfLimpo
      }
    }
  }
  return null
}

/**
 * Extrai RG do texto
 */
function extrairRG(texto: string): string | null {
  const patterns = [
    // Formato XX.XXX.XXX-X
    /(\d{1,2}[.\s]\d{3}[.\s]\d{3}[-.\s]?\d{1})/,
    // Formato após "RG" ou "REG. GERAL" ou "REGISTRO GERAL"
    /(?:RG|REG\.?\s*GERAL|REGISTRO\s*GERAL)[:\s]*[NnºO°]*\s*(\d[\d.\s-]{5,12}\d)/i,
    // Formato numérico longo (7 a 10 dígitos)
    /(?:^|\s)(\d{7,10})(?:\s|$)/m,
  ]

  for (const pattern of patterns) {
    const match = texto.match(pattern)
    if (match) {
      const rg = match[1].replace(/[.\s-]/g, '').trim()
      // RG deve ter entre 5 e 11 dígitos
      if (rg.length >= 5 && rg.length <= 11 && /^\d+$/.test(rg)) {
        return rg
      }
    }
  }
  return null
}

/**
 * Extrai data de nascimento do texto
 */
function extrairDataNascimento(texto: string): string | null {
  const patterns = [
    // Próximo a "NASCIMENTO" ou "DATA NASC"
    /(?:NASCIMENTO|DATA\s*NASC\.?|D\.?\s*NASCIMENTO)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
    // Qualquer data no formato DD/MM/AAAA
    /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/,
  ]

  for (const pattern of patterns) {
    const match = texto.match(pattern)
    if (match) {
      const partes = match[1].split(/[\/\-\.]/)
      if (partes.length === 3) {
        const dia = parseInt(partes[0], 10)
        const mes = parseInt(partes[1], 10)
        const ano = parseInt(partes[2], 10)

        if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && ano >= 1920 && ano <= 2025) {
          return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
        }
      }
    }
  }
  return null
}

/**
 * Extrai órgão emissor do texto
 */
function extrairOrgaoEmissor(texto: string): string | null {
  const textoUpper = texto.toUpperCase()

  // Tentar formato "SSP/SP" ou "SSP-SP" ou "SSP SP"
  for (const orgao of ORGAOS_EMISSORES) {
    const pattern = new RegExp(`\\b${orgao}\\b[\\s/\\-]*(?:${UFS.join('|')})`, 'i')
    const match = textoUpper.match(pattern)
    if (match) return orgao
  }

  // Tentar só o órgão
  for (const orgao of ORGAOS_EMISSORES) {
    if (textoUpper.includes(orgao)) return orgao
  }

  return null
}

/**
 * Extrai estado emissor do texto
 */
function extrairEstadoEmissor(texto: string): string | null {
  const textoUpper = texto.toUpperCase()

  // Tentar formato "SSP/SP" ou similar
  for (const uf of UFS) {
    for (const orgao of ORGAOS_EMISSORES) {
      const pattern = new RegExp(`${orgao}[\\s/\\-]+${uf}\\b`, 'i')
      if (pattern.test(textoUpper)) return uf
    }
  }

  // Tentar "ESTADO DE SÃO PAULO" → SP
  const estadosPorExtenso: Record<string, string> = {
    'SAO PAULO': 'SP', 'SÃO PAULO': 'SP', 'RIO DE JANEIRO': 'RJ',
    'MINAS GERAIS': 'MG', 'BAHIA': 'BA', 'PARANA': 'PR', 'PARANÁ': 'PR',
    'RIO GRANDE DO SUL': 'RS', 'PERNAMBUCO': 'PE', 'CEARA': 'CE', 'CEARÁ': 'CE',
    'GOIAS': 'GO', 'GOIÁS': 'GO', 'SANTA CATARINA': 'SC', 'AMAZONAS': 'AM',
    'MARANHAO': 'MA', 'MARANHÃO': 'MA', 'ESPIRITO SANTO': 'ES', 'ESPÍRITO SANTO': 'ES',
    'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS', 'DISTRITO FEDERAL': 'DF',
    'PARA': 'PA', 'PARÁ': 'PA', 'PARAIBA': 'PB', 'PARAÍBA': 'PB',
    'RIO GRANDE DO NORTE': 'RN', 'ALAGOAS': 'AL', 'PIAUI': 'PI', 'PIAUÍ': 'PI',
    'SERGIPE': 'SE', 'ACRE': 'AC', 'AMAPA': 'AP', 'AMAPÁ': 'AP',
    'RONDONIA': 'RO', 'RONDÔNIA': 'RO', 'RORAIMA': 'RR', 'TOCANTINS': 'TO',
  }

  for (const [nome, uf] of Object.entries(estadosPorExtenso)) {
    if (textoUpper.includes(nome)) return uf
  }

  return null
}

/**
 * Extrai nome da pessoa do texto do RG
 */
function extrairNome(texto: string): string | null {
  const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  // Estratégia 1: Linha após "NOME"
  for (let i = 0; i < linhas.length; i++) {
    if (/^NOME\b/i.test(linhas[i]) && i + 1 < linhas.length) {
      const candidato = linhas[i + 1].trim()
      if (isNomeValido(candidato)) return formatarNome(candidato)
    }
    // "NOME: JOAO DA SILVA" na mesma linha
    const matchNome = linhas[i].match(/NOME[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s]+)/i)
    if (matchNome && isNomeValido(matchNome[1])) {
      return formatarNome(matchNome[1])
    }
  }

  // Estratégia 2: Primeira linha que parece nome completo (2+ palavras, todas letras)
  for (const linha of linhas) {
    const limpa = linha.replace(/[^A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s]/g, '').trim()
    const palavras = limpa.split(/\s+/)
    if (palavras.length >= 2 && palavras.length <= 6 && isNomeValido(limpa)) {
      return formatarNome(limpa)
    }
  }

  return null
}

function isNomeValido(texto: string): boolean {
  const upper = texto.toUpperCase().trim()
  if (upper.length < 5) return false
  if (/\d/.test(upper)) return false

  const palavras = upper.split(/\s+/)
  if (palavras.length < 2) return false

  for (const palavra of palavras) {
    if (NAO_NOMES.includes(palavra)) return false
  }

  return true
}

function formatarNome(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .map(p => {
      // Preposições em minúscula
      if (['DA', 'DE', 'DO', 'DAS', 'DOS', 'E'].includes(p.toUpperCase())) {
        return p.toLowerCase()
      }
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    })
    .join(' ')
}

// ===========================================
// FUNÇÃO PRINCIPAL
// ===========================================

export function parsearRG(textoCompleto: string): DadosRG {
  console.log('🔍 Texto OCR recebido:\n', textoCompleto.substring(0, 500))

  const nome = extrairNome(textoCompleto)
  const cpf = extrairCPF(textoCompleto)
  const rg = extrairRG(textoCompleto)
  const dataNascimento = extrairDataNascimento(textoCompleto)
  const orgaoEmissor = extrairOrgaoEmissor(textoCompleto)
  const estadoEmissor = extrairEstadoEmissor(textoCompleto)

  const resultado: DadosRG = {
    nome,
    cpf,
    rg,
    dataNascimento,
    orgaoEmissor,
    estadoEmissor,
    confianca: {
      nome: nome !== null,
      cpf: cpf !== null,
      rg: rg !== null,
      dataNascimento: dataNascimento !== null,
      orgaoEmissor: orgaoEmissor !== null,
      estadoEmissor: estadoEmissor !== null,
    },
  }

  console.log('📋 Dados extraídos:', JSON.stringify(resultado, null, 2))
  return resultado
}
