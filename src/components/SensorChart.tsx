import { useDashboardStore } from '../store/dashboard'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import './SensorChart.css'

export function SensorChart() {
  const sensorData = useDashboardStore((state) => state.sensorData)

  // Format data for recharts
  const chartData = sensorData
    .slice()
    .reverse()
    .map((data) => ({
      time: format(new Date(data.timestamp), 'HH:mm:ss'),
      temperature: data.temperature || 0,
      humidity: data.humidity || 0,
      waterLevel: data.water_level || 0,
    }))
    .slice(0, 50) // Show last 50 data points

  return (
    <div className="sensor-chart">
      <div className="chart-header">
        <h2>Sensor Monitoring</h2>
        <p className="chart-subtitle">Real-time data visualization</p>
      </div>
      
      {sensorData.length === 0 ? (
        <p className="no-data">No sensor data available yet. Waiting for MQTT messages...</p>
      ) : (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart 
              data={chartData} 
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorHumidity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e5e7eb"
                verticalPoints={[]} 
              />
              <XAxis 
                dataKey="time" 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
                stroke="#e5e7eb"
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                stroke="#e5e7eb"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #667eea',
                  borderRadius: '10px',
                  padding: '12px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#1f2937', fontWeight: 600 }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="temperature" 
                stroke="#f59e0b" 
                dot={false}
                strokeWidth={3}
                name="Temperature (°C)"
                isAnimationActive={false}
                fillOpacity={1}
                fill="url(#colorTemp)"
              />
              <Line 
                type="monotone" 
                dataKey="humidity" 
                stroke="#06b6d4" 
                dot={false}
                strokeWidth={3}
                name="Humidity (%)"
                isAnimationActive={false}
                fillOpacity={1}
                fill="url(#colorHumidity)"
              />
              <Line 
                type="monotone" 
                dataKey="waterLevel" 
                stroke="#8b5cf6" 
                dot={false}
                strokeWidth={3}
                name="Water Level"
                isAnimationActive={false}
                fillOpacity={1}
                fill="url(#colorWater)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
