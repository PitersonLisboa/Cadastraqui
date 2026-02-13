import styles from './SectionSidebar.module.scss'

export interface SectionItem {
  id: string
  label: string
  icon: string // path to SVG
}

interface SectionSidebarProps {
  sections: SectionItem[]
  activeSection: string
  onSectionClick: (id: string) => void
}

export function SectionSidebar({ sections, activeSection, onSectionClick }: SectionSidebarProps) {
  return (
    <nav className={styles.sidebar}>
      {sections.map((section) => {
        const isActive = section.id === activeSection
        return (
          <button
            key={section.id}
            className={`${styles.sectionBtn} ${isActive ? styles.active : ''}`}
            onClick={() => onSectionClick(section.id)}
            title={section.label}
          >
            <div className={styles.iconCircle}>
              <img src={section.icon} alt="" className={styles.icon} />
            </div>
            <span className={styles.label}>{section.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
