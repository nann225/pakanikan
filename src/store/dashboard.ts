import { create } from 'zustand'
import { DeviceStatus, SensorData, FeedingRecord } from '../lib/supabase'

interface DashboardStore {
  deviceStatus: DeviceStatus | null
  sensorData: SensorData[]
  feedingHistory: FeedingRecord[]
  mqttConnected: boolean
  loading: boolean
  error: string | null

  setDeviceStatus: (status: DeviceStatus) => void
  setSensorData: (data: SensorData[]) => void
  addSensorData: (data: SensorData) => void
  addFeedingRecord: (record: FeedingRecord) => void
  setFeedingHistory: (history: FeedingRecord[]) => void
  setMQTTConnected: (connected: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearData: () => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  deviceStatus: null,
  sensorData: [],
  feedingHistory: [],
  mqttConnected: false,
  loading: false,
  error: null,

  setDeviceStatus: (status) =>
    set({ deviceStatus: status }),

  setSensorData: (data) =>
    set({ sensorData: data }),

  addSensorData: (data) =>
    set((state) => ({
      sensorData: [data, ...state.sensorData].slice(0, 100), // Keep last 100 readings
    })),

  addFeedingRecord: (record) =>
    set((state) => ({
      feedingHistory: [record, ...state.feedingHistory].slice(0, 50), // Keep last 50 records
    })),

  setFeedingHistory: (history) =>
    set({ feedingHistory: history }),

  setMQTTConnected: (connected) =>
    set({ mqttConnected: connected }),

  setLoading: (loading) =>
    set({ loading }),

  setError: (error) =>
    set({ error }),

  clearData: () =>
    set({
      deviceStatus: null,
      sensorData: [],
      feedingHistory: [],
      mqttConnected: false,
      error: null,
    }),
}))
