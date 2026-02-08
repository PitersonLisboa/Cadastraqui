import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiArrowRight, FiSave } from 'react-icons/fi'

import { FormStepper, FormStep } from '@/components/common/FormStepper/FormStepper'
import { Input } from '@/components/common/Input/Input'
import { Select } from '@/components/common/Select/Select'
import { Button } from '@/components/common/Button/Button'
import { instituicaoService } from '@/services/api'
import { 
  maskCNPJ, 
  maskPhone, 
  maskCEP, 
  unmaskValue, 
  fetchAddressByCEP,
  isValidCNPJ 
} from '@/utils/masks'
import { UF_OPTIONS } from '@/types'

import styles from './CadastroInstituicao.module.scss'

// ===========================================
// SCHEMA DE VALIDAÇÃO
// ===========================================

const instituicaoSchema = z.object({
  // Dados da Instituição
  razaoSocial: z.string().min(3, 'Razão Social deve ter no mínimo 3 caracteres'),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().min(18, 'CNPJ inválido').refine(
    (val) => isValidCNPJ(val),
    'CNPJ inválido'
  ),
  email: z.string().email('Email inválido'),
  telefone: z.string().min(14, 'Telefone inválido'),
  
  // Endereço
  cep: z.string().min(9, 'CEP inválido'),
  endereco: z.string().min(3, 'Endereço é obrigatório'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro é obrigatório'),
  cidade: z.string().min(2, 'Cidade é obrigatória'),
  uf: z.string().min(2, 'UF é obrigatória'),
  
  // Dados Adicionais
  codigoMEC: z.string().optional(),
  tipoInstituicao: z.string().optional(),
})

type InstituicaoForm = z.infer<typeof instituicaoSchema>

// ===========================================
// OPÇÕES DE SELECT
// ===========================================

const TIPO_INSTITUICAO_OPTIONS = [
  { value: 'escola', label: 'Escola' },
  { value: 'faculdade', label: 'Faculdade' },
  { value: 'universidade', label: 'Universidade' },
  { value: 'centro_universitario', label: 'Centro Universitário' },
  { value: 'instituto_federal', label: 'Instituto Federal' },
  { value: 'ong', label: 'ONG / Entidade Assistencial' },
  { value: 'outro', label: 'Outro' },
]

const STEPS = [
  { title: 'Dados da Instituição', description: 'Informações básicas' },
  { title: 'Endereço', description: 'Localização' },
  { title: 'Dados Adicionais', description: 'Informações complementares' },
  { title: 'Confirmação', description: 'Revise os dados' },
]

// ===========================================
// COMPONENTE PRINCIPAL
// ===========================================

export function CadastroInstituicao() {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingCEP, setLoadingCEP] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<InstituicaoForm>({
    resolver: zodResolver(instituicaoSchema),
    defaultValues: {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      email: '',
      telefone: '',
      cep: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      codigoMEC: '',
      tipoInstituicao: '',
    },
  })

  const watchedValues = watch()

  // Buscar endereço pelo CEP
  const handleCEPChange = async (cep: string) => {
    const cleanCEP = unmaskValue(cep)
    
    if (cleanCEP.length === 8) {
      setLoadingCEP(true)
      const address = await fetchAddressByCEP(cleanCEP)
      
      if (address) {
        setValue('endereco', address.logradouro)
        setValue('bairro', address.bairro)
        setValue('cidade', address.localidade)
        setValue('uf', address.uf)
        toast.success('Endereço encontrado!')
      } else {
        toast.error('CEP não encontrado')
      }
      
      setLoadingCEP(false)
    }
  }

  // Validar etapa atual antes de avançar
  const validateCurrentStep = async (): Promise<boolean> => {
    const fieldsToValidate: (keyof InstituicaoForm)[][] = [
      ['razaoSocial', 'cnpj', 'email', 'telefone'],           // Step 0
      ['cep', 'endereco', 'numero', 'bairro', 'cidade', 'uf'], // Step 1
      [],                                                       // Step 2 (opcional)
      [],                                                       // Step 3 (confirmação)
    ]

    const fields = fieldsToValidate[currentStep]
    if (fields.length === 0) return true

    const result = await trigger(fields)
    return result
  }

  const handleNext = async () => {
    const isValid = await validateCurrentStep()
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const onSubmit = async (data: InstituicaoForm) => {
    setLoading(true)
    
    try {
      // Preparar dados para envio
      const payload = {
        ...data,
        cnpj: unmaskValue(data.cnpj),
        telefone: unmaskValue(data.telefone),
        cep: unmaskValue(data.cep),
      }

      await instituicaoService.criar(payload)
      
      toast.success('Cadastro realizado com sucesso!')
      navigate('/instituicao')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao realizar cadastro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Cadastrar Instituição</h1>
        <p>Preencha os dados da sua instituição</p>
      </div>

      <FormStepper steps={STEPS} currentStep={currentStep}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ETAPA 1: Dados da Instituição */}
          {currentStep === 0 && (
            <FormStep 
              title="Dados da Instituição" 
              description="Informe os dados básicos da instituição"
            >
              <div className={styles.formGrid}>
                <div className={styles.fullWidth}>
                  <Input
                    label="Razão Social"
                    placeholder="Nome oficial da instituição"
                    error={errors.razaoSocial?.message}
                    required
                    {...register('razaoSocial')}
                  />
                </div>

                <div className={styles.fullWidth}>
                  <Input
                    label="Nome Fantasia (opcional)"
                    placeholder="Nome comercial da instituição"
                    {...register('nomeFantasia')}
                  />
                </div>

                <Controller
                  name="cnpj"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="CNPJ"
                      placeholder="00.000.000/0000-00"
                      error={errors.cnpj?.message}
                      required
                      value={field.value}
                      onChange={(e) => field.onChange(maskCNPJ(e.target.value))}
                    />
                  )}
                />

                <Input
                  label="Email"
                  type="email"
                  placeholder="contato@instituicao.com.br"
                  error={errors.email?.message}
                  required
                  {...register('email')}
                />

                <Controller
                  name="telefone"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Telefone"
                      placeholder="(00) 00000-0000"
                      error={errors.telefone?.message}
                      required
                      value={field.value}
                      onChange={(e) => field.onChange(maskPhone(e.target.value))}
                    />
                  )}
                />
              </div>
            </FormStep>
          )}

          {/* ETAPA 2: Endereço */}
          {currentStep === 1 && (
            <FormStep 
              title="Endereço" 
              description="Informe o endereço da instituição"
            >
              <div className={styles.formGrid}>
                <Controller
                  name="cep"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="CEP"
                      placeholder="00000-000"
                      error={errors.cep?.message}
                      required
                      value={field.value}
                      onChange={(e) => {
                        const masked = maskCEP(e.target.value)
                        field.onChange(masked)
                        handleCEPChange(masked)
                      }}
                      disabled={loadingCEP}
                    />
                  )}
                />

                <div className={styles.fullWidth}>
                  <Input
                    label="Endereço"
                    placeholder="Rua, Avenida..."
                    error={errors.endereco?.message}
                    required
                    disabled={loadingCEP}
                    {...register('endereco')}
                  />
                </div>

                <Input
                  label="Número"
                  placeholder="123"
                  error={errors.numero?.message}
                  required
                  {...register('numero')}
                />

                <Input
                  label="Complemento (opcional)"
                  placeholder="Sala, Bloco..."
                  {...register('complemento')}
                />

                <Input
                  label="Bairro"
                  placeholder="Nome do bairro"
                  error={errors.bairro?.message}
                  required
                  disabled={loadingCEP}
                  {...register('bairro')}
                />

                <Input
                  label="Cidade"
                  placeholder="Nome da cidade"
                  error={errors.cidade?.message}
                  required
                  disabled={loadingCEP}
                  {...register('cidade')}
                />

                <Select
                  label="UF"
                  placeholder="Selecione..."
                  options={UF_OPTIONS}
                  error={errors.uf?.message}
                  required
                  disabled={loadingCEP}
                  {...register('uf')}
                />
              </div>
            </FormStep>
          )}

          {/* ETAPA 3: Dados Adicionais */}
          {currentStep === 2 && (
            <FormStep 
              title="Dados Adicionais" 
              description="Informações complementares (opcional)"
            >
              <div className={styles.formGrid}>
                <Input
                  label="Código MEC (opcional)"
                  placeholder="Código de identificação no MEC"
                  {...register('codigoMEC')}
                />

                <Select
                  label="Tipo de Instituição (opcional)"
                  placeholder="Selecione..."
                  options={TIPO_INSTITUICAO_OPTIONS}
                  {...register('tipoInstituicao')}
                />
              </div>

              <div className={styles.infoBox}>
                <p>
                  <strong>💡 Dica:</strong> Esses dados são opcionais e podem ser 
                  preenchidos posteriormente. O código MEC ajuda na identificação 
                  oficial da instituição junto aos órgãos reguladores.
                </p>
              </div>
            </FormStep>
          )}

          {/* ETAPA 4: Confirmação */}
          {currentStep === 3 && (
            <FormStep 
              title="Confirmação" 
              description="Revise os dados antes de finalizar"
            >
              <div className={styles.reviewSection}>
                <h4>Dados da Instituição</h4>
                <div className={styles.reviewGrid}>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Razão Social:</span>
                    <span className={styles.reviewValue}>{watchedValues.razaoSocial}</span>
                  </div>
                  {watchedValues.nomeFantasia && (
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Nome Fantasia:</span>
                      <span className={styles.reviewValue}>{watchedValues.nomeFantasia}</span>
                    </div>
                  )}
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>CNPJ:</span>
                    <span className={styles.reviewValue}>{watchedValues.cnpj}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Email:</span>
                    <span className={styles.reviewValue}>{watchedValues.email}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Telefone:</span>
                    <span className={styles.reviewValue}>{watchedValues.telefone}</span>
                  </div>
                </div>
              </div>

              <div className={styles.reviewSection}>
                <h4>Endereço</h4>
                <div className={styles.reviewGrid}>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>CEP:</span>
                    <span className={styles.reviewValue}>{watchedValues.cep}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Endereço:</span>
                    <span className={styles.reviewValue}>
                      {watchedValues.endereco}, {watchedValues.numero}
                      {watchedValues.complemento && ` - ${watchedValues.complemento}`}
                    </span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Bairro:</span>
                    <span className={styles.reviewValue}>{watchedValues.bairro}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Cidade/UF:</span>
                    <span className={styles.reviewValue}>
                      {watchedValues.cidade}/{watchedValues.uf}
                    </span>
                  </div>
                </div>
              </div>

              {(watchedValues.codigoMEC || watchedValues.tipoInstituicao) && (
                <div className={styles.reviewSection}>
                  <h4>Dados Adicionais</h4>
                  <div className={styles.reviewGrid}>
                    {watchedValues.codigoMEC && (
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>Código MEC:</span>
                        <span className={styles.reviewValue}>{watchedValues.codigoMEC}</span>
                      </div>
                    )}
                    {watchedValues.tipoInstituicao && (
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>Tipo:</span>
                        <span className={styles.reviewValue}>
                          {TIPO_INSTITUICAO_OPTIONS.find(o => o.value === watchedValues.tipoInstituicao)?.label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </FormStep>
          )}

          {/* Botões de Navegação */}
          <div className={styles.actions}>
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                leftIcon={<FiArrowLeft />}
              >
                Voltar
              </Button>
            )}

            <div className={styles.actionsRight}>
              {currentStep < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  rightIcon={<FiArrowRight />}
                >
                  Próximo
                </Button>
              ) : (
                <Button
                  type="submit"
                  loading={loading}
                  leftIcon={<FiSave />}
                >
                  Finalizar Cadastro
                </Button>
              )}
            </div>
          </div>
        </form>
      </FormStepper>
    </div>
  )
}
