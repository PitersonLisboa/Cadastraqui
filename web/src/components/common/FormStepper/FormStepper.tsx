import { ReactNode } from 'react'
import { FiCheck } from 'react-icons/fi'
import styles from './FormStepper.module.scss'

interface Step {
  title: string
  description?: string
}

interface FormStepperProps {
  steps: Step[]
  currentStep: number
  children: ReactNode
}

export function FormStepper({ steps, currentStep, children }: FormStepperProps) {
  return (
    <div className={styles.container}>
      {/* Indicador de passos */}
      <div className={styles.stepsIndicator}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          
          return (
            <div
              key={index}
              className={`${styles.step} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.current : ''}`}
            >
              <div className={styles.stepCircle}>
                {isCompleted ? <FiCheck size={16} /> : index + 1}
              </div>
              <div className={styles.stepInfo}>
                <span className={styles.stepTitle}>{step.title}</span>
                {step.description && (
                  <span className={styles.stepDescription}>{step.description}</span>
                )}
              </div>
              {index < steps.length - 1 && <div className={styles.stepLine} />}
            </div>
          )
        })}
      </div>

      {/* Conteúdo do passo atual */}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
}

interface FormStepProps {
  children: ReactNode
  title?: string
  description?: string
}

export function FormStep({ children, title, description }: FormStepProps) {
  return (
    <div className={styles.formStep}>
      {(title || description) && (
        <div className={styles.formStepHeader}>
          {title && <h3 className={styles.formStepTitle}>{title}</h3>}
          {description && <p className={styles.formStepDescription}>{description}</p>}
        </div>
      )}
      <div className={styles.formStepContent}>
        {children}
      </div>
    </div>
  )
}
