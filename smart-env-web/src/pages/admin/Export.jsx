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
  const [form, setForm] = useState({ sensor_id: '', date_from: '', date_to: '', format: 'csv' })
  const [exporting, setExporting] = useState(false)

  const { data: sensors } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => api.get('/sensors/').then(r => r.data)
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (form.sensor_id) params.append('sensor_id', form.sensor_id)
      if (form.date_from) params.append('from', form.date_from)
      if (form.date_to) params.append('to', form.date_to)
      const res = await api.get(`/readings/export?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `climatrixa_readings_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast('Export downloaded successfully')
    } catch {
      toast('Export endpoint not yet available', 'error')
    } finally { setExporting(false) }
  }

  const inputClass = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
    dark
      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
      : 'bg-gray-50 border-gray-200 text-gray-900'
  }`

  return (
    <PageWrapper>
      <PageTitle title="Export data" subtitle="Download sensor readings and alert events as CSV" />

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
              <ThemedSelect value={form.sensor_id} onChange={e => setForm({...form, sensor_id: e.target.value})}>
                <option value="">All sensors</option>
                {sensors?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </ThemedSelect>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>From date</FieldLabel>
                <input type="date" className={inputClass} value={form.date_from} onChange={e => setForm({...form, date_from: e.target.value})} />
              </div>
              <div>
                <FieldLabel>To date</FieldLabel>
                <input type="date" className={inputClass} value={form.date_to} onChange={e => setForm({...form, date_to: e.target.value})} />
              </div>
            </div>
            <div>
              <FieldLabel>Format</FieldLabel>
              <div className="flex gap-3">
                {['csv', 'pdf'].map(f => (
                  <label key={f} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer transition-all text-sm font-medium ${
                    form.format === f
                      ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400'
                      : dark ? 'border-gray-700 text-gray-400 hover:border-gray-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                    <input type="radio" className="sr-only" value={f} checked={form.format === f} onChange={() => setForm({...form, format: f})} />
                    {f.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
            <PrimaryButton onClick={handleExport} disabled={exporting} className="w-full justify-center">
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Download readings'}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>From date</FieldLabel>
                <input type="date" className={inputClass} />
              </div>
              <div>
                <FieldLabel>To date</FieldLabel>
                <input type="date" className={inputClass} />
              </div>
            </div>
            <div>
              <FieldLabel>Format</FieldLabel>
              <div className="flex gap-3">
                {['csv', 'pdf'].map(f => (
                  <label key={f} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer transition-all text-sm font-medium ${
                    dark ? 'border-gray-700 text-gray-400 hover:border-gray-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                    {f.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={() => toast('Alert events export — coming soon', 'error')}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <Download size={16} />
              Download alert events
            </button>
          </div>
        </Card>
      </div>
    </PageWrapper>
  )
}
