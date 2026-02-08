import { InputHTMLAttributes, forwardRef, useState, useCallback } from 'react'
import { maskCPF, maskCNPJ, maskPhone, maskCEP, maskDate, maskMoney } from '@/utils/masks'
import styles from '../Input/Input.module.scss'

type MaskType = 'cpf' | 'cnpj' | 'phone' | 'cep' | 'date' | 'money'

interface MaskedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  error?: string
  helperText?: string
  mask: MaskType
  onChange?: (value: string, rawValue: string) => void
}

const maskFunctions: Record<MaskType, (value: string) => string> = {
  cpf: maskCPF,
  cnpj: maskCNPJ,
  phone: maskPhone,
  cep: maskCEP,
  date: maskDate,
  money: maskMoney,
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ label, error, helperText, mask, onChange, className, id, value, ...props }, ref) => {
    const inputId = id || props.name
    const [displayValue, setDisplayValue] = useState(
      value ? maskFunctions[mask](String(value)) : ''
    )

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '')
        const maskedValue = maskFunctions[mask](e.target.value)
        
        setDisplayValue(maskedValue)
        
        if (onChange) {
          onChange(maskedValue, rawValue)
        }
      },
      [mask, onChange]
    )

    return (
      <div className={`${styles.container} ${className || ''}`}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
            {props.required && <span className={styles.required}>*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${styles.input} ${error ? styles.error : ''}`}
          value={displayValue}
          onChange={handleChange}
          {...props}
        />
        {error && <span className={styles.errorText}>{error}</span>}
        {helperText && !error && <span className={styles.helperText}>{helperText}</span>}
      </div>
    )
  }
)

MaskedInput.displayName = 'MaskedInput'
