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
  AreaChart,
  Area,
} from 'recharts'
import { 
  FiUsers, 
  FiHome, 
  FiFileText, 
  FiClipboard,
  FiTrendingUp,
  FiActivity
} from 'react-icons/fi'
import { Card } from '@/components/common/Card/Card'
import { relatorioService } from '@/services/api'
import styles from './RelatoriosAdmin.module.scss'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280']

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em Análise',
  DOCUMENTACAO_PENDENTE: 'Doc. Pendente',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  CANCELADO: 'Cancelado',
}

export function RelatoriosAdmin() {
  const [loading, setLoading] = useState(true)
  const [dados, setDados] = useState<any>(null)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      const data = await relatorioService.dashboardAdmin()
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
        <p>Carregando dashboard...</p>
      </div>
    )
  }

  const { resumo, candidaturasPorStatus, candidaturasPorMes, instituicoesRecentes } = dados || {}

  const statusData = candidaturasPorStatus?.map((item: any) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.total,
  })) || []

  const mesData = candidaturasPorMes?.map((item: any) => ({
    mes: item.mes,
    candidaturas: item.total,
  })) || []

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Dashboard Administrativo</h1>
        <p>Visão geral do sistema Cadastraqui</p>
      </div>

      {/* Cards de Resumo */}
      <div className={styles.resumoGrid}>
        <Card className={styles.resumoCard}>
          <div className={styles.resumoIcon} style={{ backgroundColor: '#eff6ff' }}>
            <FiUsers size={24} color="#3b82f6" />
          </div>
          <div className={styles.resumoInfo}>
            <span className={styles.resumoNumero}>{resumo?.totalUsuarios || 0}</span>
            <span className={styles.resumoLabel}>Usuários</span>
          </div>
        </Card>

        <Card className={styles.resumoCard}>
          <div className={styles.resumoIcon} style={{ backgroundColor: '#dcfce7' }}>
            <FiHome size={24} color="#10b981" />
          </div>
          <div className={styles.resumoInfo}>
            <span className={styles.resumoNumero}>{resumo?.totalInstituicoes || 0}</span>
            <span className={styles.resumoLabel}>Instituições</span>
          </div>
        </Card>

        <Card className={styles.resumoCard}>
          <div className={styles.resumoIcon} style={{ backgroundColor: '#fef3c7' }}>
            <FiFileText size={24} color="#f59e0b" />
          </div>
          <div className={styles.resumoInfo}>
            <span className={styles.resumoNumero}>{resumo?.totalEditais || 0}</span>
            <span className={styles.resumoLabel}>Editais</span>
          </div>
        </Card>

        <Card className={styles.resumoCard}>
          <div className={styles.resumoIcon} style={{ backgroundColor: '#f3e8ff' }}>
            <FiClipboard size={24} color="#8b5cf6" />
          </div>
          <div className={styles.resumoInfo}>
            <span className={styles.resumoNumero}>{resumo?.totalCandidaturas || 0}</span>
            <span className={styles.resumoLabel}>Candidaturas</span>
          </div>
        </Card>

        <Card className={styles.resumoCard}>
          <div className={styles.resumoIcon} style={{ backgroundColor: '#fee2e2' }}>
            <FiActivity size={24} color="#ef4444" />
          </div>
          <div className={styles.resumoInfo}>
            <span className={styles.resumoNumero}>{resumo?.totalCandidatos || 0}</span>
            <span className={styles.resumoLabel}>Candidatos</span>
          </div>
        </Card>
      </div>

      <div className={styles.chartsGrid}>
        {/* Gráfico de Área - Evolução Mensal */}
        <Card className={styles.chartCard}>
          <h3>
            <FiTrendingUp size={18} />
            Evolução de Candidaturas (12 meses)
          </h3>
          {mesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="candidaturas" 
                  stroke="#3b82f6" 
                  fill="#93c5fd"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noData}>Sem dados disponíveis</div>
          )}
        </Card>

        {/* Gráfico de Pizza - Status das Candidaturas */}
        <Card className={styles.chartCard}>
          <h3>Distribuição por Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noData}>Sem dados disponíveis</div>
          )}
        </Card>
      </div>

      {/* Tabela de Instituições Recentes */}
      <Card className={styles.tabelaCard}>
        <h3>Instituições Recentes</h3>
        <div className={styles.tabela}>
          <table>
            <thead>
              <tr>
                <th>Instituição</th>
                <th>Nome Fantasia</th>
                <th>Email</th>
                <th>Editais</th>
                <th>Data Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {instituicoesRecentes?.map((inst: any) => (
                <tr key={inst.id}>
                  <td>{inst.razaoSocial}</td>
                  <td>{inst.nomeFantasia || '-'}</td>
                  <td>{inst.email}</td>
                  <td>{inst.totalEditais}</td>
                  <td>{new Date(inst.criadoEm).toLocaleDateString('pt-BR')}</td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={5} className={styles.noData}>Nenhuma instituição cadastrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
