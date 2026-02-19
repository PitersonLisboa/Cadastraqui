// ===========================================
// PARSER DE CERTIDÃO — Estado Civil
// Extrai estado civil do texto OCR de certidões
// (casamento, nascimento, divórcio, óbito)
//
// Estratégia:
//   1. Detectar tipo de certidão pelo título/cabeçalho
//   2. Buscar palavras-chave de estado civil no corpo
//   3. Retornar o valor compatível com ESTADO_CIVIL_OPTIONS
// ===========================================

export interface DadosCertidao {
  estadoCivil: string | null    // SOLTEIRO, CASADO, DIVORCIADO, VIUVO, UNIAO_ESTAVEL
  tipoCertidao: string | null   // CASAMENTO, NASCIMENTO, DIVORCIO, OBITO, UNIAO_ESTAVEL
  confianca: {
    estadoCivil: boolean
    tipoCertidao: boolean
  }
}

// Padrões de títulos de certidão
const CERTIDAO_PATTERNS: Array<{ regex: RegExp; tipo: string; estadoCivil: string }> = [
  // Casamento
  { regex: /CERTID[AÃ]O\s+DE\s+CASAMENTO/i, tipo: 'CASAMENTO', estadoCivil: 'CASADO' },
  { regex: /REGISTRO\s+(?:CIVIL\s+)?DE\s+CASAMENTO/i, tipo: 'CASAMENTO', estadoCivil: 'CASADO' },
  { regex: /CERTIFICADO\s+DE\s+CASAMENTO/i, tipo: 'CASAMENTO', estadoCivil: 'CASADO' },
  { regex: /CASAMENTO\s+CIVIL/i, tipo: 'CASAMENTO', estadoCivil: 'CASADO' },
  { regex: /MATRIM[OÔ]NIO/i, tipo: 'CASAMENTO', estadoCivil: 'CASADO' },

  // Divórcio (pode aparecer como averbação na certidão de casamento)
  { regex: /CERTID[AÃ]O\s+DE\s+DIV[OÓ]RCIO/i, tipo: 'DIVORCIO', estadoCivil: 'DIVORCIADO' },
  { regex: /AVERBA[CÇ][AÃ]O\s+DE\s+DIV[OÓ]RCIO/i, tipo: 'DIVORCIO', estadoCivil: 'DIVORCIADO' },
  { regex: /DISSOLU[CÇ][AÃ]O\s+(?:DO\s+)?(?:V[IÍ]NCULO\s+)?(?:MATRIMONIAL|CASAMENTO)/i, tipo: 'DIVORCIO', estadoCivil: 'DIVORCIADO' },
  { regex: /SENTENÇA\s+DE\s+DIV[OÓ]RCIO/i, tipo: 'DIVORCIO', estadoCivil: 'DIVORCIADO' },

  // Óbito (cônjuge falecido → viúvo)
  { regex: /CERTID[AÃ]O\s+DE\s+[OÓ]BITO/i, tipo: 'OBITO', estadoCivil: 'VIUVO' },
  { regex: /REGISTRO\s+(?:CIVIL\s+)?DE\s+[OÓ]BITO/i, tipo: 'OBITO', estadoCivil: 'VIUVO' },
  { regex: /ATESTADO\s+DE\s+[OÓ]BITO/i, tipo: 'OBITO', estadoCivil: 'VIUVO' },

  // União estável
  { regex: /UNI[AÃ]O\s+EST[AÁ]VEL/i, tipo: 'UNIAO_ESTAVEL', estadoCivil: 'UNIAO_ESTAVEL' },
  { regex: /CONTRATO\s+DE\s+UNI[AÃ]O/i, tipo: 'UNIAO_ESTAVEL', estadoCivil: 'UNIAO_ESTAVEL' },
  { regex: /CONVIV[EÊ]NCIA\s+EST[AÁ]VEL/i, tipo: 'UNIAO_ESTAVEL', estadoCivil: 'UNIAO_ESTAVEL' },
  { regex: /DECLARA[CÇ][AÃ]O\s+DE\s+UNI[AÃ]O/i, tipo: 'UNIAO_ESTAVEL', estadoCivil: 'UNIAO_ESTAVEL' },

  // Nascimento (solteiro — certidão de nascimento sem casamento)
  { regex: /CERTID[AÃ]O\s+DE\s+NASCIMENTO/i, tipo: 'NASCIMENTO', estadoCivil: 'SOLTEIRO' },
  { regex: /REGISTRO\s+(?:CIVIL\s+)?DE\s+NASCIMENTO/i, tipo: 'NASCIMENTO', estadoCivil: 'SOLTEIRO' },
]

// Palavras-chave soltas no corpo do texto
const KEYWORDS_ESTADO_CIVIL: Array<{ regex: RegExp; estadoCivil: string; tipo: string }> = [
  { regex: /\bDIVORCIAD[OA]\b/i, estadoCivil: 'DIVORCIADO', tipo: 'DIVORCIO' },
  { regex: /\bDIV[OÓ]RCIO\b/i, estadoCivil: 'DIVORCIADO', tipo: 'DIVORCIO' },
  { regex: /\bCASAD[OA]\b/i, estadoCivil: 'CASADO', tipo: 'CASAMENTO' },
  { regex: /\bCASAMENTO\b/i, estadoCivil: 'CASADO', tipo: 'CASAMENTO' },
  { regex: /\bVI[UÚ]V[OA]\b/i, estadoCivil: 'VIUVO', tipo: 'OBITO' },
  { regex: /\b[OÓ]BITO\b/i, estadoCivil: 'VIUVO', tipo: 'OBITO' },
  { regex: /\bUNI[AÃ]O\s+EST[AÁ]VEL\b/i, estadoCivil: 'UNIAO_ESTAVEL', tipo: 'UNIAO_ESTAVEL' },
  { regex: /\bSOLTEIR[OA]\b/i, estadoCivil: 'SOLTEIRO', tipo: 'NASCIMENTO' },
  { regex: /\bNASCIMENTO\b/i, estadoCivil: 'SOLTEIRO', tipo: 'NASCIMENTO' },
]

/**
 * Parseia texto OCR de certidão para extrair estado civil.
 */
export function parsearCertidao(textoCompleto: string): DadosCertidao {
  console.log('🔍 Parser certidão — texto recebido:\n', textoCompleto.substring(0, 500))

  let estadoCivil: string | null = null
  let tipoCertidao: string | null = null

  // ── 1. Buscar pelo título da certidão (mais confiável) ──
  for (const pattern of CERTIDAO_PATTERNS) {
    if (pattern.regex.test(textoCompleto)) {
      tipoCertidao = pattern.tipo
      estadoCivil = pattern.estadoCivil
      console.log(`📋 Certidão detectada pelo título: ${tipoCertidao} → ${estadoCivil}`)
      break
    }
  }

  // ── 2. Se detectou casamento, verificar se tem averbação de divórcio ──
  if (estadoCivil === 'CASADO') {
    if (/AVERBA[CÇ][AÃ]O\s+DE\s+DIV[OÓ]RCIO/i.test(textoCompleto) ||
        /DISSOLU[CÇ][AÃ]O/i.test(textoCompleto) ||
        /DIVORCI/i.test(textoCompleto)) {
      console.log('⚠️ Certidão de casamento com averbação de divórcio detectada')
      estadoCivil = 'DIVORCIADO'
      tipoCertidao = 'DIVORCIO'
    }
  }

  // ── 3. Se não encontrou pelo título, buscar palavras-chave ──
  if (!estadoCivil) {
    // Contar ocorrências de cada estado civil para pegar o mais frequente
    const contagem: Record<string, number> = {}

    for (const kw of KEYWORDS_ESTADO_CIVIL) {
      const matches = textoCompleto.match(new RegExp(kw.regex.source, 'gi'))
      if (matches) {
        contagem[kw.estadoCivil] = (contagem[kw.estadoCivil] || 0) + matches.length
      }
    }

    // Priorizar: DIVORCIADO > CASADO > VIUVO > UNIAO_ESTAVEL > SOLTEIRO
    // (divórcio/viúvo override casamento, pois a certidão pode mencionar ambos)
    const prioridade = ['DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'CASADO', 'SOLTEIRO']
    for (const ec of prioridade) {
      if ((contagem[ec] || 0) > 0) {
        estadoCivil = ec
        const kwMatch = KEYWORDS_ESTADO_CIVIL.find(k => k.estadoCivil === ec)
        tipoCertidao = kwMatch?.tipo || null
        console.log(`📋 Estado civil por keywords: ${estadoCivil} (${contagem[ec]} ocorrências)`)
        break
      }
    }
  }

  if (estadoCivil) console.log(`✅ Estado civil: "${estadoCivil}"`)
  if (tipoCertidao) console.log(`✅ Tipo certidão: "${tipoCertidao}"`)

  if (!estadoCivil) {
    console.warn('⚠️ Não foi possível detectar estado civil no texto')
  }

  return {
    estadoCivil,
    tipoCertidao,
    confianca: {
      estadoCivil: estadoCivil !== null,
      tipoCertidao: tipoCertidao !== null,
    },
  }
}
