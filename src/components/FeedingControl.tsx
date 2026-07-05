import { useState } from 'react'
import { useDashboardStore } from '../store/dashboard'
import { mqttManager } from '../lib/mqtt'
import { MdPlayArrow, MdStop, MdTimer } from 'react-icons/md'
import './FeedingControl.css'

export function FeedingControl() {
  const [duration, setDuration] = useState(5)
  const [isFeeding, setIsFeeding] = useState(false)
  const mqttConnected = useDashboardStore((state) => state.mqttConnected)
  const deviceId = import.meta.env.VITE_DEVICE_ID || '1'

  const handleFeed = () => {
    if (!mqttConnected) {
      alert('MQTT tidak terhubung')
      return
    }

    const feedCommand = {
      device_id: deviceId,
      feed: true,
      duration: duration,
      timestamp: new Date().toISOString(),
    }

    mqttManager.publish(
      `fishfeeder/device/${deviceId}/feed`,
      JSON.stringify(feedCommand)
    )

    setIsFeeding(true)
    setTimeout(() => setIsFeeding(false), duration * 1000 + 500)
  }

  return (
    <div className="feeding-control">
      <h2>Manual Feeding</h2>
      <div className="control-content">
        <div className="duration-setting">
          <label htmlFor="duration">
            <MdTimer className="label-icon" />
            Duration
          </label>
          <div className="input-wrapper">
            <input
              type="number"
              id="duration"
              min="1"
              max="60"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              disabled={isFeeding}
            />
            <span className="unit">seconds</span>
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
              <span>Feeding...</span>
            </>
          ) : (
            <>
              <MdPlayArrow className="button-icon" />
              <span>Feed Now</span>
            </>
          )}
        </button>

        {!mqttConnected && (
          <div className="warning">
            <span>⚠️</span>
            <span>MQTT disconnected. Waiting to reconnect...</span>
          </div>
        )}
      </div>
    </div>
  )
}
