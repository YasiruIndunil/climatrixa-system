import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../components/Toast'
import PageWrapper, { Card, CardHeader, PageTitle, ThemedSelect, PrimaryButton, FieldLabel } from '../../components/PageWrapper'
import api from '../../utils/api'

export default function Export() {
  const { dark } = useTheme()
  const toast = useToast()

  const [readings, setReadings] = useState({ sensor_id: '', date_from: '', date_to: '', format: 'csv' })
  const [alerts, setAlerts]     = useState({ sensor_id: '', date_from: '', date_to: '', format: 'csv' })
  const [exportingR, setExportingR] = useState(false)
  const [exportingA, setExportingA] = useState(false)

  const { data: sensors } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => api.get('/sensors/').then(r => r.data)
  })

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(new Blob([blob]))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleReadings = async () => {
    setExportingR(true)
    try {
      const params = new URLSearchParams()
      if (readings.sensor_id) params.append('sensor_id', readings.sensor_id)
      if (readings.date_from) params.append('from', readings.date_from)
      if (readings.date_to)   params.append('to', readings.date_to)
      params.append('format', readings.format)
      const res = await api.get(`/readings/export?${params}`, { responseType: 'blob' })
      const ext = readings.format === 'pdf' ? 'pdf' : 'csv'
      downloadBlob(res.data, `readings_${new Date().toISOString().slice(0,10)}.${ext}`)
      toast('Readings exported successfully')
    } catch {
      toast('Failed to export readings', 'error')
    } finally { setExportingR(false) }
  }

  const handleAlerts = async () => {
    setExportingA(true)
    try {
      const params = new URLSearchParams()
      if (alerts.sensor_id) params.append('sensor_id', alerts.sensor_id)
      if (alerts.date_from) params.append('from', alerts.date_from)
      if (alerts.date_to)   params.append('to', alerts.date_to)
      params.append('format', alerts.format)
      const res = await api.get(`/alerts/events/export?${params}`, { responseType: 'blob' })
      const ext = alerts.format === 'pdf' ? 'pdf' : 'csv'
      downloadBlob(res.data, `alert_events_${new Date().toISOString().slice(0,10)}.${ext}`)
      toast('Alert events exported successfully')
    } catch {
      toast('Failed to export alert events', 'error')
    } finally { setExportingA(false) }
  }

  const inputClass = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
    dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
  }`

  const FormatToggle = ({ value, onChange }) => (
    <div className="flex gap-3">
      {[{ v: 'csv', l: 'CSV' }, { v: 'pdf', l: 'PDF Report' }].map(({ v, l }) => (
        <label key={v} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer transition-all text-sm font-medium ${
          value === v
            ? 'border-teal-500 bg-teal-50 text-teal-700'
            : dark ? 'border-gray-700 text-gray-400 hover:border-gray-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'
        }`}>
          <input type="radio" className="sr-only" value={v} checked={value === v} onChange={() => onChange(v)} />
          {l}
        </label>
      ))}
    </div>
  )

  return (
    <PageWrapper>
      <PageTitle title="Export data" subtitle="Download sensor readings and alert events as CSV or PDF" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Readings export */}
        <Card>
          <CardHeader>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-teal-500/10' : 'bg-teal-50'}`}>
              <FileSpreadsheet size={17} className="text-teal-500" />
            </div>
            <div>
              <h2 className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-800'}`}>Sensor readings</h2>
              <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Temperature, humidity, AQI, pressure</p>
            </div>
          </CardHeader>
          <div className="px-5 py-5 space-y-4">
            <div>
              <FieldLabel>Sensor</FieldLabel>
              <ThemedSelect value={readings.sensor_id} onChange={e => setReadings(f => ({ ...f, sensor_id: e.target.value }))}>
                <option value="">All sensors</option>
                {sensors?.map(s => <option key={s.id} value={s.id}>{s.name} — {s.location}</option>)}
              </ThemedSelect>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>From date</FieldLabel>
                <input type="date" className={inputClass} value={readings.date_from} onChange={e => setReadings(f => ({ ...f, date_from: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>To date</FieldLabel>
                <input type="date" className={inputClass} value={readings.date_to} onChange={e => setReadings(f => ({ ...f, date_to: e.target.value }))} />
              </div>
            </div>
            <div>
              <FieldLabel>Format</FieldLabel>
              <FormatToggle value={readings.format} onChange={v => setReadings(f => ({ ...f, format: v }))} />
            </div>
            <PrimaryButton onClick={handleReadings} disabled={exportingR} className="w-full justify-center">
              <Download size={16} />
              {exportingR ? 'Exporting...' : `Download readings ${readings.format.toUpperCase()}`}
            </PrimaryButton>
          </div>
        </Card>

        {/* Alert events export */}
        <Card>
          <CardHeader>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
              <FileText size={17} className="text-orange-500" />
            </div>
            <div>
              <h2 className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-800'}`}>Alert events</h2>
              <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Triggered alerts and acknowledgements</p>
            </div>
          </CardHeader>
          <div className="px-5 py-5 space-y-4">
            <div>
              <FieldLabel>Sensor</FieldLabel>
              <ThemedSelect value={alerts.sensor_id} onChange={e => setAlerts(f => ({ ...f, sensor_id: e.target.value }))}>
                <option value="">All sensors</option>
                {sensors?.map(s => <option key={s.id} value={s.id}>{s.name} — {s.location}</option>)}
              </ThemedSelect>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>From date</FieldLabel>
                <input type="date" className={inputClass} value={alerts.date_from} onChange={e => setAlerts(f => ({ ...f, date_from: e.target.value }))} />
              </div>
              <div>
                <FieldLabel>To date</FieldLabel>
                <input type="date" className={inputClass} value={alerts.date_to} onChange={e => setAlerts(f => ({ ...f, date_to: e.target.value }))} />
              </div>
            </div>
            <div>
              <FieldLabel>Format</FieldLabel>
              <FormatToggle value={alerts.format} onChange={v => setAlerts(f => ({ ...f, format: v }))} />
            </div>
            <button
              onClick={handleAlerts}
              disabled={exportingA}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <Download size={16} />
              {exportingA ? 'Exporting...' : `Download alert events ${alerts.format.toUpperCase()}`}
            </button>
          </div>
        </Card>
      </div>
    </PageWrapper>
  )
}
