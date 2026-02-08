import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { FiFileText, FiUsers, FiCalendar, FiTrendingUp, FiPieChart } from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { relatorioService } from '@/services/api'
import styles from './Relatorios.module.scss'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280']

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em Análise',
  DOCUMENTACAO_PENDENTE: 'Doc. Pendente',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  CANCELADO: 'Cancelado',
}

export function RelatoriosInstituicao() {
  const [loading, setLoading] = useState(true)
  const [dados, setDados] = useState<any>(null)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      const data = await relatorioService.dashboardInstituicao()
      setDados(data)
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

  if (!dados?.resumo) {
    return (
      <div className={styles.empty}>
        <FiPieChart size={48} />
        <h3>Nenhum dado disponível</h3>
        <p>Complete o cadastro da instituição para ver os relatórios.</p>
      </div>
    )
  }

  const { resumo, candidaturasPorStatus, candidaturasPorEdital, candidaturasPorMes, editaisRecentes } = dados

  const statusData = candidaturasPorStatus.map((item: any) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.total,
  }))

  const mesData = candidaturasPorMes.map((item: any) => ({
    mes: item.mes,
    candidaturas: item.total,
  }))

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Relatórios e Estatísticas</h1>
        <p>Acompanhe os números da sua instituição</p>
      </div>

      {/* Cards de Resumo */}
      <div className={styles.resumoGrid}>
        <Card className={styles.resumoCard}>
          <div className={styles.resumoIcon} style={{ backgroundColor: '#eff6ff' }}>
            <FiFileText size={24} color="#3b82f6" />
          </div>
          <div className={styles.resumoInfo}>
            <span className={styles.resumoNumero}>{resumo.totalEditais}</span>
            <span className={styles.resumoLabel}>Editais Criados</span>
          </div>
        </Card>

        <Card className={styles.resumoCard}>
          <div className={styles.resumoIcon} style={{ backgroundColor: '#dcfce7' }}>
            <FiCalendar size={24} color="#10b981" />
          </div>
          <div className={styles.resumoInfo}>
            <span className={styles.resumoNumero}>{resumo.editaisAtivos}</span>
            <span className={styles.resumoLabel}>Editais Ativos</span>
          </div>
        </Card>

        <Card className={styles.resumoCard}>
          <div className={styles.resumoIcon} style={{ backgroundColor: '#fef3c7' }}>
            <FiUsers size={24} color="#f59e0b" />
          </div>
          <div className={styles.resumoInfo}>
            <span className={styles.resumoNumero}>{resumo.totalCandidaturas}</span>
            <span className={styles.resumoLabel}>Candidaturas</span>
          </div>
        </Card>

        <Card className={styles.resumoCard}>
          <div className={styles.resumoIcon} style={{ backgroundColor: '#f3e8ff' }}>
            <FiTrendingUp size={24} color="#8b5cf6" />
          </div>
          <div className={styles.resumoInfo}>
            <span className={styles.resumoNumero}>{resumo.totalVagas}</span>
            <span className={styles.resumoLabel}>Total de Vagas</span>
          </div>
        </Card>
      </div>

      <div className={styles.chartsGrid}>
        {/* Gráfico de Pizza - Status das Candidaturas */}
        <Card className={styles.chartCard}>
          <h3>Candidaturas por Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noData}>Sem dados</div>
          )}
        </Card>

        {/* Gráfico de Linha - Evolução Mensal */}
        <Card className={styles.chartCard}>
          <h3>Candidaturas por Mês</h3>
          {mesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="candidaturas" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noData}>Sem dados</div>
          )}
        </Card>

        {/* Gráfico de Barras - Candidaturas por Edital */}
        <Card className={styles.chartCardFull}>
          <h3>Candidaturas por Edital</h3>
          {candidaturasPorEdital.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={candidaturasPorEdital} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="edital" type="category" width={200} />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noData}>Sem dados</div>
          )}
        </Card>
      </div>

      {/* Editais Recentes */}
      <Card className={styles.tabelaCard}>
        <h3>Editais Recentes</h3>
        <div className={styles.tabela}>
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Status</th>
                <th>Vagas</th>
                <th>Candidaturas</th>
                <th>Período</th>
              </tr>
            </thead>
            <tbody>
              {editaisRecentes.map((edital: any) => (
                <tr key={edital.id}>
                  <td>{edital.titulo}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[edital.status.toLowerCase()]}`}>
                      {edital.status}
                    </span>
                  </td>
                  <td>{edital.vagas}</td>
                  <td>{edital._count.candidaturas}</td>
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
