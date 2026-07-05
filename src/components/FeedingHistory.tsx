import { useMemo, useState } from 'react'
import { useDashboardStore } from '../store/dashboard'
import { format } from 'date-fns'
import { MdCheckCircle, MdSchedule, MdError, MdSearch, MdChevronLeft, MdChevronRight } from 'react-icons/md'
import './FeedingHistory.css'

const PAGE_SIZE = 8

export function FeedingHistory() {
  const feedingHistory = useDashboardStore((state) => state.feedingHistory)
  const sensorData = useDashboardStore((state) => state.sensorData)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const rows = useMemo(() => {
    return feedingHistory.map((record) => {
      const recordTime = new Date(record.timestamp).getTime()
      const nearestSensor = sensorData.reduce((nearest, sensor) => {
        const distance = Math.abs(new Date(sensor.timestamp).getTime() - recordTime)
        if (!nearest || distance < nearest.distance) {
          return { sensor, distance }
        }
        return nearest
      }, null as null | { sensor: typeof sensorData[number]; distance: number })

      return {
        ...record,
        temperature: nearestSensor?.sensor.temperature,
        humidity: nearestSensor?.sensor.humidity,
      }
    })
  }, [feedingHistory, sensorData])

  const filteredRows = rows.filter((record) => {
    const haystack = [
      format(new Date(record.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      record.manual ? 'manual' : 'otomatis',
      record.status || 'completed',
      record.temperature?.toString() || '',
      record.humidity?.toString() || '',
    ].join(' ').toLowerCase()

    return haystack.includes(search.trim().toLowerCase())
  })

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const getStatusIcon = (status = 'completed') => {
    switch (status) {
      case 'completed':
        return <MdCheckCircle className="status-icon completed" />
      case 'pending':
        return <MdSchedule className="status-icon pending" />
      case 'failed':
        return <MdError className="status-icon failed" />
      default:
        return <MdSchedule className="status-icon pending" />
    }
  }

  const updateSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="feeding-history">
      <div className="history-header">
        <div>
          <h2>Riwayat Pemberian Pakan</h2>
          <p>Log command, status, dan kondisi sensor saat pemberian pakan.</p>
        </div>
        <label className="search-box">
          <MdSearch />
          <input
            type="search"
            placeholder="Cari riwayat..."
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
          />
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jam</th>
              <th>Jenis</th>
              <th>Status</th>
              <th>Suhu</th>
              <th>Kelembapan</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-cell">Belum ada riwayat pemberian pakan.</td>
              </tr>
            ) : (
              paginatedRows.map((record, index) => (
                <tr key={`${record.timestamp}-${index}`}>
                  <td>{format(new Date(record.timestamp), 'yyyy-MM-dd')}</td>
                  <td>{format(new Date(record.timestamp), 'HH:mm:ss')}</td>
                  <td>{record.manual ? 'Manual' : 'Otomatis'}</td>
                  <td>
                    <span className={`table-badge status-${record.status || 'completed'}`}>
                      {getStatusIcon(record.status)}
                      {record.status || 'completed'}
                    </span>
                  </td>
                  <td>{record.temperature === undefined ? '--' : `${record.temperature.toFixed(1)} C`}</td>
                  <td>{record.humidity === undefined ? '--' : `${record.humidity.toFixed(1)}%`}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span>
          Menampilkan {paginatedRows.length} dari {filteredRows.length} data
        </span>
        <div className="pagination-actions">
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
            <MdChevronLeft />
          </button>
          <strong>{currentPage} / {totalPages}</strong>
          <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
            <MdChevronRight />
          </button>
        </div>
      </div>
    </div>
  )
}
