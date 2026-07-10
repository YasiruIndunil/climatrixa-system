import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/useAuth'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../components/Toast'
import api from '../../utils/api'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'

export default function PublicExport() {
  const { user } = useAuth()
  const { dark } = useTheme()
  const toast = useToast()

  const [readingsForm, setReadingsForm] = useState({ sensor_id: '', date_from: '', date_to: '', format: 'csv' })
  const [alertsForm, setAlertsForm]     = useState({ sensor_id: '', date_from: '', date_to: '', format: 'csv' })
  const [exportingR, setExportingR]     = useState(false)
  const [exportingA, setExportingA]     = useState(false)

  // Only fetch sensors assigned to this user
  const { data: mySensors } = useQuery({
    queryKey: ['my-sensors', user?.id],
    queryFn: () => api.get(`/access/users/${user.id}/sensors`).then(r => r.data),
    enabled: !!user?.id,
  })
  const sensors = mySensors?.map(row => row.sensors).filter(Boolean) ?? []

  const sub  = dark ? 'text-gray-500' : 'text-gray-400'
  const head = dark ? 'text-white'    : 'text-gray-900'
  const card = `rounded-2xl border shadow-sm ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`

  const inputClass = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
    dark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900'
  }`
  const selectClass = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
    dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
  }`
  const labelClass = `block text-xs font-semibold uppercase tracking-wide mb-1.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`
  const radioClass = (active) => `flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer transition-all text-sm font-medium ${
    active
      ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400'
      : dark ? 'border-gray-700 text-gray-400 hover:border-gray-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'
  }`

  const handleReadingsExport = async () => {
    if (!readingsForm.sensor_id) {
      toast('Please select a sensor', 'error')
      return
    }
    setExportingR(true)
    try {
      const params = new URLSearchParams({ sensor_id: readingsForm.sensor_id })
      if (readingsForm.date_from) params.append('from', readingsForm.date_from)
      if (readingsForm.date_to)   params.append('to',   readingsForm.date_to)
      const res = await api.get(`/readings/export?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a   = document.createElement('a')
      a.href     = url
      a.download = `climatrixa_readings_${readingsForm.sensor_id}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast('Readings downloaded successfully')
    } catch {
      toast('Export failed — please try again', 'error')
    } finally { setExportingR(false) }
  }

  const handleAlertsExport = async () => {
    if (!alertsForm.sensor_id) {
      toast('Please select a sensor', 'error')
      return
    }
    setExportingA(true)
    try {
      const params = new URLSearchParams({ sensor_id: alertsForm.sensor_id })
      if (alertsForm.date_from) params.append('from', alertsForm.date_from)
      if (alertsForm.date_to)   params.append('to',   alertsForm.date_to)
      const res = await api.get(`/alerts/events/export?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a   = document.createElement('a')
      a.href     = url
      a.download = `climatrixa_alerts_${alertsForm.sensor_id}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast('Alert events downloaded successfully')
    } catch {
      toast('Alert events export not yet available', 'error')
    } finally { setExportingA(false) }
  }

  return (
    <div className={`p-6 ${dark ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-xl font-bold ${head}`}>Export Data</h1>
        <p className={`text-sm mt-0.5 ${sub}`}>
          Download readings and alert events for your assigned sensors
          {sensors.length > 0 && <span className="text-teal-500 font-medium"> · {sensors.length} sensor{sensors.length !== 1 ? 's' : ''} available</span>}
        </p>
      </div>

      {sensors.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <Download size={36} className={`mx-auto mb-3 ${dark ? 'text-gray-700' : 'text-gray-200'}`}/>
          <p className={`text-sm font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>No sensors assigned</p>
          <p className={`text-xs mt-1 ${sub}`}>Contact your administrator to get sensor access before exporting</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">

          {/* Readings export */}
          <div className={card}>
            <div className={`px-5 py-4 border-b flex items-center gap-3 ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-teal-500/10' : 'bg-teal-50'}`}>
                <FileSpreadsheet size={17} className="text-teal-500"/>
              </div>
              <div>
                <h2 className={`font-semibold text-sm ${head}`}>Sensor readings</h2>
                <p className={`text-xs ${sub}`}>Temperature, humidity, AQI, pressure</p>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className={labelClass}>Sensor <span className="text-red-500">*</span></label>
                <select className={selectClass}
                  value={readingsForm.sensor_id}
                  onChange={e => setReadingsForm(f => ({ ...f, sensor_id: e.target.value }))}>
                  <option value="">Select a sensor...</option>
                  {sensors.map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.location}</option>
                  ))}
                </select>
              </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>From date</label>
                    <input
                      type="date"
                      className={`${inputClass} w-full`}
                      value={readingsForm.date_from}
                      onChange={e =>
                        setReadingsForm(f => ({ ...f, date_from: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>To date</label>
                    <input
                      type="date"
                      className={`${inputClass} w-full`}
                      value={readingsForm.date_to}
                      onChange={e =>
                        setReadingsForm(f => ({ ...f, date_to: e.target.value }))
                      }
                    />
                  </div>
                </div>
              <div>
                <label className={labelClass}>Format</label>
                <div className="flex gap-3">
                  {['csv', 'pdf'].map(f => (
                    <label key={f} className={radioClass(readingsForm.format === f)}>
                      <input type="radio" className="sr-only" value={f}
                        checked={readingsForm.format === f}
                        onChange={() => setReadingsForm(p => ({ ...p, format: f }))}/>
                      {f.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleReadingsExport} disabled={exportingR}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
                <Download size={16}/>
                {exportingR ? 'Downloading...' : 'Download readings'}
              </button>
            </div>
          </div>

          {/* Alert events export */}
          <div className={card}>
            <div className={`px-5 py-4 border-b flex items-center gap-3 ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                <FileText size={17} className="text-orange-500"/>
              </div>
              <div>
                <h2 className={`font-semibold text-sm ${head}`}>Alert events</h2>
                <p className={`text-xs ${sub}`}>Triggered alerts and acknowledgements</p>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className={labelClass}>Sensor <span className="text-red-500">*</span></label>
                <select className={selectClass}
                  value={alertsForm.sensor_id}
                  onChange={e => setAlertsForm(f => ({ ...f, sensor_id: e.target.value }))}>
                  <option value="">Select a sensor...</option>
                  {sensors.map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.location}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>From date</label>
                  <input type="date" className={inputClass}
                    value={alertsForm.date_from}
                    onChange={e => setAlertsForm(f => ({ ...f, date_from: e.target.value }))}/>
                </div>
                <div>
                  <label className={labelClass}>To date</label>
                  <input type="date" className={inputClass}
                    value={alertsForm.date_to}
                    onChange={e => setAlertsForm(f => ({ ...f, date_to: e.target.value }))}/>
                </div>
              </div>
              <div>
                <label className={labelClass}>Format</label>
                <div className="flex gap-3">
                  {['csv', 'pdf'].map(f => (
                    <label key={f} className={radioClass(alertsForm.format === f)}>
                      <input type="radio" className="sr-only" value={f}
                        checked={alertsForm.format === f}
                        onChange={() => setAlertsForm(p => ({ ...p, format: f }))}/>
                      {f.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleAlertsExport} disabled={exportingA}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
                <Download size={16}/>
                {exportingA ? 'Downloading...' : 'Download alert events'}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
