import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n')

  // Limpar banco (ordem importa por causa das foreign keys)
  console.log('🗑️  Limpando dados existentes...')
  await prisma.historicoCandidatura.deleteMany()
  await prisma.notificacao.deleteMany()
  await prisma.agendamento.deleteMany()
  await prisma.parecerJuridico.deleteMany()
  await prisma.parecerSocial.deleteMany()
  await prisma.documentoCandidatura.deleteMany()
  await prisma.membroFamilia.deleteMany()
  await prisma.candidatura.deleteMany()
  await prisma.edital.deleteMany()
  await prisma.candidato.deleteMany()
  await prisma.advogado.deleteMany()
  await prisma.assistenteSocial.deleteMany()
  await prisma.documentoInstituicao.deleteMany()
  await prisma.unidadeInstituicao.deleteMany()
  await prisma.membroEquipe.deleteMany()
  await prisma.instituicao.deleteMany()
  await prisma.logAtividade.deleteMany()
  await prisma.usuario.deleteMany()

  const senhaHash = await bcrypt.hash('123456', 10)

  // =============================================
  // 1. ADMIN
  // =============================================
  console.log('👤 Criando Admin...')
  const admin = await prisma.usuario.create({
    data: {
      nome: 'Administrador do Sistema',
      email: 'admin@teste.com',
      senha: senhaHash,
      role: 'ADMIN',
      ativo: true,
    },
  })
  console.log(`   ✓ Admin criado: ${admin.email}`)

  // =============================================
  // 2. INSTITUIÇÃO
  // =============================================
  console.log('\n🏛️  Criando Instituição...')
  const usuarioInstituicao = await prisma.usuario.create({
    data: {
      nome: 'Universidade Federal de Exemplo',
      email: 'instituicao@teste.com',
      senha: senhaHash,
      role: 'INSTITUICAO',
      ativo: true,
    },
  })

  const instituicao = await prisma.instituicao.create({
    data: {
      usuarioId: usuarioInstituicao.id,
      cnpj: '12345678000199',
      razaoSocial: 'Universidade Federal de Exemplo',
      nomeFantasia: 'UFE - Universidade Federal de Exemplo',
      email: 'contato@ufe.edu.br',
      telefone: '1133334444',
      endereco: 'Avenida Universitária',
      numero: '1000',
      complemento: 'Campus Principal',
      bairro: 'Centro Universitário',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01310100',
      status: 'ATIVA',
      tipoInstituicao: 'UNIVERSIDADE',
      codigoMEC: '12345',
    },
  })
  console.log(`   ✓ Instituição criada: ${instituicao.nomeFantasia}`)

  // =============================================
  // 3. EDITAL
  // =============================================
  console.log('\n📋 Criando Edital...')
  const dataAtual = new Date()
  const dataInicio = new Date(dataAtual)
  dataInicio.setDate(dataInicio.getDate() - 10) // Começou há 10 dias
  const dataFim = new Date(dataAtual)
  dataFim.setDate(dataFim.getDate() + 50) // Termina em 50 dias

  const edital = await prisma.edital.create({
    data: {
      instituicaoId: instituicao.id,
      titulo: 'Programa de Bolsas de Estudo 2025 - 1º Semestre',
      descricao: `O Programa de Bolsas de Estudo da UFE tem como objetivo auxiliar estudantes em situação de vulnerabilidade socioeconômica a permanecerem na universidade.

O programa oferece bolsas integrais e parciais (50%) conforme análise socioeconômica realizada pela equipe de assistência social da universidade.`,
      requisitos: `1. Estar regularmente matriculado em curso de graduação presencial
2. Não possuir diploma de curso superior
3. Comprovar renda familiar per capita de até 1,5 salário mínimo
4. Não ter sido reprovado por frequência no semestre anterior`,
      documentosExigidos: `- RG e CPF do candidato
- Comprovante de matrícula atualizado
- Comprovante de residência
- Comprovante de renda de todos os membros da família`,
      dataInicio,
      dataFim,
      vagasDisponiveis: 100,
      anoLetivo: 2025,
      ativo: true,
    },
  })
  console.log(`   ✓ Edital criado: ${edital.titulo}`)

  // =============================================
  // 4. ADVOGADO
  // =============================================
  console.log('\n⚖️  Criando Advogado...')
  const usuarioAdvogado = await prisma.usuario.create({
    data: {
      nome: 'Dr. Ricardo Mendes Oliveira',
      email: 'advogado@teste.com',
      senha: senhaHash,
      role: 'ADVOGADO',
      ativo: true,
    },
  })

  const advogado = await prisma.advogado.create({
    data: {
      usuarioId: usuarioAdvogado.id,
      nome: 'Dr. Ricardo Mendes Oliveira',
      oab: '123456',
      oabUf: 'SP',
      telefone: '11988887777',
      instituicaoId: instituicao.id,
    },
  })
  console.log(`   ✓ Advogado criado: ${advogado.nome} (OAB: ${advogado.oab}/${advogado.oabUf})`)

  // =============================================
  // 5. ASSISTENTES SOCIAIS
  // =============================================
  console.log('\n👩‍💼 Criando Assistentes Sociais...')
  
  // Assistente Social 1
  const usuarioAssistente1 = await prisma.usuario.create({
    data: {
      nome: 'Maria Fernanda Costa Santos',
      email: 'assistente1@teste.com',
      senha: senhaHash,
      role: 'ASSISTENTE_SOCIAL',
      ativo: true,
    },
  })

  const assistente1 = await prisma.assistenteSocial.create({
    data: {
      usuarioId: usuarioAssistente1.id,
      nome: 'Maria Fernanda Costa Santos',
      cress: 'CRESS-SP 45678',
      telefone: '11977776666',
      instituicaoId: instituicao.id,
    },
  })
  console.log(`   ✓ Assistente Social 1: ${assistente1.nome} (${assistente1.cress})`)

  // Assistente Social 2
  const usuarioAssistente2 = await prisma.usuario.create({
    data: {
      nome: 'Ana Paula Rodrigues Lima',
      email: 'assistente2@teste.com',
      senha: senhaHash,
      role: 'ASSISTENTE_SOCIAL',
      ativo: true,
    },
  })

  const assistente2 = await prisma.assistenteSocial.create({
    data: {
      usuarioId: usuarioAssistente2.id,
      nome: 'Ana Paula Rodrigues Lima',
      cress: 'CRESS-SP 78901',
      telefone: '11966665555',
      instituicaoId: instituicao.id,
    },
  })
  console.log(`   ✓ Assistente Social 2: ${assistente2.nome} (${assistente2.cress})`)

  // =============================================
  // 6. CANDIDATOS COM FAMÍLIAS
  // =============================================
  console.log('\n👨‍👩‍👧‍👦 Criando Candidatos e Famílias...')

  // ----- CANDIDATO 1 -----
  const usuarioCandidato1 = await prisma.usuario.create({
    data: {
      nome: 'João Pedro Silva Nascimento',
      email: 'candidato1@teste.com',
      senha: senhaHash,
      role: 'CANDIDATO',
      ativo: true,
    },
  })

  const candidato1 = await prisma.candidato.create({
    data: {
      usuarioId: usuarioCandidato1.id,
      nome: 'João Pedro Silva Nascimento',
      cpf: '11122233344',
      dataNascimento: new Date('2000-03-15'),
      telefone: '1133332222',
      celular: '11955554444',
      endereco: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 45',
      bairro: 'Jardim Primavera',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01234567',
      estadoCivil: 'SOLTEIRO',
      profissao: 'Estudante',
      rendaFamiliar: 2800.00,
    },
  })

  // Família do Candidato 1
  await prisma.membroFamilia.createMany({
    data: [
      {
        candidatoId: candidato1.id,
        nome: 'Maria Helena Silva',
        parentesco: 'MÃE',
        dataNascimento: new Date('1975-08-20'),
        cpf: '22233344455',
        ocupacao: 'Auxiliar de Limpeza',
        renda: 1412.00,
      },
      {
        candidatoId: candidato1.id,
        nome: 'José Carlos Nascimento',
        parentesco: 'PAI',
        dataNascimento: new Date('1972-11-10'),
        cpf: '33344455566',
        ocupacao: 'Pedreiro Autônomo',
        renda: 1800.00,
      },
      {
        candidatoId: candidato1.id,
        nome: 'Ana Beatriz Silva Nascimento',
        parentesco: 'IRMÃ',
        dataNascimento: new Date('2008-05-25'),
        cpf: '44455566677',
        ocupacao: 'Estudante',
        renda: 0,
      },
    ],
  })

  // Candidatura do Candidato 1 (PENDENTE)
  const candidatura1 = await prisma.candidatura.create({
    data: {
      candidatoId: candidato1.id,
      editalId: edital.id,
      status: 'PENDENTE',
      dataInscricao: new Date(dataAtual.getTime() - 5 * 24 * 60 * 60 * 1000),
      observacoes: 'Candidatura aguardando análise inicial.',
    },
  })

  await prisma.historicoCandidatura.create({
    data: {
      candidaturaId: candidatura1.id,
      status: 'PENDENTE',
      observacao: 'Candidatura submetida pelo candidato',
      usuarioId: usuarioCandidato1.id,
    },
  })

  console.log(`   ✓ Candidato 1: ${candidato1.nome} (3 familiares) - Status: PENDENTE`)

  // ----- CANDIDATO 2 -----
  const usuarioCandidato2 = await prisma.usuario.create({
    data: {
      nome: 'Mariana Oliveira Santos',
      email: 'candidato2@teste.com',
      senha: senhaHash,
      role: 'CANDIDATO',
      ativo: true,
    },
  })

  const candidato2 = await prisma.candidato.create({
    data: {
      usuarioId: usuarioCandidato2.id,
      nome: 'Mariana Oliveira Santos',
      cpf: '55566677788',
      dataNascimento: new Date('2001-07-22'),
      telefone: '1932321212',
      celular: '19988776655',
      endereco: 'Avenida Brasil',
      numero: '456',
      complemento: 'Casa dos fundos',
      bairro: 'Vila Nova',
      cidade: 'Campinas',
      uf: 'SP',
      cep: '13040050',
      estadoCivil: 'SOLTEIRA',
      profissao: 'Estudante',
      rendaFamiliar: 2200.00,
    },
  })

  // Família do Candidato 2
  await prisma.membroFamilia.createMany({
    data: [
      {
        candidatoId: candidato2.id,
        nome: 'Sandra Regina Oliveira',
        parentesco: 'MÃE',
        dataNascimento: new Date('1978-02-14'),
        cpf: '66677788899',
        ocupacao: 'Cozinheira',
        renda: 1600.00,
      },
      {
        candidatoId: candidato2.id,
        nome: 'Lucas Oliveira Santos',
        parentesco: 'IRMÃO',
        dataNascimento: new Date('2010-09-30'),
        cpf: '77788899900',
        ocupacao: 'Estudante',
        renda: 0,
      },
    ],
  })

  // Candidatura do Candidato 2 (EM_ANALISE com Parecer Social)
  const candidatura2 = await prisma.candidatura.create({
    data: {
      candidatoId: candidato2.id,
      editalId: edital.id,
      status: 'EM_ANALISE',
      dataInscricao: new Date(dataAtual.getTime() - 8 * 24 * 60 * 60 * 1000),
      observacoes: 'Parecer social emitido, aguardando parecer jurídico.',
    },
  })

  // Parecer Social para Candidato 2
  await prisma.parecerSocial.create({
    data: {
      candidaturaId: candidatura2.id,
      assistenteId: assistente1.id,
      parecer: `Após análise detalhada da documentação apresentada e visita domiciliar, verificou-se que:

1. A família é composta por 3 membros: a candidata, sua mãe e um irmão menor.
2. A renda familiar declarada de R$ 2.200,00 foi confirmada.
3. A renda per capita está dentro dos critérios do edital.
4. A família reside em imóvel cedido pela avó materna.
5. A mãe é a única provedora da família.

A candidata atende aos requisitos socioeconômicos estabelecidos pelo programa.`,
      recomendacao: 'FAVORAVEL',
      dataEmissao: new Date(dataAtual.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.historicoCandidatura.createMany({
    data: [
      {
        candidaturaId: candidatura2.id,
        status: 'PENDENTE',
        observacao: 'Candidatura submetida pelo candidato',
        usuarioId: usuarioCandidato2.id,
      },
      {
        candidaturaId: candidatura2.id,
        status: 'EM_ANALISE',
        observacao: 'Parecer social emitido: FAVORAVEL',
        usuarioId: usuarioAssistente1.id,
      },
    ],
  })

  console.log(`   ✓ Candidato 2: ${candidato2.nome} (2 familiares) - Status: EM_ANALISE (com parecer social)`)

  // ----- CANDIDATO 3 -----
  const usuarioCandidato3 = await prisma.usuario.create({
    data: {
      nome: 'Carlos Eduardo Ferreira Lima',
      email: 'candidato3@teste.com',
      senha: senhaHash,
      role: 'CANDIDATO',
      ativo: true,
    },
  })

  const candidato3 = await prisma.candidato.create({
    data: {
      usuarioId: usuarioCandidato3.id,
      nome: 'Carlos Eduardo Ferreira Lima',
      cpf: '88899900011',
      dataNascimento: new Date('1999-12-03'),
      telefone: '1144556677',
      celular: '11944332211',
      endereco: 'Rua dos Trabalhadores',
      numero: '789',
      bairro: 'Centro',
      cidade: 'Santo André',
      uf: 'SP',
      cep: '09010100',
      estadoCivil: 'CASADO',
      profissao: 'Auxiliar Administrativo',
      rendaFamiliar: 3500.00,
    },
  })

  // Família do Candidato 3
  await prisma.membroFamilia.createMany({
    data: [
      {
        candidatoId: candidato3.id,
        nome: 'Juliana Mendes Lima',
        parentesco: 'CÔNJUGE',
        dataNascimento: new Date('2000-04-18'),
        cpf: '99900011122',
        ocupacao: 'Desempregada',
        renda: 0,
      },
      {
        candidatoId: candidato3.id,
        nome: 'Sofia Mendes Lima',
        parentesco: 'FILHA',
        dataNascimento: new Date('2022-06-10'),
        cpf: '00011122233',
        ocupacao: '',
        renda: 0,
      },
      {
        candidatoId: candidato3.id,
        nome: 'Antônio Ferreira Lima',
        parentesco: 'PAI',
        dataNascimento: new Date('1965-01-25'),
        cpf: '11122233300',
        ocupacao: 'Aposentado por invalidez',
        renda: 1412.00,
      },
    ],
  })

  // Candidatura do Candidato 3 (APROVADO - com ambos os pareceres)
  const candidatura3 = await prisma.candidatura.create({
    data: {
      candidatoId: candidato3.id,
      editalId: edital.id,
      status: 'APROVADO',
      dataInscricao: new Date(dataAtual.getTime() - 15 * 24 * 60 * 60 * 1000),
      observacoes: 'Candidatura aprovada após análise completa.',
    },
  })

  // Parecer Social para Candidato 3
  await prisma.parecerSocial.create({
    data: {
      candidaturaId: candidatura3.id,
      assistenteId: assistente2.id,
      parecer: `Visita domiciliar realizada com sucesso.

COMPOSIÇÃO FAMILIAR:
- Candidato: Carlos Eduardo, 25 anos, auxiliar administrativo
- Esposa: Juliana, 24 anos, desempregada
- Filha: Sofia, 2 anos
- Pai do candidato: Antônio, 59 anos, aposentado por invalidez

ANÁLISE:
1. Renda total: R$ 3.500,00
2. Renda per capita: R$ 875,00 - dentro do limite
3. Despesas significativas com financiamento habitacional

Recomendo a concessão da bolsa integral.`,
      recomendacao: 'FAVORAVEL',
      dataEmissao: new Date(dataAtual.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
  })

  // Parecer Jurídico para Candidato 3
  await prisma.parecerJuridico.create({
    data: {
      candidaturaId: candidatura3.id,
      advogadoId: advogado.id,
      parecer: `Analisada a documentação e o parecer social emitido, verifico que:

1. O candidato atende a todos os requisitos formais do edital
2. A documentação está completa e em conformidade
3. A renda per capita está dentro do limite estabelecido
4. Não há impedimentos legais para a concessão

DECISÃO: DEFERIDO`,
      fundamentacao: `Fundamentação Legal:
- Lei nº 13.146/2015 (Estatuto da Pessoa com Deficiência)
- Decreto nº 7.234/2010 (PNAES)
- Edital UFE nº 001/2025`,
      recomendacao: 'DEFERIDO',
      dataEmissao: new Date(dataAtual.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.historicoCandidatura.createMany({
    data: [
      {
        candidaturaId: candidatura3.id,
        status: 'PENDENTE',
        observacao: 'Candidatura submetida pelo candidato',
        usuarioId: usuarioCandidato3.id,
      },
      {
        candidaturaId: candidatura3.id,
        status: 'EM_ANALISE',
        observacao: 'Parecer social emitido: FAVORAVEL',
        usuarioId: usuarioAssistente2.id,
      },
      {
        candidaturaId: candidatura3.id,
        status: 'APROVADO',
        observacao: 'Parecer jurídico emitido: DEFERIDO',
        usuarioId: usuarioAdvogado.id,
      },
    ],
  })

  console.log(`   ✓ Candidato 3: ${candidato3.nome} (3 familiares) - Status: APROVADO (com ambos pareceres)`)

  // =============================================
  // 7. AGENDAMENTOS
  // =============================================
  console.log('\n📅 Criando Agendamentos...')
  
  const amanha = new Date(dataAtual)
  amanha.setDate(amanha.getDate() + 1)
  amanha.setHours(10, 0, 0, 0)

  await prisma.agendamento.create({
    data: {
      candidaturaId: candidatura1.id,
      assistenteId: assistente1.id,
      dataHora: amanha,
      titulo: 'Visita Domiciliar - João Pedro',
      descricao: 'Visita para verificação das condições de moradia',
      duracao: 60,
      local: 'Rua das Flores, 123 - Jardim Primavera, São Paulo/SP',
    },
  })
  console.log(`   ✓ Agendamento criado para ${candidato1.nome}`)

  // =============================================
  // 8. NOTIFICAÇÕES
  // =============================================
  console.log('\n🔔 Criando Notificações...')
  
  await prisma.notificacao.createMany({
    data: [
      {
        usuarioId: usuarioCandidato1.id,
        titulo: 'Candidatura recebida',
        mensagem: 'Sua candidatura ao Programa de Bolsas 2025 foi recebida e está em análise.',
        tipo: 'INFO',
        lida: true,
      },
      {
        usuarioId: usuarioCandidato1.id,
        titulo: 'Visita domiciliar agendada',
        mensagem: `Uma visita domiciliar foi agendada para ${amanha.toLocaleDateString('pt-BR')} às 10:00.`,
        tipo: 'ALERTA',
        lida: false,
      },
      {
        usuarioId: usuarioCandidato2.id,
        titulo: 'Parecer social emitido',
        mensagem: 'O parecer social da sua candidatura foi emitido. Aguarde a análise jurídica.',
        tipo: 'SUCESSO',
        lida: false,
      },
      {
        usuarioId: usuarioCandidato3.id,
        titulo: 'Candidatura aprovada!',
        mensagem: 'Parabéns! Sua candidatura ao Programa de Bolsas 2025 foi APROVADA.',
        tipo: 'SUCESSO',
        lida: false,
      },
      {
        usuarioId: usuarioAssistente1.id,
        titulo: 'Nova candidatura para análise',
        mensagem: 'Uma nova candidatura foi submetida e aguarda parecer social.',
        tipo: 'INFO',
        lida: false,
      },
      {
        usuarioId: usuarioAdvogado.id,
        titulo: 'Parecer jurídico pendente',
        mensagem: 'Há candidaturas com parecer social aguardando análise jurídica.',
        tipo: 'ALERTA',
        lida: false,
      },
    ],
  })
  console.log('   ✓ Notificações criadas')

  // =============================================
  // RESUMO FINAL
  // =============================================
  console.log('\n' + '='.repeat(60))
  console.log('✅ SEED CONCLUÍDO COM SUCESSO!')
  console.log('='.repeat(60))
  console.log('\n📋 RESUMO DOS DADOS CRIADOS:')
  console.log('─'.repeat(40))
  console.log(`   👤 Admin: admin@teste.com`)
  console.log(`   🏛️  Instituição: instituicao@teste.com`)
  console.log(`   ⚖️  Advogado: advogado@teste.com`)
  console.log(`   👩‍💼 Assistente Social 1: assistente1@teste.com`)
  console.log(`   👩‍💼 Assistente Social 2: assistente2@teste.com`)
  console.log(`   👨‍🎓 Candidato 1: candidato1@teste.com (PENDENTE)`)
  console.log(`   👩‍🎓 Candidato 2: candidato2@teste.com (EM_ANALISE)`)
  console.log(`   👨‍🎓 Candidato 3: candidato3@teste.com (APROVADO)`)
  console.log('─'.repeat(40))
  console.log(`   🔑 SENHA PARA TODOS: 123456`)
  console.log('─'.repeat(40))
  console.log('\n')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
