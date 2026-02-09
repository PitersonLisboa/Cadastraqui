import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSetRecoilState } from 'recoil'
import { toast } from 'react-toastify'
import { FiUser, FiHome, FiUserCheck, FiShield, FiArrowLeft, FiCheck } from 'react-icons/fi'
import { authState } from '@/atoms'
import { authService, api } from '@/services/api'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import styles from './Registrar.module.scss'

type TipoRegistro = 'CANDIDATO' | 'INSTITUICAO' | 'ASSISTENTE_SOCIAL' | 'ADVOGADO' | 'SUPERVISAO' | 'CONTROLE' | 'OPERACIONAL' | null

interface ConviteInfo {
  tipo: string
  instituicao: {
    id: string
    razaoSocial: string
    nomeFantasia?: string
  }
}

const registroSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmarSenha: z.string(),
  codigoConvite: z.string().optional(),
  nome: z.string().optional(),
  registro: z.string().optional(),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: 'As senhas não conferem',
  path: ['confirmarSenha'],
})

type RegistroForm = z.infer<typeof registroSchema>

const TIPOS_PUBLICOS = [
  {
    tipo: 'CANDIDATO' as TipoRegistro,
    nome: 'Candidato',
    descricao: 'Pessoa que deseja se candidatar a uma bolsa de estudo',
    icone: FiUser,
    cor: '#22c55e',
  },
  {
    tipo: 'INSTITUICAO' as TipoRegistro,
    nome: 'Instituição',
    descricao: 'Instituição de ensino que oferece bolsas',
    icone: FiHome,
    cor: '#3b82f6',
  },
]

const TIPOS_COM_CONVITE = [
  {
    tipo: 'ASSISTENTE_SOCIAL' as TipoRegistro,
    nome: 'Assistente Social',
    descricao: 'Profissional vinculado a uma instituição (requer código de convite)',
    icone: FiUserCheck,
    cor: '#f59e0b',
  },
  {
    tipo: 'ADVOGADO' as TipoRegistro,
    nome: 'Advogado',
    descricao: 'Profissional vinculado a uma instituição (requer código de convite)',
    icone: FiShield,
    cor: '#8b5cf6',
  },
  {
    tipo: 'SUPERVISAO' as TipoRegistro,
    nome: 'Supervisão',
    descricao: 'Coordenador do setor social (requer código de convite)',
    icone: FiUserCheck,
    cor: '#0891b2',
  },
  {
    tipo: 'CONTROLE' as TipoRegistro,
    nome: 'Controle',
    descricao: 'Instância de consulta e acompanhamento (requer código de convite)',
    icone: FiShield,
    cor: '#4f46e5',
  },
  {
    tipo: 'OPERACIONAL' as TipoRegistro,
    nome: 'Operacional',
    descricao: 'Equipe de pré-análise documental (requer código de convite)',
    icone: FiUserCheck,
    cor: '#d97706',
  },
]

export function RegistrarPage() {
  const [searchParams] = useSearchParams()
  const codigoUrl = searchParams.get('codigo')
  
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoRegistro>(null)
  const [etapa, setEtapa] = useState<'tipo' | 'convite' | 'dados'>('tipo')
  const [loading, setLoading] = useState(false)
  const [validandoConvite, setValidandoConvite] = useState(false)
  const [conviteValidado, setConviteValidado] = useState<ConviteInfo | null>(null)
  const [codigoConvite, setCodigoConvite] = useState(codigoUrl || '')
  
  const setAuth = useSetRecoilState(authState)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegistroForm>({
    resolver: zodResolver(registroSchema),
  })

  // Se veio com código na URL, validar automaticamente
  useEffect(() => {
    if (codigoUrl) {
      validarCodigo(codigoUrl)
    }
  }, [codigoUrl])

  const validarCodigo = async (codigo: string) => {
    if (!codigo || codigo.length < 6) return

    setValidandoConvite(true)
    try {
      const response = await api.get(`/convites/validar?codigo=${codigo}`)
      if (response.data.valido) {
        setConviteValidado(response.data.convite)
        setTipoSelecionado(response.data.convite.tipo)
        setValue('codigoConvite', codigo.toUpperCase())
        setEtapa('dados')
        toast.success(`Convite válido para ${response.data.convite.instituicao.razaoSocial}`)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Código de convite inválido')
      setConviteValidado(null)
    } finally {
      setValidandoConvite(false)
    }
  }

  const handleSelecionarTipo = (tipo: TipoRegistro) => {
    setTipoSelecionado(tipo)
    
    if (['ASSISTENTE_SOCIAL', 'ADVOGADO', 'SUPERVISAO', 'CONTROLE', 'OPERACIONAL'].includes(tipo as string)) {
      setEtapa('convite')
    } else {
      setEtapa('dados')
    }
  }

  const handleValidarConvite = () => {
    if (codigoConvite.length < 6) {
      toast.error('Digite o código de convite completo')
      return
    }
    validarCodigo(codigoConvite)
  }

  const onSubmit = async (data: RegistroForm) => {
    if (!tipoSelecionado) return

    setLoading(true)
    try {
      const response = await authService.registrar({
        ...data,
        role: tipoSelecionado,
        codigoConvite: conviteValidado ? codigoConvite : undefined,
      })

      setAuth({
        token: response.token,
        usuario: response.usuario,
        isAuthenticated: true,
      })

      toast.success('Conta criada com sucesso!')

      // Redirecionar conforme o tipo
      switch (tipoSelecionado) {
        case 'CANDIDATO':
          navigate('/candidato')
          break
        case 'INSTITUICAO':
          navigate('/instituicao')
          break
        case 'ASSISTENTE_SOCIAL':
          navigate('/assistente-social')
          break
        case 'ADVOGADO':
          navigate('/advogado')
          break
        case 'SUPERVISAO':
          navigate('/supervisao')
          break
        case 'CONTROLE':
          navigate('/controle')
          break
        case 'OPERACIONAL':
          navigate('/operacional')
          break
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const voltarEtapa = () => {
    if (etapa === 'convite') {
      setEtapa('tipo')
      setTipoSelecionado(null)
    } else if (etapa === 'dados') {
      if (conviteValidado) {
        setEtapa('convite')
        setConviteValidado(null)
      } else {
        setEtapa('tipo')
        setTipoSelecionado(null)
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {etapa !== 'tipo' && (
          <button className={styles.backBtn} onClick={voltarEtapa}>
            <FiArrowLeft size={20} />
            Voltar
          </button>
        )}

        <div className={styles.logo}>📋 CADASTRAQUI</div>

        {/* ETAPA 1: Seleção de Tipo */}
        {etapa === 'tipo' && (
          <>
            <h1>Criar Conta</h1>
            <p className={styles.subtitle}>Selecione o tipo de conta que deseja criar</p>

            <div className={styles.tiposGrid}>
              <h3>Cadastro Público</h3>
              {TIPOS_PUBLICOS.map((item) => {
                const Icon = item.icone
                return (
                  <button
                    key={item.tipo}
                    className={styles.tipoCard}
                    onClick={() => handleSelecionarTipo(item.tipo)}
                    style={{ '--tipo-cor': item.cor } as React.CSSProperties}
                  >
                    <div className={styles.tipoIcone}>
                      <Icon size={24} />
                    </div>
                    <div className={styles.tipoInfo}>
                      <span className={styles.tipoNome}>{item.nome}</span>
                      <span className={styles.tipoDesc}>{item.descricao}</span>
                    </div>
                  </button>
                )
              })}

              <h3>Cadastro com Convite</h3>
              <p className={styles.conviteInfo}>
                Para estes perfis, você precisa de um código de convite fornecido pela instituição.
              </p>
              {TIPOS_COM_CONVITE.map((item) => {
                const Icon = item.icone
                return (
                  <button
                    key={item.tipo}
                    className={styles.tipoCard}
                    onClick={() => handleSelecionarTipo(item.tipo)}
                    style={{ '--tipo-cor': item.cor } as React.CSSProperties}
                  >
                    <div className={styles.tipoIcone}>
                      <Icon size={24} />
                    </div>
                    <div className={styles.tipoInfo}>
                      <span className={styles.tipoNome}>{item.nome}</span>
                      <span className={styles.tipoDesc}>{item.descricao}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className={styles.links}>
              <Link to="/login">Já tenho uma conta</Link>
            </div>
          </>
        )}

        {/* ETAPA 2: Código de Convite */}
        {etapa === 'convite' && (
          <>
            <h1>Código de Convite</h1>
            <p className={styles.subtitle}>
              Digite o código de convite fornecido pela instituição
            </p>

            <div className={styles.conviteForm}>
              <Input
                label="Código de Convite"
                placeholder="Ex: INV-ABC123"
                value={codigoConvite}
                onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
                maxLength={10}
              />

              <Button
                fullWidth
                onClick={handleValidarConvite}
                loading={validandoConvite}
                disabled={codigoConvite.length < 6}
              >
                Validar Código
              </Button>
            </div>

            <p className={styles.conviteHelp}>
              Não tem um código? Entre em contato com a instituição onde você trabalha.
            </p>
          </>
        )}

        {/* ETAPA 3: Dados do Cadastro */}
        {etapa === 'dados' && (
          <>
            <h1>Dados da Conta</h1>
            
            {conviteValidado && (
              <div className={styles.instituicaoInfo}>
                <FiCheck size={20} />
                <div>
                  <span>Vinculado à instituição:</span>
                  <strong>{conviteValidado.instituicao.razaoSocial}</strong>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              <Input
                label="Email"
                type="email"
                placeholder="seu@email.com"
                error={errors.email?.message}
                {...register('email')}
              />

              {['ASSISTENTE_SOCIAL', 'ADVOGADO', 'SUPERVISAO', 'CONTROLE', 'OPERACIONAL'].includes(tipoSelecionado as string) && (
                <>
                  <Input
                    label="Nome Completo"
                    placeholder="Seu nome"
                    error={errors.nome?.message}
                    {...register('nome')}
                  />
                  <Input
                    label={
                      tipoSelecionado === 'ASSISTENTE_SOCIAL' ? 'CRESS' :
                      tipoSelecionado === 'ADVOGADO' ? 'OAB' :
                      'Registro/Cargo (opcional)'
                    }
                    placeholder={
                      tipoSelecionado === 'ASSISTENTE_SOCIAL' ? 'Ex: 12345/SP' :
                      tipoSelecionado === 'ADVOGADO' ? 'Ex: 123456/SP' :
                      'Ex: Coordenador Social'
                    }
                    error={errors.registro?.message}
                    {...register('registro')}
                  />
                </>
              )}

              <Input
                label="Senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                error={errors.senha?.message}
                {...register('senha')}
              />

              <Input
                label="Confirmar Senha"
                type="password"
                placeholder="Digite novamente"
                error={errors.confirmarSenha?.message}
                {...register('confirmarSenha')}
              />

              <Button type="submit" fullWidth loading={loading}>
                Criar Conta
              </Button>
            </form>

            <div className={styles.links}>
              <Link to="/login">Já tenho uma conta</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
