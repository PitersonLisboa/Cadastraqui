import { useState, useEffect } from 'react'
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
import { candidatoService } from '@/services/api'
import { 
  maskCPF, 
  maskPhone, 
  maskCEP, 
  unmaskValue, 
  fetchAddressByCEP,
  isValidCPF 
} from '@/utils/masks'
import { UF_OPTIONS } from '@/types'

import styles from './CadastroCandidato.module.scss'

// ===========================================
// SCHEMA DE VALIDAÇÃO
// ===========================================

const candidatoSchema = z.object({
  // Dados Pessoais
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: z.string().min(14, 'CPF inválido').refine(
    (val) => isValidCPF(val),
    'CPF inválido'
  ),
  dataNascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  telefone: z.string().min(14, 'Telefone inválido'),
  celular: z.string().optional(),
  estadoCivil: z.string().min(1, 'Selecione o estado civil'),
  profissao: z.string().optional(),
  
  // Endereço
  cep: z.string().min(9, 'CEP inválido'),
  endereco: z.string().min(3, 'Endereço é obrigatório'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro é obrigatório'),
  cidade: z.string().min(2, 'Cidade é obrigatória'),
  uf: z.string().min(2, 'UF é obrigatória'),
  
  // Dados Socioeconômicos
  rendaFamiliar: z.string().optional(),
})

type CandidatoForm = z.infer<typeof candidatoSchema>

// ===========================================
// OPÇÕES DE SELECT
// ===========================================

const ESTADO_CIVIL_OPTIONS = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
]

const STEPS = [
  { title: 'Dados Pessoais', description: 'Informações básicas' },
  { title: 'Endereço', description: 'Onde você mora' },
  { title: 'Socioeconômico', description: 'Situação financeira' },
  { title: 'Confirmação', description: 'Revise os dados' },
]

// ===========================================
// COMPONENTE PRINCIPAL
// ===========================================

export function CadastroCandidato() {
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
  } = useForm<CandidatoForm>({
    resolver: zodResolver(candidatoSchema),
    defaultValues: {
      nome: '',
      cpf: '',
      dataNascimento: '',
      telefone: '',
      celular: '',
      estadoCivil: '',
      profissao: '',
      cep: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      rendaFamiliar: '',
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
    const fieldsToValidate: (keyof CandidatoForm)[][] = [
      ['nome', 'cpf', 'dataNascimento', 'telefone', 'estadoCivil'], // Step 0
      ['cep', 'endereco', 'numero', 'bairro', 'cidade', 'uf'],       // Step 1
      [],                                                              // Step 2 (opcional)
      [],                                                              // Step 3 (confirmação)
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

  const onSubmit = async (data: CandidatoForm) => {
    setLoading(true)
    
    try {
      // Preparar dados para envio
      const payload = {
        ...data,
        cpf: unmaskValue(data.cpf),
        telefone: unmaskValue(data.telefone),
        celular: data.celular ? unmaskValue(data.celular) : undefined,
        cep: unmaskValue(data.cep),
        rendaFamiliar: data.rendaFamiliar 
          ? parseFloat(data.rendaFamiliar.replace(/\D/g, '')) / 100 
          : undefined,
      }

      await candidatoService.criar(payload)
      
      toast.success('Cadastro realizado com sucesso!')
      navigate('/candidato')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao realizar cadastro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Completar Cadastro</h1>
        <p>Preencha seus dados para acessar o sistema</p>
      </div>

      <FormStepper steps={STEPS} currentStep={currentStep}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ETAPA 1: Dados Pessoais */}
          {currentStep === 0 && (
            <FormStep 
              title="Dados Pessoais" 
              description="Informe seus dados básicos de identificação"
            >
              <div className={styles.formGrid}>
                <div className={styles.fullWidth}>
                  <Input
                    label="Nome Completo"
                    placeholder="Digite seu nome completo"
                    error={errors.nome?.message}
                    required
                    {...register('nome')}
                  />
                </div>

                <Controller
                  name="cpf"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="CPF"
                      placeholder="000.000.000-00"
                      error={errors.cpf?.message}
                      required
                      value={field.value}
                      onChange={(e) => field.onChange(maskCPF(e.target.value))}
                    />
                  )}
                />

                <Input
                  label="Data de Nascimento"
                  type="date"
                  error={errors.dataNascimento?.message}
                  required
                  {...register('dataNascimento')}
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

                <Controller
                  name="celular"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Celular (opcional)"
                      placeholder="(00) 00000-0000"
                      value={field.value}
                      onChange={(e) => field.onChange(maskPhone(e.target.value))}
                    />
                  )}
                />

                <Select
                  label="Estado Civil"
                  placeholder="Selecione..."
                  options={ESTADO_CIVIL_OPTIONS}
                  error={errors.estadoCivil?.message}
                  required
                  {...register('estadoCivil')}
                />

                <Input
                  label="Profissão (opcional)"
                  placeholder="Ex: Estudante, Autônomo..."
                  {...register('profissao')}
                />
              </div>
            </FormStep>
          )}

          {/* ETAPA 2: Endereço */}
          {currentStep === 1 && (
            <FormStep 
              title="Endereço" 
              description="Informe seu endereço residencial"
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
                  placeholder="Apto, Bloco..."
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

          {/* ETAPA 3: Dados Socioeconômicos */}
          {currentStep === 2 && (
            <FormStep 
              title="Dados Socioeconômicos" 
              description="Informe sua situação financeira (opcional nesta etapa)"
            >
              <div className={styles.formGrid}>
                <Input
                  label="Renda Familiar Mensal (opcional)"
                  placeholder="R$ 0,00"
                  helperText="Some a renda de todos os membros da família"
                  {...register('rendaFamiliar')}
                />
              </div>

              <div className={styles.infoBox}>
                <p>
                  <strong>💡 Dica:</strong> Você poderá completar os dados 
                  socioeconômicos mais tarde, incluindo informações sobre 
                  membros da família, despesas e documentos.
                </p>
              </div>
            </FormStep>
          )}

          {/* ETAPA 4: Confirmação */}
          {currentStep === 3 && (
            <FormStep 
              title="Confirmação" 
              description="Revise seus dados antes de finalizar"
            >
              <div className={styles.reviewSection}>
                <h4>Dados Pessoais</h4>
                <div className={styles.reviewGrid}>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Nome:</span>
                    <span className={styles.reviewValue}>{watchedValues.nome}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>CPF:</span>
                    <span className={styles.reviewValue}>{watchedValues.cpf}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Data de Nascimento:</span>
                    <span className={styles.reviewValue}>
                      {watchedValues.dataNascimento && 
                        new Date(watchedValues.dataNascimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Telefone:</span>
                    <span className={styles.reviewValue}>{watchedValues.telefone}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Estado Civil:</span>
                    <span className={styles.reviewValue}>
                      {ESTADO_CIVIL_OPTIONS.find(o => o.value === watchedValues.estadoCivil)?.label}
                    </span>
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
