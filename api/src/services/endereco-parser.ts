// ===========================================
// PARSER DE ENDEREÇO — Comprovante de Residência
// Extrai: rua, número, bairro, cidade, UF, CEP
// do texto OCR de contas de água/luz/gás/telefone
// ===========================================

export interface DadosEndereco {
  cep: string | null
  rua: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  complemento: string | null
  confianca: {
    cep: boolean
    rua: boolean
    numero: boolean
    bairro: boolean
    cidade: boolean
    uf: boolean
    complemento: boolean
  }
}

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
]

// Prefixos de logradouro
const PREFIXOS_RUA = [
  'RUA', 'R\\.', 'AVENIDA', 'AV\\.', 'AV', 'ALAMEDA', 'AL\\.', 'AL',
  'TRAVESSA', 'TRAV\\.', 'TV\\.', 'PRAÇA', 'PCA\\.', 'PÇA',
  'ESTRADA', 'EST\\.', 'RODOVIA', 'ROD\\.',
  'LARGO', 'VIELA', 'BECO', 'PASSAGEM',
  'CONDOMÍNIO', 'COND\\.', 'CONJUNTO', 'CONJ\\.',
]

const PREFIXO_REGEX = new RegExp(
  `(${PREFIXOS_RUA.join('|')})\\s+`,
  'i'
)

/**
 * Extrai CEP do texto.
 * Formatos: 12246-020, 12246020
 */
function extrairCEP(texto: string): string | null {
  // Com hífen
  const matchHifen = texto.match(/(\d{5})\s*[-–]\s*(\d{3})/)
  if (matchHifen) return `${matchHifen[1]}-${matchHifen[2]}`

  // Sem hífen (8 dígitos seguidos, não pode ser CPF/RG)
  const matches = texto.match(/\b(\d{8})\b/g)
  if (matches) {
    for (const m of matches) {
      const primeiros5 = parseInt(m.substring(0, 5))
      // CEPs brasileiros vão de 01000 a 99999
      if (primeiros5 >= 1000 && primeiros5 <= 99999) {
        return `${m.substring(0, 5)}-${m.substring(5)}`
      }
    }
  }

  return null
}

/**
 * Extrai logradouro (rua/avenida) do texto.
 * Procura por prefixos como "Rua", "Av.", "Alameda", etc.
 */
function extrairLogradouro(texto: string): { rua: string | null; numero: string | null; complemento: string | null } {
  const linhas = texto.split(/[\n\r\t]+/).map(l => l.trim()).filter(l => l.length > 0)

  for (const linha of linhas) {
    const match = linha.match(PREFIXO_REGEX)
    if (!match) continue

    // Pegar tudo a partir do prefixo
    const inicio = linha.indexOf(match[0])
    let endereco = linha.substring(inicio).trim()

    // Limpar lixo no final
    endereco = endereco
      .replace(/\s*(CEP|BAIRRO|CIDADE|MUNICÍPIO|CNPJ|CPF|INSCRIÇÃO|REFERENTE|VENCIMENTO|TOTAL|VALOR|FATURA).*$/i, '')
      .trim()

    if (endereco.length < 5) continue

    // Extrair número: "Rua dos Piquirões, 120" ou "Rua X Nº 120" ou "Rua X N. 120"
    let numero: string | null = null
    let complemento: string | null = null

    // Padrão: ", 120" ou ",120" ou " Nº 120" ou " N° 120" ou " N. 120" ou " Nro 120"
    const numMatch = endereco.match(/[,\s]+(?:N[ºo°\.]?\s*|Nro\.?\s*)?(\d{1,5})\s*(.*)$/i)
    if (numMatch) {
      numero = numMatch[1]
      const resto = numMatch[2].trim()

      // Checar complemento: "apto 5644", "ap. 302", "bl A", "casa 2"
      if (resto) {
        const compMatch = resto.match(/^[-–,\s]*(AP\.?\s*\d+|APTO\.?\s*\d+|BL\.?\s*\w+|BLOCO\s*\w+|CASA\s*\d+|SALA\s*\d+|LOTE\s*\d+|LT\.?\s*\d+|QUADRA\s*\d+|QD\.?\s*\d+|.+)/i)
        if (compMatch) {
          complemento = compMatch[1].trim()
          // Limpar se pegou lixo
          if (complemento.length > 50 || /\d{5}/.test(complemento)) complemento = null
        }
      }

      // Remover número e complemento da rua
      endereco = endereco.substring(0, endereco.indexOf(numMatch[0])).trim()
    }

    // Limpar vírgula final
    endereco = endereco.replace(/,\s*$/, '').trim()

    if (endereco.length >= 5) {
      return {
        rua: formatarEndereco(endereco),
        numero,
        complemento: complemento ? formatarEndereco(complemento) : null,
      }
    }
  }

  return { rua: null, numero: null, complemento: null }
}

/**
 * Extrai bairro do texto.
 * Procura por padrões: "BAIRRO: ...", "BRO: ...", ou proximidade com a palavra "BAIRRO"
 */
function extrairBairro(texto: string): string | null {
  const linhas = texto.split(/[\n\r\t]+/).map(l => l.trim()).filter(l => l.length > 0)

  for (let i = 0; i < linhas.length; i++) {
    // "BAIRRO: Parque Residencial" ou "BRO: ..."
    const match = linhas[i].match(/(?:BAIRRO|BRO|B\.)\s*[:]\s*(.+)/i)
    if (match) {
      const bairro = match[1]
        .replace(/\s*(CIDADE|MUNICÍPIO|CEP|UF|ESTADO|CNPJ|REFERENTE).*$/i, '')
        .trim()
      if (bairro.length >= 2) return formatarEndereco(bairro)
    }

    // "BAIRRO" seguido por valor na mesma ou próxima linha (layout tabular)
    if (/^BAIRRO\s*$/i.test(linhas[i]) && i + 1 < linhas.length) {
      const prox = linhas[i + 1].trim()
      if (prox.length >= 2 && !/\d{5}/.test(prox) && !/^(CIDADE|CEP|UF)/i.test(prox)) {
        return formatarEndereco(prox)
      }
    }
  }

  return null
}

/**
 * Extrai cidade do texto.
 */
function extrairCidade(texto: string): string | null {
  const linhas = texto.split(/[\n\r\t]+/).map(l => l.trim()).filter(l => l.length > 0)

  for (let i = 0; i < linhas.length; i++) {
    // "CIDADE: São José dos Campos" ou "MUNICÍPIO: ..."
    const match = linhas[i].match(/(?:CIDADE|MUNICÍPIO|MUNICIPIO)\s*[:]\s*(.+)/i)
    if (match) {
      let cidade = match[1]
        .replace(/\s*(UF|ESTADO|CEP|CNPJ|BAIRRO).*$/i, '')
        .replace(/\s*[-\/]\s*[A-Z]{2}\s*$/, '') // remover " - SP" no final
        .trim()
      if (cidade.length >= 2) return formatarEndereco(cidade)
    }

    // "CIDADE" sozinha + próxima linha
    if (/^(?:CIDADE|MUNICÍPIO)\s*$/i.test(linhas[i]) && i + 1 < linhas.length) {
      const prox = linhas[i + 1].trim().replace(/\s*[-\/]\s*[A-Z]{2}\s*$/, '').trim()
      if (prox.length >= 2 && !/\d{5}/.test(prox)) {
        return formatarEndereco(prox)
      }
    }
  }

  // Fallback: procurar "CIDADE/UF" como "São José dos Campos/SP" ou "São Paulo - SP"
  for (const linha of linhas) {
    for (const uf of UFS) {
      const pattern = new RegExp(`([A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\\s]{3,})\\s*[-\\/]\\s*${uf}\\b`, 'i')
      const match = linha.match(pattern)
      if (match) {
        const cidade = match[1].trim()
        // Não pegar se é parte de endereço (tem Rua, Av.)
        if (!PREFIXO_REGEX.test(cidade) && cidade.length >= 3 && !/\d/.test(cidade)) {
          return formatarEndereco(cidade)
        }
      }
    }
  }

  return null
}

/**
 * Extrai UF do texto.
 */
function extrairUF(texto: string, cidade: string | null): string | null {
  const linhas = texto.split(/[\n\r\t]+/).map(l => l.trim()).filter(l => l.length > 0)

  // "UF: SP" ou "ESTADO: SP"
  for (const linha of linhas) {
    const match = linha.match(/(?:UF|ESTADO)\s*[:]\s*([A-Z]{2})/i)
    if (match) {
      const uf = match[1].toUpperCase()
      if (UFS.includes(uf)) return uf
    }
  }

  // Procurar UF junto com cidade: "São Paulo/SP", "São Paulo - SP"
  for (const linha of linhas) {
    for (const uf of UFS) {
      const pattern = new RegExp(`[-\\/\\s]${uf}\\b`)
      if (pattern.test(linha.toUpperCase())) return uf
    }
  }

  // Mapa de capitais conhecidas
  if (cidade) {
    const cidadeUF: Record<string, string> = {
      'SAO PAULO': 'SP', 'SÃO PAULO': 'SP', 'RIO DE JANEIRO': 'RJ',
      'BELO HORIZONTE': 'MG', 'SALVADOR': 'BA', 'CURITIBA': 'PR',
      'FORTALEZA': 'CE', 'RECIFE': 'PE', 'PORTO ALEGRE': 'RS',
      'BRASILIA': 'DF', 'BRASÍLIA': 'DF', 'MANAUS': 'AM',
      'GOIANIA': 'GO', 'GOIÂNIA': 'GO', 'BELEM': 'PA', 'BELÉM': 'PA',
      'CAMPINAS': 'SP', 'SANTOS': 'SP', 'GUARULHOS': 'SP',
      'SAO BERNARDO DO CAMPO': 'SP', 'OSASCO': 'SP', 'SOROCABA': 'SP',
      'SAO JOSE DOS CAMPOS': 'SP', 'SÃO JOSÉ DOS CAMPOS': 'SP',
      'NITEROI': 'RJ', 'NITERÓI': 'RJ', 'VITORIA': 'ES', 'VITÓRIA': 'ES',
      'FLORIANOPOLIS': 'SC', 'FLORIANÓPOLIS': 'SC', 'NATAL': 'RN',
      'JOAO PESSOA': 'PB', 'JOÃO PESSOA': 'PB', 'MACEIO': 'AL', 'MACEIÓ': 'AL',
      'SAO LUIS': 'MA', 'SÃO LUÍS': 'MA', 'TERESINA': 'PI', 'ARACAJU': 'SE',
      'CAMPO GRANDE': 'MS', 'CUIABA': 'MT', 'CUIABÁ': 'MT',
      'PORTO VELHO': 'RO', 'MACAPA': 'AP', 'MACAPÁ': 'AP',
      'BOA VISTA': 'RR', 'PALMAS': 'TO', 'RIO BRANCO': 'AC',
      'RIBEIRAO PRETO': 'SP', 'RIBEIRÃO PRETO': 'SP', 'UBERLANDIA': 'MG', 'UBERLÂNDIA': 'MG',
      'LONDRINA': 'PR', 'MARINGA': 'PR', 'MARINGÁ': 'PR',
      'JOINVILLE': 'SC', 'BLUMENAU': 'SC',
    }
    const upper = cidade.toUpperCase().trim()
    if (cidadeUF[upper]) return cidadeUF[upper]
  }

  return null
}

function formatarEndereco(texto: string): string {
  return texto
    .trim()
    .split(/\s+/)
    .map(p => {
      const lower = p.toLowerCase()
      if (['da', 'de', 'do', 'das', 'dos', 'e', 'a', 'o'].includes(lower)) return lower
      // Manter abreviações em maiúsculo
      if (/^(R|AV|AL|TV|PCA|EST|ROD|COND|CONJ|AP|BL|QD|LT)\.?$/i.test(p)) {
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
      }
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Função principal: parseia texto OCR de comprovante de endereço.
 */
export function parsearEndereco(textoCompleto: string): DadosEndereco {
  console.log('🔍 Texto OCR endereço recebido:\n', textoCompleto.substring(0, 500))

  const cep = extrairCEP(textoCompleto)
  const { rua, numero, complemento } = extrairLogradouro(textoCompleto)
  const bairro = extrairBairro(textoCompleto)
  const cidade = extrairCidade(textoCompleto)
  const uf = extrairUF(textoCompleto, cidade)

  if (cep) console.log(`✅ CEP: "${cep}"`)
  if (rua) console.log(`✅ Rua: "${rua}"`)
  if (numero) console.log(`✅ Número: "${numero}"`)
  if (bairro) console.log(`✅ Bairro: "${bairro}"`)
  if (cidade) console.log(`✅ Cidade: "${cidade}"`)
  if (uf) console.log(`✅ UF: "${uf}"`)
  if (complemento) console.log(`✅ Complemento: "${complemento}"`)

  const resultado: DadosEndereco = {
    cep, rua, numero, bairro, cidade, uf, complemento,
    confianca: {
      cep: cep !== null,
      rua: rua !== null,
      numero: numero !== null,
      bairro: bairro !== null,
      cidade: cidade !== null,
      uf: uf !== null,
      complemento: complemento !== null,
    },
  }

  console.log('📋 Endereço extraído:', JSON.stringify(resultado, null, 2))
  return resultado
}
