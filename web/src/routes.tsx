import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout/Layout'
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

// Placeholder para páginas não implementadas ainda
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{title}</h1>
      <p style={{ color: '#6b7280' }}>Esta página está em desenvolvimento.</p>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/registrar',
    element: <RegistrarPage />,
  },
  {
    path: '/esqueci-senha',
    element: <EsqueciSenha />,
  },
  {
    path: '/redefinir-senha',
    element: <RedefinirSenha />,
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  
  // =========================================
  // ROTAS ADMIN
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
  // ROTAS INSTITUIÇÃO
  // =========================================
  {
    path: '/instituicao',
    element: <Layout />,
    children: [
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
    ],
  },

  // =========================================
  // ROTAS CANDIDATO
  // =========================================
  {
    path: '/candidato',
    element: <Layout />,
    children: [
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
    ],
  },

  // =========================================
  // ROTAS ASSISTENTE SOCIAL
  // =========================================
  {
    path: '/assistente-social',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardAssistente /> },
      { path: 'candidaturas', element: <ListaCandidaturasAssistente /> },
      { path: 'candidaturas/:id', element: <AnalisarCandidatura /> },
      { path: 'agendamentos', element: <ListaAgendamentos /> },
      { path: 'pareceres', element: <MeusPareceres /> },
      { path: 'perfil', element: <Perfil /> },
    ],
  },

  // =========================================
  // ROTAS ADVOGADO
  // =========================================
  {
    path: '/advogado',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardAdvogado /> },
      { path: 'candidaturas', element: <ListaCandidaturasAdvogado /> },
      { path: 'candidaturas/:id', element: <AnalisarCandidaturaAdvogado /> },
      { path: 'pareceres', element: <MeusPareceresAdvogado /> },
      { path: 'perfil', element: <Perfil /> },
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
        padding: '2rem'
      }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
        <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '2rem' }}>
          Página não encontrada
        </p>
        <a href="/login" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
          Voltar para o login
        </a>
      </div>
    ),
  },
])
