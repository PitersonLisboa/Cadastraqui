import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'
import { PassThrough } from 'stream'

// ===========================================
// TIPOS
// ===========================================

interface CandidaturaExport {
  id: string
  candidato: {
    nome: string
    cpf: string
    email?: string
    telefone?: string
  }
  edital: {
    titulo: string
    anoLetivo: string
  }
  status: string
  dataInscricao: Date
  observacao?: string
}

interface EditalExport {
  id: string
  titulo: string
  anoLetivo: string
  vagas: number
  status: string
  dataInicio: Date
  dataFim: Date
  totalCandidaturas: number
}

interface RelatorioConfig {
  titulo: string
  subtitulo?: string
  instituicao?: string
  dataGeracao?: Date
}

// ===========================================
// UTILITÁRIOS
// ===========================================

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em Análise',
  DOCUMENTACAO_PENDENTE: 'Documentação Pendente',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  CANCELADO: 'Cancelado',
  RASCUNHO: 'Rascunho',
  ABERTO: 'Aberto',
  ENCERRADO: 'Encerrado',
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('pt-BR')
}

function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// ===========================================
// EXPORTAÇÃO PDF
// ===========================================

export async function exportarCandidaturasPDF(
  candidaturas: CandidaturaExport[],
  config: RelatorioConfig
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Cabeçalho
    doc.fontSize(20).font('Helvetica-Bold').text(config.titulo, { align: 'center' })
    if (config.subtitulo) {
      doc.fontSize(12).font('Helvetica').text(config.subtitulo, { align: 'center' })
    }
    if (config.instituicao) {
      doc.fontSize(10).text(config.instituicao, { align: 'center' })
    }
    doc.moveDown()
    doc.fontSize(8).text(`Gerado em: ${formatDate(config.dataGeracao || new Date())}`, { align: 'right' })
    doc.moveDown(2)

    // Resumo
    const aprovadas = candidaturas.filter(c => c.status === 'APROVADO').length
    const reprovadas = candidaturas.filter(c => c.status === 'REPROVADO').length
    const pendentes = candidaturas.filter(c => !['APROVADO', 'REPROVADO', 'CANCELADO'].includes(c.status)).length

    doc.fontSize(12).font('Helvetica-Bold').text('Resumo')
    doc.fontSize(10).font('Helvetica')
    doc.text(`Total de Candidaturas: ${candidaturas.length}`)
    doc.text(`Aprovadas: ${aprovadas}`)
    doc.text(`Reprovadas: ${reprovadas}`)
    doc.text(`Em Análise: ${pendentes}`)
    doc.moveDown(2)

    // Tabela de candidaturas
    doc.fontSize(12).font('Helvetica-Bold').text('Lista de Candidaturas')
    doc.moveDown()

    // Cabeçalho da tabela
    const tableTop = doc.y
    const colWidths = [150, 90, 80, 100, 70]
    const headers = ['Candidato', 'CPF', 'Edital', 'Data Inscrição', 'Status']

    doc.fontSize(9).font('Helvetica-Bold')
    let xPos = 50
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' })
      xPos += colWidths[i]
    })

    // Linha separadora
    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke()

    // Dados
    doc.font('Helvetica').fontSize(8)
    let yPos = tableTop + 20

    candidaturas.forEach((cand, index) => {
      // Nova página se necessário
      if (yPos > 750) {
        doc.addPage()
        yPos = 50
      }

      xPos = 50
      const rowData = [
        cand.candidato.nome.substring(0, 25),
        formatCPF(cand.candidato.cpf),
        cand.edital.titulo.substring(0, 15),
        formatDate(cand.dataInscricao),
        STATUS_LABELS[cand.status] || cand.status,
      ]

      rowData.forEach((data, i) => {
        doc.text(data, xPos, yPos, { width: colWidths[i], align: 'left' })
        xPos += colWidths[i]
      })

      yPos += 15

      // Linha alternada
      if (index % 2 === 0) {
        doc.rect(50, yPos - 15, 495, 15).fill('#f5f5f5').stroke()
        doc.fill('#000000')
      }
    })

    // Rodapé
    const pages = doc.bufferedPageRange()
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i)
      doc.fontSize(8).text(
        `Página ${i + 1} de ${pages.count}`,
        50, 780,
        { align: 'center' }
      )
    }

    doc.end()
  })
}

export async function exportarRelatorioPDF(
  dados: any,
  config: RelatorioConfig
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Cabeçalho
    doc.fontSize(20).font('Helvetica-Bold').text(config.titulo, { align: 'center' })
    if (config.subtitulo) {
      doc.fontSize(12).font('Helvetica').text(config.subtitulo, { align: 'center' })
    }
    doc.moveDown()
    doc.fontSize(8).text(`Gerado em: ${formatDate(config.dataGeracao || new Date())}`, { align: 'right' })
    doc.moveDown(2)

    // Conteúdo dinâmico baseado nos dados
    if (dados.resumo) {
      doc.fontSize(14).font('Helvetica-Bold').text('Resumo Geral')
      doc.moveDown()
      doc.fontSize(10).font('Helvetica')
      
      Object.entries(dados.resumo).forEach(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
        doc.text(`${label}: ${value}`)
      })
      doc.moveDown(2)
    }

    if (dados.candidaturasPorStatus) {
      doc.fontSize(14).font('Helvetica-Bold').text('Candidaturas por Status')
      doc.moveDown()
      doc.fontSize(10).font('Helvetica')
      
      dados.candidaturasPorStatus.forEach((item: any) => {
        doc.text(`${STATUS_LABELS[item.status] || item.status}: ${item.total}`)
      })
      doc.moveDown(2)
    }

    doc.end()
  })
}

// ===========================================
// EXPORTAÇÃO EXCEL
// ===========================================

export async function exportarCandidaturasExcel(
  candidaturas: CandidaturaExport[],
  config: RelatorioConfig
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cadastraqui'
  workbook.created = new Date()

  // Planilha principal
  const sheet = workbook.addWorksheet('Candidaturas')

  // Cabeçalho do relatório
  sheet.mergeCells('A1:G1')
  sheet.getCell('A1').value = config.titulo
  sheet.getCell('A1').font = { size: 16, bold: true }
  sheet.getCell('A1').alignment = { horizontal: 'center' }

  if (config.subtitulo) {
    sheet.mergeCells('A2:G2')
    sheet.getCell('A2').value = config.subtitulo
    sheet.getCell('A2').alignment = { horizontal: 'center' }
  }

  sheet.mergeCells('A3:G3')
  sheet.getCell('A3').value = `Gerado em: ${formatDate(config.dataGeracao || new Date())}`
  sheet.getCell('A3').font = { size: 9, italic: true }
  sheet.getCell('A3').alignment = { horizontal: 'right' }

  // Cabeçalhos da tabela
  const headerRow = sheet.getRow(5)
  headerRow.values = ['#', 'Candidato', 'CPF', 'Email', 'Telefone', 'Edital', 'Data Inscrição', 'Status']
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' },
  }
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.alignment = { horizontal: 'center' }

  // Larguras das colunas
  sheet.columns = [
    { key: 'num', width: 5 },
    { key: 'candidato', width: 30 },
    { key: 'cpf', width: 15 },
    { key: 'email', width: 25 },
    { key: 'telefone', width: 15 },
    { key: 'edital', width: 25 },
    { key: 'dataInscricao', width: 15 },
    { key: 'status', width: 18 },
  ]

  // Dados
  candidaturas.forEach((cand, index) => {
    const row = sheet.addRow({
      num: index + 1,
      candidato: cand.candidato.nome,
      cpf: formatCPF(cand.candidato.cpf),
      email: cand.candidato.email || '-',
      telefone: cand.candidato.telefone || '-',
      edital: cand.edital.titulo,
      dataInscricao: formatDate(cand.dataInscricao),
      status: STATUS_LABELS[cand.status] || cand.status,
    })

    // Cores alternadas
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      }
    }

    // Cor do status
    const statusCell = row.getCell(8)
    if (cand.status === 'APROVADO') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }
      statusCell.font = { color: { argb: 'FF166534' } }
    } else if (cand.status === 'REPROVADO') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
      statusCell.font = { color: { argb: 'FF991B1B' } }
    } else if (cand.status === 'EM_ANALISE') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
      statusCell.font = { color: { argb: 'FF1E40AF' } }
    }
  })

  // Planilha de resumo
  const resumoSheet = workbook.addWorksheet('Resumo')
  
  resumoSheet.mergeCells('A1:B1')
  resumoSheet.getCell('A1').value = 'Resumo do Relatório'
  resumoSheet.getCell('A1').font = { size: 14, bold: true }

  const aprovadas = candidaturas.filter(c => c.status === 'APROVADO').length
  const reprovadas = candidaturas.filter(c => c.status === 'REPROVADO').length
  const emAnalise = candidaturas.filter(c => c.status === 'EM_ANALISE').length
  const pendentes = candidaturas.filter(c => c.status === 'PENDENTE').length

  resumoSheet.addRow([])
  resumoSheet.addRow(['Total de Candidaturas', candidaturas.length])
  resumoSheet.addRow(['Aprovadas', aprovadas])
  resumoSheet.addRow(['Reprovadas', reprovadas])
  resumoSheet.addRow(['Em Análise', emAnalise])
  resumoSheet.addRow(['Pendentes', pendentes])

  resumoSheet.getColumn(1).width = 25
  resumoSheet.getColumn(2).width = 15

  // Gerar buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function exportarEditaisExcel(
  editais: EditalExport[],
  config: RelatorioConfig
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cadastraqui'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Editais')

  // Cabeçalho
  sheet.mergeCells('A1:G1')
  sheet.getCell('A1').value = config.titulo
  sheet.getCell('A1').font = { size: 16, bold: true }
  sheet.getCell('A1').alignment = { horizontal: 'center' }

  // Cabeçalhos da tabela
  const headerRow = sheet.getRow(3)
  headerRow.values = ['#', 'Título', 'Ano Letivo', 'Vagas', 'Início', 'Fim', 'Status', 'Candidaturas']
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' },
  }
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }

  // Larguras
  sheet.columns = [
    { key: 'num', width: 5 },
    { key: 'titulo', width: 35 },
    { key: 'anoLetivo', width: 12 },
    { key: 'vagas', width: 10 },
    { key: 'dataInicio', width: 12 },
    { key: 'dataFim', width: 12 },
    { key: 'status', width: 15 },
    { key: 'candidaturas', width: 15 },
  ]

  // Dados
  editais.forEach((edital, index) => {
    sheet.addRow({
      num: index + 1,
      titulo: edital.titulo,
      anoLetivo: edital.anoLetivo,
      vagas: edital.vagas,
      dataInicio: formatDate(edital.dataInicio),
      dataFim: formatDate(edital.dataFim),
      status: STATUS_LABELS[edital.status] || edital.status,
      candidaturas: edital.totalCandidaturas,
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ===========================================
// EXPORT DO SERVIÇO
// ===========================================

export const exportService = {
  exportarCandidaturasPDF,
  exportarCandidaturasExcel,
  exportarEditaisExcel,
  exportarRelatorioPDF,
}
