import { useState, useEffect, useCallback, InputHTMLAttributes } from 'react'
import { maskDate } from '@/utils/masks'

/**
 * DateInput — input de data com máscara dd/mm/aaaa
 * 
 * Resolve o problema de dispositivos móveis onde type="date" abre
 * um calendário na data atual, forçando o usuário a rolar dezenas
 * de anos para inserir datas de nascimento.
 * 
 * Props:
 *  - value: string ISO (yyyy-mm-dd) ou vazio
 *  - onChange: recebe string ISO (yyyy-mm-dd) ou vazio
 *  - Todas as props de <input> exceto type e onChange
 */

interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'value'> {
  value: string      // ISO format: yyyy-mm-dd ou ''
  onChange: (isoDate: string) => void
}

// Converte ISO (yyyy-mm-dd) para display (dd/mm/aaaa)
function isoToDisplay(iso: string): string {
  if (!iso) return ''
  const parts = iso.split('-')
  if (parts.length !== 3) return ''
  const [y, m, d] = parts
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

// Converte display (dd/mm/aaaa) para ISO (yyyy-mm-dd)
function displayToIso(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.length !== 8) return ''
  const day = digits.substring(0, 2)
  const month = digits.substring(2, 4)
  const year = digits.substring(4, 8)
  
  // Validação básica
  const d = parseInt(day, 10)
  const m = parseInt(month, 10)
  const y = parseInt(year, 10)
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) return ''
  
  return `${year}-${month}-${day}`
}

export function DateInput({ value, onChange, placeholder, ...props }: DateInputProps) {
  const [displayValue, setDisplayValue] = useState(() => isoToDisplay(value))

  // Sincroniza quando o valor externo muda (ex: carregar dados do servidor)
  useEffect(() => {
    const newDisplay = isoToDisplay(value)
    setDisplayValue(prev => {
      // Só atualiza se o valor ISO correspondente é diferente
      // Isso evita sobrescrever enquanto o usuário digita
      const currentIso = displayToIso(prev)
      if (currentIso !== value) {
        return newDisplay
      }
      return prev
    })
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskDate(e.target.value)
    setDisplayValue(masked)

    const digits = masked.replace(/\D/g, '')
    if (digits.length === 8) {
      const iso = displayToIso(masked)
      if (iso) {
        onChange(iso)
      }
    } else if (digits.length === 0) {
      onChange('')
    }
  }, [onChange])

  // Ao sair do campo, se tiver data completa, formata; se não, limpa
  const handleBlur = useCallback(() => {
    const digits = displayValue.replace(/\D/g, '')
    if (digits.length === 8) {
      const iso = displayToIso(displayValue)
      if (iso) {
        onChange(iso)
      } else {
        // Data inválida, limpa
        setDisplayValue('')
        onChange('')
      }
    } else if (digits.length > 0 && digits.length < 8) {
      // Incompleta — mantém o que digitou para o usuário corrigir
    }
  }, [displayValue, onChange])

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      placeholder={placeholder || 'dd/mm/aaaa'}
      maxLength={10}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  )
}
