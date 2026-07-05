import { useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { FeedingControl } from './components/FeedingControl'
import { DeviceStatus } from './components/DeviceStatus'
import { SensorChart } from './components/SensorChart'
import { FeedingHistory } from './components/FeedingHistory'
import { useDashboardStore } from './store/dashboard'
import { mqttManager } from './lib/mqtt'
import { supabase, FeedingRecord, DeviceStatus as IDeviceStatus, SensorData } from './lib/supabase'
import './App.css'

// Helper function to save device status to Supabase
async function saveDeviceStatus(status: IDeviceStatus) {
  try {
    // Check if device exists
    const { data: existing } = await supabase
      .from('device_status')
      .select('id')
      .eq('device_id', status.device_id)
      .single()

    if (existing) {
      // Update existing record
      await supabase
        .from('device_status')
        .update({
          motor_status: status.motor_status,
          battery_level: status.battery_level,
          last_seen: new Date().toISOString(),
          is_online: status.status === 'online',
        })
        .eq('device_id', status.device_id)
    } else {
      // Create new record
      await supabase
        .from('device_status')
        .insert({
          device_id: parseInt(status.device_id as unknown as string),
          motor_status: status.motor_status,
          battery_level: status.battery_level,
          last_seen: new Date().toISOString(),
          is_online: status.status === 'online',
        })
    }
  } catch (error) {
    console.error('Error saving device status:', error)
  }
}

// Helper function to save sensor data to Supabase
async function saveSensorData(data: SensorData) {
  try {
    await supabase
      .from('sensor_data')
      .insert({
        device_id: parseInt(data.device_id as unknown as string),
        temperature: data.temperature,
        humidity: data.humidity,
        water_level: data.water_level,
        timestamp: data.timestamp || new Date().toISOString(),
      })
  } catch (error) {
    console.error('Error saving sensor data:', error)
  }
}

// Helper function to save feeding record to Supabase
async function saveFeedingRecord(record: FeedingRecord) {
  try {
    await supabase
      .from('feeding_records')
      .insert({
        device_id: parseInt(record.device_id as unknown as string),
        duration: record.duration,
        manual: record.type === 'manual',
        status: 'completed',
        timestamp: record.timestamp || new Date().toISOString(),
      })
  } catch (error) {
    console.error('Error saving feeding record:', error)
  }
}

function App() {
  const {
    setMQTTConnected,
    setDeviceStatus,
    addSensorData,
    addFeedingRecord,
    setError,
  } = useDashboardStore()

  const initRef = useRef(false)
  const deviceId = import.meta.env.VITE_DEVICE_ID || '1'

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
            const status = JSON.parse(payload) as IDeviceStatus
            setDeviceStatus(status)
            saveDeviceStatus(status)  // Save to Supabase
          } catch (error) {
            console.error('Failed to parse device status:', error)
          }
        })

        // Subscribe to sensor data
        mqttManager.subscribe(`fishfeeder/device/${deviceId}/sensors`, (payload) => {
          try {
            const data = JSON.parse(payload) as SensorData
            addSensorData(data)
            saveSensorData(data)  // Save to Supabase
          } catch (error) {
            console.error('Failed to parse sensor data:', error)
          }
        })

        // Subscribe to feeding records
        mqttManager.subscribe(`fishfeeder/device/${deviceId}/feeding`, (payload) => {
          try {
            const record = JSON.parse(payload) as FeedingRecord
            addFeedingRecord(record)
            saveFeedingRecord(record)  // Save to Supabase
          } catch (error) {
            console.error('Failed to parse feeding record:', error)
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
        console.error('Initialization error:', error)
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
          console.error('Error fetching feeding records:', feedingError)
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
          console.error('Error fetching sensor data:', sensorError)
        } else if (sensorData) {
          sensorData.reverse().forEach((data) => {
            addSensorData({
              ...data,
              timestamp: data.timestamp,
            })
          })
        }
      } catch (error) {
        console.error('Error loading historical data:', error)
      }
    }

    loadHistoricalData()
  }, [deviceId, addFeedingRecord, addSensorData])

  return (
    <div className="app">
      <Header />
      
      <main className="main-container">
        <div className="dashboard-grid">
          <div className="column">
            <FeedingControl />
            <DeviceStatus />
          </div>
          
          <div className="column">
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
