import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '')

// Types for Supabase database
export interface FeedingRecord {
  id?: string
  device_id: number
  timestamp: string
  duration: number
  manual: boolean
  status: 'pending' | 'completed' | 'failed'
  created_at?: string
  updated_at?: string
}

export interface DeviceStatus {
  id?: string
  device_id: number
  is_online: boolean
  battery_level?: number
  last_seen: string
  motor_status: 'idle' | 'running' | 'error'
  created_at?: string
  updated_at?: string
}

export interface SensorData {
  id?: string
  device_id: number
  temperature?: number
  humidity?: number
  water_level?: number
  timestamp: string
  created_at?: string
}
