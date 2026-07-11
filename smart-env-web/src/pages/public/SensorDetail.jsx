import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/useAuth'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../components/Toast'
import api from '../../utils/api'
import {
  ArrowLeft, Radio, MapPin, ThermometerSun, Droplets,
  Wind, Gauge, Bell, BellOff, TrendingUp, Clock
} from 'lucide-react'

const PARAMS = [
  { key: 'temperature', label: 'Temperature', icon: ThermometerSun, color: 'red',    unit: '°C' },
  { key: 'humidity',    label: 'Humidity',    icon: Droplets,       color: 'blue',   unit: '%'  },
  { key: 'aqi',         label: 'AQI',         icon: Wind,           color: 'teal',   unit: ''   },
  { key: 'pressure',    label: 'Pressure',    icon: Gauge,          color: 'purple', unit: ' hPa' },
]


function AQIBadge({ status }) {
  const map = { Good: 'bg-green-100 text-green-700', Moderate: 'bg-yellow-100 text-yellow-700', Unhealthy: 'bg-red-100 text-red-700', Hazardous: 'bg-gray-800 text-white' }
  return <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status || 'Unknown'}</span>
}

export default function SensorDetail() {
  const { sensorId } = useParams()
  const { user } = useAuth()
  const { dark } = useTheme()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [togglingParam, setTogglingParam] = useState(null)

  const sub  = dark ? 'text-gray-500' : 'text-gray-400'
  const head = dark ? 'text-white'    : 'text-gray-900'
  const card = `rounded-2xl border shadow-sm ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`

  // Sensor details
  const { data: allSensors } = useQuery({
    queryKey: ['sensors-map'],
    queryFn: () => api.get('/sensors/').then(r => r.data),
  })
  const sensor = allSensors?.find(s => s.id === sensorId)

  // Latest reading
  const { data: readings } = useQuery({
    queryKey: ['latest-readings-public'],
    queryFn: () => api.get('/readings/latest').then(r => r.data),
    refetchInterval: 30000,
  })
  const reading = readings?.find(r => r.sensor_id === sensorId)

  // Alert subscriptions — backend: GET /subscriptions/{user_id}/{sensor_id}
  // Returns: { temperature: bool, humidity: bool, aqi: bool, pressure: bool }
  const { data: subscription, isLoading: subsLoading, refetch: refetchSubs } = useQuery({
    queryKey: ['subscriptions', sensorId, user?.id],
    queryFn: async () => {
      try {
        const r = await api.get(`/subscriptions/${user.id}/${sensorId}`)
        return r.data
      } catch (err) {
        // 404 means no subscription record yet — return nulls so we show all as off
        if (err.response?.status === 404) return null
        throw err
      }
    },
    enabled: !!sensorId && !!user?.id,
  })

  // AI Forecast
  const { data: forecast } = useQuery({
    queryKey: ['forecast', sensorId],
    queryFn: () => api.get(`/ai/forecast/${sensorId}`).then(r => r.data),
    enabled: !!sensorId,
    retry: false,
  })

  // Alert history for this sensor
  const { data: alertEvents } = useQuery({
    queryKey: ['public-alert-events'],
    queryFn: () => api.get('/alerts/events').then(r => r.data),
    refetchInterval: 20000,
  })
  const sensorAlerts = (alertEvents || []).filter(e => e.sensor_id === sensorId).slice(0, 10)

  // subscription is { temperature: bool, humidity: bool, aqi: bool, pressure: bool } or null
  const isSubscribed = (paramKey) => {
    if (!subscription) return false
    return subscription[paramKey] === true
  }

  const toggleSubscription = async (paramKey) => {
    setTogglingParam(paramKey)
    const currently = isSubscribed(paramKey)
    try {
      if (subscription) {
        // Record exists — PATCH to update the one parameter
        await api.patch(`/subscriptions/${user.id}/${sensorId}`, {
          temperature: paramKey === 'temperature' ? !currently : (subscription.temperature ?? false),
          humidity:    paramKey === 'humidity'    ? !currently : (subscription.humidity    ?? false),
          aqi:         paramKey === 'aqi'         ? !currently : (subscription.aqi         ?? false),
          pressure:    paramKey === 'pressure'    ? !currently : (subscription.pressure    ?? false),
        })
      } else {
        // No record yet — POST to create with this one parameter enabled
        await api.post(`/subscriptions/${user.id}/${sensorId}`, {
          temperature: paramKey === 'temperature',
          humidity:    paramKey === 'humidity',
          aqi:         paramKey === 'aqi',
          pressure:    paramKey === 'pressure',
        })
      }
      await refetchSubs()
      toast(currently ? `${paramKey} alerts disabled` : `${paramKey} alerts enabled`)
    } catch {
      toast('Failed to update subscription', 'error')
    } finally {
      setTogglingParam(null)
    }
  }

  const colors = {
    red:    dark ? 'bg-red-500/10 text-red-400'    : 'bg-red-50 text-red-600',
    blue:   dark ? 'bg-blue-500/10 text-blue-400'  : 'bg-blue-50 text-blue-600',
    teal:   dark ? 'bg-teal-500/10 text-teal-400'  : 'bg-teal-50 text-teal-600',
    purple: dark ? 'bg-purple-500/10 text-purple-400': 'bg-purple-50 text-purple-600',
  }

  return (
    <div className={`p-6 ${dark ? 'text-white' : 'text-gray-900'}`}>

      {/* Back */}
      <button onClick={() => navigate('/dashboard/sensors')}
        className={`flex items-center gap-2 text-sm mb-5 ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}>
        <ArrowLeft size={16}/> Back to My Sensors
      </button>

      {/* Header */}
      {sensor ? (
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              sensor.is_active
                ? dark ? 'bg-teal-500/10 border border-teal-500/20' : 'bg-teal-50 border border-teal-100'
                : dark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100 border border-gray-200'
            }`}>
              <Radio size={20} className={sensor.is_active ? 'text-teal-500' : dark ? 'text-gray-600' : 'text-gray-400'}/>
            </div>
            <div>
              <h1 className={`text-xl font-bold ${head}`}>{sensor.name}</h1>
              <div className={`flex items-center gap-1 text-sm mt-0.5 ${sub}`}><MapPin size={13}/> {sensor.location}</div>
              {sensor.industry_profile && (
                <div className={`text-xs mt-0.5 capitalize ${sub}`}>{sensor.industry_profile.replace(/_/g, ' ')}</div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              sensor.is_active ? dark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-700'
                               : dark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'
            }`}>{sensor.is_active ? '● Active' : '○ Inactive'}</span>
            {reading && <AQIBadge status={reading.aqi_status}/>}
          </div>
        </div>
      ) : (
        <div className={`${card} p-10 text-center text-sm ${sub} mb-6`}>Loading sensor...</div>
      )}

      {/* Live readings */}
      <h2 className={`font-semibold text-sm mb-3 ${head}`}>Live Readings</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {PARAMS.map(p => {
          const val = reading?.[p.key]
          const subscribed = isSubscribed(p.key)
          const toggling = togglingParam === p.key
          return (
            <div key={p.key} className={`${card} p-4`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[p.color]}`}>
                  <p.icon size={16}/>
                </div>
                <button
                  onClick={() => toggleSubscription(p.key)}
                  disabled={toggling || subsLoading}
                  title={subsLoading ? 'Loading alert status…' : subscribed ? 'Disable alerts for this parameter' : 'Enable alerts for this parameter'}
                  className={`p-1.5 rounded-lg transition-colors ${
                    subsLoading
                      ? dark ? 'text-gray-700' : 'text-gray-200'
                      : subscribed
                      ? dark ? 'text-teal-400 hover:bg-teal-500/10' : 'text-teal-600 hover:bg-teal-50'
                      : dark ? 'text-gray-600 hover:bg-gray-800' : 'text-gray-300 hover:bg-gray-100'
                  } ${(toggling || subsLoading) ? 'opacity-50' : ''}`}
                >
                  {subscribed ? <Bell size={14}/> : <BellOff size={14}/>}
                </button>
              </div>
              <div className={`text-xl font-bold mb-0.5 ${head}`}>
                {val != null ? `${val}${p.unit}` : '—'}
              </div>
              <div className={`text-xs ${sub}`}>{p.label}</div>
              <div className={`text-xs mt-1 font-medium ${subscribed ? 'text-teal-500' : sub}`}>
                {subsLoading ? '…' : subscribed ? '🔔 Alerts on' : '🔕 Alerts off'}
              </div>
            </div>
          )
        })}
      </div>
      {reading?.recorded_at_display && (
        <p className={`text-xs ${sub} mb-6`}>Last updated: {reading.recorded_at_display}</p>
      )}

      {/* AI Forecast */}
      <h2 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${head}`}>
        <TrendingUp size={15} className="text-teal-500"/> AI Forecast — Next 24 hours
      </h2>
      <div className={`${card} mb-6 overflow-hidden`}>
        {forecast && forecast.forecast?.length > 0 ? (
          <div className="p-5">
            {/* Next 6 hours summary cards */}
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {PARAMS.map(p => {
                const next6 = forecast.forecast
                  .slice(0, 6)
                  .map(f => f[p.key])
                  .filter(v => v != null)

                const avg = next6.length
                  ? (next6.reduce((a, b) => a + b, 0) / next6.length).toFixed(1)
                  : '-'

                const min = next6.length ? Math.min(...next6).toFixed(1) : '-'
                const max = next6.length ? Math.max(...next6).toFixed(1) : '-'

                return (
                  <div
                    key={p.key}
                    className={`rounded-xl p-3 ${colors[p.color]}`}
                  >
                    <div className="flex flex-col gap-2">

                      {/* Header */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p.icon size={14} className="shrink-0" />
                        <span className="text-xs font-semibold truncate">
                          {p.label}
                        </span>
                      </div>

                      {/* Value */}
                      <div className="text-2xl sm:text-2xl font-bold leading-none">
                        {avg}
                        <span className="text-lg sm:text-xl">{p.unit}</span>
                      </div>

                      {/* Range */}
                      <div className="text-xs opacity-70">
                        Next 6h avg · {min}–{max}{p.unit}
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
            {/* Hourly forecast table */}
            <div className={`rounded-xl overflow-hidden border ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className={`grid grid-cols-5 text-xs font-semibold px-3 py-2 ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                <span>Hour</span>
                <span>Temp</span>
                <span>Humidity</span>
                <span>AQI</span>
                <span>Pressure</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {forecast.forecast.map(f => (
                  <div key={f.hours_ahead} className={`grid grid-cols-5 text-xs px-3 py-1.5 border-t ${dark ? 'border-gray-800 hover:bg-gray-800/50' : 'border-gray-50 hover:bg-gray-50'}`}>
                    <span className={dark ? 'text-gray-400' : 'text-gray-500'}>+{f.hours_ahead}h</span>
                    <span className="text-red-500 font-medium">{f.temperature?.toFixed(1)}°C</span>
                    <span className="text-blue-500 font-medium">{f.humidity?.toFixed(1)}%</span>
                    <span className="text-teal-500 font-medium">{f.aqi?.toFixed(0)}</span>
                    <span className="text-purple-500 font-medium">{f.pressure?.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
            {forecast.generated_at && (
              <p className={`text-xs mt-3 ${sub}`}>Generated: {new Date(forecast.generated_at).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}</p>
            )}
          </div>
        ) : (
          <div className={`p-10 text-center ${sub} text-sm`}>
            <TrendingUp size={32} className={`mx-auto mb-2 ${dark ? 'text-gray-700' : 'text-gray-200'}`}/>
            <p>AI forecast not yet available for this sensor</p>
            <p className={`text-xs mt-1 ${dark ? 'text-gray-700' : 'text-gray-300'}`}>Forecasts generate once enough data has been collected</p>
          </div>
        )}
      </div>

      {/* Recent alerts for this sensor */}
      <h2 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${head}`}>
        <Bell size={15} className="text-orange-500"/> Recent Alerts
      </h2>
      <div className={`${card} overflow-hidden`}>
        {sensorAlerts.length === 0 ? (
          <div className={`p-8 text-center text-sm ${sub}`}>No alerts triggered for this sensor</div>
        ) : (
          <div className={`divide-y ${dark ? 'divide-gray-800' : 'divide-gray-50'}`}>
            {sensorAlerts.map(a => (
              <div key={a.id} className={`px-5 py-3 flex items-start gap-3 ${!a.acknowledged ? dark ? 'bg-orange-500/5' : 'bg-orange-50' : ''}`}>
                <span className="text-lg shrink-0">{
                  a.alert_type?.includes('temperature') ? '🌡️' :
                  a.alert_type?.includes('humidity') ? '💧' :
                  a.alert_type?.includes('aqi') ? '🌫️' : '📊'
                }</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${!a.acknowledged ? dark ? 'text-orange-300' : 'text-orange-800' : dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {a.message}
                  </div>
                  <div className={`text-xs mt-0.5 flex items-center gap-1 ${sub}`}>
                    <Clock size={10}/>
                    {new Date(a.triggered_at).toLocaleString('en-LK', { timeZone: 'Asia/Colombo', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                </div>
                {!a.acknowledged && <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">NEW</span>}
                {a.acknowledged && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full shrink-0">✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
