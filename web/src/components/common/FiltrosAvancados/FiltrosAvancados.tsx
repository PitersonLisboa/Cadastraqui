import { useState } from 'react'
import { FiFilter, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { Button } from '@/components/common/Button/Button'
import { Input } from '@/components/common/Input/Input'
import { Select } from '@/components/common/Select/Select'
import styles from './FiltrosAvancados.module.scss'

export interface FiltroConfig {
  nome: string
  label: string
  tipo: 'texto' | 'select' | 'data' | 'numero' | 'dataRange'
  opcoes?: { value: string; label: string }[]
  placeholder?: string
}

interface FiltrosAvancadosProps {
  filtros: FiltroConfig[]
  valores: Record<string, any>
  onChange: (nome: string, valor: any) => void
  onLimpar: () => void
  onAplicar: () => void
}

export function FiltrosAvancados({
  filtros,
  valores,
  onChange,
  onLimpar,
  onAplicar,
}: FiltrosAvancadosProps) {
  const [expandido, setExpandido] = useState(false)

  const filtrosAtivos = Object.values(valores).filter(v => v !== '' && v !== null && v !== undefined).length

  const renderFiltro = (filtro: FiltroConfig) => {
    switch (filtro.tipo) {
      case 'texto':
        return (
          <Input
            placeholder={filtro.placeholder || `Filtrar por ${filtro.label.toLowerCase()}`}
            value={valores[filtro.nome] || ''}
            onChange={(e) => onChange(filtro.nome, e.target.value)}
          />
        )

      case 'select':
        return (
          <Select
            value={valores[filtro.nome] || ''}
            onChange={(e) => onChange(filtro.nome, e.target.value)}
          >
            <option value="">Todos</option>
            {filtro.opcoes?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        )

      case 'data':
        return (
          <Input
            type="date"
            value={valores[filtro.nome] || ''}
            onChange={(e) => onChange(filtro.nome, e.target.value)}
          />
        )

      case 'dataRange':
        return (
          <div className={styles.dataRange}>
            <Input
              type="date"
              placeholder="De"
              value={valores[`${filtro.nome}De`] || ''}
              onChange={(e) => onChange(`${filtro.nome}De`, e.target.value)}
            />
            <span>até</span>
            <Input
              type="date"
              placeholder="Até"
              value={valores[`${filtro.nome}Ate`] || ''}
              onChange={(e) => onChange(`${filtro.nome}Ate`, e.target.value)}
            />
          </div>
        )

      case 'numero':
        return (
          <Input
            type="number"
            placeholder={filtro.placeholder || `Filtrar por ${filtro.label.toLowerCase()}`}
            value={valores[filtro.nome] || ''}
            onChange={(e) => onChange(filtro.nome, e.target.value)}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className={styles.container}>
      <button 
        className={styles.toggleBtn}
        onClick={() => setExpandido(!expandido)}
      >
        <FiFilter size={18} />
        <span>Filtros Avançados</span>
        {filtrosAtivos > 0 && (
          <span className={styles.badge}>{filtrosAtivos}</span>
        )}
        {expandido ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
      </button>

      {expandido && (
        <div className={styles.panel}>
          <div className={styles.grid}>
            {filtros.map((filtro) => (
              <div key={filtro.nome} className={styles.filtroItem}>
                <label>{filtro.label}</label>
                {renderFiltro(filtro)}
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <Button variant="outline" size="sm" onClick={onLimpar}>
              <FiX size={16} />
              Limpar Filtros
            </Button>
            <Button size="sm" onClick={onAplicar}>
              <FiFilter size={16} />
              Aplicar Filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
