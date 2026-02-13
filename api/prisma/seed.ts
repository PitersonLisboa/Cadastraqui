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
  await prisma.supervisor.deleteMany()
  await prisma.membroControle.deleteMany()
  await prisma.membroOperacional.deleteMany()
  await prisma.documentoInstituicao.deleteMany()
  await prisma.unidadeInstituicao.deleteMany()
  await prisma.membroEquipe.deleteMany()
  await prisma.conviteEquipe.deleteMany()
  await prisma.configuracao.deleteMany()
  await prisma.tenant.deleteMany()
  await prisma.instituicao.deleteMany()
  await prisma.logAtividade.deleteMany()
  await prisma.sessao.deleteMany()
  await prisma.tokenRecuperacaoSenha.deleteMany()
  await prisma.usuario.deleteMany()

  const senhaHash = await bcrypt.hash('123456', 10)

  // =============================================
  // 1. ADMIN (sem instituição)
  // =============================================
  console.log('👤 Criando Admin...')
  const admin = await prisma.usuario.create({
    data: {
      nome: 'Administrador do Sistema',
      email: 'admin@teste.com',
      senha: senhaHash,
      role: 'ADMIN',
      ativo: true,
      instituicaoId: null, // ADMIN não pertence a instituição
    },
  })
  console.log(`   ✓ Admin criado: ${admin.email}`)

  // =============================================
  // 1b. EQUIPE CADASTRAQUI (gestão do portfólio)
  // =============================================
  console.log('\n🔧 Criando Equipe Cadastraqui...')
  const equipeCadastraqui = await prisma.usuario.create({
    data: {
      nome: 'Equipe Cadastraqui',
      email: 'instituicao@cadastraqui.com.br',
      senha: senhaHash,
      role: 'INSTITUICAO',
      ativo: true,
      instituicaoId: null, // Sem vínculo — vê todas as instituições
    },
  })
  console.log(`   ✓ Equipe Cadastraqui: ${equipeCadastraqui.email}`)

  // =============================================
  // 2. INSTITUIÇÃO + TENANT (PUCMinas)
  // =============================================
  console.log('\n🏛️  Criando Instituição PUCMinas...')
  const usuarioInstituicao = await prisma.usuario.create({
    data: {
      nome: 'PUC Minas',
      email: 'instituicao@pucminas.br',
      senha: senhaHash,
      role: 'INSTITUICAO',
      ativo: true,
      // instituicaoId será preenchido após criar a instituição
    },
  })

  const instituicao = await prisma.instituicao.create({
    data: {
      usuarioId: usuarioInstituicao.id,
      cnpj: '17178195000167',
      razaoSocial: 'Sociedade Mineira de Cultura',
      nomeFantasia: 'PUC Minas',
      email: 'contato@pucminas.br',
      telefone: '3133194000',
      endereco: 'Avenida Dom José Gaspar',
      numero: '500',
      complemento: 'Campus Coração Eucarístico',
      bairro: 'Coração Eucarístico',
      cidade: 'Belo Horizonte',
      uf: 'MG',
      cep: '30535901',
      status: 'ATIVA',
      tipoInstituicao: 'UNIVERSIDADE',
      codigoMEC: '595',
    },
  })

  // Vincular instituicaoId ao usuário da instituição
  await prisma.usuario.update({
    where: { id: usuarioInstituicao.id },
    data: { instituicaoId: instituicao.id },
  })

  // Criar Tenant
  const tenant = await prisma.tenant.create({
    data: {
      slug: 'PUCMinas',
      nome: 'PUC Minas',
      instituicaoId: instituicao.id,
      logoUrl: '/images/tenants/logo-PUCMinas.png',
      corPrimaria: '#1a237e',
      corSecundaria: '#c62828',
    },
  })

  console.log(`   ✓ Instituição criada: ${instituicao.nomeFantasia}`)
  console.log(`   ✓ Tenant criado: ${tenant.slug}`)

  // =============================================
  // 3. EDITAL
  // =============================================
  console.log('\n📋 Criando Edital...')
  const dataAtual = new Date()
  const dataInicio = new Date(dataAtual)
  dataInicio.setDate(dataInicio.getDate() - 10)
  const dataFim = new Date(dataAtual)
  dataFim.setDate(dataFim.getDate() + 50)

  const edital = await prisma.edital.create({
    data: {
      instituicaoId: instituicao.id,
      titulo: 'Programa de Bolsas CEBAS 2025 - 1º Semestre',
      descricao: `O Programa de Bolsas CEBAS da PUC Minas tem como objetivo auxiliar estudantes em situação de vulnerabilidade socioeconômica.\n\nO programa oferece bolsas integrais e parciais (50%) conforme análise socioeconômica.`,
      requisitos: `1. Estar regularmente matriculado em curso de graduação presencial\n2. Não possuir diploma de curso superior\n3. Comprovar renda familiar per capita de até 1,5 salário mínimo\n4. Não ter sido reprovado por frequência no semestre anterior`,
      documentosExigidos: `- RG e CPF do candidato\n- Comprovante de matrícula atualizado\n- Comprovante de residência\n- Comprovante de renda de todos os membros da família`,
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
      instituicaoId: instituicao.id,
    },
  })

  const advogado = await prisma.advogado.create({
    data: {
      usuarioId: usuarioAdvogado.id,
      nome: 'Dr. Ricardo Mendes Oliveira',
      oab: '123456',
      oabUf: 'MG',
      telefone: '31988887777',
      instituicaoId: instituicao.id,
    },
  })
  console.log(`   ✓ Advogado criado: ${advogado.nome} (OAB: ${advogado.oab}/${advogado.oabUf})`)

  // =============================================
  // 5. ASSISTENTES SOCIAIS
  // =============================================
  console.log('\n👩‍💼 Criando Assistentes Sociais...')
  
  const usuarioAssistente1 = await prisma.usuario.create({
    data: {
      nome: 'Maria Fernanda Costa Santos',
      email: 'assistente1@teste.com',
      senha: senhaHash,
      role: 'ASSISTENTE_SOCIAL',
      ativo: true,
      instituicaoId: instituicao.id,
    },
  })

  const assistente1 = await prisma.assistenteSocial.create({
    data: {
      usuarioId: usuarioAssistente1.id,
      nome: 'Maria Fernanda Costa Santos',
      cress: 'CRESS-MG 45678',
      telefone: '31977776666',
      instituicaoId: instituicao.id,
    },
  })
  console.log(`   ✓ Assistente Social 1: ${assistente1.nome} (${assistente1.cress})`)

  const usuarioAssistente2 = await prisma.usuario.create({
    data: {
      nome: 'Ana Paula Rodrigues Lima',
      email: 'assistente2@teste.com',
      senha: senhaHash,
      role: 'ASSISTENTE_SOCIAL',
      ativo: true,
      instituicaoId: instituicao.id,
    },
  })

  const assistente2 = await prisma.assistenteSocial.create({
    data: {
      usuarioId: usuarioAssistente2.id,
      nome: 'Ana Paula Rodrigues Lima',
      cress: 'CRESS-MG 78901',
      telefone: '31966665555',
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
      instituicaoId: instituicao.id,
    },
  })

  const candidato1 = await prisma.candidato.create({
    data: {
      usuarioId: usuarioCandidato1.id,
      instituicaoId: instituicao.id,
      nome: 'João Pedro Silva Nascimento',
      cpf: '11122233344',
      dataNascimento: new Date('2000-03-15'),
      telefone: '3133332222',
      celular: '31955554444',
      endereco: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 45',
      bairro: 'Jardim Primavera',
      cidade: 'Belo Horizonte',
      uf: 'MG',
      cep: '30130000',
      estadoCivil: 'SOLTEIRO',
      profissao: 'Estudante',
      rendaFamiliar: 2800.00,
    },
  })

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
      instituicaoId: instituicao.id,
    },
  })

  const candidato2 = await prisma.candidato.create({
    data: {
      usuarioId: usuarioCandidato2.id,
      instituicaoId: instituicao.id,
      nome: 'Mariana Oliveira Santos',
      cpf: '55566677788',
      dataNascimento: new Date('2001-07-22'),
      telefone: '3132321212',
      celular: '31988776655',
      endereco: 'Avenida Brasil',
      numero: '456',
      complemento: 'Casa dos fundos',
      bairro: 'Vila Nova',
      cidade: 'Belo Horizonte',
      uf: 'MG',
      cep: '30140000',
      estadoCivil: 'SOLTEIRA',
      profissao: 'Estudante',
      rendaFamiliar: 2200.00,
    },
  })

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

  const candidatura2 = await prisma.candidatura.create({
    data: {
      candidatoId: candidato2.id,
      editalId: edital.id,
      status: 'EM_ANALISE',
      dataInscricao: new Date(dataAtual.getTime() - 8 * 24 * 60 * 60 * 1000),
      observacoes: 'Parecer social emitido, aguardando parecer jurídico.',
    },
  })

  await prisma.parecerSocial.create({
    data: {
      candidaturaId: candidatura2.id,
      assistenteId: assistente1.id,
      parecer: `Após análise detalhada da documentação apresentada e visita domiciliar, verificou-se que a família é composta por 3 membros e a renda per capita está dentro dos critérios do edital. A candidata atende aos requisitos socioeconômicos.`,
      recomendacao: 'FAVORAVEL',
      dataEmissao: new Date(dataAtual.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.historicoCandidatura.createMany({
    data: [
      { candidaturaId: candidatura2.id, status: 'PENDENTE', observacao: 'Candidatura submetida pelo candidato', usuarioId: usuarioCandidato2.id },
      { candidaturaId: candidatura2.id, status: 'EM_ANALISE', observacao: 'Parecer social emitido: FAVORAVEL', usuarioId: usuarioAssistente1.id },
    ],
  })

  console.log(`   ✓ Candidato 2: ${candidato2.nome} (2 familiares) - Status: EM_ANALISE`)

  // ----- CANDIDATO 3 -----
  const usuarioCandidato3 = await prisma.usuario.create({
    data: {
      nome: 'Carlos Eduardo Ferreira Lima',
      email: 'candidato3@teste.com',
      senha: senhaHash,
      role: 'CANDIDATO',
      ativo: true,
      instituicaoId: instituicao.id,
    },
  })

  const candidato3 = await prisma.candidato.create({
    data: {
      usuarioId: usuarioCandidato3.id,
      instituicaoId: instituicao.id,
      nome: 'Carlos Eduardo Ferreira Lima',
      cpf: '88899900011',
      dataNascimento: new Date('1999-12-03'),
      telefone: '3144556677',
      celular: '31944332211',
      endereco: 'Rua dos Trabalhadores',
      numero: '789',
      bairro: 'Centro',
      cidade: 'Contagem',
      uf: 'MG',
      cep: '32010000',
      estadoCivil: 'CASADO',
      profissao: 'Auxiliar Administrativo',
      rendaFamiliar: 3500.00,
    },
  })

  await prisma.membroFamilia.createMany({
    data: [
      { candidatoId: candidato3.id, nome: 'Juliana Mendes Lima', parentesco: 'CÔNJUGE', dataNascimento: new Date('2000-04-18'), cpf: '99900011122', ocupacao: 'Desempregada', renda: 0 },
      { candidatoId: candidato3.id, nome: 'Sofia Mendes Lima', parentesco: 'FILHA', dataNascimento: new Date('2022-06-10'), cpf: '00011122233', ocupacao: '', renda: 0 },
      { candidatoId: candidato3.id, nome: 'Antônio Ferreira Lima', parentesco: 'PAI', dataNascimento: new Date('1965-01-25'), cpf: '11122233300', ocupacao: 'Aposentado por invalidez', renda: 1412.00 },
    ],
  })

  const candidatura3 = await prisma.candidatura.create({
    data: {
      candidatoId: candidato3.id,
      editalId: edital.id,
      status: 'APROVADO',
      dataInscricao: new Date(dataAtual.getTime() - 15 * 24 * 60 * 60 * 1000),
      observacoes: 'Candidatura aprovada após análise completa.',
    },
  })

  await prisma.parecerSocial.create({
    data: {
      candidaturaId: candidatura3.id,
      assistenteId: assistente2.id,
      parecer: `Visita domiciliar realizada. Renda total: R$ 3.500,00. Renda per capita: R$ 875,00 - dentro do limite. Recomendo a concessão da bolsa integral.`,
      recomendacao: 'FAVORAVEL',
      dataEmissao: new Date(dataAtual.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.parecerJuridico.create({
    data: {
      candidaturaId: candidatura3.id,
      advogadoId: advogado.id,
      parecer: `Documentação completa e em conformidade. Não há impedimentos legais. DECISÃO: DEFERIDO`,
      fundamentacao: `Fundamentação Legal: Lei Complementar nº 187/2021, Portaria 15/2017`,
      recomendacao: 'DEFERIDO',
      dataEmissao: new Date(dataAtual.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.historicoCandidatura.createMany({
    data: [
      { candidaturaId: candidatura3.id, status: 'PENDENTE', observacao: 'Candidatura submetida pelo candidato', usuarioId: usuarioCandidato3.id },
      { candidaturaId: candidatura3.id, status: 'EM_ANALISE', observacao: 'Parecer social emitido: FAVORAVEL', usuarioId: usuarioAssistente2.id },
      { candidaturaId: candidatura3.id, status: 'APROVADO', observacao: 'Parecer jurídico emitido: DEFERIDO', usuarioId: usuarioAdvogado.id },
    ],
  })

  console.log(`   ✓ Candidato 3: ${candidato3.nome} (3 familiares) - Status: APROVADO`)

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
      local: 'Rua das Flores, 123 - Jardim Primavera, Belo Horizonte/MG',
    },
  })
  console.log(`   ✓ Agendamento criado para ${candidato1.nome}`)

  // =============================================
  // 8. NOTIFICAÇÕES (com instituicaoId)
  // =============================================
  console.log('\n🔔 Criando Notificações...')
  await prisma.notificacao.createMany({
    data: [
      { usuarioId: usuarioCandidato1.id, titulo: 'Candidatura recebida', mensagem: 'Sua candidatura ao Programa de Bolsas CEBAS 2025 foi recebida.', tipo: 'INFO', lida: true, instituicaoId: instituicao.id },
      { usuarioId: usuarioCandidato1.id, titulo: 'Visita domiciliar agendada', mensagem: `Visita agendada para ${amanha.toLocaleDateString('pt-BR')} às 10:00.`, tipo: 'ALERTA', lida: false, instituicaoId: instituicao.id },
      { usuarioId: usuarioCandidato2.id, titulo: 'Parecer social emitido', mensagem: 'O parecer social foi emitido. Aguarde a análise jurídica.', tipo: 'SUCESSO', lida: false, instituicaoId: instituicao.id },
      { usuarioId: usuarioCandidato3.id, titulo: 'Candidatura aprovada!', mensagem: 'Parabéns! Sua candidatura foi APROVADA.', tipo: 'SUCESSO', lida: false, instituicaoId: instituicao.id },
      { usuarioId: usuarioAssistente1.id, titulo: 'Nova candidatura', mensagem: 'Nova candidatura aguarda parecer social.', tipo: 'INFO', lida: false, instituicaoId: instituicao.id },
      { usuarioId: usuarioAdvogado.id, titulo: 'Parecer jurídico pendente', mensagem: 'Candidaturas aguardando análise jurídica.', tipo: 'ALERTA', lida: false, instituicaoId: instituicao.id },
    ],
  })
  console.log('   ✓ Notificações criadas')

  // =============================================
  // 9. SEGUNDA INSTITUIÇÃO: METODISTA (só estrutura)
  // =============================================
  console.log('\n🏛️  Criando Instituição Metodista...')
  const usuarioMetodista = await prisma.usuario.create({
    data: {
      nome: 'Universidade Metodista',
      email: 'instituicao@metodista.br',
      senha: senhaHash,
      role: 'INSTITUICAO',
      ativo: true,
    },
  })

  const metodista = await prisma.instituicao.create({
    data: {
      usuarioId: usuarioMetodista.id,
      cnpj: '44351146000398',
      razaoSocial: 'Instituto Metodista de Ensino Superior',
      nomeFantasia: 'Universidade Metodista de São Paulo',
      email: 'contato@metodista.br',
      telefone: '1143665000',
      endereco: 'Rua Alfeu Tavares',
      numero: '149',
      bairro: 'Rudge Ramos',
      cidade: 'São Bernardo do Campo',
      uf: 'SP',
      cep: '09641000',
      status: 'ATIVA',
      tipoInstituicao: 'UNIVERSIDADE',
      codigoMEC: '302',
    },
  })

  await prisma.usuario.update({
    where: { id: usuarioMetodista.id },
    data: { instituicaoId: metodista.id },
  })

  const tenantMetodista = await prisma.tenant.create({
    data: {
      slug: 'Metodista',
      nome: 'Universidade Metodista',
      instituicaoId: metodista.id,
      logoUrl: '/images/tenants/logo-Metodista.png',
      corPrimaria: '#1b5e20',
      corSecundaria: '#4caf50',
    },
  })

  console.log(`   ✓ Instituição criada: ${metodista.nomeFantasia}`)
  console.log(`   ✓ Tenant criado: ${tenantMetodista.slug}`)

  // =============================================
  // RESUMO FINAL
  // =============================================
  console.log('\n' + '='.repeat(60))
  console.log('✅ SEED CONCLUÍDO COM SUCESSO!')
  console.log('='.repeat(60))
  console.log('\n📋 RESUMO DOS DADOS CRIADOS:')
  console.log('─'.repeat(40))
  console.log(`   🏛️  Tenant 1: ${tenant.slug} (${tenant.nome})`)
  console.log(`   🏛️  Tenant 2: ${tenantMetodista.slug} (${tenantMetodista.nome})`)
  console.log(`   👤 Admin: admin@teste.com`)
  console.log(`   🔧 Equipe Cadastraqui: instituicao@cadastraqui.com.br`)
  console.log(`   🏛️  Instituição 1: instituicao@pucminas.br`)
  console.log(`   🏛️  Instituição 2: instituicao@metodista.br`)
  console.log(`   ⚖️  Advogado: advogado@teste.com`)
  console.log(`   👩‍💼 Assistente Social 1: assistente1@teste.com`)
  console.log(`   👩‍💼 Assistente Social 2: assistente2@teste.com`)
  console.log(`   👨‍🎓 Candidato 1: candidato1@teste.com (PENDENTE)`)
  console.log(`   👩‍🎓 Candidato 2: candidato2@teste.com (EM_ANALISE)`)
  console.log(`   👨‍🎓 Candidato 3: candidato3@teste.com (APROVADO)`)
  console.log('─'.repeat(40))
  console.log(`   🔑 SENHA PARA TODOS: 123456`)
  console.log('─'.repeat(40))
  console.log(`   🌐 URLs:`)
  console.log(`      /PUCMinas/login   → PUC Minas`)
  console.log(`      /Metodista/login  → Metodista`)
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
