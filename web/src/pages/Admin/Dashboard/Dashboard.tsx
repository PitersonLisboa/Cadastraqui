import { useRecoilValue } from 'recoil'
import { FiUsers, FiFileText, FiSettings, FiTrendingUp } from 'react-icons/fi'
import { authState } from '@/atoms'
import styles from './Dashboard.module.scss'

export function AdminDashboard() {
  const auth = useRecoilValue(authState)

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1>Painel Administrativo</h1>
        <p>Bem-vindo(a), {auth.usuario?.email}</p>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#eff6ff' }}>
            <FiUsers color="#1e40af" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>24</span>
            <span className={styles.statLabel}>Instituições</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#f0fdf4' }}>
            <FiUsers color="#166534" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>156</span>
            <span className={styles.statLabel}>Candidatos</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#faf5ff' }}>
            <FiFileText color="#7c3aed" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>12</span>
            <span className={styles.statLabel}>Editais Ativos</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#fff7ed' }}>
            <FiTrendingUp color="#c2410c" size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>89</span>
            <span className={styles.statLabel}>Candidaturas</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>Atividades Recentes</h2>
          <div className={styles.activityList}>
            <div className={styles.activityItem}>
              <span className={styles.activityDot} style={{ backgroundColor: '#166534' }} />
              <div className={styles.activityInfo}>
                <p>Nova instituição cadastrada: <strong>Escola ABC</strong></p>
                <span>Há 2 horas</span>
              </div>
            </div>
            <div className={styles.activityItem}>
              <span className={styles.activityDot} style={{ backgroundColor: '#1e40af' }} />
              <div className={styles.activityInfo}>
                <p>Edital publicado: <strong>Bolsas 2026</strong></p>
                <span>Há 5 horas</span>
              </div>
            </div>
            <div className={styles.activityItem}>
              <span className={styles.activityDot} style={{ backgroundColor: '#7c3aed' }} />
              <div className={styles.activityInfo}>
                <p>Parecer emitido por <strong>Maria Silva</strong></p>
                <span>Há 1 dia</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
