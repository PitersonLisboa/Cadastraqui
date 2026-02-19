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
  naturalidade: string | null     // cidade de nascimento
  naturalidadeEstado: string | null // UF da naturalidade (ex: SP, RJ)
  nacionalidade: string | null    // Brasileira, etc.
  filiacao: string[] | null       // nomes dos pais (até 2)
  confianca: {
    nome: boolean
    cpf: boolean
    rg: boolean
    dataNascimento: boolean
    orgaoEmissor: boolean
    estadoEmissor: boolean
    naturalidade: boolean
    naturalidadeEstado: boolean
    nacionalidade: boolean
    filiacao: boolean
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
// EXTRATORES DE NATURALIDADE, NACIONALIDADE E FILIAÇÃO
// ===================================================

/**
 * Extrai naturalidade (cidade de nascimento) do RG.
 * Formato típico: "NATURALIDADE São Paulo" ou "NATURALIDADE\nSão Paulo"
 */
function extrairNaturalidade(texto: string): string | null {
  const linhas = texto.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0)

  for (let i = 0; i < linhas.length; i++) {
    const upper = linhas[i].toUpperCase()

    // "NATURALIDADE São Paulo" na mesma linha
    const matchMesma = linhas[i].match(/NATURALIDADE[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s]+)/i)
    if (matchMesma) {
      const cidade = matchMesma[1].trim()
      // Remover se colou com outro campo (ex: "São Paulo DATA")
      const limpa = cidade.replace(/\s*(DATA|NASCIMENTO|DOC|CPF|FILIAÇÃO|FILIACAO|REGISTRO).*$/i, '').trim()
      if (limpa.length >= 2) return formatarCidade(limpa)
    }

    // "NATURALIDADE" sozinha → próxima linha
    if (/^NATURALIDADE\s*$/i.test(upper) && i + 1 < linhas.length) {
      const proxLinha = linhas[i + 1].trim()
      const limpa = proxLinha.replace(/\s*(DATA|NASCIMENTO|DOC|CPF|FILIAÇÃO|FILIACAO|REGISTRO).*$/i, '').trim()
      if (limpa.length >= 2 && !/\d/.test(limpa)) return formatarCidade(limpa)
    }
  }
  return null
}

/**
 * Extrai naturalidade usando posição das palavras (OCR.space).
 */
function extrairNaturalidadeComPosicao(palavras: PalavraOCR[]): string | null {
  const idxNat = palavras.findIndex(p => p.text.trim().toUpperCase() === 'NATURALIDADE')
  if (idxNat < 0) return null

  const pNat = palavras[idxNat]
  const yNat = pNat.top + pNat.height / 2
  const xNatDir = pNat.left + pNat.width
  const toleranciaY = pNat.height * 2.0

  const candidatas: PalavraOCR[] = []

  for (let i = idxNat + 1; i < palavras.length; i++) {
    const p = palavras[i]
    const txt = p.text.trim().toUpperCase()
    const yP = p.top + p.height / 2
    const diffY = yP - yNat

    if (ROTULOS_CAMPO.includes(txt) && txt !== 'NATURALIDADE') break

    const mesmaLinha = Math.abs(diffY) < pNat.height * 0.8
    const proximaLinha = diffY > 0 && diffY < toleranciaY

    if (mesmaLinha && p.left >= xNatDir - 5) {
      candidatas.push(p)
    } else if (proximaLinha && !/\d/.test(p.text)) {
      candidatas.push(p)
    } else if (diffY > toleranciaY) {
      break
    }
  }

  if (candidatas.length === 0) return null

  candidatas.sort((a, b) => {
    const dy = a.top - b.top
    if (Math.abs(dy) > a.height * 0.5) return dy
    return a.left - b.left
  })

  const resultado = candidatas.map(p => p.text.trim()).join(' ')
  if (resultado.length >= 2) return formatarCidade(resultado)
  return null
}

/**
 * Tenta detectar o estado (UF) da naturalidade.
 * Alguns RGs trazem "São Paulo - SP" ou "São Paulo/SP".
 */
function extrairNaturalidadeEstado(texto: string, naturalidade: string | null): string | null {
  const linhas = texto.split(/[\n\r]+/).map(l => l.trim())

  for (const linha of linhas) {
    if (!/NATURALIDADE/i.test(linha)) continue

    // "NATURALIDADE São Paulo - SP" ou "São Paulo/SP"
    for (const uf of UFS) {
      const pattern = new RegExp(`[\\-\\/\\s]${uf}\\b`, 'i')
      if (pattern.test(linha)) return uf
    }
  }

  // Se temos a naturalidade, tentar mapear cidades conhecidas para UF
  if (naturalidade) {
    const cidadeUF: Record<string, string> = {
      'SAO PAULO': 'SP', 'SÃO PAULO': 'SP', 'RIO DE JANEIRO': 'RJ',
      'BELO HORIZONTE': 'MG', 'SALVADOR': 'BA', 'CURITIBA': 'PR',
      'FORTALEZA': 'CE', 'RECIFE': 'PE', 'PORTO ALEGRE': 'RS',
      'BRASILIA': 'DF', 'BRASÍLIA': 'DF', 'MANAUS': 'AM',
      'GOIANIA': 'GO', 'GOIÂNIA': 'GO', 'BELEM': 'PA', 'BELÉM': 'PA',
      'CAMPINAS': 'SP', 'SANTOS': 'SP', 'GUARULHOS': 'SP',
      'SAO BERNARDO DO CAMPO': 'SP', 'OSASCO': 'SP', 'SOROCABA': 'SP',
      'NITEROI': 'RJ', 'NITERÓI': 'RJ', 'VITORIA': 'ES', 'VITÓRIA': 'ES',
      'FLORIANOPOLIS': 'SC', 'FLORIANÓPOLIS': 'SC', 'NATAL': 'RN',
      'JOAO PESSOA': 'PB', 'JOÃO PESSOA': 'PB', 'MACEIO': 'AL', 'MACEIÓ': 'AL',
      'SAO LUIS': 'MA', 'SÃO LUÍS': 'MA', 'TERESINA': 'PI', 'ARACAJU': 'SE',
      'CAMPO GRANDE': 'MS', 'CUIABA': 'MT', 'CUIABÁ': 'MT',
      'PORTO VELHO': 'RO', 'MACAPA': 'AP', 'MACAPÁ': 'AP',
      'BOA VISTA': 'RR', 'PALMAS': 'TO', 'RIO BRANCO': 'AC',
    }
    const upper = naturalidade.toUpperCase().trim()
    if (cidadeUF[upper]) return cidadeUF[upper]
  }

  return null
}

/**
 * Extrai nacionalidade do RG.
 * Quase sempre "BRASILEIRA" ou "BRASILEIRO", mas pode ser outra.
 */
function extrairNacionalidade(texto: string): string | null {
  const linhas = texto.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0)

  for (let i = 0; i < linhas.length; i++) {
    // "NACIONALIDADE Brasileira" na mesma linha
    const match = linhas[i].match(/NACIONALIDADE[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s]+)/i)
    if (match) {
      const nac = match[1].trim().replace(/\s*(NATURALIDADE|DATA|NASCIMENTO|FILIAÇÃO|FILIACAO).*$/i, '').trim()
      if (nac.length >= 2) return formatarCidade(nac) // capitalizar
    }

    // "NACIONALIDADE" sozinha → próxima linha
    if (/^NACIONALIDADE\s*$/i.test(linhas[i]) && i + 1 < linhas.length) {
      const proxLinha = linhas[i + 1].trim()
      if (proxLinha.length >= 2 && !/\d/.test(proxLinha)) {
        const nac = proxLinha.replace(/\s*(NATURALIDADE|DATA|NASCIMENTO).*$/i, '').trim()
        return formatarCidade(nac)
      }
    }
  }

  // Busca direta por palavras de nacionalidade comuns
  const upper = texto.toUpperCase()
  if (upper.includes('BRASILEIRA')) return 'Brasileira'
  if (upper.includes('BRASILEIRO')) return 'Brasileira'

  return null
}

/**
 * Extrai filiação (nomes dos pais) do RG.
 * Formato típico:
 *   FILIAÇÃO
 *   JOAO DA SILVA
 *   MARIA DA SILVA
 */
function extrairFiliacao(texto: string): string[] | null {
  const linhas = texto.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0)
  const pais: string[] = []

  for (let i = 0; i < linhas.length; i++) {
    const upper = linhas[i].toUpperCase()

    if (/FILIA[ÇC][ÃA]O/i.test(upper)) {
      // "FILIAÇÃO NOME PAI" na mesma linha
      const matchMesma = linhas[i].match(/FILIA[ÇC][ÃA]O[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s]+)/i)
      if (matchMesma) {
        const nome = matchMesma[1].trim()
        if (isNomeValido(nome)) pais.push(formatarNome(nome))
      }

      // Próximas 1-2 linhas podem ter os nomes
      for (let j = i + 1; j <= Math.min(i + 3, linhas.length - 1) && pais.length < 2; j++) {
        const candidato = linhas[j].trim()
        const candidatoUpper = candidato.toUpperCase()

        // Parar se encontrou outro rótulo
        if (ROTULOS_CAMPO.some(r => candidatoUpper.startsWith(r))) break
        if (/\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/.test(candidato)) break // data

        if (isNomeValido(candidato)) {
          pais.push(formatarNome(candidato))
        }
      }

      break // só processar o primeiro bloco de filiação
    }
  }

  return pais.length > 0 ? pais : null
}

/**
 * Extrai filiação usando posição das palavras (OCR.space).
 */
function extrairFiliacaoComPosicao(palavras: PalavraOCR[]): string[] | null {
  const idxFil = palavras.findIndex(p => /^FILIA[ÇC][ÃA]O$/i.test(p.text.trim()))
  if (idxFil < 0) return null

  const pFil = palavras[idxFil]
  const yFil = pFil.top + pFil.height / 2
  const toleranciaY = pFil.height * 4.0 // filiação pode ter 2 linhas de nomes

  const linhasAgrupadas: Map<number, PalavraOCR[]> = new Map()

  for (let i = idxFil + 1; i < palavras.length; i++) {
    const p = palavras[i]
    const txt = p.text.trim().toUpperCase()
    const yP = p.top + p.height / 2
    const diffY = yP - yFil

    if (ROTULOS_CAMPO.includes(txt) && !/FILIA/i.test(txt)) break
    if (diffY > toleranciaY) break
    if (/\d/.test(p.text)) continue // pular números

    // Agrupar por linha (top similar)
    const linhaKey = Math.round(p.top / (p.height * 0.8))
    if (!linhasAgrupadas.has(linhaKey)) linhasAgrupadas.set(linhaKey, [])
    linhasAgrupadas.get(linhaKey)!.push(p)
  }

  const pais: string[] = []
  const linhasOrdenadas = [...linhasAgrupadas.entries()].sort(([a], [b]) => a - b)

  for (const [, palavrasDaLinha] of linhasOrdenadas) {
    if (pais.length >= 2) break
    palavrasDaLinha.sort((a, b) => a.left - b.left)
    const nome = palavrasDaLinha.map(p => p.text.trim()).join(' ')
    if (isNomeValido(nome)) {
      pais.push(formatarNome(nome))
    }
  }

  return pais.length > 0 ? pais : null
}

function formatarCidade(cidade: string): string {
  return cidade
    .trim()
    .split(/\s+/)
    .map(p => {
      const lower = p.toLowerCase()
      if (['da', 'de', 'do', 'das', 'dos', 'e'].includes(lower)) return lower
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    })
    .join(' ')
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

  // ── NATURALIDADE: posição → texto ──
  let naturalidade: string | null = null
  if (palavras && palavras.length > 2) {
    naturalidade = extrairNaturalidadeComPosicao(palavras)
    if (naturalidade) console.log(`✅ Naturalidade por POSIÇÃO: "${naturalidade}"`)
  }
  if (!naturalidade) {
    naturalidade = extrairNaturalidade(textoCompleto)
    if (naturalidade) console.log(`✅ Naturalidade por TEXTO: "${naturalidade}"`)
  }

  const naturalidadeEstado = extrairNaturalidadeEstado(textoCompleto, naturalidade)
  if (naturalidadeEstado) console.log(`✅ Estado naturalidade: "${naturalidadeEstado}"`)

  // ── NACIONALIDADE ──
  const nacionalidade = extrairNacionalidade(textoCompleto)
  if (nacionalidade) console.log(`✅ Nacionalidade: "${nacionalidade}"`)

  // ── FILIAÇÃO: posição → texto ──
  let filiacao: string[] | null = null
  if (palavras && palavras.length > 2) {
    filiacao = extrairFiliacaoComPosicao(palavras)
    if (filiacao) console.log(`✅ Filiação por POSIÇÃO: ${JSON.stringify(filiacao)}`)
  }
  if (!filiacao) {
    filiacao = extrairFiliacao(textoCompleto)
    if (filiacao) console.log(`✅ Filiação por TEXTO: ${JSON.stringify(filiacao)}`)
  }

  const resultado: DadosRG = {
    nome,
    cpf,
    rg,
    dataNascimento,
    orgaoEmissor,
    estadoEmissor,
    naturalidade,
    naturalidadeEstado,
    nacionalidade,
    filiacao,
    confianca: {
      nome: nome !== null,
      cpf: cpf !== null,
      rg: rg !== null,
      dataNascimento: dataNascimento !== null,
      orgaoEmissor: orgaoEmissor !== null,
      estadoEmissor: estadoEmissor !== null,
      naturalidade: naturalidade !== null,
      naturalidadeEstado: naturalidadeEstado !== null,
      nacionalidade: nacionalidade !== null,
      filiacao: filiacao !== null,
    },
  }

  console.log('📋 Dados extraídos:', JSON.stringify(resultado, null, 2))
  return resultado
}
