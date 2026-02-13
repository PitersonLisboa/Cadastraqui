import { createBrowserRouter, Navigate, Outlet, useParams, Link } from 'react-router-dom'
import { Layout } from './components/layout/Layout/Layout'
import { TenantProvider, TenantLoading, TenantNotFound, useTenant } from './contexts/TenantContext'
import { LoginPage } from './pages/Auth/Login/Login'
import { RegistrarPage } from './pages/Auth/Registrar/Registrar'
import { EsqueciSenha } from './pages/Auth/EsqueciSenha/EsqueciSenha'
import { RedefinirSenha } from './pages/Auth/RedefinirSenha/RedefinirSenha'

// Admin
import { AdminDashboard } from './pages/Admin/Dashboard/Dashboard'
import { RelatoriosAdmin } from './pages/Admin/Relatorios/Relatorios'
import { GestaoUsuarios } from './pages/Admin/Usuarios/GestaoUsuarios'
import { GestaoInstituicoes } from './pages/Admin/Instituicoes/GestaoInstituicoes'
import { LogsAtividade } from './pages/Admin/Logs/LogsAtividade'
import { Configuracoes } from './pages/Admin/Configuracoes/Configuracoes'

// Painel Cadastraqui (gestão do portfólio)
import { LoginPainel } from './pages/Painel/Login/LoginPainel'
import { DashboardPainel } from './pages/Painel/Dashboard/DashboardPainel'

// Candidato
import { DashboardCandidato } from './pages/Candidato/Dashboard/DashboardCandidato'
import { CadastroCandidato } from './pages/Candidato/CadastroCandidato/CadastroCandidato'
import { ListaEditaisDisponiveis } from './pages/Candidato/Editais/ListaEditaisDisponiveis'
import { DetalhesEditalCandidato } from './pages/Candidato/Editais/DetalhesEditalCandidato'
import { MinhasCandidaturas } from './pages/Candidato/Candidaturas/MinhasCandidaturas'
import { DetalhesCandidatura } from './pages/Candidato/Candidaturas/DetalhesCandidatura'
import { MeusDocumentos } from './pages/Candidato/Documentos/MeusDocumentos'
import { MeusAgendamentos } from './pages/Candidato/Agendamentos/MeusAgendamentos'
import { MembrosFamilia } from './pages/Candidato/Familia/MembrosFamilia'
import { WizardInscricao } from './pages/Candidato/Inscricao/WizardInscricao'

// Instituição
import { DashboardInstituicao } from './pages/Instituicao/Dashboard/DashboardInstituicao'
import { CadastroInstituicao } from './pages/Instituicao/CadastroInstituicao/CadastroInstituicao'
import { ListaEditais } from './pages/Instituicao/Editais/ListaEditais'
import { FormEdital } from './pages/Instituicao/Editais/FormEdital'
import { DetalhesEdital } from './pages/Instituicao/Editais/DetalhesEdital'
import { GestaoEquipe } from './pages/Instituicao/Equipe/GestaoEquipe'
import { RelatoriosInstituicao } from './pages/Instituicao/Relatorios/RelatoriosInstituicao'
import { ListaCandidaturasInstituicao } from './pages/Instituicao/Candidaturas/ListaCandidaturasInstituicao'
import { DetalhesCandidaturaInstituicao } from './pages/Instituicao/Candidaturas/DetalhesCandidaturaInstituicao'
import { DocumentosInstituicao } from './pages/Instituicao/Documentos/DocumentosInstituicao'

// Assistente Social
import { DashboardAssistente } from './pages/AssistenteSocial/Dashboard/DashboardAssistente'
import { ListaCandidaturasAssistente } from './pages/AssistenteSocial/Candidaturas/ListaCandidaturasAssistente'
import { AnalisarCandidatura } from './pages/AssistenteSocial/Candidaturas/AnalisarCandidatura'
import { ListaAgendamentos } from './pages/AssistenteSocial/Agendamentos/ListaAgendamentos'
import { MeusPareceres } from './pages/AssistenteSocial/Pareceres/MeusPareceres'

// Advogado
import { DashboardAdvogado } from './pages/Advogado/Dashboard/DashboardAdvogado'
import { ListaCandidaturasAdvogado } from './pages/Advogado/Candidaturas/ListaCandidaturasAdvogado'
import { AnalisarCandidaturaAdvogado } from './pages/Advogado/Candidaturas/AnalisarCandidaturaAdvogado'
import { MeusPareceresAdvogado } from './pages/Advogado/Pareceres/MeusPareceresAdvogado'

// Perfil (compartilhado)
import { Perfil } from './pages/Perfil/Perfil'

// ===========================================
// COMPONENTE: Aluno em breve (placeholder)
// ===========================================

function AlunoEmBreve() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎓</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
        Acesso do Aluno
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '2rem', maxWidth: '400px' }}>
        O módulo de acesso para alunos está em desenvolvimento e estará disponível em breve.
      </p>
      <Link
        to={`/${slug}/login`}
        style={{
          display: 'inline-block',
          padding: '0.625rem 1.5rem',
          backgroundColor: '#1F4B73',
          color: '#fff',
          borderRadius: '0.375rem',
          textDecoration: 'none',
          fontWeight: 500,
          transition: 'opacity 0.2s',
        }}
      >
        Voltar para a página inicial
      </Link>
    </div>
  )
}

// ===========================================
// WRAPPER: Carrega tenant e valida
// ===========================================

function TenantGuard() {
  const { tenant, loading, error, slug } = useTenant()
  if (loading) return <TenantLoading />
  if (error || !tenant) return <TenantNotFound slug={slug || undefined} />
  return <Outlet />
}

function TenantLayout() {
  return (
    <TenantProvider>
      <TenantGuard />
    </TenantProvider>
  )
}

// ===========================================
// ROTAS COMPARTILHADAS (reutilizadas dentro de cada tenant)
// ===========================================

const candidatoChildren = [
  { index: true, element: <DashboardCandidato /> },
  { path: 'cadastro', element: <CadastroCandidato /> },
  { path: 'editais', element: <ListaEditaisDisponiveis /> },
  { path: 'editais/:id', element: <DetalhesEditalCandidato /> },
  { path: 'editais/:editalId/inscrever', element: <WizardInscricao /> },
  { path: 'candidaturas', element: <MinhasCandidaturas /> },
  { path: 'candidaturas/:id', element: <DetalhesCandidatura /> },
  { path: 'documentos', element: <MeusDocumentos /> },
  { path: 'agendamentos', element: <MeusAgendamentos /> },
  { path: 'familia', element: <MembrosFamilia /> },
  { path: 'perfil', element: <Perfil /> },
]

const instituicaoTenantChildren = [
  { index: true, element: <DashboardInstituicao /> },
  { path: 'cadastro', element: <CadastroInstituicao /> },
  { path: 'editais', element: <ListaEditais /> },
  { path: 'editais/novo', element: <FormEdital /> },
  { path: 'editais/:id', element: <DetalhesEdital /> },
  { path: 'editais/:id/editar', element: <FormEdital /> },
  { path: 'candidaturas', element: <ListaCandidaturasInstituicao /> },
  { path: 'candidaturas/:id', element: <DetalhesCandidaturaInstituicao /> },
  { path: 'equipe', element: <GestaoEquipe /> },
  { path: 'relatorios', element: <RelatoriosInstituicao /> },
  { path: 'documentos', element: <DocumentosInstituicao /> },
  { path: 'perfil', element: <Perfil /> },
]

const assistenteSocialChildren = [
  { index: true, element: <DashboardAssistente /> },
  { path: 'candidaturas', element: <ListaCandidaturasAssistente /> },
  { path: 'candidaturas/:id', element: <AnalisarCandidatura /> },
  { path: 'agendamentos', element: <ListaAgendamentos /> },
  { path: 'pareceres', element: <MeusPareceres /> },
  { path: 'perfil', element: <Perfil /> },
]

const advogadoChildren = [
  { index: true, element: <DashboardAdvogado /> },
  { path: 'candidaturas', element: <ListaCandidaturasAdvogado /> },
  { path: 'candidaturas/:id', element: <AnalisarCandidaturaAdvogado /> },
  { path: 'pareceres', element: <MeusPareceresAdvogado /> },
  { path: 'perfil', element: <Perfil /> },
]

// ===========================================
// ROUTER
// ===========================================

export const router = createBrowserRouter([
  // =========================================
  // ROTA RAIZ
  // =========================================
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },

  // =========================================
  // ROTAS LEGADO (sem tenant - para admin e compat)
  // =========================================
  { path: '/login', element: <LoginPage /> },
  { path: '/registrar', element: <RegistrarPage /> },
  { path: '/esqueci-senha', element: <EsqueciSenha /> },
  { path: '/redefinir-senha', element: <RedefinirSenha /> },

  // =========================================
  // PAINEL CADASTRAQUI (gestão do portfólio)
  // /instituicao → login da equipe
  // /painel → dashboard panorâmica
  // =========================================
  { path: '/instituicao', element: <LoginPainel /> },
  { path: '/painel', element: <DashboardPainel /> },

  // =========================================
  // ADMIN (acesso global, sem tenant)
  // =========================================
  {
    path: '/admin',
    element: <Layout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'usuarios', element: <GestaoUsuarios /> },
      { path: 'instituicoes', element: <GestaoInstituicoes /> },
      { path: 'relatorios', element: <RelatoriosAdmin /> },
      { path: 'logs', element: <LogsAtividade /> },
      { path: 'configuracoes', element: <Configuracoes /> },
      { path: 'perfil', element: <Perfil /> },
    ],
  },

  // =========================================
  // ROTAS COM TENANT — /:slug/...
  // Ex: /PUCMinas/login, /PUCMinas/candidato/editais
  // =========================================
  {
    path: '/:slug',
    element: <TenantLayout />,
    children: [
      // Index do tenant → login
      { index: true, element: <Navigate to="login" replace /> },

      // Auth
      { path: 'login', element: <LoginPage /> },
      { path: 'registrar', element: <RegistrarPage /> },
      { path: 'esqueci-senha', element: <EsqueciSenha /> },
      { path: 'redefinir-senha', element: <RedefinirSenha /> },

      // Candidato
      { path: 'candidato', element: <Layout />, children: candidatoChildren },

      // Aluno (em breve)
      { path: 'aluno', element: <AlunoEmBreve /> },

      // Instituição (dentro do tenant)
      { path: 'instituicao', element: <Layout />, children: instituicaoTenantChildren },

      // Assistente Social
      { path: 'assistente-social', element: <Layout />, children: assistenteSocialChildren },

      // Advogado
      { path: 'advogado', element: <Layout />, children: advogadoChildren },
    ],
  },

  // =========================================
  // 404
  // =========================================
  {
    path: '*',
    element: (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
        padding: '2rem',
      }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
        <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '2rem' }}>
          Página não encontrada
        </p>
        <a href="/" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
          Voltar para o início
        </a>
      </div>
    ),
  },
])
