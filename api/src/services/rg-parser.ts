// ===========================================
// PARSER DE RG BRASILEIRO
// Extrai campos do texto bruto retornado pelo OCR
// Versão 3: compatível com OCR.space (Left/Top/Width/Height)
// ===========================================

/** Palavra com posição (formato normalizado do OCR.space) */
export interface PalavraOCR {
  text: string
  left: number
  top: number
  width: number
  height: number
}

/** Linha de texto com palavras */
export interface LinhaOCR {
  palavras: PalavraOCR[]
  minTop: number
  maxHeight: number
}

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

// Palavras que NÃO são nomes de pessoa
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

// Rótulos de campo do RG (indicam que um campo vem em seguida)
const ROTULOS_CAMPO = [
  'NOME', 'FILIAÇÃO', 'FILIACAO', 'NATURALIDADE', 'NASCIMENTO',
  'DATA', 'REGISTRO', 'CPF', 'DOC', 'VALIDADE', 'ASSINATURA',
  'IMPRESSÃO', 'IMPRESSAO', 'OBSERVAÇÃO', 'OBSERVACAO',
  'HABILITAÇÃO', 'HABILITACAO',
]

// ===================================================
// EXTRAÇÃO COM POSIÇÃO (OCR.space Words com Left/Top)
// ===================================================

/**
 * Extrai nome usando posição das palavras do OCR.space.
 *
 * Lógica:
 *   1. Localiza a palavra "NOME" (rótulo) usando posição
 *   2. Coleta palavras que ficam:
 *      a) À DIREITA do rótulo na mesma linha
 *      b) OU na(s) linha(s) IMEDIATAMENTE ABAIXO
 *   3. Para quando encontra outro rótulo de campo
 *   4. Valida o resultado final
 */
function extrairNomeComPosicao(palavras: PalavraOCR[]): string | null {
  if (!palavras || palavras.length < 3) return null

  // Encontrar a palavra "NOME" (rótulo)
  const idxNome = palavras.findIndex(p => p.text.trim().toUpperCase() === 'NOME')
  if (idxNome < 0) return null

  const pNome = palavras[idxNome]
  const yNome = pNome.top + pNome.height / 2  // centro Y
  const xNomeDir = pNome.left + pNome.width     // borda direita
  const toleranciaY = pNome.height * 2.0         // ~2x a altura para linha seguinte

  console.log(`📍 Rótulo "NOME" em (left=${pNome.left}, top=${pNome.top}, h=${pNome.height})`)

  const candidatas: PalavraOCR[] = []

  for (let i = idxNome + 1; i < palavras.length; i++) {
    const p = palavras[i]
    const txt = p.text.trim().toUpperCase()
    const yP = p.top + p.height / 2
    const diffY = yP - yNome

    // Se encontrou outro rótulo de campo, parar
    if (ROTULOS_CAMPO.includes(txt) && txt !== 'NOME') {
      break
    }

    // Mesma linha: centro Y similar e à direita do rótulo
    const mesmaLinha = Math.abs(diffY) < pNome.height * 0.8
    // Próxima(s) linha(s): abaixo, dentro da tolerância
    const proximaLinha = diffY > 0 && diffY < toleranciaY

    if (mesmaLinha && p.left >= xNomeDir - 5) {
      candidatas.push(p)
    } else if (proximaLinha) {
      candidatas.push(p)
    } else if (diffY > toleranciaY) {
      break // passou da zona de interesse
    }
  }

  if (candidatas.length === 0) return null

  // Ordenar: por linha (top) e depois por coluna (left)
  candidatas.sort((a, b) => {
    const dy = a.top - b.top
    if (Math.abs(dy) > a.height * 0.5) return dy
    return a.left - b.left
  })

  const nomeRaw = candidatas.map(p => p.text.trim()).join(' ')
  console.log(`📍 Nome candidato (posição): "${nomeRaw}"`)

  if (isNomeValido(nomeRaw)) {
    return formatarNome(nomeRaw)
  }

  return null
}

/**
 * Extrai nome usando linhas do OCR.space.
 * Localiza a linha que contém "NOME"
 * e coleta o restante da mesma linha ou a linha seguinte.
 */
function extrairNomeComLinhas(linhas: LinhaOCR[]): string | null {
  for (let i = 0; i < linhas.length; i++) {
    const textoLinha = linhas[i].palavras.map(p => p.text).join(' ').trim()
    const upper = textoLinha.toUpperCase()

    // "NOME JOAO DA SILVA" na mesma linha
    const matchMesmaLinha = upper.match(/^NOME\s+(.+)/)
    if (matchMesmaLinha) {
      const posInicio = textoLinha.toUpperCase().indexOf(matchMesmaLinha[1])
      const restante = textoLinha.substring(posInicio)
      if (isNomeValido(restante)) return formatarNome(restante)
    }

    // "NOME" sozinho → próxima linha é o nome
    if (upper === 'NOME' && i + 1 < linhas.length) {
      const proxLinha = linhas[i + 1].palavras.map(p => p.text).join(' ').trim()
      if (isNomeValido(proxLinha)) return formatarNome(proxLinha)
    }
  }
  return null
}

// ===================================================
// EXTRAÇÃO POR TEXTO PURO (fallback final)
// ===================================================

function extrairNomeTexto(texto: string): string | null {
  const linhas = texto.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0)

  for (let i = 0; i < linhas.length; i++) {
    const matchMesmaLinha = linhas[i].match(/NOME[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s]+)/i)
    if (matchMesmaLinha && isNomeValido(matchMesmaLinha[1])) {
      return formatarNome(matchMesmaLinha[1])
    }
    if (/^NOME\b/i.test(linhas[i]) && i + 1 < linhas.length) {
      const candidato = linhas[i + 1].trim()
      if (isNomeValido(candidato)) return formatarNome(candidato)
    }
  }

  // Fallback: primeira linha que parece nome (pula cabeçalho)
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

// ===================================================
// EXTRATORES DE CAMPOS NUMÉRICOS
// ===================================================

function extrairCPF(texto: string): string | null {
  // Formatos encontrados em RGs brasileiros:
  //   11111111111        (sem formatação)
  //   111111111/11       (barra)
  //   111111111-11       (hífen)
  //   111.111.11111      (pontos sem separador final)
  //   111.111.111/11     (pontos + barra)
  //   111.111.111-11     (padrão)
  //   111.111.111 11     (pontos + espaço)

  const patterns = [
    // 1) Com rótulo "CPF" antes — mais confiável
    /CPF[:\s]*(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\s\/\-\.]?\d{2})/i,
    // 2) Formato padrão: 111.111.111-11 ou 111.111.111/11
    /(\d{3}\.\d{3}\.\d{3}[\-\/]\d{2})/,
    // 3) Formato com pontos mas sem separador final: 111.111.11111
    /(\d{3}\.\d{3}\.\d{5})/,
    // 4) Formato 9+2 com barra ou hífen: 111111111/11 ou 111111111-11
    /(\d{9}[\-\/]\d{2})/,
    // 5) Formato com pontos e espaço: 111.111.111 11
    /(\d{3}\.\d{3}\.\d{3}\s\d{2})/,
    // 6) 11 dígitos seguidos (sem formatação) — próximo a "CPF"
    /CPF[:\s]*(\d{11})/i,
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

function extrairRG(texto: string): string | null {
  const patterns = [
    /(\d{1,2}[.\s]\d{3}[.\s]\d{3}[-.\s]?\d{1})/,
    /(?:RG|REG\.?\s*GERAL|REGISTRO\s*GERAL)[:\s]*[NnºO°]*\s*(\d[\d.\s-]{5,12}\d)/i,
    /(?:^|\s)(\d{7,10})(?:\s|$)/m,
  ]
  for (const pattern of patterns) {
    const match = texto.match(pattern)
    if (match) {
      const rg = match[1].replace(/[.\s-]/g, '').trim()
      if (rg.length >= 5 && rg.length <= 11 && /^\d+$/.test(rg)) {
        return rg
      }
    }
  }
  return null
}

function extrairDataNascimento(texto: string): string | null {
  const patterns = [
    /(?:NASCIMENTO|DATA\s*NASC\.?|D\.?\s*NASCIMENTO)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
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

function extrairOrgaoEmissor(texto: string): string | null {
  const textoUpper = texto.toUpperCase()
  for (const orgao of ORGAOS_EMISSORES) {
    const pattern = new RegExp(`\\b${orgao}\\b[\\s/\\-]*(?:${UFS.join('|')})`, 'i')
    if (pattern.test(textoUpper)) return orgao
  }
  for (const orgao of ORGAOS_EMISSORES) {
    if (textoUpper.includes(orgao)) return orgao
  }
  return null
}

function extrairEstadoEmissor(texto: string): string | null {
  const textoUpper = texto.toUpperCase()
  for (const uf of UFS) {
    for (const orgao of ORGAOS_EMISSORES) {
      const pattern = new RegExp(`${orgao}[\\s/\\-]+${uf}\\b`, 'i')
      if (pattern.test(textoUpper)) return uf
    }
  }
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

// ===================================================
// UTILITÁRIOS
// ===================================================

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
      if (['DA', 'DE', 'DO', 'DAS', 'DOS', 'E'].includes(p.toUpperCase())) {
        return p.toLowerCase()
      }
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    })
    .join(' ')
}

// ===================================================
// FUNÇÃO PRINCIPAL
// ===================================================

/**
 * Parseia texto de RG brasileiro extraindo campos estruturados.
 *
 * @param textoCompleto - Texto OCR completo
 * @param palavras - Lista de palavras com posição (OCR.space Words)
 * @param linhas - Lista de linhas com palavras (OCR.space Lines)
 */
export function parsearRG(
  textoCompleto: string,
  palavras?: PalavraOCR[],
  linhas?: LinhaOCR[],
): DadosRG {
  console.log('🔍 Texto OCR recebido:\n', textoCompleto.substring(0, 500))

  // ── NOME: 3 estratégias em cascata ──
  let nome: string | null = null

  // 1) Por posição das palavras (mais preciso)
  if (palavras && palavras.length > 2) {
    console.log(`📐 Tentando extração por POSIÇÃO (${palavras.length} palavras)`)
    nome = extrairNomeComPosicao(palavras)
    if (nome) console.log(`✅ Nome por POSIÇÃO: "${nome}"`)
  }

  // 2) Por linhas estruturadas
  if (!nome && linhas && linhas.length > 0) {
    console.log(`📐 Tentando extração por LINHAS (${linhas.length} linhas)`)
    nome = extrairNomeComLinhas(linhas)
    if (nome) console.log(`✅ Nome por LINHAS: "${nome}"`)
  }

  // 3) Fallback: texto puro
  if (!nome) {
    console.log('📐 Tentando extração por TEXTO (fallback)')
    nome = extrairNomeTexto(textoCompleto)
    if (nome) console.log(`✅ Nome por TEXTO: "${nome}"`)
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
