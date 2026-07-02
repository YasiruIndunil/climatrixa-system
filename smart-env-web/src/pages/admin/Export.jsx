import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Table } from 'lucide-react'
import api from '../../utils/api'

export default function Export() {
  const [form, setForm] = useState({
    sensor_id: '', parameter: 'all',
    date_from: '', date_to: '', format: 'csv'
  })
  const [exporting, setExporting] = useState(false)

  const { data: sensors } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => api.get('/sensors/').then(r => r.data),
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (form.sensor_id) params.append('sensor_id', form.sensor_id)
      if (form.date_from) params.append('from', form.date_from)
      if (form.date_to) params.append('to', form.date_to)

      const res = await api.get(`/readings/export?${params}`, {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `climatrixa_readings_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Export failed — endpoint may not be implemented yet')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Export Data</h1>
        <p className="text-sm text-gray-500 mt-1">Download sensor readings and alert events</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Readings export */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center">
              <Table size={16} className="text-teal-600" />
            </div>
            <h2 className="font-semibold text-gray-800">Sensor readings</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sensor</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.sensor_id} onChange={e => setForm({...form, sensor_id: e.target.value})}>
                <option value="">All sensors</option>
                {sensors?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From date</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  value={form.date_from} onChange={e => setForm({...form, date_from: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To date</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  value={form.date_to} onChange={e => setForm({...form, date_to: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3">
              {['csv', 'pdf'].map(f => (
                <label key={f} className={`flex-1 border-2 rounded-lg p-3 cursor-pointer text-center transition-colors ${form.format === f ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500'}`}>
                  <input type="radio" className="sr-only" value={f}
                    checked={form.format === f} onChange={() => setForm({...form, format: f})} />
                  <span className="text-sm font-medium uppercase">{f}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Download readings'}
            </button>
          </div>
        </div>

        {/* Alert events export */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-orange-600" />
            </div>
            <h2 className="font-semibold text-gray-800">Alert events</h2>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From date</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To date</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <div className="flex gap-3">
              {['csv', 'pdf'].map(f => (
                <label key={f} className={`flex-1 border-2 rounded-lg p-3 cursor-pointer text-center transition-colors ${form.format === f ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
                  <input type="radio" className="sr-only" value={f}
                    checked={form.format === f} onChange={() => setForm({...form, format: f})} />
                  <span className="text-sm font-medium uppercase">{f}</span>
                </label>
              ))}
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium"
              onClick={() => alert('Alert events export — endpoint coming soon')}
            >
              <Download size={16} />
              Download alert events
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
