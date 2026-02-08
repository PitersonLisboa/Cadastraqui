import { useState, useEffect } from 'react'
import { 
  FiUsers, 
  FiHome, 
  FiFileText, 
  FiCheckCircle,
  FiTrendingUp,
  FiPieChart,
  FiBarChart2,
  FiActivity,
  FiDownload
} from 'react-icons/fi'
import { 
  SimpleBarChart, 
  SimplePieChart, 
  SimpleLineChart,
  StatCard,
  CHART_COLORS 
} from '@/components/charts/Charts'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { api } from '@/services/api'
import styles from './Relatorios.module.scss'

interface DashboardData {
  resumo: {
    totalUsuarios: number
    totalInstituicoes: number
    totalCandidatos: number
    totalEditais: number
    totalCandidaturas: number
  }
  candidaturasPorStatus: { status: string; total: number }[]
  candidaturasPorMes: { mes: string; total: number }[]
  instituicoesRecentes: any[]
}

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em Análise',
  DOCUMENTACAO_PENDENTE: 'Doc. Pendente',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  CANCELADO: 'Cancelado',
}

export function RelatoriosAdmin() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      const response = await api.get('/relatorios/dashboard/admin')
      setData(response.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando relatórios...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={styles.error}>
        <p>Erro ao carregar dados</p>
      </div>
    )
  }

  // Preparar dados para gráficos
  const statusData = data.candidaturasPorStatus.map(s => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.total,
  }))

  const mensalData = data.candidaturasPorMes.map(m => ({
    name: m.mes,
    candidaturas: m.total,
  }))

  async function exportarPDF() {
    try {
      const response = await api.get('/export/dashboard', {
        params: { formato: 'pdf' },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `relatorio_admin_${Date.now()}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
    }
  }

  async function exportarExcel() {
    try {
      const response = await api.get('/export/candidaturas', {
        params: { formato: 'excel' },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `candidaturas_${Date.now()}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Erro ao exportar Excel:', error)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Relatórios e Estatísticas</h1>
          <p>Visão geral do sistema</p>
        </div>
        <div className={styles.exportButtons}>
          <Button variant="outline" onClick={exportarPDF}>
            <FiDownload size={16} /> PDF
          </Button>
          <Button variant="outline" onClick={exportarExcel}>
            <FiDownload size={16} /> Excel
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Total de Usuários"
          value={data.resumo.totalUsuarios}
          icon={<FiUsers size={24} />}
          color={CHART_COLORS.primary}
        />
        <StatCard
          title="Instituições"
          value={data.resumo.totalInstituicoes}
          icon={<FiHome size={24} />}
          color={CHART_COLORS.success}
        />
        <StatCard
          title="Candidatos"
          value={data.resumo.totalCandidatos}
          icon={<FiUsers size={24} />}
          color={CHART_COLORS.warning}
        />
        <StatCard
          title="Editais"
          value={data.resumo.totalEditais}
          icon={<FiFileText size={24} />}
          color={CHART_COLORS.info}
        />
        <StatCard
          title="Total Candidaturas"
          value={data.resumo.totalCandidaturas}
          icon={<FiCheckCircle size={24} />}
          color={CHART_COLORS.purple}
        />
      </div>

      {/* Gráficos */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartLarge}>
          <SimpleBarChart
            data={mensalData}
            dataKey="candidaturas"
            title="Candidaturas por Mês"
            subtitle="Últimos 12 meses"
            color={CHART_COLORS.primary}
            height={350}
          />
        </div>

        <div className={styles.chartSmall}>
          <SimplePieChart
            data={statusData}
            title="Candidaturas por Status"
            subtitle="Distribuição atual"
            height={350}
          />
        </div>
      </div>

      {/* Instituições Recentes */}
      <Card className={styles.recentCard}>
        <h3>
          <FiHome size={20} />
          Instituições Recentes
        </h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Instituição</th>
                <th>Email</th>
                <th>Editais</th>
                <th>Data Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {data.instituicoesRecentes.map((inst) => (
                <tr key={inst.id}>
                  <td>
                    <strong>{inst.nomeFantasia || inst.razaoSocial}</strong>
                  </td>
                  <td>{inst.email}</td>
                  <td>{inst.totalEditais}</td>
                  <td>{new Date(inst.criadoEm).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
