import { useQuery, useQueries } from '@tanstack/react-query'
import { useAuth } from '../../context/useAuth'
import { useTheme } from '../../context/ThemeContext'
import { useAlertWS } from '../../components/Toast'
import api from '../../utils/api'
import { Radio, Bell, BellOff, Activity, ThermometerSun, Droplets, Wind, Gauge } from 'lucide-react'

function MetricCard({ label, value, unit, icon: Icon, color, dark }) {
  const colors = {
    red:    dark ? 'bg-red-500/10 text-red-400 border-red-500/20'       : 'bg-red-50 text-red-600 border-red-100',
    blue:   dark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'     : 'bg-blue-50 text-blue-600 border-blue-100',
    teal:   dark ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'     : 'bg-teal-50 text-teal-600 border-teal-100',
    purple: dark ? 'bg-purple-500/10 text-purple-400 border-purple-500/20': 'bg-purple-50 text-purple-600 border-purple-100',
  }
  return (
    <div className={`rounded-2xl p-5 border shadow-sm ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-4 ${colors[color]}`}>
        <Icon size={18}/>
      </div>
      <div className={`text-2xl font-bold mb-0.5 ${dark ? 'text-white' : 'text-gray-900'}`}>
        {value != null ? `${value}${unit}` : '—'}
      </div>
      <div className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</div>
    </div>
  )
}

function AQIBadge({ status }) {
  const map = {
    Good:      'bg-green-100 text-green-700',
    Moderate:  'bg-yellow-100 text-yellow-700',
    Unhealthy: 'bg-red-100 text-red-700',
    Hazardous: 'bg-gray-800 text-white',
  }
  return <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status || 'Unknown'}</span>
}

const PARAM_LABELS = [
  { key: 'temperature', label: 'Temp',     icon: ThermometerSun },
  { key: 'humidity',    label: 'Humidity', icon: Droplets },
  { key: 'aqi',         label: 'AQI',      icon: Wind },
  { key: 'pressure',    label: 'Pressure', icon: Gauge },
]

function SensorReadingCard({ reading, subscription, dark }) {
  // Which params have alerts on?
  const enabledParams = PARAM_LABELS.filter(p => subscription?.[p.key] === true)
  const anyEnabled = enabledParams.length > 0

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
      <div className={`px-5 py-4 border-b flex items-center justify-between ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-teal-500/10' : 'bg-teal-50'}`}>
            <Radio size={16} className="text-teal-500"/>
          </div>
          <div>
            <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{reading.sensor_name}</div>
            <div className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{reading.location}</div>
          </div>
        </div>
        <AQIBadge status={reading.aqi_status}/>
      </div>
      <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Temperature', value: reading.temperature, unit: '°C', icon: ThermometerSun, color: 'red' },
          { label: 'Humidity',    value: reading.humidity,    unit: '%',  icon: Droplets,       color: 'blue' },
          { label: 'AQI',         value: reading.aqi,         unit: '',   icon: Wind,           color: 'teal' },
          { label: 'Pressure',    value: reading.pressure,    unit: ' hPa', icon: Gauge,        color: 'purple' },
        ].map(m => (
          <MetricCard key={m.label} {...m} dark={dark}/>
        ))}
      </div>
      {/* Alert subscription status row */}
      <div className={`px-5 pb-4 flex items-center gap-2 flex-wrap`}>
        {anyEnabled ? (
          <>
            <Bell size={12} className="text-teal-500 shrink-0"/>
            <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Alerts on:</span>
            {enabledParams.map(p => (
              <span key={p.key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${dark ? 'bg-teal-500/15 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
                {p.label}
              </span>
            ))}
          </>
        ) : (
          <>
            <BellOff size={12} className={dark ? 'text-gray-600' : 'text-gray-400'}/>
            <span className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>No alerts enabled</span>
          </>
        )}
      </div>
      {reading.recorded_at_display && (
        <div className={`px-5 pb-4 text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
          Last updated: {reading.recorded_at_display}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { dark } = useTheme()
  const { connected } = useAlertWS()

  const { data: mySensors } = useQuery({
    queryKey: ['my-sensors', user?.id],
    queryFn: () => api.get(`/access/users/${user.id}/sensors`).then(r => r.data),
    enabled: !!user?.id,
  })

  const { data: readings, isLoading } = useQuery({
    queryKey: ['latest-readings-public'],
    queryFn: () => api.get('/readings/latest').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: alerts } = useQuery({
    queryKey: ['public-alert-events'],
    queryFn: () => api.get('/alerts/events').then(r => r.data),
    refetchInterval: 20000,
  })

  const assignedSensorIds = new Set(mySensors?.map(row => row.sensors?.id).filter(Boolean) || [])
  const myReadings = readings?.filter(r => assignedSensorIds.has(r.sensor_id)) ?? []
  const unreadCount = alerts?.filter(a => !a.acknowledged).length ?? 0

  // Fetch subscriptions for each assigned sensor
  const sensorIdList = [...assignedSensorIds]
  const subscriptionQueries = useQueries({
    queries: sensorIdList.map(sensorId => ({
      queryKey: ['subscriptions', sensorId, user?.id],
      queryFn: async () => {
        try {
          const r = await api.get(`/subscriptions/${user.id}/${sensorId}`)
          return { sensorId, data: r.data }
        } catch {
          return { sensorId, data: null }
        }
      },
      enabled: !!user?.id,
      retry: false,
    }))
  })
  const subscriptionMap = Object.fromEntries(
    subscriptionQueries.map(q => [q.data?.sensorId, q.data?.data]).filter(([k]) => k)
  )

  const today = new Date().toLocaleDateString('en-LK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Colombo'
  })

  return (
    <div className={`p-6 ${dark ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
        <p className={`text-sm mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{today}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-2xl p-5 border shadow-sm ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-4 ${dark ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-teal-50 text-teal-600 border-teal-100'}`}>
            <Radio size={18}/>
          </div>
          <div className={`text-2xl font-bold mb-0.5 ${dark ? 'text-white' : 'text-gray-900'}`}>{myReadings.length}</div>
          <div className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>My sensors</div>
        </div>
        <div className={`rounded-2xl p-5 border shadow-sm ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-4 ${dark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
            <Bell size={18}/>
          </div>
          <div className={`text-2xl font-bold mb-0.5 ${dark ? 'text-white' : 'text-gray-900'}`}>{unreadCount}</div>
          <div className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Unread alerts</div>
        </div>
        <div className={`rounded-2xl p-5 border shadow-sm col-span-2 lg:col-span-1 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-4 ${dark ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
            <Activity size={18}/>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
              {connected ? 'Live' : 'Off'}
            </div>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-teal-400 animate-pulse' : 'bg-red-400'}`}/>
          </div>
          <div className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Feed status</div>
        </div>
      </div>

      {/* Live readings */}
      <div className="mb-2 flex items-center gap-2">
        <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"/>
        <h2 className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-800'}`}>
          Live readings — my sensors
        </h2>
        <span className={`text-xs ml-auto px-2 py-1 rounded-full ${dark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
          Refreshes every 30s
        </span>
      </div>

      {isLoading ? (
        <div className={`rounded-2xl border p-10 text-center text-sm ${dark ? 'bg-gray-900 border-gray-800 text-gray-500' : 'bg-white border-gray-100 text-gray-400'}`}>
          Loading sensor data...
        </div>
      ) : myReadings.length === 0 ? (
        <div className={`rounded-2xl border p-10 text-center ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <Radio size={36} className={`mx-auto mb-3 ${dark ? 'text-gray-700' : 'text-gray-200'}`}/>
          <p className={`text-sm font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>No sensors assigned yet</p>
          <p className={`text-xs mt-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Contact your administrator to get sensor access</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myReadings.map(r => <SensorReadingCard key={r.sensor_id} reading={r} subscription={subscriptionMap[r.sensor_id]} dark={dark}/>)}
        </div>
      )}
    </div>
  )
}
