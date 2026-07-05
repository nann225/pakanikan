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
          } catch (error) {
            console.error('Failed to parse device status:', error)
          }
        })

        // Subscribe to sensor data
        mqttManager.subscribe(`fishfeeder/device/${deviceId}/sensors`, (payload) => {
          try {
            const data = JSON.parse(payload) as SensorData
            addSensorData(data)
          } catch (error) {
            console.error('Failed to parse sensor data:', error)
          }
        })

        // Subscribe to feeding records
        mqttManager.subscribe(`fishfeeder/device/${deviceId}/feeding`, (payload) => {
          try {
            const record = JSON.parse(payload) as FeedingRecord
            addFeedingRecord(record)
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
