import { supabase } from './supabase'

export const DEVICE_ID = import.meta.env.VITE_DEVICE_ID || '00:00:00:00:00:00'

export function validateDeviceId(deviceId: unknown): string {
  if (typeof deviceId !== 'string' && typeof deviceId !== 'number') {
    throw new Error('Device ID tidak valid')
  }

  const normalized = String(deviceId).trim()
  if (!normalized) {
    throw new Error('Device ID kosong')
  }

  return normalized
}

export function parseJsonObject<T>(
  payload: string,
  validate: (value: Record<string, unknown>) => T
): T {
  let parsed: unknown

  try {
    parsed = JSON.parse(payload)
  } catch {
    throw new Error('Payload MQTT bukan JSON valid')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Payload MQTT harus berupa JSON object')
  }

  return validate(parsed as Record<string, unknown>)
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function asTimestamp(value: unknown): string {
  if (typeof value === 'string' && !Number.isNaN(new Date(value).getTime())) {
    return value
  }

  return new Date().toISOString()
}

export async function validateSession(): Promise<void> {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('Konfigurasi Supabase belum lengkap')
  }

  if (import.meta.env.VITE_REQUIRE_AUTH === 'true') {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    if (!data.session) throw new Error('Session tidak valid')
  }
}

export async function logError(message: string, context?: unknown): Promise<void> {
  console.error(message, context)

  try {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      return
    }

    await supabase.from('device_logs').insert({
      device_id: validateDeviceId(DEVICE_ID),
      level: 'ERROR',
      message: context ? `${message}: ${String(context)}` : message,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Gagal menyimpan error log:', error)
  }
}
