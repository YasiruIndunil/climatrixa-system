import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, ToggleLeft, ToggleRight, MapPin, Wifi } from 'lucide-react'
import api from '../../utils/api'

function SensorModal({ sensor, onClose, onSave }) {
  const [form, setForm] = useState(sensor || {
    name: '', location: '', industry_profile: 'general',
    latitude: '', longitude: '', mac_address: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const industryProfiles = [
    'general', 'spice_factory', 'supermarket', 'hospital',
    'office', 'warehouse', 'cold_storage'
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save sensor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">
            {sensor ? 'Edit sensor' : 'Register new sensor'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Sensor name</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Location description</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.location} onChange={e => setForm({...form, location: e.target.value})} required />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">MAC address</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={form.mac_address} onChange={e => setForm({...form, mac_address: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Industry profile</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.industry_profile} onChange={e => setForm({...form, industry_profile: e.target.value})}>
                {industryProfiles.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
              <input type="number" step="any" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.latitude} onChange={e => setForm({...form, latitude: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
              <input type="number" step="any" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.longitude} onChange={e => setForm({...form, longitude: e.target.value})} />
            </div>
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving...' : 'Save sensor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Sensors() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: sensors, isLoading } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => api.get('/sensors/').then(r => r.data),
  })

  const saveSensor = async (form) => {
    if (editing) {
      await api.patch(`/sensors/${editing.id}`, form)
    } else {
      await api.post('/sensors/', form)
    }
    queryClient.invalidateQueries(['sensors'])
  }

  const toggleSensor = async (sensor) => {
    await api.patch(`/sensors/${sensor.id}/`, { is_active: !sensor.is_active })
    queryClient.invalidateQueries(['sensors'])
  }

  if (isLoading) return <div className="p-6 text-gray-400">Loading sensors...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Sensors</h1>
          <p className="text-sm text-gray-500 mt-1">Manage registered sensor nodes</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true) }}
          className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Add sensor
        </button>
      </div>

      <div className="grid gap-4">
        {sensors?.map(sensor => (
          <div key={sensor.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${sensor.is_active ? 'bg-teal-100' : 'bg-gray-100'}`}>
                  <Wifi size={18} className={sensor.is_active ? 'text-teal-600' : 'text-gray-400'} />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{sensor.name}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <MapPin size={11} /> {sensor.location}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 font-mono">{sensor.mac_address || 'MAC not set'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Profile: {sensor.industry_profile?.replace('_', ' ')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sensor.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {sensor.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => { setEditing(sensor); setModalOpen(true) }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => toggleSensor(sensor)}
                  className={`p-1.5 rounded-lg ${sensor.is_active ? 'text-teal-600 hover:bg-teal-50' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  {sensor.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
              </div>
            </div>

            {sensor.latitude && sensor.longitude && (
              <div className="mt-3 text-xs text-gray-400">
                GPS: {sensor.latitude}, {sensor.longitude}
              </div>
            )}
          </div>
        ))}
      </div>

      {modalOpen && (
        <SensorModal
          sensor={editing}
          onClose={() => setModalOpen(false)}
          onSave={saveSensor}
        />
      )}
    </div>
  )
}
