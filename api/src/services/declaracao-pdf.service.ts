/**
 * Serviço de geração de PDF para Declarações CEBAS
 * Utiliza PDFKit para gerar o documento conforme modelo do Cadastraqui
 * 
 * v2 — Paginação dinâmica (sem páginas em branco)
 */

import PDFDocument from 'pdfkit'

// Formatar CPF
function fmtCpf(cpf: string | null | undefined): string {
  if (!cpf) return ''
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

// Formatar moeda BRL
function fmtMoney(v: number | string | null | undefined): string {
  const n = typeof v === 'string' ? parseFloat(v) : (v || 0)
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  try {
    const date = new Date(d)
    return date.toLocaleDateString('pt-BR')
  } catch {
    return d
  }
}

interface CandidatoData {
  nome: string
  cpf: string
  rg?: string | null
  rgOrgao?: string | null
  rgEstado?: string | null
  nacionalidade?: string | null
  estadoCivil?: string | null
  profissao?: string | null
  cep?: string | null
  endereco?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  usuario?: { email?: string }
  membrosFamilia?: any[]
  veiculos?: any[]
}

export async function gerarPdfDeclaracoes(
  candidato: CandidatoData,
  declaracoes: any[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const declMap = new Map<string, any>()
    for (const d of declaracoes) {
      declMap.set(d.tipo, d)
    }

    const email = candidato.usuario?.email || ''
    const PAGE_BOTTOM = doc.page.height - 80 // margem para rodapé

    // ── Helper: verificar se precisa nova página ──
    function checkPageBreak(spaceNeeded: number = 120) {
      if (doc.y > PAGE_BOTTOM - spaceNeeded) {
        doc.addPage()
      }
    }

    // ── Helper: título de seção ──
    function sectionTitle(title: string) {
      checkPageBreak(150)
      doc.fontSize(12).font('Helvetica-Bold')
        .text(title, { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(10).font('Helvetica')
    }

    // ══════════════════════════════════════════
    // CABEÇALHO + DECLARAÇÃO PRINCIPAL
    // ══════════════════════════════════════════

    doc.fontSize(14).font('Helvetica-Bold')
      .text('DECLARAÇÕES PARA FINS DE PROCESSO SELETIVO CEBAS', { align: 'center' })
    doc.moveDown(1)

    doc.fontSize(10).font('Helvetica')
    doc.text(
      `Eu, ${candidato.nome}, portador(a) da cédula de identidade RG nº ${candidato.rg || ''}, ` +
      `órgão emissor ${candidato.rgOrgao || ''}, UF do órgão emissor ${candidato.rgEstado || ''}, ` +
      `inscrito(a) no CPF nº ${fmtCpf(candidato.cpf)}, nacionalidade ${candidato.nacionalidade || 'Brasileira'}, ` +
      `estado civil ${candidato.estadoCivil || ''}, profissão ${candidato.profissao || ''}, ` +
      `residente na Rua ${candidato.endereco || ''}, nº ${candidato.numero || ''}, ` +
      `complemento ${candidato.complemento || ''}, CEP: ${candidato.cep || ''}, ` +
      `bairro ${candidato.bairro || ''}, cidade ${candidato.cidade || ''}, ` +
      `estado ${candidato.uf || ''}, UF ${candidato.uf || ''}, ` +
      `e-mail: ${email}, ` +
      `declaro para os devidos fins do processo seletivo realizado nos termos da Lei Complementar nº 187 ` +
      `de 16 de dezembro de 2021 que todas as informações estão corretas.`,
      { align: 'justify', lineGap: 2 }
    )
    doc.moveDown(1.5)

    // ══════════════════════════════════════════
    // DECLARAÇÕES CONDICIONAIS (só aparecem se preenchidas)
    // ══════════════════════════════════════════

    // === AUSÊNCIA DE RENDA ===
    const ausencia = declMap.get('AUSENCIA_RENDA')
    if (ausencia && ausencia.resposta === false) {
      sectionTitle('DECLARAÇÃO DE AUSÊNCIA DE RENDA (DESEMPREGADO(A) OU DO LAR)')
      doc.text(`Eu, ${candidato.nome}, inscrito(a) no CPF ${fmtCpf(candidato.cpf)}, declaro não exercer nenhuma atividade laboral.`)
      doc.moveDown(1)
    }

    // === AUTÔNOMO/RENDA INFORMAL ===
    const autonomo = declMap.get('AUTONOMO_INFORMAL')
    if (autonomo && autonomo.resposta === true) {
      sectionTitle('DECLARAÇÃO DE AUTÔNOMO(A)/RENDA INFORMAL')
      doc.text(`Eu, ${candidato.nome}, portador(a) do CPF nº ${fmtCpf(candidato.cpf)}, ` +
        `desenvolvo atividades ${autonomo.dados?.atividade || ''}.`)
      doc.moveDown(1)
    }

    // === RENDA DE EMPRESÁRIO ===
    const empresario = declMap.get('EMPRESARIO')
    if (empresario && empresario.resposta === true) {
      sectionTitle('DECLARAÇÃO DE RENDA DE EMPRESÁRIO')
      doc.text(`Eu, ${candidato.nome}, portador(a) do CPF nº ${fmtCpf(candidato.cpf)}, ` +
        `sou sócio de uma empresa e exerço a atividade: ${empresario.dados?.atividade || ''}.`)
      doc.moveDown(1)
    }

    // === EMPRESA INATIVA ===
    const empresaInativa = declMap.get('EMPRESA_INATIVA')
    if (empresaInativa && empresaInativa.resposta === true) {
      const ei = empresaInativa.dados || {}
      const end = ei.endereco || {}
      sectionTitle('DECLARAÇÃO DE EMPRESA INATIVA')
      doc.text(`Eu, ${candidato.nome}, portador(a) do CPF nº ${fmtCpf(candidato.cpf)}, ` +
        `possuo uma empresa inativa cuja razão social é ${ei.razaoSocial || ''}, ` +
        `inscrita sob o CNPJ ${ei.cnpj || ''}, localizada no endereço ` +
        `${end.rua || ''}, nº ${end.numero || ''}, complemento ${end.complemento || ''}, ` +
        `bairro ${end.bairro || ''}, cidade ${end.cidade || ''}, UF ${end.uf || ''}, CEP ${end.cep || ''}.`)
      doc.moveDown(1)
    }

    // === ISENTO DE IR ===
    const isentoIr = declMap.get('ISENTO_IR')
    if (isentoIr && isentoIr.resposta === true) {
      const ano = new Date().getFullYear()
      sectionTitle('DECLARAÇÃO DE ISENTO DE IMPOSTO DE RENDA')
      doc.text(
        `Eu, ${candidato.nome}, portador(a) da cédula de identidade RG n° ${candidato.rg || ''}, ` +
        `órgão emissor ${candidato.rgOrgao || ''}, UF do órgão emissor ${candidato.rgEstado || ''}, ` +
        `CPF n° ${fmtCpf(candidato.cpf)}, nacionalidade ${candidato.nacionalidade || 'Brasileira'}, ` +
        `estado civil ${candidato.estadoCivil || ''}, profissão ${candidato.profissao || ''}, ` +
        `residente na rua ${candidato.endereco || ''}, n° ${candidato.numero || ''}, ` +
        `complemento ${candidato.complemento || ''}, CEP: ${candidato.cep || ''}, ` +
        `bairro ${candidato.bairro || ''}, cidade ${candidato.cidade || ''}, UF ${candidato.uf || ''}, ` +
        `e-mail: ${email}, DECLARO SER ISENTO(A) da apresentação da Declaração ` +
        `do Imposto de Renda Pessoa Física (DIRPF) no(s) exercício(s) ${ano}. ` +
        `por não incorrer em nenhuma das hipóteses de obrigatoriedade estabelecidas pelas ` +
        `Instruções Normativas (IN) da Receita Federal do Brasil (RFB). Esta declaração está ` +
        `em conformidade com a IN RFB n° 1548/2015 e a Lei n° 7.115/83. Declaro ainda, sob as penas da lei, ` +
        `serem verdadeiras todas as informações acima prestadas.`,
        { align: 'justify', lineGap: 2 }
      )
      doc.moveDown(1)
    }

    // === RENDIMENTOS MEI ===
    const mei = declMap.get('MEI')
    if (mei && mei.resposta === true) {
      sectionTitle('DECLARAÇÃO DE RENDIMENTOS – MEI')
      doc.text(`Eu, ${candidato.nome}, portador(a) do CPF nº ${fmtCpf(candidato.cpf)}, ` +
        `POSSUO o cadastro como Microempreendedor Individual e consta no meu cadastro, neste processo, ` +
        `a Declaração Anual do Simples Nacional para o(a) Microempreendedor(a) Individual (DAS-SIMEI). ` +
        `Esta declaração está em conformidade com a Lei n° 7.115/83. Declaro ainda, sob as penas da lei, ` +
        `serem verdadeiras todas as informações acima prestadas.`,
        { align: 'justify', lineGap: 2 })
      doc.moveDown(1)
    }

    // === SEPARAÇÃO DE FATO ===
    const separacao = declMap.get('SEPARACAO_FATO')
    if (separacao && separacao.resposta === true) {
      const sep = separacao.dados || {}
      const endSep = sep.endereco || {}
      sectionTitle('DECLARAÇÃO DE SEPARAÇÃO DE FATO (NÃO JUDICIAL)')
      doc.text(`Me separei de ${sep.nome || ''}, inscrito(a) no CPF nº ${sep.cpf || ''}, ` +
        `desde ${fmtDate(sep.dataSeparacao)}. Meu(minha) ex-companheiro(a) reside na ` +
        `${endSep.rua || ''}, nº ${endSep.numero || ''}, complemento ${endSep.complemento || ''}, ` +
        `CEP: ${endSep.cep || ''}, bairro ${endSep.bairro || ''}, cidade ${endSep.cidade || ''}, ` +
        `UF ${endSep.uf || ''}.\nAté o presente momento não formalizei o encerramento de nossa relação por meio de divórcio.`,
        { align: 'justify', lineGap: 2 })
      doc.moveDown(1)
    }

    // === PENSÃO ALIMENTÍCIA ===
    const pensao = declMap.get('PENSAO_ALIMENTICIA')
    if (pensao && (pensao.dados?.recebePropia || pensao.dados?.filhosRecebem || pensao.dados?.outrosPaisRecebem)) {
      const p = pensao.dados || {}
      sectionTitle('DECLARAÇÃO DE PENSÃO ALIMENTÍCIA')

      if (p.recebePropia) {
        doc.text(`A. Recebo pensão alimentícia (judicial) no valor total de ${fmtMoney(p.valor)} ` +
          `de ${p.pagadorNome || ''}, inscrito(a) no CPF nº ${p.pagadorCpf || ''}.`)
        doc.moveDown(0.5)
      }

      if (p.filhosRecebem && p.pensaoFilhos) {
        const pf = p.pensaoFilhos
        const filhosNomes = (pf.filhos || []).map((fid: string) => {
          const m = candidato.membrosFamilia?.find((mm: any) => mm.id === fid)
          return m?.nome || fid
        }).join(', ')
        doc.text(`B. Meu(s) filho(s) ${filhosNomes} recebe(m) pensão alimentícia (judicial) ` +
          `no valor total de ${fmtMoney(pf.valor)} de ${pf.pagadorNome || ''} ` +
          `inscrito(a) no CPF nº ${pf.pagadorCpf || ''}.`)
        doc.moveDown(0.5)
      }

      if (p.outrosPaisRecebem && Array.isArray(p.pensoesOutros)) {
        for (let i = 0; i < p.pensoesOutros.length; i++) {
          const po = p.pensoesOutros[i]
          const filhosNomes = (po.filhos || []).map((fid: string) => {
            const m = candidato.membrosFamilia?.find((mm: any) => mm.id === fid)
            return m?.nome || fid
          }).join(', ')
          doc.text(`C. Meu(s) filho(s) ${filhosNomes} recebe(m) pensão alimentícia (judicial) ` +
            `no valor total de ${fmtMoney(po.valor)} de ${po.pagadorNome || ''}, ` +
            `inscrito(a) no CPF nº ${po.pagadorCpf || ''}.`)
          doc.moveDown(0.3)
        }
      }
      doc.moveDown(1)
    }

    // === ALUGUEL ===
    const aluguel = declMap.get('ALUGUEL')
    if (aluguel && aluguel.resposta === true) {
      const al = aluguel.dados || {}
      const endAl = al.endereco || {}
      sectionTitle('DECLARAÇÃO DE RENDIMENTO DE IMÓVEL ALUGADO')
      doc.text(`Eu, ${candidato.nome}, portador(a) do CPF nº ${fmtCpf(candidato.cpf)}, ` +
        `recebo aluguel do imóvel situado no Endereço ${endAl.rua || ''}, nº ${endAl.numero || ''}, ` +
        `complemento ${endAl.complemento || ''}, CEP: ${endAl.cep || ''}, bairro ${endAl.bairro || ''}, ` +
        `cidade ${endAl.cidade || ''}, UF ${endAl.uf || ''}, no valor mensal de ${fmtMoney(al.valor)}, ` +
        `pago por ${al.locatarioNome || ''}, inscrito(a) no CPF nº ${al.locatarioCpf || ''} (locatário(a)).`,
        { align: 'justify', lineGap: 2 })
      doc.moveDown(1)
    }

    // === TRABALHADOR RURAL ===
    const rural = declMap.get('TRABALHADOR_RURAL')
    if (rural && rural.resposta === true) {
      sectionTitle('DECLARAÇÃO DE TRABALHADOR(A) RURAL')
      doc.text(`Eu, ${candidato.nome}, portador(a) do CPF nº ${fmtCpf(candidato.cpf)}, ` +
        `sou trabalhador(a) rural, desenvolvo atividades ${rural.dados?.atividade || ''}.`)
      doc.moveDown(1)
    }

    // === ESTADO CIVIL SOLTEIRO ===
    const solteiro = declMap.get('ESTADO_CIVIL_SOLTEIRO')
    if (solteiro && solteiro.resposta === true) {
      sectionTitle('DECLARAÇÃO DE ESTADO CIVIL SOLTEIRO(A)')
      doc.text(`Eu, ${candidato.nome}, inscrito(a) no CPF ${fmtCpf(candidato.cpf)} declaro que sou solteiro(a).`)
      doc.moveDown(1)
    }

    // === UNIÃO ESTÁVEL ===
    const uniao = declMap.get('UNIAO_ESTAVEL')
    if (uniao && uniao.resposta === true) {
      const u = uniao.dados || {}
      sectionTitle('DECLARAÇÃO DE UNIÃO ESTÁVEL')
      doc.text(`Convivo em União Estável com ${u.parceiro || ''}, CPF ${u.cpf || ''}, ` +
        `desde ${fmtDate(u.dataInicio)} e que somos juridicamente capazes. ` +
        `Nossa União Estável possui natureza pública, contínua e duradoura com o objetivo de constituição de família, ` +
        `nos termos dos artigos 1723 e seguintes do Código Civil.`,
        { align: 'justify', lineGap: 2 })
      doc.moveDown(1)
    }

    // === VEÍCULO ===
    const veiculo = declMap.get('VEICULO')
    if (veiculo) {
      sectionTitle('DECLARAÇÃO DE PROPRIEDADE DE VEÍCULO AUTOMOTOR')
      const veiculos = candidato.veiculos || []
      if (veiculos.length > 0) {
        doc.text('Declaro que eu ou alguém do meu grupo familiar possui o(s) veículo(s) abaixo:')
        for (let i = 0; i < veiculos.length; i++) {
          const v = veiculos[i]
          const vd = veiculo.dados || {}
          doc.text(`${i + 1}. ${v.modelo} para fins de ${vd.finalidade || 'Deslocamento Necessário'} ` +
            `sendo do tipo ${vd.tipo || 'Carros Pequenos e Utilitários'}`)
        }
      } else {
        doc.text('Declaro que nem eu nem meu grupo familiar possui veículo automotor.')
      }
      doc.moveDown(1)
    }

    // === CONTA CORRENTE/POUPANÇA ===
    const conta = declMap.get('CONTA_BANCARIA')
    if (conta) {
      sectionTitle('DECLARAÇÃO DE ABERTURA E MANUTENÇÃO DE CONTA CORRENTE E/OU POUPANÇA')
      if (conta.resposta === false) {
        doc.text('Afirmo que não sou titular de nenhuma conta corrente ou conta poupança em quaisquer instituições financeiras.')
      } else {
        doc.text('Afirmo que possuo conta corrente e/ou poupança em instituição financeira.')
      }
      doc.moveDown(1)
    }

    // ══════════════════════════════════════════
    // SEÇÕES FIXAS (sempre aparecem)
    // ══════════════════════════════════════════

    // === LGPD ===
    sectionTitle('TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS')
    doc.text(
      `Declaro estar ciente de que o tratamento de meus dados pessoais é condição essencial para a participação no processo ` +
      `seletivo de concessão e/ou renovação de Bolsa de Estudo e por este termo declaro estar ciente e dou o meu consentimento ` +
      `para a realização do tratamento para as finalidades informadas no Edital, na forma da Lei nº 13.709, DE 14 DE AGOSTO ` +
      `DE 2018. "Art. 1o Esta Lei dispõe sobre o tratamento de dados pessoais, inclusive nos meios digitais, por pessoa natural ` +
      `ou por pessoa jurídica de direito público ou privado, com o objetivo de proteger os direitos fundamentais de liberdade e ` +
      `de privacidade e o livre desenvolvimento da personalidade da pessoa natural". O processo seletivo realizado por meio da ` +
      `plataforma Cadastraqui se baseia na confiabilidade, sigilo e arquivamento do documento e na instituição de ensino, do ` +
      `mesmo modo nos termos de seu edital.`,
      { align: 'justify', lineGap: 2 }
    )
    doc.moveDown(1)

    // === ALTERAÇÃO NO GRUPO FAMILIAR ===
    sectionTitle('ALTERAÇÃO NO TAMANHO DO GRUPO FAMILIAR E/OU RENDA')
    doc.text(
      `Tenho ciência de que devo comunicar o(a) assistente social da entidade beneficente sobre nascimento ou falecimento de ` +
      `membro do meu grupo familiar, desde que morem na mesma residência, bem como sobre eventual rescisão de contrato ` +
      `de trabalho, encerramento de atividade que gere renda ou sobre início em novo emprego ou atividade que gere renda ` +
      `para um dos membros, pois altera a aferição realizada e o benefício em decorrência da nova renda familiar bruta mensal ` +
      `pode ser ampliado, reduzido ou mesmo cancelado, após análise por profissional de serviço social.`,
      { align: 'justify', lineGap: 2 }
    )
    doc.moveDown(1)

    // === INTEIRA RESPONSABILIDADE ===
    sectionTitle('INTEIRA RESPONSABILIDADE PELAS INFORMAÇÕES CONTIDAS NESTE INSTRUMENTO')
    doc.text(
      `Estou ciente e assumo, inteira responsabilidade pelas informações contidas neste instrumento e em relação as ` +
      `informações prestadas no decorrer do preenchimento deste formulário eletrônico e documentos anexados, estando ` +
      `consciente que a apresentação de documento falso e/ou a falsidade nas informações implicará nas penalidades cabíveis, ` +
      `previstas nos artigos 298 e 299 do Código Penal Brasileiro, bem como sobre a condição prevista no caput e § 2º do art. 26 ` +
      `da Lei Complementar nº 187, de 16 de dezembro de 2021. Art. 26. Os alunos beneficiários das bolsas de estudo de que trata ` +
      `esta Lei Complementar, ou seus pais ou responsáveis, quando for o caso, respondem legalmente pela veracidade e pela ` +
      `autenticidade das informações por eles prestadas, e as informações prestadas pelas instituições de ensino superior (IES) ` +
      `acerca dos beneficiários em qualquer âmbito devem respeitar os limites estabelecidos pela Lei nº 13.709, de 14 de agosto ` +
      `de 2018. (...) § 2º As bolsas de estudo poderão ser canceladas a qualquer tempo em caso de constatação de falsidade da ` +
      `informação prestada pelo bolsista ou por seus pais ou seu responsável, ou de inidoneidade de documento apresentado, ` +
      `sem prejuízo das demais sanções cíveis e penais cabíveis, sem que o ato do cancelamento resulte em prejuízo à entidade ` +
      `beneficente concedente, inclusive na apuração das proporções exigidas nesta Seção, salvo se comprovada negligência ` +
      `ou má-fé da entidade beneficente.`,
      { align: 'justify', lineGap: 2 }
    )

    // ══════════════════════════════════════════
    // ASSINATURA
    // ══════════════════════════════════════════

    checkPageBreak(120)
    doc.moveDown(2)

    const hoje = new Date()
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                   'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
    doc.fontSize(12).font('Helvetica')
      .text(`${candidato.cidade || ''}, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`,
            { align: 'left' })

    doc.moveDown(3)

    doc.fontSize(10)
      .text('__________________________________________________', { align: 'center' })
      .text(`Assinatura ${candidato.nome}`, { align: 'center' })

    // ── Rodapé em todas as páginas ──
    const range = doc.bufferedPageRange()
    const totalPages = range.count
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i)
      const bottom = doc.page.height - 40
      doc.fontSize(8).fillColor('#666')
      doc.text('CADASTRAQUI', 50, bottom, { continued: false, lineBreak: false })
      doc.text(`Pág. ${i + 1}/${totalPages}`, 50, bottom, { align: 'right' })
    }
    doc.fillColor('#000')

    doc.end()
  })
}
