import { useState } from 'react'
import { useDashboardStore } from '../store/dashboard'
import { mqttManager } from '../lib/mqtt'
import { supabase } from '../lib/supabase'
import { DEVICE_ID, logError, validateDeviceId, validateSession } from '../lib/monitoring'
import { MdPlayArrow, MdStop, MdTimer } from 'react-icons/md'
import './FeedingControl.css'

export function FeedingControl() {
  const [duration, setDuration] = useState(5)
  const [isFeeding, setIsFeeding] = useState(false)
  const mqttConnected = useDashboardStore((state) => state.mqttConnected)
  const addFeedingRecord = useDashboardStore((state) => state.addFeedingRecord)
  const setError = useDashboardStore((state) => state.setError)
  const deviceId = validateDeviceId(DEVICE_ID)

  const handleFeed = async () => {
    try {
      setError(null)

      if (!mqttConnected || !mqttManager.isConnected()) {
        throw new Error('MQTT tidak terhubung')
      }

      await validateSession()

      if (!Number.isFinite(duration) || duration < 1 || duration > 60) {
        throw new Error('Durasi pakan harus 1 sampai 60 detik')
      }

      const timestamp = new Date().toISOString()
      const feedCommand = {
        device_id: deviceId,
        action: 'feed',
        duration,
        timestamp,
      }

      JSON.stringify(feedCommand)
      setIsFeeding(true)

      const { error } = await supabase.from('feeding_records').insert({
        device_id: deviceId,
        duration,
        manual: true,
        status: 'pending',
        timestamp,
      })

      if (error) throw error

      addFeedingRecord({
        device_id: deviceId,
        duration,
        manual: true,
        type: 'manual',
        status: 'pending',
        timestamp,
      })

      mqttManager.publish(
        `fishfeeder/device/${deviceId}/command`,
        JSON.stringify(feedCommand)
      )

      window.setTimeout(() => {
        setIsFeeding(false)
      }, duration * 1000 + 500)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memberi pakan'
      setIsFeeding(false)
      setError(message)
      await logError('Manual feed failed', message)
    }
  }

  return (
    <div className="feeding-control">
      <h2>Manual Feed</h2>
      <div className="control-content">
        <div className="duration-setting">
          <label htmlFor="duration">
            <MdTimer className="label-icon" />
            Durasi
          </label>
          <div className="input-wrapper">
            <input
              type="number"
              id="duration"
              min="1"
              max="60"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              disabled={isFeeding}
            />
            <span className="unit">detik</span>
          </div>
        </div>

        <button
          className={`feed-button ${isFeeding ? 'feeding' : ''}`}
          onClick={handleFeed}
          disabled={isFeeding || !mqttConnected}
        >
          {isFeeding ? (
            <>
              <MdStop className="button-icon" />
              <span>Mengirim...</span>
            </>
          ) : (
            <>
              <MdPlayArrow className="button-icon" />
              <span>BERI PAKAN SEKARANG</span>
            </>
          )}
        </button>

        {!mqttConnected && (
          <div className="warning">
            <span>MQTT disconnected. Waiting to reconnect...</span>
          </div>
        )}
      </div>
    </div>
  )
}
