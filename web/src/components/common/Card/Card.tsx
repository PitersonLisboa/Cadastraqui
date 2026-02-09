import { ReactNode, CSSProperties } from 'react'
import styles from './Card.module.scss'

export interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  actions?: ReactNode
  onClick?: () => void
  style?: CSSProperties
}

export function Card({ 
  children, 
  title, 
  subtitle, 
  className, 
  padding = 'md',
  actions,
  onClick,
  style
}: CardProps) {
  return (
    <div 
      className={`${styles.card} ${styles[padding]} ${className || ''} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
      style={style}
    >
      {(title || subtitle || actions) && (
        <div className={styles.header}>
          <div className={styles.headerText}>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
}
