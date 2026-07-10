import { useQuery } from '@tanstack/react-query'
import { useTheme } from '../../context/ThemeContext'
import { useEffect } from 'react'
import api from '../../utils/api'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import PageWrapper, { Card, PageTitle, LoadingSpinner } from '../../components/PageWrapper'
import { MapPin } from 'lucide-react'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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

export default function AdminSensorMap() {
  const { dark } = useTheme()

  const { data: allSensors, isLoading: sensorsLoading } = useQuery({
    queryKey: ['sensors-map'],
    queryFn: () => api.get('/sensors/').then(r => r.data),
  })

  const { data: readings } = useQuery({
    queryKey: ['latest-readings'],
    queryFn: () => api.get('/readings/latest').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: alerts } = useQuery({
    queryKey: ['alert-events-map'],
    queryFn: () => api.get('/alerts/events').then(r => r.data),
    refetchInterval: 20000,
  })

  const sensors = (allSensors || []).filter(s => s.latitude && s.longitude)
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
      <PageTitle
        title="Sensor Map"
        subtitle={`${sensors.length} sensor${sensors.length !== 1 ? 's' : ''} with GPS · ${(allSensors || []).filter(s => s.is_active).length} active`}
      />

      {/* Legend */}
      <div className={`flex items-start gap-3 mb-4 text-xs ${sub} flex-wrap`}>
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
          className={`rounded-2xl border overflow-hidden shadow-sm mb-6 ${
            dark ? 'border-gray-800' : 'border-gray-200'
          }`}
          style={{ height: 'clamp(320px, 60vh, 480px)' }}
        >
        {sensorsLoading ? (
          <div className={`h-full flex items-center justify-center ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <LoadingSpinner label="Loading sensor map..."/>
          </div>
        ) : sensors.length === 0 ? (
          <div className={`h-full flex flex-col items-center justify-center ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <MapPin size={36} className={`mb-3 ${dark ? 'text-gray-700' : 'text-gray-200'}`}/>
            <p className={`text-sm ${sub}`}>No sensors with GPS data yet</p>
            <p className={`text-xs mt-1 ${sub}`}>Add GPS coordinates when registering sensors</p>
          </div>
        ) : (
          <MapContainer
            center={[7.2085, 79.8358]}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer attribution='© OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
            <FitBounds sensors={sensors}/>
            {sensors.map(sensor => {
              const r = readingMap[sensor.id]
              const alertStatus = sensorAlertMap[sensor.id]
              const icon = alertStatus?.actual ? alertIcon
                : alertStatus?.predicted ? predictedIcon
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
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${sensor.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {sensor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                        <MapPin size={10}/> {sensor.location}
                      </div>
                      {sensor.mac_address && (
                        <div className="text-xs text-gray-400 font-mono mb-2">{sensor.mac_address}</div>
                      )}
                      {sensor.industry_profile && (
                        <div className="text-xs text-gray-400 mb-2 capitalize">{sensor.industry_profile.replace(/_/g, ' ')}</div>
                      )}
                      {r ? (
                        <>
                          <div className="mb-2"><AQIBadge status={r.aqi_status}/></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {[
                              { label: '🌡️ Temp',     value: `${r.temperature}°C` },
                              { label: '💧 Humidity', value: `${r.humidity}%`      },
                              { label: '🌫️ AQI',      value: r.aqi                },
                              { label: '📊 Pressure', value: `${r.pressure} hPa`  },
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
                      <a href={`https://www.google.com/maps?q=${sensor.latitude},${sensor.longitude}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 mt-2">
                        <MapPin size={10}/> Open in Google Maps
                      </a>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        )}
      </div>

      {/* All sensors list */}
      <h2 className={`font-semibold text-sm mb-3 ${head}`}>All sensors ({allSensors?.length ?? 0})</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(allSensors || []).map(sensor => {
          const r = readingMap[sensor.id]
          const alertStatus = sensorAlertMap[sensor.id]
          return (
            <div key={sensor.id} className={`${card} p-4 relative`}>
              {alertStatus?.actual && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg animate-pulse" title="Active alert">
                  <span className="text-white text-xs">⚠</span>
                </div>
              )}
              {!alertStatus?.actual && alertStatus?.predicted && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg" title="AI predicted warning">
                  <span className="text-white text-xs">✨</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                <div>
                  <div className={`font-semibold text-sm truncate ${head}`}>{sensor.name}</div>
                  <div className={`flex items-center gap-1 text-xs mt-0.5 ${sub}`}>
                    <MapPin size={10}/> {sensor.location}
                  </div>
                  {sensor.mac_address && (
                    <div className={`text-xs mt-0.5 font-mono ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{sensor.mac_address}</div>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  sensor.is_active ? 'bg-green-100 text-green-700' : dark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'
                }`}>
                  {sensor.is_active ? '● Active' : '○ Inactive'}
                </span>
              </div>
              {alertStatus?.actual && (
                <div className="mb-2 px-2 py-1 rounded-lg bg-red-50 text-xs text-red-700 font-medium truncate">
                  ⚠ {alertStatus.actual.message}
                </div>
              )}
              {alertStatus?.predicted && (
                <div className="mb-2 px-2 py-1 rounded-lg bg-amber-50 text-xs text-amber-700 font-medium truncate">
                  ✨ {alertStatus.predicted.message}
                </div>
              )}
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
