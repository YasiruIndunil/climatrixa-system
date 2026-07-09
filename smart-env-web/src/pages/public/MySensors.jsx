import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/useAuth'
import { useTheme } from '../../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { Radio, MapPin, ThermometerSun, Droplets, Wind, Gauge, ChevronRight, Bell, BellOff } from 'lucide-react'

const ALERT_TYPES_FOR_PARAM = {
  temperature: ['temperature_high', 'temperature_low'],
  humidity:    ['humidity_high',    'humidity_low'],
  aqi:         ['aqi_high'],
  pressure:    ['pressure_high',   'pressure_low'],
}

function AQIBadge({ status }) {
  const map = { Good: 'bg-green-100 text-green-700', Moderate: 'bg-yellow-100 text-yellow-700', Unhealthy: 'bg-red-100 text-red-700', Hazardous: 'bg-gray-800 text-white' }
  return <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status || 'Unknown'}</span>
}

export default function MySensors() {
  const { user } = useAuth()
  const { dark } = useTheme()
  const navigate = useNavigate()

  const { data: mySensors, isLoading } = useQuery({
    queryKey: ['my-sensors', user?.id],
    queryFn: () => api.get(`/access/users/${user.id}/sensors`).then(r => r.data),
    enabled: !!user?.id,
  })

  const { data: readings } = useQuery({
    queryKey: ['latest-readings-public'],
    queryFn: () => api.get('/readings/latest').then(r => r.data),
    refetchInterval: 30000,
  })

  const sensors = mySensors?.map(row => row.sensors).filter(Boolean) ?? []
  const readingMap = Object.fromEntries((readings || []).map(r => [r.sensor_id, r]))

  const sub  = dark ? 'text-gray-500' : 'text-gray-400'
  const card = `rounded-2xl border shadow-sm ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`

  return (
    <div className={`p-6 ${dark ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>My Sensors</h1>
        <p className={`text-sm mt-0.5 ${sub}`}>
          {sensors.length} sensor{sensors.length !== 1 ? 's' : ''} assigned · click a sensor to view details, history and configure alerts
        </p>
      </div>

      {isLoading ? (
        <div className={`${card} p-10 text-center text-sm ${sub}`}>Loading...</div>
      ) : sensors.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <Radio size={36} className={`mx-auto mb-3 ${dark ? 'text-gray-700' : 'text-gray-200'}`}/>
          <p className={`text-sm font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>No sensors assigned</p>
          <p className={`text-xs mt-1 ${sub}`}>Ask your administrator to assign sensors to your account</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sensors.map(sensor => {
            const r = readingMap[sensor.id]
            return (
              <button key={sensor.id}
                onClick={() => navigate(`/dashboard/sensors/${sensor.id}`)}
                className={`${card} overflow-hidden text-left w-full hover:shadow-md transition-shadow group`}>

                {/* Header */}
                <div className={`px-5 py-4 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        sensor.is_active
                          ? dark ? 'bg-teal-500/10 border border-teal-500/20' : 'bg-teal-50 border border-teal-100'
                          : dark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100 border border-gray-200'
                      }`}>
                        <Radio size={17} className={sensor.is_active ? 'text-teal-500' : dark ? 'text-gray-600' : 'text-gray-400'}/>
                      </div>
                      <div>
                        <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{sensor.name}</div>
                        <div className={`flex items-center gap-1 text-xs mt-0.5 ${sub}`}>
                          <MapPin size={11}/> {sensor.location}
                        </div>
                        {sensor.industry_profile && (
                          <div className={`text-xs mt-0.5 capitalize ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                            {sensor.industry_profile.replace(/_/g, ' ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        sensor.is_active
                          ? dark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-700'
                          : dark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'
                      }`}>{sensor.is_active ? '● Active' : '○ Inactive'}</span>
                      {r && <AQIBadge status={r.aqi_status}/>}
                    </div>
                  </div>
                </div>

                {/* Latest readings */}
                {r ? (
                  <div className="px-5 py-4 grid grid-cols-2 gap-2">
                    {[
                      { label: 'Temperature', value: `${r.temperature}°C`, icon: ThermometerSun, color: 'text-red-500',    bg: dark ? 'bg-red-500/10'    : 'bg-red-50' },
                      { label: 'Humidity',    value: `${r.humidity}%`,     icon: Droplets,       color: 'text-blue-500',   bg: dark ? 'bg-blue-500/10'   : 'bg-blue-50' },
                      { label: 'AQI',         value: r.aqi,                icon: Wind,           color: 'text-teal-500',   bg: dark ? 'bg-teal-500/10'   : 'bg-teal-50' },
                      { label: 'Pressure',    value: `${r.pressure} hPa`,  icon: Gauge,          color: 'text-purple-500', bg: dark ? 'bg-purple-500/10' : 'bg-purple-50' },
                    ].map(m => (
                      <div key={m.label} className={`${m.bg} rounded-xl p-2.5 flex items-center gap-2`}>
                        <m.icon size={14} className={m.color}/>
                        <div>
                          <div className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{m.value}</div>
                          <div className={`text-xs ${sub}`}>{m.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`px-5 py-5 text-center text-sm ${sub}`}>
                    {sensor.is_active ? 'Waiting for first reading...' : 'Sensor inactive'}
                  </div>
                )}

                {/* Footer */}
                <div className={`px-5 pb-4 flex items-center justify-between`}>
                  <span className={`text-xs ${sub}`}>
                    {r?.recorded_at_display ? `Updated ${r.recorded_at_display}` : ''}
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-semibold text-teal-600 group-hover:text-teal-500`}>
                    View details <ChevronRight size={13}/>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
