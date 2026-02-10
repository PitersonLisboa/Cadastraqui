import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'

// ===========================================
// TIPOS
// ===========================================

export interface TenantConfig {
  slug: string
  nome: string
  logoUrl: string | null
  corPrimaria: string
  corSecundaria: string
  instituicaoId: string
  configuracoes: Record<string, any> | null
  instituicao: {
    id: string
    razaoSocial: string
    nomeFantasia: string | null
    email: string
    telefone: string
    cidade: string
    uf: string
  }
}

interface TenantContextType {
  tenant: TenantConfig | null
  slug: string | null
  loading: boolean
  error: string | null
  // Helper para montar paths com o slug do tenant
  tenantPath: (path: string) => string
}

// ===========================================
// CONTEXT
// ===========================================

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  slug: null,
  loading: true,
  error: null,
  tenantPath: (path) => path,
})

export function useTenant() {
  return useContext(TenantContext)
}

// ===========================================
// PROVIDER
// ===========================================

interface TenantProviderProps {
  children: ReactNode
}

export function TenantProvider({ children }: TenantProviderProps) {
  const { slug } = useParams<{ slug: string }>()
  const [tenant, setTenant] = useState<TenantConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchTenant() {
      try {
        setLoading(true)
        setError(null)
        const response = await api.get(`/tenant/${slug}`)
        
        if (!cancelled) {
          setTenant(response.data.tenant)
          
          // Aplicar cores do tenant como CSS variables
          const root = document.documentElement
          root.style.setProperty('--tenant-primary', response.data.tenant.corPrimaria)
          root.style.setProperty('--tenant-secondary', response.data.tenant.corSecundaria)
          
          // Atualizar título da página
          document.title = `${response.data.tenant.nome} - Cadastraqui`
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Instituição não encontrada')
          setTenant(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchTenant()

    return () => {
      cancelled = true
    }
  }, [slug])

  const tenantPath = (path: string) => {
    if (!slug) return path
    return `/${slug}${path.startsWith('/') ? path : `/${path}`}`
  }

  return (
    <TenantContext.Provider value={{ tenant, slug: slug || null, loading, error, tenantPath }}>
      {children}
    </TenantContext.Provider>
  )
}

// ===========================================
// COMPONENTE: Tela de carregamento do tenant
// ===========================================

export function TenantLoading() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '1rem',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #e5e7eb',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <p style={{ color: '#6b7280' }}>Carregando...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ===========================================
// COMPONENTE: Tela de erro do tenant
// ===========================================

export function TenantNotFound({ slug }: { slug?: string }) {
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
      <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', color: '#1f2937' }}>😕</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1f2937' }}>
        Instituição não encontrada
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '2rem', maxWidth: '400px' }}>
        {slug 
          ? `Não encontramos uma instituição com o identificador "${slug}".`
          : 'O endereço acessado não corresponde a nenhuma instituição cadastrada.'}
      </p>
      <a 
        href="https://www.cadastraqui.net.br" 
        style={{ color: '#3b82f6', textDecoration: 'underline' }}
      >
        Voltar para a página inicial
      </a>
    </div>
  )
}
