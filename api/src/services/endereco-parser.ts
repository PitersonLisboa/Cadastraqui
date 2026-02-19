// ===========================================
// PARSER DE ENDEREÇO — Comprovante de Residência
// Extrai: rua, número, bairro, cidade, UF, CEP
// do texto OCR de boletos, contas de água/luz/gás/telefone
//
// Estratégia principal:
//   1. Localizar seção PAGADOR/SACADO no boleto
//   2. Extrair linhas dessa seção (nome, endereço, bairro, CEP+cidade)
//   3. Fallback: buscar padrões no texto completo
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
  'RUA', 'R\\.?', 'AVENIDA', 'AV\\.?', 'ALAMEDA', 'AL\\.?',
  'TRAVESSA', 'TRAV\\.?', 'TV\\.?', 'PRAÇA', 'PCA\\.?', 'PÇA\\.?',
  'ESTRADA', 'EST\\.?', 'RODOVIA', 'ROD\\.?',
  'LARGO', 'LGO\\.?', 'VIELA', 'VL\\.?', 'BECO', 'BC\\.?',
  'PASSAGEM', 'PSG\\.?', 'CONDOMÍNIO', 'COND\\.?',
  'CONJUNTO', 'CONJ\\.?', 'SERVIDÃO', 'SER\\.?',
]

const PREFIXO_REGEX = new RegExp(
  `^\\s*(${PREFIXOS_RUA.join('|')})\\s+`,
  'i'
)

// Palavras-chave que indicam seção do pagador
const PAGADOR_LABELS = [
  'PAGADOR', 'SACADO', 'SACADO/PAGADOR', 'PAGADOR/SACADO',
  'DADOS DO PAGADOR', 'DADOS DO SACADO',
  'NOME DO PAGADOR', 'NOME DO SACADO',
  'DESTINATÁRIO', 'CLIENTE', 'TITULAR',
  'NOME/RAZÃO SOCIAL',
]

// ─── Extração por seção PAGADOR/SACADO ───

/**
 * Localiza a seção PAGADOR/SACADO e retorna as linhas seguintes.
 * Em boletos, essa seção contém: nome, endereço, bairro, CEP cidade-UF.
 */
function extrairLinhasPagador(texto: string): string[] {
  const linhas = texto.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0)

  for (let i = 0; i < linhas.length; i++) {
    const upper = linhas[i].toUpperCase().replace(/[:\-–]/g, ' ').trim()

    for (const label of PAGADOR_LABELS) {
      if (upper.includes(label)) {
        // Pegar até 6 linhas depois da label PAGADOR/SACADO
        // (nome, rua, bairro, cep+cidade, cpf/cnpj)
        const resultado: string[] = []

        // Se a mesma linha tem conteúdo após a label, incluir
        const posLabel = linhas[i].toUpperCase().indexOf(label.charAt(0))
        const aposLabel = linhas[i].substring(posLabel + label.length).replace(/^[\s:\-–]+/, '').trim()
        if (aposLabel.length > 3) resultado.push(aposLabel)

        // Linhas seguintes
        for (let j = i + 1; j < Math.min(i + 7, linhas.length); j++) {
          const l = linhas[j].trim()
          // Parar se encontrou outra seção de boleto
          if (/^(BENEFICIÁRIO|CEDENTE|AUTENTICAÇÃO|BANCO|VENCIMENTO|VALOR|INSTRU[CÇ][OÕ]ES|COD\s*BAIXA|ESPÉCIE|DATA\s*DOC)/i.test(l)) break
          // Parar se encontrou código de barras (sequência longa de números)
          if (/^\d{30,}$/.test(l.replace(/[\s.\-]/g, ''))) break
          if (l.length > 2) resultado.push(l)
        }

        if (resultado.length >= 2) {
          console.log(`📍 Seção PAGADOR encontrada (linha ${i}): ${resultado.length} linhas`)
          return resultado
        }
      }
    }
  }

  return []
}

// ─── Extração de CEP ───

/**
 * Extrai CEP do texto.
 * Formato: 12246-020 ou 12246020
 */
function extrairCEP(texto: string): string | null {
  // Formato com hífen: 12246-020
  const matchHifen = texto.match(/(\d{5})\s*[-–]\s*(\d{3})/)
  if (matchHifen) {
    const cep = `${matchHifen[1]}-${matchHifen[2]}`
    // Validar range de CEP brasileiro (01000-000 a 99999-999)
    const num = parseInt(matchHifen[1])
    if (num >= 1000 && num <= 99999) return cep
  }

  // Formato sem hífen: 8 dígitos que não sejam parte de CPF/CNPJ/código de barras
  const linhas = texto.split(/[\n\r]+/)
  for (const linha of linhas) {
    // Procurar 8 dígitos isolados (não parte de sequência maior)
    const matches = linha.match(/(?<!\d)(\d{8})(?!\d)/g)
    if (matches) {
      for (const m of matches) {
        const primeiros5 = parseInt(m.substring(0, 5))
        if (primeiros5 >= 1000 && primeiros5 <= 99999) {
          // Verificar que não é CPF (11 dígitos) ou CNPJ (14 dígitos)
          const contexto = linha.replace(/[\s.\-\/]/g, '')
          const pos = contexto.indexOf(m)
          // Se tem mais dígitos grudados, pular
          if (pos > 0 && /\d/.test(contexto[pos - 1])) continue
          if (pos + 8 < contexto.length && /\d/.test(contexto[pos + 8])) continue
          return `${m.substring(0, 5)}-${m.substring(5)}`
        }
      }
    }
  }

  return null
}

/**
 * Encontra a linha que contém o CEP e extrai cidade/UF dela.
 * Padrão típico: "12246-020  São José dos Campos - SP"
 */
function extrairCidadeUFDaLinhaCEP(texto: string): { cidade: string | null; uf: string | null } {
  const linhas = texto.split(/[\n\r]+/).map(l => l.trim())

  for (const linha of linhas) {
    // Procurar linha com CEP + cidade
    const matchCEP = linha.match(/\d{5}\s*[-–]\s*\d{3}/)
    if (!matchCEP) continue

    // Tudo após o CEP
    const apos = linha.substring(linha.indexOf(matchCEP[0]) + matchCEP[0].length).trim()
    if (!apos || apos.length < 2) continue

    // Tentar extrair "Cidade - UF" ou "Cidade/UF" ou "Cidade UF"
    for (const uf of UFS) {
      // "São José dos Campos - SP" ou "São José dos Campos/SP" ou "São José dos Campos SP"
      const pattern = new RegExp(`^(.+?)\\s*[-\\/\\s]\\s*${uf}\\s*$`, 'i')
      const match = apos.match(pattern)
      if (match) {
        const cidade = match[1].replace(/^[-–,\s]+/, '').replace(/[-–,\s]+$/, '').trim()
        if (cidade.length >= 2 && !/\d{5}/.test(cidade)) {
          return { cidade: formatarEndereco(cidade), uf }
        }
      }
    }

    // Fallback: só UF no final
    const ufMatch = apos.match(/\b([A-Z]{2})\s*$/)
    if (ufMatch && UFS.includes(ufMatch[1])) {
      const cidade = apos.substring(0, apos.lastIndexOf(ufMatch[1])).replace(/[-\/\s]+$/, '').trim()
      if (cidade.length >= 2) {
        return { cidade: formatarEndereco(cidade), uf: ufMatch[1] }
      }
    }
  }

  return { cidade: null, uf: null }
}

// ─── Extração de Logradouro ───

/**
 * Extrai logradouro de uma lista de linhas (preferencialmente da seção PAGADOR).
 */
function extrairLogradouro(linhas: string[]): { rua: string | null; numero: string | null; complemento: string | null } {
  for (const linha of linhas) {
    // Linha começa com prefixo de rua?
    if (!PREFIXO_REGEX.test(linha)) continue

    let endereco = linha.trim()

    // Limpar lixo do OCR no final
    endereco = endereco
      .replace(/\s*(CEP|BAIRRO|CIDADE|MUNICÍPIO|CNPJ|CPF|INSCRIÇÃO|REFERENTE|VENCIMENTO|TOTAL|VALOR|FATURA).*$/i, '')
      .trim()

    if (endereco.length < 5) continue

    let numero: string | null = null
    let complemento: string | null = null

    // Extrair número e complemento
    // Padrões: ", 120", " Nº 120", " N° 120", " 120 -", " 120,"
    const numMatch = endereco.match(/[,\s]+(?:N[ºo°\.]?\s*|Nro\.?\s*)?(\d{1,6})\b\s*(.*?)$/i)
    if (numMatch) {
      numero = numMatch[1]
      const resto = numMatch[2].replace(/^[-–,\s]+/, '').trim()

      // Checar complemento: "apto 5644", "ap. 302", "bl A", "casa 2"
      if (resto && resto.length > 0) {
        const compMatch = resto.match(/^(AP\.?\s*\d+|APTO\.?\s*\d+|BL\.?\s*\w+|BLOCO\s*\w+|CASA\s*\d+|SALA\s*\d+|LOTE\s*\d+|LT\.?\s*\d+|QUADRA\s*\d+|QD\.?\s*\d+|ANDAR\s*\d+|.+)/i)
        if (compMatch) {
          complemento = compMatch[1].trim()
          // Limpar se pegou lixo (muito longo ou tem CEP)
          if (complemento.length > 60 || /\d{5}[-–]\d{3}/.test(complemento)) complemento = null
        }
      }

      // Remover número e complemento da rua
      endereco = endereco.substring(0, endereco.indexOf(numMatch[0])).trim()
    }

    // Limpar vírgula/hífen no final
    endereco = endereco.replace(/[,\-–\s]+$/, '').trim()

    if (endereco.length >= 3) {
      return {
        rua: formatarEndereco(endereco),
        numero,
        complemento: complemento ? formatarEndereco(complemento) : null,
      }
    }
  }

  return { rua: null, numero: null, complemento: null }
}

// ─── Extração de Bairro ───

/**
 * Extrai bairro.
 * Estratégia:
 *   1. Nas linhas PAGADOR: linha entre o endereço e o CEP
 *   2. Label "BAIRRO:"
 *   3. Fallback genérico
 */
function extrairBairro(linhasPagador: string[], textoCompleto: string): string | null {
  // Nas linhas do PAGADOR: a linha que NÃO é nome, NÃO é endereço (Rua/Av),
  // NÃO contém CEP, e NÃO é CPF/CNPJ — provavelmente é o bairro
  if (linhasPagador.length >= 3) {
    for (let i = 1; i < linhasPagador.length; i++) {
      const l = linhasPagador[i].trim()
      // Pular se é endereço com prefixo
      if (PREFIXO_REGEX.test(l)) continue
      // Pular se contém CEP
      if (/\d{5}\s*[-–]\s*\d{3}/.test(l)) continue
      // Pular se é CPF/CNPJ
      if (/\d{3}\.\d{3}\.\d{3}[-–]\d{2}/.test(l)) continue
      if (/\d{2}\.\d{3}\.\d{3}\/\d{4}[-–]\d{2}/.test(l)) continue
      // Pular se é só número
      if (/^\d+$/.test(l.replace(/\s/g, ''))) continue
      // Pular se é muito curto
      if (l.length < 3) continue
      // Pular se contém muitos dígitos (provavelmente código)
      if ((l.match(/\d/g) || []).length > l.length * 0.5) continue

      // Se a linha anterior era endereço (Rua/Av), esta é provável bairro
      if (i > 0 && PREFIXO_REGEX.test(linhasPagador[i - 1])) {
        return formatarEndereco(l.replace(/\s*[-–\/]\s*$/, '').trim())
      }
    }
  }

  // Buscar label "BAIRRO: ..."
  const linhas = textoCompleto.split(/[\n\r]+/).map(l => l.trim())
  for (let i = 0; i < linhas.length; i++) {
    const match = linhas[i].match(/(?:BAIRRO|BRO|B\.)\s*[:]\s*(.+)/i)
    if (match) {
      const bairro = match[1].replace(/\s*(CIDADE|MUNICÍPIO|CEP|UF|ESTADO|CNPJ).*$/i, '').trim()
      if (bairro.length >= 2) return formatarEndereco(bairro)
    }
    // "BAIRRO" sozinha + próxima linha
    if (/^BAIRRO\s*$/i.test(linhas[i]) && i + 1 < linhas.length) {
      const prox = linhas[i + 1].trim()
      if (prox.length >= 2 && !/\d{5}/.test(prox) && !/^(CIDADE|CEP|UF)/i.test(prox)) {
        return formatarEndereco(prox)
      }
    }
  }

  return null
}

// ─── Extração de Cidade e UF ───

function extrairCidade(texto: string): string | null {
  const linhas = texto.split(/[\n\r]+/).map(l => l.trim())

  // Label "CIDADE: ..." ou "MUNICÍPIO: ..."
  for (let i = 0; i < linhas.length; i++) {
    const match = linhas[i].match(/(?:CIDADE|MUNICÍPIO|MUNICIPIO)\s*[:]\s*(.+)/i)
    if (match) {
      let cidade = match[1]
        .replace(/\s*(UF|ESTADO|CEP|CNPJ|BAIRRO).*$/i, '')
        .replace(/\s*[-\/]\s*[A-Z]{2}\s*$/, '')
        .trim()
      if (cidade.length >= 2) return formatarEndereco(cidade)
    }
  }

  return null
}

function extrairUF(texto: string, cidade: string | null): string | null {
  const linhas = texto.split(/[\n\r]+/).map(l => l.trim())

  // Label "UF: SP"
  for (const linha of linhas) {
    const match = linha.match(/(?:UF|ESTADO)\s*[:]\s*([A-Z]{2})/i)
    if (match && UFS.includes(match[1].toUpperCase())) return match[1].toUpperCase()
  }

  // UF junto com cidade: "São Paulo/SP", "São Paulo - SP"
  for (const linha of linhas) {
    for (const uf of UFS) {
      if (new RegExp(`[-\\/\\s]${uf}\\b`).test(linha.toUpperCase())) return uf
    }
  }

  // Mapa de capitais e cidades grandes
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
      'RIBEIRAO PRETO': 'SP', 'RIBEIRÃO PRETO': 'SP', 'JUNDIAI': 'SP', 'JUNDIAÍ': 'SP',
      'PIRACICABA': 'SP', 'BAURU': 'SP', 'FRANCA': 'SP', 'MARILIA': 'SP', 'MARÍLIA': 'SP',
      'NITEROI': 'RJ', 'NITERÓI': 'RJ', 'VITORIA': 'ES', 'VITÓRIA': 'ES',
      'FLORIANOPOLIS': 'SC', 'FLORIANÓPOLIS': 'SC', 'NATAL': 'RN',
      'JOAO PESSOA': 'PB', 'JOÃO PESSOA': 'PB', 'MACEIO': 'AL', 'MACEIÓ': 'AL',
      'SAO LUIS': 'MA', 'SÃO LUÍS': 'MA', 'TERESINA': 'PI', 'ARACAJU': 'SE',
      'CAMPO GRANDE': 'MS', 'CUIABA': 'MT', 'CUIABÁ': 'MT',
      'PORTO VELHO': 'RO', 'MACAPA': 'AP', 'MACAPÁ': 'AP',
      'BOA VISTA': 'RR', 'PALMAS': 'TO', 'RIO BRANCO': 'AC',
      'UBERLANDIA': 'MG', 'UBERLÂNDIA': 'MG', 'LONDRINA': 'PR',
      'MARINGA': 'PR', 'MARINGÁ': 'PR', 'JOINVILLE': 'SC', 'BLUMENAU': 'SC',
    }
    const upper = cidade.toUpperCase().normalize('NFC').trim()
    if (cidadeUF[upper]) return cidadeUF[upper]
  }

  return null
}

// ─── Formatação ───

function formatarEndereco(texto: string): string {
  return texto
    .trim()
    .split(/\s+/)
    .map(p => {
      const lower = p.toLowerCase()
      // Preposições em minúsculo
      if (['da', 'de', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'na', 'no', 'nas', 'nos'].includes(lower)) return lower
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    })
    .join(' ')
}

// ─── Função Principal ───

/**
 * Parseia texto OCR de comprovante de endereço (boleto, conta de serviço).
 *
 * Estratégia:
 *   1. Localizar seção PAGADOR/SACADO → extrair linhas da seção
 *   2. Da seção: logradouro (linha com Rua/Av), bairro (linha seguinte), CEP+cidade (linha com 5dígitos-3dígitos)
 *   3. Fallback: buscar padrões no texto completo
 */
export function parsearEndereco(textoCompleto: string): DadosEndereco {
  console.log('🔍 Parser endereço — texto recebido:\n', textoCompleto.substring(0, 600))

  // ── 1. Tentar seção PAGADOR/SACADO ──
  const linhasPagador = extrairLinhasPagador(textoCompleto)
  if (linhasPagador.length > 0) {
    console.log(`📍 Linhas PAGADOR (${linhasPagador.length}):`)
    linhasPagador.forEach((l, i) => console.log(`   [${i}] "${l}"`))
  }

  // ── 2. CEP (procurar em PAGADOR primeiro, depois texto completo) ──
  const textoPagador = linhasPagador.join('\n')
  let cep = extrairCEP(textoPagador) || extrairCEP(textoCompleto)

  // ── 3. Cidade/UF da linha do CEP ──
  let { cidade: cidadeCEP, uf: ufCEP } = extrairCidadeUFDaLinhaCEP(textoPagador)
  if (!cidadeCEP) {
    const result = extrairCidadeUFDaLinhaCEP(textoCompleto)
    cidadeCEP = result.cidade
    ufCEP = result.uf
  }

  // ── 4. Logradouro (PAGADOR primeiro, depois texto completo) ──
  let { rua, numero, complemento } = extrairLogradouro(linhasPagador)
  if (!rua) {
    const todas = textoCompleto.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0)
    const result = extrairLogradouro(todas)
    rua = result.rua
    numero = result.numero
    complemento = result.complemento
  }

  // ── 5. Bairro ──
  const bairro = extrairBairro(linhasPagador, textoCompleto)

  // ── 6. Cidade e UF (CEP line > label > fallback) ──
  let cidade = cidadeCEP || extrairCidade(textoCompleto)
  let uf = ufCEP || extrairUF(textoCompleto, cidade)

  // Se não achou UF mas achou cidade, tentar mapa
  if (cidade && !uf) {
    uf = extrairUF('', cidade)
  }

  // ── Log resultado ──
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

  const total = Object.values(resultado.confianca).filter(v => v).length
  console.log(`📋 Endereço — ${total}/7 campos extraídos`)
  return resultado
}
