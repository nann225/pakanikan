import { useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { FeedingControl } from './components/FeedingControl'
import { DeviceStatus } from './components/DeviceStatus'
import { SensorChart } from './components/SensorChart'
import { FeedingHistory } from './components/FeedingHistory'
import { useDashboardStore } from './store/dashboard'
import { mqttManager } from './lib/mqtt'
import { supabase, FeedingRecord, DeviceStatus as IDeviceStatus, SensorData } from './lib/supabase'
import { DEVICE_ID, asNumber, asTimestamp, logError, parseJsonObject, validateDeviceId } from './lib/monitoring'
import './App.css'

// Helper function to save device status to Supabase
async function saveDeviceStatus(status: IDeviceStatus) {
  try {
    const deviceId = validateDeviceId(status.device_id)

    // Check if device exists
    const { data: existing, error: lookupError } = await supabase
      .from('device_status')
      .select('id')
      .eq('device_id', deviceId)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('device_status')
        .update({
          motor_status: status.motor_status,
          battery_level: status.battery_level,
          last_seen: new Date().toISOString(),
          is_online: status.is_online ?? true,
        })
        .eq('device_id', deviceId)

      if (error) throw error
    } else {
      // Create new record
      const { error } = await supabase
        .from('device_status')
        .insert({
          device_id: deviceId,
          motor_status: status.motor_status,
          battery_level: status.battery_level,
          last_seen: new Date().toISOString(),
          is_online: status.is_online ?? true,
        })

      if (error) throw error
    }
  } catch (error) {
    await logError('Error saving device status', error)
  }
}

// Helper function to save sensor data to Supabase
async function saveSensorData(data: SensorData) {
  try {
    const deviceId = validateDeviceId(data.device_id)

    const { error } = await supabase
      .from('sensor_data')
      .insert({
        device_id: deviceId,
        temperature: data.temperature,
        humidity: data.humidity,
        water_level: data.water_level,
        timestamp: data.timestamp || new Date().toISOString(),
      })

    if (error) throw error
  } catch (error) {
    await logError('Error saving sensor data', error)
  }
}

// Helper function to save feeding record to Supabase
async function saveFeedingRecord(record: FeedingRecord) {
  try {
    const deviceId = validateDeviceId(record.device_id)

    const { error } = await supabase
      .from('feeding_records')
      .insert({
        device_id: deviceId,
        duration: record.duration,
        manual: record.type === 'manual',
        status: 'completed',
        timestamp: record.timestamp || new Date().toISOString(),
      })

    if (error) throw error
  } catch (error) {
    await logError('Error saving feeding record', error)
  }
}

function validateStatusPayload(value: Record<string, unknown>): IDeviceStatus {
  const statusText = typeof value.status === 'string' ? value.status : undefined

  return {
    device_id: validateDeviceId(value.device_id || DEVICE_ID),
    status: statusText,
    is_online: value.is_online === false || statusText === 'offline' ? false : true,
    battery_level: value.battery_level === undefined ? undefined : asNumber(value.battery_level),
    signal_strength: value.signal_strength === undefined ? undefined : asNumber(value.signal_strength),
    last_seen: asTimestamp(value.timestamp || value.last_seen),
    motor_status: value.motor_status === 'running' || value.motor_status === 'error' ? value.motor_status : 'idle',
  }
}

function validateSensorPayload(value: Record<string, unknown>): SensorData {
  return {
    device_id: validateDeviceId(value.device_id || DEVICE_ID),
    temperature: asNumber(value.temperature),
    humidity: asNumber(value.humidity),
    water_level: value.water_level === undefined ? undefined : asNumber(value.water_level),
    timestamp: asTimestamp(value.timestamp),
  }
}

function validateFeedingPayload(value: Record<string, unknown>): FeedingRecord {
  const duration = asNumber(value.duration, 5)
  if (duration <= 0 || duration > 3600) {
    throw new Error('Durasi feeding tidak valid')
  }

  return {
    device_id: validateDeviceId(value.device_id || DEVICE_ID),
    duration,
    type: value.type === 'scheduled' ? 'scheduled' : 'manual',
    manual: value.type !== 'scheduled',
    status: value.status === 'failed' || value.status === 'pending' ? value.status : 'completed',
    timestamp: asTimestamp(value.timestamp),
  }
}

function formatMetric(value: number | undefined, suffix: string): string {
  if (value === undefined || Number.isNaN(value)) return '--'
  return `${value.toFixed(1)}${suffix}`
}

function App() {
  const {
    deviceStatus,
    sensorData,
    feedingHistory,
    mqttConnected,
    error,
    setMQTTConnected,
    setDeviceStatus,
    addSensorData,
    addFeedingRecord,
    setError,
  } = useDashboardStore()

  const initRef = useRef(false)
  const deviceId = validateDeviceId(DEVICE_ID)
  const latestSensor = sensorData[0]
  const today = new Date().toDateString()
  const feedsToday = feedingHistory.filter((record) => new Date(record.timestamp).toDateString() === today).length
  const nextSchedule = import.meta.env.VITE_NEXT_FEED_TIME || 'Belum dijadwalkan'

  // Initialize MQTT connection and subscriptions
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const initializeApp = async () => {
      try {
        // Connect to MQTT
        await mqttManager.connect()
        setMQTTConnected(true)

        // Subscribe to device status updates
        mqttManager.subscribe(`fishfeeder/device/${deviceId}/status`, (payload) => {
          try {
            const status = parseJsonObject(payload, validateStatusPayload)
            setDeviceStatus(status)
            saveDeviceStatus(status)  // Save to Supabase
          } catch (error) {
            logError('Failed to parse device status', error)
          }
        })

        // Subscribe to sensor data
        mqttManager.subscribe(`fishfeeder/device/${deviceId}/sensors`, (payload) => {
          try {
            const data = parseJsonObject(payload, validateSensorPayload)
            addSensorData(data)
            saveSensorData(data)  // Save to Supabase
          } catch (error) {
            logError('Failed to parse sensor data', error)
          }
        })

        // Subscribe to feeding records
        mqttManager.subscribe(`fishfeeder/device/${deviceId}/feeding`, (payload) => {
          try {
            const record = parseJsonObject(payload, validateFeedingPayload)
            addFeedingRecord(record)
            saveFeedingRecord(record)  // Save to Supabase
          } catch (error) {
            logError('Failed to parse feeding record', error)
          }
        })

        // Listen to connection changes
        mqttManager.onConnectionChange((connected) => {
          setMQTTConnected(connected)
          if (!connected) {
            setError('MQTT connection lost. Attempting to reconnect...')
          } else {
            setError(null)
          }
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        setError(`Failed to initialize MQTT: ${message}`)
        logError('Initialization error', error)
      }
    }

    initializeApp()

    return () => {
      // Cleanup is handled by MQTT manager
    }
  }, [deviceId, setMQTTConnected, setDeviceStatus, addSensorData, addFeedingRecord, setError])

  // Load historical data from Supabase on mount
  useEffect(() => {
    const loadHistoricalData = async () => {
      try {
        // Fetch recent feeding records
        const { data: feedingData, error: feedingError } = await supabase
          .from('feeding_records')
          .select('*')
          .eq('device_id', deviceId)
          .order('timestamp', { ascending: false })
          .limit(50)

        if (feedingError) {
          await logError('Error fetching feeding records', feedingError.message)
        } else if (feedingData) {
          feedingData.forEach((record) => {
            addFeedingRecord({
              ...record,
              timestamp: record.timestamp,
            })
          })
        }

        // Fetch recent sensor data
        const { data: sensorData, error: sensorError } = await supabase
          .from('sensor_data')
          .select('*')
          .eq('device_id', deviceId)
          .order('timestamp', { ascending: false })
          .limit(100)

        if (sensorError) {
          await logError('Error fetching sensor data', sensorError.message)
        } else if (sensorData) {
          sensorData.reverse().forEach((data) => {
            addSensorData({
              ...data,
              timestamp: data.timestamp,
            })
          })
        }
      } catch (error) {
        await logError('Error loading historical data', error)
      }
    }

    loadHistoricalData()
  }, [deviceId, addFeedingRecord, addSensorData])

  return (
    <div className="app">
      <Header />
      
      <main className="main-container">
        {error && <div className="error-banner">{error}</div>}

        <section className="summary-grid">
          <div className="metric-card metric-temperature">
            <span className="metric-label">Suhu</span>
            <strong>{formatMetric(latestSensor?.temperature, '°C')}</strong>
            <small>Realtime dari sensor ESP32</small>
          </div>

          <div className="metric-card metric-humidity">
            <span className="metric-label">Kelembapan</span>
            <strong>{formatMetric(latestSensor?.humidity, '%')}</strong>
            <small>Update terakhir {latestSensor ? new Date(latestSensor.timestamp).toLocaleTimeString('id-ID') : '--'}</small>
          </div>

          <div className="metric-card">
            <span className="metric-label">Pakan Hari Ini</span>
            <strong>{feedsToday}</strong>
            <small>Total log pemberian pakan</small>
          </div>

          <div className="metric-card">
            <span className="metric-label">Jadwal Berikutnya</span>
            <strong className="schedule-value">{nextSchedule}</strong>
            <small>Konfigurasi jadwal aktif</small>
          </div>
        </section>

        <div className="dashboard-grid">
          <div className="panel-stack">
            <FeedingControl />
            <DeviceStatus />
          </div>

          <div className="panel-stack">
            <div className="connection-card">
              <div>
                <span className="metric-label">Status Koneksi ESP32</span>
                <strong className={deviceStatus?.is_online && mqttConnected ? 'online-text' : 'offline-text'}>
                  {deviceStatus?.is_online && mqttConnected ? 'ONLINE' : 'OFFLINE'}
                </strong>
              </div>
              <span className={`connection-indicator ${deviceStatus?.is_online && mqttConnected ? 'online' : 'offline'}`} />
            </div>
            <SensorChart />
          </div>
        </div>

        <div className="full-width">
          <FeedingHistory />
        </div>
      </main>

      <footer className="app-footer">
        <p>Fish Feeder Dashboard • Real-time Monitoring via MQTT • Powered by React + Vite + HiveMQ</p>
      </footer>
    </div>
  )
}

export default App
