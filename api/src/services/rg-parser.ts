// ===========================================
// PARSER DE RG BRASILEIRO
// Extrai campos do texto bruto retornado pelo OCR
// Versão 2: usa posição dos blocos (bounding box)
//   para localizar o NOME corretamente
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

/** Bloco de texto retornado pelo Google Vision (textAnnotations) */
export interface BlocoTexto {
  description: string
  boundingPoly?: {
    vertices: Array<{ x: number; y: number }>
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
  'DIRETOR', 'DIRETORA', 'DELEGADO', 'DELEGADA', 'PERITO', 'PERITA',
  'CHEFE', 'COORDENADOR', 'COORDENADORA', 'SUPERINTENDENTE',
  'RESPONSAVEL', 'RESPONSÁVEL',
]

// Rótulos de campo do RG (indicam que um campo vem em seguida, não é nome)
const ROTULOS_CAMPO = [
  'NOME', 'FILIAÇÃO', 'FILIACAO', 'NATURALIDADE', 'NASCIMENTO',
  'DATA', 'REGISTRO', 'CPF', 'DOC', 'VALIDADE', 'ASSINATURA',
  'IMPRESSÃO', 'IMPRESSAO', 'OBSERVAÇÃO', 'OBSERVACAO',
  'HABILITAÇÃO', 'HABILITACAO',
]

// ===================================================
// EXTRAÇÃO COM POSIÇÃO (bounding box) — estratégia #1
// ===================================================

/** Retorna o centro Y (vertical) de um bloco */
function centroY(bloco: BlocoTexto): number {
  if (!bloco.boundingPoly?.vertices?.length) return 0
  const ys = bloco.boundingPoly.vertices.map(v => v.y || 0)
  return (Math.min(...ys) + Math.max(...ys)) / 2
}

/** Retorna o centro X (horizontal) de um bloco */
function centroX(bloco: BlocoTexto): number {
  if (!bloco.boundingPoly?.vertices?.length) return 0
  const xs = bloco.boundingPoly.vertices.map(v => v.x || 0)
  return (Math.min(...xs) + Math.max(...xs)) / 2
}

/** Retorna a altura de um bloco (para estimar tolerância de linha) */
function alturaBloco(bloco: BlocoTexto): number {
  if (!bloco.boundingPoly?.vertices?.length) return 20
  const ys = bloco.boundingPoly.vertices.map(v => v.y || 0)
  return Math.max(...ys) - Math.min(...ys)
}

/** Topo Y de um bloco */
function topoY(bloco: BlocoTexto): number {
  if (!bloco.boundingPoly?.vertices?.length) return 0
  return Math.min(...bloco.boundingPoly.vertices.map(v => v.y || 0))
}

/**
 * Extrai nome usando posição dos blocos do Google Vision.
 * 
 * Lógica:
 *   1. Localiza o bloco que contém "NOME" (rótulo)
 *   2. Coleta palavras que ficam:
 *      a) À DIREITA do rótulo na mesma linha (ex: "NOME  JOAO DA SILVA")
 *      b) OU na linha IMEDIATAMENTE ABAIXO (dentro de ~1.5x a altura do rótulo)
 *   3. Para de coletar quando encontra outro rótulo (FILIAÇÃO, NATURALIDADE, etc.)
 *   4. Valida o resultado final
 */
function extrairNomeComPosicao(blocos: BlocoTexto[]): string | null {
  // blocos[0] é o texto completo, blocos[1+] são palavras individuais
  if (!blocos || blocos.length < 3) return null

  const palavras = blocos.slice(1) // pular o bloco [0] (texto completo)

  // Encontrar o bloco "NOME" (rótulo do campo)
  const idxNome = palavras.findIndex(b => {
    const txt = (b.description || '').trim().toUpperCase()
    return txt === 'NOME'
  })

  if (idxNome < 0) return null

  const blocoNome = palavras[idxNome]
  const yNome = centroY(blocoNome)
  const xNome = centroX(blocoNome)
  const hNome = alturaBloco(blocoNome)
  const toleranciaLinha = hNome * 1.8  // ~1.8x a altura para pegar mesma linha e próxima

  console.log(`📍 Rótulo "NOME" encontrado em posição (cx=${xNome.toFixed(0)}, cy=${yNome.toFixed(0)}, h=${hNome.toFixed(0)})`)

  // Coletar palavras que estão à direita ou abaixo do rótulo "NOME"
  const candidatas: BlocoTexto[] = []

  for (let i = idxNome + 1; i < palavras.length; i++) {
    const b = palavras[i]
    const txt = (b.description || '').trim().toUpperCase()
    const yB = centroY(b)
    const xB = centroX(b)

    // Se encontrou outro rótulo de campo, parar
    if (ROTULOS_CAMPO.includes(txt) && i !== idxNome) {
      // Exceção: se o rótulo está na mesma posição que o "NOME" (pode ser
      // sub-rótulo), verificar se está abaixo
      if (yB > yNome + toleranciaLinha) break
      if (txt !== 'NOME') break
    }

    // Verificar se está na "zona de nome":
    //   - Mesma linha (Y similar) e à direita
    //   - OU na próxima linha (Y um pouco abaixo)
    const diffY = yB - yNome
    const mesmaLinha = Math.abs(diffY) < hNome * 0.7
    const proximaLinha = diffY > 0 && diffY < toleranciaLinha * 1.5

    if (mesmaLinha && xB > xNome) {
      candidatas.push(b)
    } else if (proximaLinha) {
      candidatas.push(b)
    } else if (diffY > toleranciaLinha * 1.5) {
      // Já passou longe demais, parar
      break
    }
  }

  if (candidatas.length === 0) return null

  // Montar o nome: ordenar por Y e depois por X (leitura natural)
  candidatas.sort((a, b) => {
    const dy = topoY(a) - topoY(b)
    if (Math.abs(dy) > alturaBloco(a) * 0.5) return dy
    return centroX(a) - centroX(b)
  })

  const nomeRaw = candidatas.map(b => b.description.trim()).join(' ')
  console.log(`📍 Nome candidato (posição): "${nomeRaw}"`)

  if (isNomeValido(nomeRaw)) {
    return formatarNome(nomeRaw)
  }

  return null
}

// ===================================================
// EXTRAÇÃO POR TEXTO (fallback) — estratégias originais
// ===================================================

/**
 * Extrai CPF do texto
 */
function extrairCPF(texto: string): string | null {
  // Formato: 123.456.789-01 ou 12345678901
  const patterns = [
    /CPF[:\s]*([\d]{3}\.?[\d]{3}\.?[\d]{3}[-.]?[\d]{2})/i,
    /([\d]{3}[.\s][\d]{3}[.\s][\d]{3}[-.\s][\d]{2})/,
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

        if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && ano >= 1920 && ano <= 2026) {
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
 * Extrai nome da pessoa do texto do RG (fallback sem posição)
 */
function extrairNomeTexto(texto: string): string | null {
  const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  // Estratégia 1: Linha após "NOME" (ou "NOME:" na mesma linha)
  for (let i = 0; i < linhas.length; i++) {
    // "NOME: JOAO DA SILVA" na mesma linha
    const matchNomeMesmaLinha = linhas[i].match(/NOME[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s]+)/i)
    if (matchNomeMesmaLinha && isNomeValido(matchNomeMesmaLinha[1])) {
      return formatarNome(matchNomeMesmaLinha[1])
    }

    // "NOME" sozinho → nome na linha seguinte
    if (/^NOME\b/i.test(linhas[i]) && i + 1 < linhas.length) {
      const candidato = linhas[i + 1].trim()
      if (isNomeValido(candidato)) return formatarNome(candidato)
    }
  }

  // Estratégia 2: Primeira linha que parece nome completo (2+ palavras, todas letras)
  // PORÉM agora ignoramos as primeiras 3 linhas (geralmente cabeçalho do instituto)
  const linhasParaNome = linhas.slice(Math.min(3, linhas.length))
  for (const linha of linhasParaNome) {
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

export function parsearRG(textoCompleto: string, blocos?: BlocoTexto[]): DadosRG {
  console.log('🔍 Texto OCR recebido:\n', textoCompleto.substring(0, 500))

  // NOME: tentar primeiro com posição (mais preciso), depois fallback texto
  let nome: string | null = null
  if (blocos && blocos.length > 2) {
    console.log(`📐 Usando ${blocos.length} blocos com posição para extrair nome`)
    nome = extrairNomeComPosicao(blocos)
    if (nome) {
      console.log(`✅ Nome extraído por POSIÇÃO: "${nome}"`)
    }
  }
  if (!nome) {
    nome = extrairNomeTexto(textoCompleto)
    if (nome) {
      console.log(`✅ Nome extraído por TEXTO (fallback): "${nome}"`)
    }
  }

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
