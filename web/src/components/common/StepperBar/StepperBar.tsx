import styles from './StepperBar.module.scss'

interface StepperBarProps {
  totalSteps: number
  currentStep: number // 0-indexed
  onStepClick?: (step: number) => void
}

export function StepperBar({ totalSteps, currentStep, onStepClick }: StepperBarProps) {
  return (
    <div className={styles.stepper}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const isActive = i === currentStep
        const isCompleted = i < currentStep
        return (
          <div key={i} className={styles.stepWrapper}>
            <button
              className={`${styles.stepCircle} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
              onClick={() => onStepClick?.(i)}
              type="button"
            >
              {i + 1}
            </button>
            {i < totalSteps - 1 && (
              <div className={`${styles.stepLine} ${isCompleted ? styles.lineCompleted : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
