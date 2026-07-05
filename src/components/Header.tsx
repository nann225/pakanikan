import { useDashboardStore } from '../store/dashboard'
import { MdSignalCellularAlt, MdSignalCellularNoSim, MdCircle, MdSettings, MdPause } from 'react-icons/md'
import './Header.css'

export function Header() {
  const mqttConnected = useDashboardStore((state) => state.mqttConnected)
  const deviceStatus = useDashboardStore((state) => state.deviceStatus)
  const motorStatus = deviceStatus?.motor_status || 'idle'

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <h1>Fish Feeder Dashboard</h1>
          <p className="subtitle">Real-time Monitoring System</p>
        </div>
        <div className="header-status">
          <div className="status-item">
            <span className="label">MQTT Connection</span>
            <div className={`status-badge ${mqttConnected ? 'connected' : 'disconnected'}`}>
              {mqttConnected ? <MdSignalCellularAlt /> : <MdSignalCellularNoSim />}
              <span>{mqttConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          
          <div className="status-item">
            <span className="label">Device Status</span>
            <div className={`status-badge ${deviceStatus?.is_online ? 'online' : 'offline'}`}>
              <MdCircle className="status-dot" />
              <span>{deviceStatus?.is_online ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          <div className="status-item">
            <span className="label">Motor Status</span>
            <div className={`status-badge ${motorStatus === 'running' ? 'running' : motorStatus === 'error' ? 'error' : 'idle'}`}>
              {motorStatus === 'running' ? <MdSettings className="spinning" /> : <MdPause />}
              <span>{motorStatus}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
