import { useDashboardStore } from '../store/dashboard'
import { MdSignalCellularAlt, MdAccessTime, MdBattery80, MdBattery60, MdBattery30, MdBatteryAlert, MdSettings, MdError, MdPause } from 'react-icons/md'
import { format } from 'date-fns'
import './DeviceStatus.css'

export function DeviceStatus() {
  const deviceStatus = useDashboardStore((state) => state.deviceStatus)

  const getBatteryIcon = (level?: number) => {
    if (!level) return <MdBattery80 className="battery-icon" />
    if (level > 60) return <MdBattery80 className="battery-icon high" />
    if (level > 30) return <MdBattery60 className="battery-icon medium" />
    if (level > 10) return <MdBattery30 className="battery-icon low" />
    return <MdBatteryAlert className="battery-icon critical" />
  }

  const getMotorIcon = (status?: string) => {
    switch (status) {
      case 'running':
        return <MdSettings className="motor-icon spinning" />
      case 'error':
        return <MdError className="motor-icon error" />
      default:
        return <MdPause className="motor-icon" />
    }
  }

  if (!deviceStatus) {
    return (
      <div className="device-status">
        <h2>Device Information</h2>
        <p className="no-data">Waiting for device information...</p>
      </div>
    )
  }

  return (
    <div className="device-status">
      <h2>Device Information</h2>
      <div className="status-grid">
        <div className="status-card">
          <div className="card-header">
            <MdSignalCellularAlt className="card-icon" />
            <h3>Connection Status</h3>
          </div>
          <div className={`card-value ${deviceStatus.is_online ? 'online' : 'offline'}`}>
            {deviceStatus.is_online ? 'Online' : 'Offline'}
          </div>
          <p className="card-detail">Device is {deviceStatus.is_online ? 'connected to network' : 'disconnected'}</p>
        </div>

        {deviceStatus.battery_level !== undefined && (
          <div className="status-card">
            <div className="card-header">
              {getBatteryIcon(deviceStatus.battery_level)}
              <h3>Battery Level</h3>
            </div>
            <div className="card-value">{deviceStatus.battery_level}%</div>
            <div className="battery-bar">
              <div 
                className={`battery-fill ${
                  deviceStatus.battery_level > 60 ? 'high' :
                  deviceStatus.battery_level > 30 ? 'medium' : 'low'
                }`}
                style={{
                  width: `${deviceStatus.battery_level}%`
                }}
              />
            </div>
          </div>
        )}

        <div className="status-card">
          <div className="card-header">
            <MdAccessTime className="card-icon" />
            <h3>Last Seen</h3>
          </div>
          <div className="card-value">
            {format(new Date(deviceStatus.last_seen), 'HH:mm:ss')}
          </div>
          <p className="card-detail">
            {format(new Date(deviceStatus.last_seen), 'MMM dd, yyyy')}
          </p>
        </div>

        <div className="status-card">
          <div className="card-header">
            {getMotorIcon(deviceStatus.motor_status)}
            <h3>Motor Status</h3>
          </div>
          <div className={`card-value motor-status-${deviceStatus.motor_status}`}>
            {deviceStatus.motor_status}
          </div>
        </div>
      </div>
    </div>
  )
}
