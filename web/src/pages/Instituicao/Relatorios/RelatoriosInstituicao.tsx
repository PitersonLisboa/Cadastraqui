import { useState, useEffect } from 'react'
import { 
  FiFileText, 
  FiUsers, 
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiTrendingUp,
  FiPercent,
  FiDownload
} from 'react-icons/fi'
import { 
  SimpleBarChart, 
  SimplePieChart, 
  MultiBarChart,
  SimpleLineChart,
  StatCard,
  CHART_COLORS 
} from '@/components/charts/Charts'
import { Card } from '@/components/common/Card/Card'
import { Button } from '@/components/common/Button/Button'
import { api } from '@/services/api'
import styles from './RelatoriosInstituicao.module.scss'

interface DashboardData {
  resumo: {
    totalEditais: number
    editaisAtivos: number
    totalCandidaturas: number
    totalVagas: number
  }
  candidaturasPorStatus: { status: string; total: number }[]
  candidaturasPorEdital: { edital: string; total: number }[]
  candidaturasPorMes: { mes: string; total: number }[]
  editaisRecentes: any[]
}

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em Análise',
  DOCUMENTACAO_PENDENTE: 'Doc. Pendente',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  CANCELADO: 'Cancelado',
}

const STATUS_EDITAL: Record<string, { label: string; color: string }> = {
  RASCUNHO: { label: 'Rascunho', color: '#6b7280' },
  ABERTO: { label: 'Aberto', color: '#22c55e' },
  ENCERRADO: { label: 'Encerrado', color: '#f59e0b' },
  CANCELADO: { label: 'Cancelado', color: '#ef4444' },
}

export function RelatoriosInstituicao() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      const response = await api.get('/relatorios/dashboard/instituicao')
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

  if (!data || !data.resumo) {
    return (
      <Card className={styles.emptyState}>
        <FiFileText size={48} />
        <h3>Nenhum dado disponível</h3>
        <p>Complete o cadastro da instituição para visualizar os relatórios.</p>
      </Card>
    )
  }

  // Calcular estatísticas
  const aprovadas = data.candidaturasPorStatus.find(s => s.status === 'APROVADO')?.total || 0
  const reprovadas = data.candidaturasPorStatus.find(s => s.status === 'REPROVADO')?.total || 0
  const pendentes = data.candidaturasPorStatus
    .filter(s => ['PENDENTE', 'EM_ANALISE', 'DOCUMENTACAO_PENDENTE'].includes(s.status))
    .reduce((acc, s) => acc + s.total, 0)
  
  const taxaAprovacao = data.resumo.totalCandidaturas > 0 
    ? Math.round((aprovadas / data.resumo.totalCandidaturas) * 100) 
    : 0

  // Preparar dados para gráficos
  const statusData = data.candidaturasPorStatus.map(s => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.total,
  }))

  const editalData = data.candidaturasPorEdital.slice(0, 8).map(e => ({
    name: e.edital.length > 15 ? e.edital.substring(0, 15) + '...' : e.edital,
    candidaturas: e.total,
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
      link.setAttribute('download', `relatorio_instituicao_${Date.now()}.pdf`)
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
          <h1>Relatórios da Instituição</h1>
          <p>Acompanhe o desempenho dos seus editais e candidaturas</p>
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
          title="Total de Editais"
          value={data.resumo.totalEditais}
          icon={<FiFileText size={24} />}
          color={CHART_COLORS.primary}
        />
        <StatCard
          title="Editais Ativos"
          value={data.resumo.editaisAtivos}
          icon={<FiClock size={24} />}
          color={CHART_COLORS.success}
        />
        <StatCard
          title="Total de Candidaturas"
          value={data.resumo.totalCandidaturas}
          icon={<FiUsers size={24} />}
          color={CHART_COLORS.info}
        />
        <StatCard
          title="Vagas Oferecidas"
          value={data.resumo.totalVagas}
          icon={<FiCheckCircle size={24} />}
          color={CHART_COLORS.warning}
        />
        <StatCard
          title="Taxa de Aprovação"
          value={`${taxaAprovacao}%`}
          icon={<FiPercent size={24} />}
          color={CHART_COLORS.purple}
        />
      </div>

      {/* Cards de Status Rápido */}
      <div className={styles.statusCards}>
        <Card className={styles.statusCard} style={{ borderLeftColor: CHART_COLORS.success }}>
          <div className={styles.statusIcon} style={{ backgroundColor: '#dcfce7' }}>
            <FiCheckCircle color={CHART_COLORS.success} size={24} />
          </div>
          <div>
            <span className={styles.statusNumber}>{aprovadas}</span>
            <span className={styles.statusLabel}>Aprovadas</span>
          </div>
        </Card>
        <Card className={styles.statusCard} style={{ borderLeftColor: CHART_COLORS.danger }}>
          <div className={styles.statusIcon} style={{ backgroundColor: '#fee2e2' }}>
            <FiXCircle color={CHART_COLORS.danger} size={24} />
          </div>
          <div>
            <span className={styles.statusNumber}>{reprovadas}</span>
            <span className={styles.statusLabel}>Reprovadas</span>
          </div>
        </Card>
        <Card className={styles.statusCard} style={{ borderLeftColor: CHART_COLORS.warning }}>
          <div className={styles.statusIcon} style={{ backgroundColor: '#fef3c7' }}>
            <FiClock color={CHART_COLORS.warning} size={24} />
          </div>
          <div>
            <span className={styles.statusNumber}>{pendentes}</span>
            <span className={styles.statusLabel}>Pendentes</span>
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartLarge}>
          <SimpleBarChart
            data={editalData}
            dataKey="candidaturas"
            title="Candidaturas por Edital"
            subtitle="Top 8 editais"
            color={CHART_COLORS.primary}
            height={350}
          />
        </div>

        <div className={styles.chartSmall}>
          <SimplePieChart
            data={statusData}
            title="Status das Candidaturas"
            subtitle="Distribuição atual"
            height={350}
          />
        </div>
      </div>

      {/* Evolução Mensal */}
      {mensalData.length > 0 && (
        <div className={styles.chartFull}>
          <SimpleLineChart
            data={mensalData}
            lines={[
              { dataKey: 'candidaturas', color: CHART_COLORS.primary, name: 'Candidaturas' },
            ]}
            title="Evolução de Candidaturas"
            subtitle="Últimos 12 meses"
            height={300}
          />
        </div>
      )}

      {/* Editais Recentes */}
      <Card className={styles.recentCard}>
        <h3>
          <FiFileText size={20} />
          Editais Recentes
        </h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Edital</th>
                <th>Status</th>
                <th>Vagas</th>
                <th>Candidaturas</th>
                <th>Período</th>
              </tr>
            </thead>
            <tbody>
              {data.editaisRecentes.map((edital) => (
                <tr key={edital.id}>
                  <td>
                    <strong>{edital.titulo}</strong>
                  </td>
                  <td>
                    <span 
                      className={styles.badge}
                      style={{ 
                        backgroundColor: STATUS_EDITAL[edital.status]?.color + '20',
                        color: STATUS_EDITAL[edital.status]?.color 
                      }}
                    >
                      {STATUS_EDITAL[edital.status]?.label || edital.status}
                    </span>
                  </td>
                  <td>{edital.vagas}</td>
                  <td>{edital._count?.candidaturas || 0}</td>
                  <td>
                    {new Date(edital.dataInicio).toLocaleDateString('pt-BR')} - {new Date(edital.dataFim).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
