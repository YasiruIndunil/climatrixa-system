import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/useAuth'
import { useTheme } from '../../context/ThemeContext'
import { useEffect, useState } from 'react'
import api from '../../utils/api'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import PageWrapper, { LoadingSpinner } from '../../components/PageWrapper'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Green = active, Grey = inactive, Teal/blue = my assigned sensor (active)
const activeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})
const inactiveIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})
const myAssignedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})
// Red = active alert triggered by a real reading (needs attention now)
const alertIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 49], iconAnchor: [15, 49], popupAnchor: [1, -40], shadowSize: [41, 41],
})
// Amber/gold = AI-predicted alert (early warning, not yet happened)
const predictedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [28, 46], iconAnchor: [14, 46], popupAnchor: [1, -38], shadowSize: [41, 41],
})

function FitBounds({ sensors }) {
  const map = useMap()
  useEffect(() => {
    const pts = sensors.filter(s => s.latitude && s.longitude).map(s => [s.latitude, s.longitude])
    if (pts.length === 1) map.setView(pts[0], 14)
    else if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40] })
  }, [sensors])
  return null
}

function AQIBadge({ status }) {
  const map = {
    Good:      'bg-green-100 text-green-700',
    Moderate:  'bg-yellow-100 text-yellow-700',
    Unhealthy: 'bg-red-100 text-red-700',
    Hazardous: 'bg-gray-800 text-white',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status || 'Unknown'}</span>
}

export default function SensorMap() {
  const { user } = useAuth()
  const { dark } = useTheme()
  const [showOnlyMine, setShowOnlyMine] = useState(false)

  const { data: mySensors } = useQuery({
    queryKey: ['my-sensors', user?.id],
    queryFn: () => api.get(`/access/users/${user.id}/sensors`).then(r => r.data),
    enabled: !!user?.id,
  })

  const { data: allSensors, isLoading: sensorsLoading } = useQuery({
    queryKey: ['sensors-map'],
    queryFn: () => api.get('/sensors/').then(r => r.data),
  })

  const { data: readings } = useQuery({
    queryKey: ['latest-readings-public'],
    queryFn: () => api.get('/readings/latest').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: alerts } = useQuery({
    queryKey: ['public-alert-events-map'],
    queryFn: () => api.get('/alerts/events').then(r => r.data),
    refetchInterval: 20000,
  })

  const assignedIds = new Set(mySensors?.map(row => row.sensors?.id).filter(Boolean) || [])
  const allWithGPS = (allSensors || []).filter(s => s.latitude && s.longitude)
  const sensors = showOnlyMine ? allWithGPS.filter(s => assignedIds.has(s.id)) : allWithGPS
  const readingMap = Object.fromEntries((readings || []).map(r => [r.sensor_id, r]))

  // Build per-sensor alert status: actual (real reading breach) takes priority over predicted (AI forecast)
  const sensorAlertMap = {}
  ;(alerts || []).filter(a => !a.acknowledged).forEach(a => {
    if (!sensorAlertMap[a.sensor_id]) sensorAlertMap[a.sensor_id] = { actual: null, predicted: null }
    if (a.is_predicted) sensorAlertMap[a.sensor_id].predicted = a
    else sensorAlertMap[a.sensor_id].actual = a
  })

  const sub  = dark ? 'text-gray-500' : 'text-gray-400'
  const head = dark ? 'text-white'    : 'text-gray-900'
  const card = `rounded-2xl border shadow-sm ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`

  return (
      <PageWrapper>
      <div className="mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-xl font-bold ${head}`}>Sensor Map</h1>
          <p className={`text-sm mt-0.5 ${sub}`}>
            {sensors.length} sensor{sensors.length !== 1 ? 's' : ''} on map ·{' '}
            <span className="text-blue-500 font-medium">{assignedIds.size} assigned to me</span>
          </p>
        </div>
        {/* Filter toggle */}
        <div className={`flex rounded-xl overflow-hidden border text-xs font-medium ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setShowOnlyMine(false)}
            className={`px-3 py-1.5 transition-colors ${!showOnlyMine
              ? 'bg-blue-600 text-white'
              : dark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-white text-gray-500 hover:text-gray-800'}`}
          >All Sensors</button>
          <button
            onClick={() => setShowOnlyMine(true)}
            className={`px-3 py-1.5 transition-colors ${showOnlyMine
              ? 'bg-blue-600 text-white'
              : dark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-white text-gray-500 hover:text-gray-800'}`}
          >My Sensors</button>
        </div>
      </div>

      {/* Legend */}
      <div className={`flex items-center gap-5 mb-4 text-xs ${sub} flex-wrap`}>
        <span className="flex items-center gap-1.5">
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png"
            className="h-4 w-auto" alt="mine"/> My assigned sensor (active)
        </span>
        <span className="flex items-center gap-1.5">
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png"
            className="h-4 w-auto" alt="active"/> Active sensor
        </span>
        <span className="flex items-center gap-1.5">
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png"
            className="h-4 w-auto" alt="inactive"/> Inactive sensor
        </span>
        <span className="flex items-center gap-1.5">
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png"
            className="h-5 w-auto" alt="alert"/> Active alert (real reading)
        </span>
        <span className="flex items-center gap-1.5">
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png"
            className="h-4.5 w-auto" alt="predicted"/> AI predicted warning
        </span>
      </div>

      {/* Map */}
      <div
  className={`relative isolate overflow-hidden rounded-2xl border shadow-sm mb-6 ${dark ? 'border-gray-800' : 'border-gray-200'}`}
  style={{ height: 480 }}
>
        {sensorsLoading ? (
          <div className={`h-full flex items-center justify-center ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <LoadingSpinner label="Loading sensor map..."/>
          </div>
        ) : sensors.length === 0 ? (
          <div className={`h-full flex flex-col items-center justify-center ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <MapPin size={36} className={`mb-3 ${dark ? 'text-gray-700' : 'text-gray-200'}`}/>
            <p className={`text-sm ${sub}`}>No sensors with GPS data yet</p>
          </div>
        ) : (
          <MapContainer center={[7.2085, 79.8358]} zoom={10} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution='© OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
            <FitBounds sensors={sensors}/>
            {sensors.map(sensor => {
              const r = readingMap[sensor.id]
              const isMine = assignedIds.has(sensor.id)
              const alertStatus = sensorAlertMap[sensor.id]
              // Priority: actual alert (red) > predicted alert (violet) > mine (blue) > active (green) > inactive (grey)
              const icon = alertStatus?.actual ? alertIcon
                : alertStatus?.predicted ? predictedIcon
                : isMine && sensor.is_active ? myAssignedIcon
                : sensor.is_active ? activeIcon
                : inactiveIcon

              return (
                <Marker key={sensor.id} position={[sensor.latitude, sensor.longitude]} icon={icon}>
                  <Popup maxWidth={260}>
                    <div className="p-1">
                      {alertStatus?.actual && (
                        <div className="mb-2 px-2 py-1.5 rounded-lg bg-red-50 border border-red-200">
                          <div className="text-xs font-bold text-red-700 flex items-center gap-1">⚠ Active Alert</div>
                          <div className="text-xs text-red-600 mt-0.5">{alertStatus.actual.message}</div>
                        </div>
                      )}
                      {alertStatus?.predicted && (
                        <div className="mb-2 px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                          <div className="text-xs font-bold text-amber-700 flex items-center gap-1">✨ AI Predicted Warning</div>
                          <div className="text-xs text-amber-600 mt-0.5">{alertStatus.predicted.message}</div>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-sm text-gray-900">{sensor.name}</div>
                        <div className="flex items-center gap-1">
                          {isMine && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Mine</span>}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${sensor.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {sensor.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                        <MapPin size={10}/> {sensor.location}
                      </div>
                      {r ? (
                        <>
                          <div className="mb-2"><AQIBadge status={r.aqi_status}/></div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { label: '🌡️ Temp',     value: `${r.temperature}°C`   },
                              { label: '💧 Humidity', value: `${r.humidity}%`        },
                              { label: '🌫️ AQI',      value: r.aqi                  },
                              { label: '📊 Pressure', value: `${r.pressure} hPa`    },
                            ].map(m => (
                              <div key={m.label} className="bg-gray-50 rounded-lg px-2 py-1.5">
                                <div className="text-xs text-gray-400">{m.label}</div>
                                <div className="text-sm font-bold text-gray-800">{m.value}</div>
                              </div>
                            ))}
                          </div>
                          {r.recorded_at_display && (
                            <div className="text-xs text-gray-400 mt-2">Updated: {r.recorded_at_display}</div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">No readings yet</p>
                      )}
                      {sensor.latitude && sensor.longitude && (
                        <a href={`https://www.google.com/maps?q=${sensor.latitude},${sensor.longitude}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 mt-2">
                          <MapPin size={10}/> Open in Google Maps
                        </a>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        )}
      </div>

      {/* Sensor list below map — ALL sensors */}
      <h2 className={`font-semibold text-sm mb-3 ${head}`}>All sensors</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(allSensors || []).map(sensor => {
          const r = readingMap[sensor.id]
          const isMine = assignedIds.has(sensor.id)
          return (
            <div key={sensor.id} className={`${card} p-4`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className={`font-semibold text-sm ${head}`}>{sensor.name}</div>
                  <div className={`flex items-center gap-1 text-xs mt-0.5 ${sub}`}>
                    <MapPin size={10}/> {sensor.location}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {isMine && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                      Mine
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    sensor.is_active
                      ? 'bg-green-100 text-green-700'
                      : dark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {sensor.is_active ? '● Active' : '○ Inactive'}
                  </span>
                </div>
              </div>
              {r ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-600'}`}>🌡️ {r.temperature}°C</span>
                  <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-600'}`}>💧 {r.humidity}%</span>
                  <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-600'}`}>🌫️ {r.aqi}</span>
                  <AQIBadge status={r.aqi_status}/>
                </div>
              ) : (
                <p className={`text-xs ${sub}`}>{sensor.is_active ? 'Waiting for reading...' : 'Sensor inactive'}</p>
              )}
            </div>
          )
        })}
      </div>
</PageWrapper>
)
}
