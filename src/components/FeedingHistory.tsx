import { useDashboardStore } from '../store/dashboard'
import { format } from 'date-fns'
import { MdCheckCircle, MdSchedule, MdError, MdGamepad, MdTimer } from 'react-icons/md'
import './FeedingHistory.css'

export function FeedingHistory() {
  const feedingHistory = useDashboardStore((state) => state.feedingHistory)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <MdCheckCircle className="icon completed" />
      case 'pending':
        return <MdSchedule className="icon pending" />
      case 'failed':
        return <MdError className="icon failed" />
      default:
        return null
    }
  }

  return (
    <div className="feeding-history">
      <h2>Feeding History</h2>
      
      {feedingHistory.length === 0 ? (
        <p className="no-data">No feeding records yet.</p>
      ) : (
        <div className="history-list">
          {feedingHistory.map((record, index) => (
            <div key={index} className={`history-item status-${record.status}`}>
              <div className="item-status">
                {getStatusIcon(record.status || 'completed')}
              </div>
              
              <div className="item-info">
                <div className="item-time">
                  {format(new Date(record.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                </div>
                <div className="item-details">
                  <span className="duration">
                    <MdTimer /> {record.duration}s
                  </span>
                  <span className="type">
                    {record.manual ? <><MdGamepad /> Manual</> : <><MdSchedule /> Auto</>}
                  </span>
                </div>
              </div>

              <div className={`item-badge status-${record.status}`}>
                {record.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
