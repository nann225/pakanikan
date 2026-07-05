import { useDashboardStore } from '../store/dashboard'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import './SensorChart.css'

type ChartKey = 'temperature' | 'humidity'

const chartConfig: Record<ChartKey, { title: string; unit: string; stroke: string; domain: [number | 'auto', number | 'auto'] }> = {
  temperature: {
    title: 'Grafik Suhu',
    unit: 'C',
    stroke: '#d97706',
    domain: ['auto', 'auto'],
  },
  humidity: {
    title: 'Grafik Kelembapan',
    unit: '%',
    stroke: '#0284c7',
    domain: [0, 100],
  },
}

function SensorLineCard({ chartKey }: { chartKey: ChartKey }) {
  const sensorData = useDashboardStore((state) => state.sensorData)
  const config = chartConfig[chartKey]
  const chartData = sensorData
    .slice(0, 40)
    .reverse()
    .map((data) => ({
      time: format(new Date(data.timestamp), 'HH:mm:ss'),
      value: chartKey === 'temperature' ? data.temperature || 0 : data.humidity || 0,
    }))

  return (
    <div className="sensor-chart-card">
      <div className="chart-header">
        <div>
          <h2>{config.title}</h2>
          <p className="chart-subtitle">Realtime telemetry</p>
        </div>
        <span className="chart-badge">{config.unit}</span>
      </div>

      {chartData.length === 0 ? (
        <p className="no-data">Menunggu data sensor dari MQTT...</p>
      ) : (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 10, right: 18, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} stroke="#cbd5e1" />
              <YAxis domain={config.domain} tick={{ fill: '#64748b', fontSize: 11 }} stroke="#cbd5e1" />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(1)} ${config.unit}`, config.title]}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={config.stroke}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export function SensorChart() {
  return (
    <div className="sensor-chart-grid">
      <SensorLineCard chartKey="temperature" />
      <SensorLineCard chartKey="humidity" />
    </div>
  )
}
