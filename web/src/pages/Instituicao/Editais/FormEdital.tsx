import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiSave } from 'react-icons/fi'

import { Input } from '@/components/common/Input/Input'
import { Select } from '@/components/common/Select/Select'
import { Button } from '@/components/common/Button/Button'
import { Card } from '@/components/common/Card/Card'
import { editalService } from '@/services/api'

import styles from './FormEdital.module.scss'

// ===========================================
// SCHEMA DE VALIDAÇÃO
// ===========================================

const editalSchema = z.object({
  titulo: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  descricao: z.string().optional(),
  anoLetivo: z.coerce.number().min(2020, 'Ano inválido').max(2100, 'Ano inválido'),
  dataInicio: z.string().min(1, 'Data de início é obrigatória'),
  dataFim: z.string().min(1, 'Data de fim é obrigatória'),
  vagasDisponiveis: z.coerce.number().min(1, 'Deve ter pelo menos 1 vaga'),
  requisitos: z.string().optional(),
  documentosExigidos: z.string().optional(),
  ativo: z.boolean().default(true),
}).refine((data) => {
  const inicio = new Date(data.dataInicio)
  const fim = new Date(data.dataFim)
  return fim >= inicio
}, {
  message: 'Data de fim deve ser posterior à data de início',
  path: ['dataFim'],
})

type EditalForm = z.infer<typeof editalSchema>

// ===========================================
// OPÇÕES
// ===========================================

const ANO_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const year = new Date().getFullYear() + i
  return { value: String(year), label: String(year) }
})

// ===========================================
// COMPONENTE
// ===========================================

export function FormEdital() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(!!id)
  const isEditing = !!id

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditalForm>({
    resolver: zodResolver(editalSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      anoLetivo: new Date().getFullYear(),
      dataInicio: '',
      dataFim: '',
      vagasDisponiveis: 1,
      requisitos: '',
      documentosExigidos: '',
      ativo: true,
    },
  })

  useEffect(() => {
    if (id) {
      loadEdital()
    }
  }, [id])

  const loadEdital = async () => {
    try {
      const response = await editalService.buscar(id!)
      const edital = response.edital
      
      reset({
        titulo: edital.titulo,
        descricao: edital.descricao || '',
        anoLetivo: edital.anoLetivo,
        dataInicio: edital.dataInicio.split('T')[0],
        dataFim: edital.dataFim.split('T')[0],
        vagasDisponiveis: edital.vagasDisponiveis,
        requisitos: edital.requisitos || '',
        documentosExigidos: edital.documentosExigidos || '',
        ativo: edital.ativo,
      })
    } catch (error) {
      toast.error('Erro ao carregar edital')
      navigate('/instituicao/editais')
    } finally {
      setLoadingData(false)
    }
  }

  const onSubmit = async (data: EditalForm) => {
    setLoading(true)
    
    try {
      if (isEditing) {
        await editalService.atualizar(id!, data)
        toast.success('Edital atualizado com sucesso!')
      } else {
        await editalService.criar(data)
        toast.success('Edital criado com sucesso!')
      }
      
      navigate('/instituicao/editais')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar edital')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/instituicao/editais')}
          leftIcon={<FiArrowLeft />}
        >
          Voltar
        </Button>
        <div>
          <h1>{isEditing ? 'Editar Edital' : 'Novo Edital'}</h1>
          <p>
            {isEditing 
              ? 'Atualize as informações do edital' 
              : 'Preencha os dados para criar um novo edital'}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card title="Informações Básicas" className={styles.section}>
          <div className={styles.formGrid}>
            <div className={styles.fullWidth}>
              <Input
                label="Título do Edital"
                placeholder="Ex: Processo Seletivo de Bolsas 2026"
                error={errors.titulo?.message}
                required
                {...register('titulo')}
              />
            </div>

            <div className={styles.fullWidth}>
              <label className={styles.label}>Descrição (opcional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Descreva o edital, público-alvo, benefícios..."
                rows={4}
                {...register('descricao')}
              />
            </div>

            <Select
              label="Ano Letivo"
              options={ANO_OPTIONS}
              error={errors.anoLetivo?.message}
              required
              {...register('anoLetivo')}
            />

            <Input
              label="Vagas Disponíveis"
              type="number"
              min={1}
              error={errors.vagasDisponiveis?.message}
              required
              {...register('vagasDisponiveis')}
            />
          </div>
        </Card>

        <Card title="Período de Inscrições" className={styles.section}>
          <div className={styles.formGrid}>
            <Input
              label="Data de Início"
              type="date"
              error={errors.dataInicio?.message}
              required
              {...register('dataInicio')}
            />

            <Input
              label="Data de Término"
              type="date"
              error={errors.dataFim?.message}
              required
              {...register('dataFim')}
            />
          </div>
        </Card>

        <Card title="Requisitos e Documentos" className={styles.section}>
          <div className={styles.formGrid}>
            <div className={styles.fullWidth}>
              <label className={styles.label}>Requisitos (opcional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Liste os requisitos para participação no edital..."
                rows={4}
                {...register('requisitos')}
              />
              <span className={styles.helperText}>
                Dica: Use uma linha para cada requisito
              </span>
            </div>

            <div className={styles.fullWidth}>
              <label className={styles.label}>Documentos Exigidos (opcional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Liste os documentos necessários para inscrição..."
                rows={4}
                {...register('documentosExigidos')}
              />
              <span className={styles.helperText}>
                Dica: Use uma linha para cada documento
              </span>
            </div>
          </div>
        </Card>

        <Card title="Status" className={styles.section}>
          <div className={styles.checkboxContainer}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                {...register('ativo')}
              />
              <span className={styles.checkmark}></span>
              <span className={styles.checkboxLabel}>
                Edital Ativo
                <small>Desmarque para manter o edital como rascunho</small>
              </span>
            </label>
          </div>
        </Card>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/instituicao/editais')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            leftIcon={<FiSave />}
          >
            {isEditing ? 'Salvar Alterações' : 'Criar Edital'}
          </Button>
        </div>
      </form>
    </div>
  )
}
