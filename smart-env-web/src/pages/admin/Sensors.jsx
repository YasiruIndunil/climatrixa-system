import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, ToggleLeft, ToggleRight, MapPin, Radio, Search, X, BrainCircuit, CheckCircle } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../components/Toast'
import PageWrapper, { Card, CardHeader, PageTitle, ThemedInput, ThemedSelect, PrimaryButton, GhostButton, FieldLabel, Tooltip } from '../../components/PageWrapper'
import api from '../../utils/api'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({ click(e) { onLocationSelect(e.latlng.lat, e.latlng.lng) } })
  return null
}

function FlyToLocation({ lat, lng, enabled }) {
  const map = useMapEvents({})
  useEffect(() => {
    if (lat && lng && enabled) map.flyTo([lat, lng], 15)
  }, [lat, lng])
  return null
}

function SensorModal({ sensor, onClose, onSave }) {
  const { dark } = useTheme()
  const [form, setForm] = useState({
    name: sensor?.name || '',
    location: sensor?.location || '',
    industry_profile: sensor?.industry_profile || 'general',
    latitude: sensor?.latitude || 7.2085,
    longitude: sensor?.longitude || 79.8358,
    mac_address: sensor?.mac_address || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const profiles = ['general','spice_factory','supermarket','hospital','office','warehouse','cold_storage']

  useEffect(() => {
    if (!sensor && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setForm(f => ({
          ...f,
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6))
        })),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save sensor')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl my-4 border ${
        dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
      }`}>
        <div className={`px-6 py-5 border-b flex items-center justify-between ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <div>
            <h3 className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
              {sensor ? 'Edit sensor' : 'Register new sensor'}
            </h3>
            <p className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              {sensor ? 'Update sensor details' : 'Add a new sensor node to the system'}
            </p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${dark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <FieldLabel>Sensor name</FieldLabel>
            <ThemedInput value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Sensor Alpha" required />
          </div>
          <div>
            <FieldLabel>Location description</FieldLabel>
            <ThemedInput value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. Factory Floor A, Colombo" required />
          </div>
          <div>
            <FieldLabel>MAC address</FieldLabel>
            <ThemedInput
              value={form.mac_address}
              onChange={e => setForm({...form, mac_address: e.target.value.toUpperCase()})}
              placeholder="AA:BB:CC:DD:EE:FF"
              className="font-mono"
            />
          </div>
          <div>
            <FieldLabel>Industry profile</FieldLabel>
            <ThemedSelect value={form.industry_profile} onChange={e => setForm({...form, industry_profile: e.target.value})}>
              {profiles.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
            </ThemedSelect>
          </div>
          <div>
            <FieldLabel>GPS location — click map to place pin</FieldLabel>
            <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 200 }}>
              <MapContainer center={[form.latitude || 7.2085, form.longitude || 79.8358]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='© OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapClickHandler onLocationSelect={(lat, lng) => setForm(f => ({
                  ...f,
                  latitude: parseFloat(lat.toFixed(6)),
                  longitude: parseFloat(lng.toFixed(6))
                }))} />
                <FlyToLocation lat={form.latitude} lng={form.longitude} enabled={!sensor} />
                {form.latitude && form.longitude && <Marker position={[form.latitude, form.longitude]} />}
              </MapContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className={`text-xs mb-1 block ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Latitude</label>
                <ThemedInput type="number" step="any" value={form.latitude} onChange={e => setForm({...form, latitude: parseFloat(e.target.value)})} className="py-1.5 text-xs" />
              </div>
              <div>
                <label className={`text-xs mb-1 block ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Longitude</label>
                <ThemedInput type="number" step="any" value={form.longitude} onChange={e => setForm({...form, longitude: parseFloat(e.target.value)})} className="py-1.5 text-xs" />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <GhostButton type="button" onClick={onClose} className="flex-1 justify-center">Cancel</GhostButton>
            <PrimaryButton type="submit" disabled={saving} className="flex-1 justify-center">
              {saving ? 'Saving...' : sensor ? 'Save changes' : 'Register sensor'}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Sensors() {
  const { dark } = useTheme()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [trainingIds, setTrainingIds] = useState(new Set())
  const [trainedIds, setTrainedIds] = useState(new Set())

  const trainModel = async (sensor) => {
    setTrainingIds(prev => new Set([...prev, sensor.id]))
    try {
      await api.post(`/ai/train/${sensor.id}`)
      toast(`Training started for ${sensor.name} — takes ~60 seconds`)
      // Poll status every 10 seconds for up to 2 minutes
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          const res = await api.get(`/ai/train/status/${sensor.id}`)
          if (res.data.is_trained) {
            clearInterval(poll)
            setTrainingIds(prev => { const n = new Set(prev); n.delete(sensor.id); return n })
            setTrainedIds(prev => new Set([...prev, sensor.id]))
            toast(`AI model trained for ${sensor.name}`)
          }
        } catch {}
        if (attempts >= 12) clearInterval(poll)
      }, 10000)
    } catch {
      toast('Failed to start training', 'error')
      setTrainingIds(prev => { const n = new Set(prev); n.delete(sensor.id); return n })
    }
  }

  const { data: sensors, isLoading } = useQuery({
    queryKey: ['sensors', 'all'],
    queryFn: () => api.get('/sensors/all').then(r => r.data),
  })

  const saveSensor = async form => {
    if (editing) {
      await api.patch(`/sensors/${editing.id}`, form)
      toast('Sensor updated successfully')
    } else {
      await api.post('/sensors/', form)
      toast('Sensor registered successfully')
    }
    queryClient.invalidateQueries(['sensors'])
  }

  const toggleSensor = async sensor => {
    try {
      const newStatus = !sensor.is_active
      await api.patch(`/sensors/${sensor.id}`, { is_active: newStatus })
      queryClient.invalidateQueries(['sensors'])
      toast(newStatus ? 'Sensor activated' : 'Sensor deactivated')
    } catch (err) {
      const detail = err?.response?.data?.detail
      toast(detail ? `Failed to update sensor: ${detail}` : 'Failed to update sensor', 'error')
    }
  }

  const filtered = sensors?.filter(s => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()) ||
      s.mac_address?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' ? s.is_active : !s.is_active)
    return matchSearch && matchStatus
  })

  if (isLoading) return (
    <PageWrapper>
      <div className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Loading sensors...</div>
    </PageWrapper>
  )

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <PageTitle
          title="Sensors"
          subtitle={`${filtered?.length ?? 0} of ${sensors?.length ?? 0} sensor nodes`}
        />
        <Tooltip text="Register a new sensor node">
          <PrimaryButton onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={16} /> Add sensor
          </PrimaryButton>
        </Tooltip>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className={`absolute left-3 top-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
          <ThemedInput
            className="pl-9 pr-8 w-full"
            placeholder="Search by name, location or MAC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-3">
              <X size={14} className={dark ? 'text-gray-500' : 'text-gray-400'} />
            </button>
          )}
        </div>
        <ThemedSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="flex-1">
          <option value="all">All status</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </ThemedSelect>
        {(search || statusFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('all') }}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
              dark ? 'border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            Clear
          </button>
        )}
      </div>

      {/* Sensor cards */}
      <div className="grid gap-3">
        {filtered?.length === 0 && (
          <Card className="p-10 text-center">
            <Radio size={32} className={`mx-auto mb-2 ${dark ? 'text-gray-700' : 'text-gray-200'}`} />
            <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No sensors match your search</p>
          </Card>
        )}
        {filtered?.map(sensor => (
          <Card key={sensor.id} className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  sensor.is_active
                    ? dark ? 'bg-teal-500/10 border border-teal-500/20' : 'bg-teal-50 border border-teal-100'
                    : dark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100 border border-gray-200'
                }`}>
                  <Radio size={18} className={sensor.is_active ? 'text-teal-500' : dark ? 'text-gray-600' : 'text-gray-400'} />
                </div>
                <div className="min-w-0">
                  <div className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{sensor.name}</div>
                  <div className={`flex items-center gap-1 text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <MapPin size={11} /> {sensor.location}
                  </div>
                  {sensor.mac_address && (
                    <div className={`text-xs mt-0.5 font-mono ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {sensor.mac_address}
                    </div>
                  )}
                  <div className={`text-xs mt-0.5 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                    {sensor.industry_profile?.replace(/_/g, ' ')}
                    {sensor.latitude && sensor.longitude && ` · ${sensor.latitude}, ${sensor.longitude}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:justify-end flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  sensor.is_active
                    ? dark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-700'
                    : dark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'
                }`}>
                  {sensor.is_active ? '● Active' : '○ Inactive'}
                </span>
                <Tooltip text={trainedIds.has(sensor.id) ? 'AI model trained ✓' : trainingIds.has(sensor.id) ? 'Training...' : 'Train AI model'}>
                  <button
                    onClick={() => trainModel(sensor)}
                    disabled={trainingIds.has(sensor.id)}
                    className={`p-2 rounded-xl transition-colors ${
                      trainedIds.has(sensor.id)
                        ? 'text-teal-500'
                        : trainingIds.has(sensor.id)
                          ? dark ? 'text-gray-600 animate-pulse' : 'text-gray-300 animate-pulse'
                          : dark ? 'hover:bg-gray-800 text-gray-500 hover:text-purple-400' : 'hover:bg-purple-50 text-gray-400 hover:text-purple-600'
                    }`}>
                    {trainedIds.has(sensor.id) ? <CheckCircle size={16}/> : <BrainCircuit size={16}/>}
                  </button>
                </Tooltip>
                <Tooltip text="Edit sensor">
                  <button onClick={() => { setEditing(sensor); setModalOpen(true) }}
                    className={`p-2 rounded-xl transition-colors ${dark ? 'hover:bg-gray-800 text-gray-500 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}>
                    <Edit2 size={15} />
                  </button>
                </Tooltip>
                <Tooltip text={sensor.is_active ? 'Deactivate sensor' : 'Activate sensor'}>
                  <button onClick={() => toggleSensor(sensor)}
                    className={`p-2 rounded-xl transition-colors ${
                      sensor.is_active
                        ? dark ? 'hover:bg-teal-500/10 text-teal-500' : 'hover:bg-teal-50 text-teal-600'
                        : dark ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 text-gray-400'
                    }`}>
                    {sensor.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                </Tooltip>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {modalOpen && (
        <SensorModal
          sensor={editing}
          onClose={() => setModalOpen(false)}
          onSave={saveSensor}
        />
      )}
    </PageWrapper>
  )
}
