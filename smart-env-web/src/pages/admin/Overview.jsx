import { useQuery, useQueries } from '@tanstack/react-query'
import { Wifi, Users, Bell, Activity, AlertTriangle, TrendingUp, TrendingDown, Minus, Calendar, CheckCircle, XCircle, Sparkles } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { LoadingSpinner } from '../../components/PageWrapper'
import api from '../../utils/api'

function StatCard({ icon: Icon, label, value, sub, color, dark }) {
  const colors = {
    teal: dark ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-teal-50 text-teal-600 border-teal-100',
    blue: dark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100',
    orange: dark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-100',
    purple: dark ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-600 border-purple-100',
  }
  return (
    <div className={`rounded-2xl p-5 border ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} shadow-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colors[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className={`text-2xl font-bold mb-0.5 ${dark ? 'text-white' : 'text-gray-900'}`}>{value ?? '—'}</div>
      <div className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</div>
      {sub && <div className={`text-xs mt-1 ${dark ? 'text-gray-600' : 'text-gray-300'}`}>{sub}</div>}
    </div>
  )
}

function AQIBadge({ status }) {
  const map = {
    Good: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Moderate: 'bg-yellow-100 text-yellow-700',
    Unhealthy: 'bg-red-100 text-red-700',
    Hazardous: 'bg-gray-800 text-white',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function MetricPill({ label, value, unit, color, dark, predicted }) {
  const colors = {
    red: dark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100',
    blue: dark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100',
    teal: dark ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-teal-50 text-teal-600 border-teal-100',
    purple: dark ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-600 border-purple-100',
  }
  const predictedText = {
    red: dark ? 'text-red-400' : 'text-red-500',
    blue: dark ? 'text-blue-400' : 'text-blue-500',
    teal: dark ? 'text-teal-400' : 'text-teal-500',
    purple: dark ? 'text-purple-400' : 'text-purple-500',
  }
  return (
    <div className={`rounded-xl px-3 py-2.5 border ${colors[color]}`}>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-base font-bold">{value}{unit}</div>
          <div className="text-xs opacity-70 mt-0.5">{label}</div>
        </div>
        {predicted != null && (
          <div className={`text-right shrink-0 pl-2 border-l border-dashed ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5 justify-end mb-0.5 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
              <Sparkles size={8}/> AI
            </div>
            <div className={`text-xs font-bold flex items-center gap-0.5 justify-end ${predictedText[color]}`}>
              <TrendingUp size={9}/> {predicted}{unit}
            </div>
            <div className={`text-[9px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>1h</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Overview() {
  const { dark } = useTheme()

  const { data: sensors } = useQuery({ queryKey: ['sensors'], queryFn: () => api.get('/sensors/').then(r => r.data), refetchInterval: 60000 })
  const { data: readings, isLoading: readingsLoading } = useQuery({ queryKey: ['latest-readings'], queryFn: () => api.get('/readings/latest').then(r => r.data), refetchInterval: 30000 })

  // Fetch next-hour AI prediction for every active sensor
  const activeSensorIds = (sensors || []).filter(s => s.is_active).map(s => s.id)
  const forecastQueries = useQueries({
    queries: activeSensorIds.map(id => ({
      queryKey: ['forecast', id],
      queryFn: () => api.get(`/ai/forecast/${id}`).then(r => r.data),
      retry: false,
      staleTime: 5 * 60 * 1000,
    }))
  })
  const forecastMap = Object.fromEntries(
    activeSensorIds.map((id, i) => [id, forecastQueries[i]?.data])
  )
  const { data: alerts } = useQuery({ queryKey: ['alert-events'], queryFn: () => api.get('/alerts/events').then(r => r.data), refetchInterval: 30000 })
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/auth/users/').then(r => r.data), refetchInterval: 120000 })
  const { data: scheduleLogs } = useQuery({ queryKey: ['schedule-logs'], queryFn: () => api.get('/ai/schedule/logs?limit=5').then(r => r.data), refetchInterval: 60000 })

  const activeSensors = sensors?.filter(s => s.is_active)?.length ?? 0
  const totalUsers = users?.length ?? 0
  const unreadAlerts = alerts?.filter(a => !a.acknowledged)?.length ?? 0
  const todayAlerts = alerts?.filter(a => {
    const d = new Date(a.triggered_at)
    return d.toDateString() === new Date().toDateString()
  })?.length ?? 0

  return (
    <div className={`p-6 ${dark ? 'text-white' : 'text-gray-900'}`}>

      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Overview</h1>
        <p className={`text-sm mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          {new Date().toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Colombo' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Wifi} label="Active sensors" value={activeSensors} sub={`of ${sensors?.length ?? 0} total`} color="teal" dark={dark} />
        <StatCard icon={Users} label="Users" value={totalUsers} color="blue" dark={dark} />
        <StatCard icon={Bell} label="Unread alerts" value={unreadAlerts} sub={`${todayAlerts} today`} color="orange" dark={dark} />
        <StatCard icon={Activity} label="Reading interval" value="30s" sub="continuous" color="purple" dark={dark} />
      </div>

      {/* Live readings */}
      <div className={`rounded-2xl border mb-6 overflow-hidden ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} shadow-sm`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
            <h2 className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-800'}`}>Live sensor readings</h2>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${dark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
            Auto-refreshes every 30s
          </span>
        </div>

        <div className={`divide-y ${dark ? 'divide-gray-800' : 'divide-gray-50'}`}>
          {readingsLoading ? (
            <LoadingSpinner label="Loading live readings..."/>
          ) : readings?.length > 0 ? readings.map(r => {
            const nextHour = forecastMap[r.sensor_id]?.forecast?.find(f => f.hours_ahead === 1)
            return (
            <div key={r.sensor_id} className={`px-5 py-4 hover:${dark ? 'bg-gray-800/50' : 'bg-gray-50'} transition-colors`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{r.sensor_name}</div>
                  <div className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{r.location}</div>
                </div>
                <div className="flex items-center gap-2">
                  <AQIBadge status={r.aqi_status} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <MetricPill label="Temp" value={r.temperature} unit="°C" color="red" dark={dark} predicted={nextHour?.temperature} />
                <MetricPill label="Humidity" value={r.humidity} unit="%" color="blue" dark={dark} predicted={nextHour?.humidity} />
                <MetricPill label="AQI" value={r.aqi} unit="" color="teal" dark={dark} predicted={nextHour?.aqi} />
                <MetricPill label="Pressure" value={r.pressure} unit=" hPa" color="purple" dark={dark} predicted={nextHour?.pressure} />
              </div>
              {r.recorded_at_display && (
                <div className={`text-xs mt-2 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                  Last updated: {r.recorded_at_display}
                </div>
              )}
            </div>
          )}) : (
            <div className={`px-5 py-10 text-center ${dark ? 'text-gray-600' : 'text-gray-300'} text-sm`}>
              No readings yet — waiting for sensor data
            </div>
          )}
        </div>
      </div>

      {/* Recent alerts */}
      <div className={`rounded-2xl border overflow-hidden ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} shadow-sm`}>
        <div className={`px-5 py-4 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <h2 className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-800'}`}>
            Recent alerts
            {unreadAlerts > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{unreadAlerts} new</span>
            )}
          </h2>
        </div>
        <div className={`divide-y ${dark ? 'divide-gray-800' : 'divide-gray-50'}`}>
          {alerts?.slice(0, 5).map(a => (
            <div key={a.id} className={`px-5 py-3 flex items-start gap-3 ${!a.acknowledged ? (dark ? 'bg-orange-500/5' : 'bg-orange-50') : ''}`}>
              <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${!a.acknowledged ? 'text-orange-500' : dark ? 'text-gray-600' : 'text-gray-300'}`} />
              <div className="flex-1">
                <div className={`text-sm flex items-center gap-2 flex-wrap ${!a.acknowledged ? (dark ? 'text-orange-300' : 'text-orange-800') : (dark ? 'text-gray-500' : 'text-gray-500')}`}>
                  {a.message}
                  {a.is_predicted && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">✨ Predicted</span>
                  )}
                </div>
                <div className={`text-xs mt-0.5 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                  {new Date(a.triggered_at).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}
                </div>
              </div>
              {!a.acknowledged && (
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium shrink-0">New</span>
              )}
            </div>
          )) ?? (
            <div className={`px-5 py-8 text-center text-sm ${dark ? 'text-gray-600' : 'text-gray-300'}`}>No alerts yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
