import { ReactNode } from 'react'
import styles from './Card.module.scss'

interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  actions?: ReactNode
}

export function Card({ 
  children, 
  title, 
  subtitle, 
  className, 
  padding = 'md',
  actions 
}: CardProps) {
  return (
    <div className={`${styles.card} ${styles[padding]} ${className || ''}`}>
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
