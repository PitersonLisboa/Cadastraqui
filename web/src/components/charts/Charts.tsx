import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts'

// Cores padrão para gráficos
export const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gray: '#6b7280',
}

export const PIE_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#6b7280',
]

interface ChartContainerProps {
  children: React.ReactElement
  title?: string
  subtitle?: string
  height?: number
}

export function ChartContainer({ children, title, subtitle, height = 300 }: ChartContainerProps) {
  return (
    <div style={{ 
      background: 'white', 
      borderRadius: '8px', 
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb'
    }}>
      {title && (
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{subtitle}</p>
          )}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}

// Gráfico de Barras
interface BarChartData {
  name: string
  [key: string]: string | number
}

interface SimpleBarChartProps {
  data: BarChartData[]
  dataKey: string
  title?: string
  subtitle?: string
  color?: string
  height?: number
}

export function SimpleBarChart({ 
  data, 
  dataKey, 
  title, 
  subtitle, 
  color = CHART_COLORS.primary,
  height = 300 
}: SimpleBarChartProps) {
  return (
    <ChartContainer title={title} subtitle={subtitle} height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6b7280" />
        <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }} 
        />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

// Gráfico de Barras Múltiplas
interface MultiBarChartProps {
  data: BarChartData[]
  bars: { dataKey: string; color: string; name: string }[]
  title?: string
  subtitle?: string
  height?: number
}

export function MultiBarChart({ data, bars, title, subtitle, height = 300 }: MultiBarChartProps) {
  return (
    <ChartContainer title={title} subtitle={subtitle} height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6b7280" />
        <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '6px'
          }} 
        />
        <Legend />
        {bars.map((bar) => (
          <Bar key={bar.dataKey} dataKey={bar.dataKey} fill={bar.color} name={bar.name} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

// Gráfico de Pizza
interface PieChartData {
  name: string
  value: number
}

interface SimplePieChartProps {
  data: PieChartData[]
  title?: string
  subtitle?: string
  height?: number
  showLabels?: boolean
}

export function SimplePieChart({ 
  data, 
  title, 
  subtitle, 
  height = 300,
  showLabels = true 
}: SimplePieChartProps) {
  const RADIAN = Math.PI / 180
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return percent > 0.05 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null
  }

  return (
    <ChartContainer title={title} subtitle={subtitle} height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={showLabels ? renderCustomizedLabel : undefined}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '6px'
          }} 
        />
        <Legend />
      </PieChart>
    </ChartContainer>
  )
}

// Gráfico de Linha
interface LineChartData {
  name: string
  [key: string]: string | number
}

interface SimpleLineChartProps {
  data: LineChartData[]
  lines: { dataKey: string; color: string; name: string }[]
  title?: string
  subtitle?: string
  height?: number
}

export function SimpleLineChart({ data, lines, title, subtitle, height = 300 }: SimpleLineChartProps) {
  return (
    <ChartContainer title={title} subtitle={subtitle} height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6b7280" />
        <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '6px'
          }} 
        />
        <Legend />
        {lines.map((line) => (
          <Line 
            key={line.dataKey} 
            type="monotone" 
            dataKey={line.dataKey} 
            stroke={line.color} 
            name={line.name}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}

// Gráfico de Área
interface SimpleAreaChartProps {
  data: LineChartData[]
  dataKey: string
  title?: string
  subtitle?: string
  color?: string
  height?: number
}

export function SimpleAreaChart({ 
  data, 
  dataKey, 
  title, 
  subtitle, 
  color = CHART_COLORS.primary,
  height = 300 
}: SimpleAreaChartProps) {
  return (
    <ChartContainer title={title} subtitle={subtitle} height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6b7280" />
        <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '6px'
          }} 
        />
        <Area 
          type="monotone" 
          dataKey={dataKey} 
          stroke={color} 
          fill={color} 
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}

// Componente de Stat Card
interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: number; isPositive: boolean }
  color?: string
}

export function StatCard({ title, value, icon, trend, color = CHART_COLORS.primary }: StatCardProps) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '1rem'
    }}>
      {icon && (
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '8px',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          flexShrink: 0
        }}>
          {icon}
        </div>
      )}
      <div>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>{title}</p>
        <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>{value}</p>
        {trend && (
          <p style={{ 
            fontSize: '0.75rem', 
            color: trend.isPositive ? '#22c55e' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% vs mês anterior
          </p>
        )}
      </div>
    </div>
  )
}
