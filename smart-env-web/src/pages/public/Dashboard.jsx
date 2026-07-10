import { useState } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useAuth } from '../../context/useAuth'
import { useTheme } from '../../context/ThemeContext'
import { useAlertWS } from '../../components/Toast'
import api from '../../utils/api'
import { Radio, Bell, BellOff, Activity, ThermometerSun, Droplets, Wind, Gauge, TrendingUp, Sparkles, AlertTriangle, ChevronRight } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { LoadingSpinner } from '../../components/PageWrapper'

function MetricCard({ label, value, unit, icon: Icon, color, dark, predicted }) {
  const colors = {
    red:    dark ? 'bg-red-500/10 text-red-400 border-red-500/20'       : 'bg-red-50 text-red-600 border-red-100',
    blue:   dark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'     : 'bg-blue-50 text-blue-600 border-blue-100',
    teal:   dark ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'     : 'bg-teal-50 text-teal-600 border-teal-100',
    purple: dark ? 'bg-purple-500/10 text-purple-400 border-purple-500/20': 'bg-purple-50 text-purple-600 border-purple-100',
  }
  const predictedText = {
    red:    dark ? 'text-red-400'    : 'text-red-500',
    blue:   dark ? 'text-blue-400'   : 'text-blue-500',
    teal:   dark ? 'text-teal-400'   : 'text-teal-500',
    purple: dark ? 'text-purple-400' : 'text-purple-500',
  }
return (
  <div
    className={`rounded-xl p-3 border shadow-sm ${
      dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
    }`}
  >
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

      {/* Icon + Label */}
      <div className="flex items-center sm:flex-col sm:w-14 gap-3 sm:gap-1 shrink-0">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colors[color]}`}
        >
          <Icon size={16}/>
        </div>

        <span
          className={`text-xs font-medium ${
            dark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {label}
        </span>
      </div>


      {/* Value */}
      <div className="flex-1 flex justify-center">
        <div
          className={`text-2xl sm:text-3xl font-bold ${
            dark ? "text-white" : "text-gray-900"
          }`}
        >
          {value != null ? `${value}${unit}` : "—"}
        </div>
      </div>


      {/* Forecast */}
      {predicted != null && (
        <div
          className={`text-center sm:text-right border-t sm:border-t-0 sm:border-l border-dashed pt-2 sm:pt-0 sm:pl-3 ${
            dark ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div
            className={`text-[9px] font-bold uppercase flex items-center justify-center sm:justify-end gap-1 ${
              dark ? "text-gray-600" : "text-gray-400"
            }`}
          >
            <Sparkles size={8}/>
            AI Forecast
          </div>

          <div
            className={`text-xs font-bold flex justify-center sm:justify-end items-center gap-1 ${predictedText[color]}`}
          >
            <TrendingUp size={10}/>
            {predicted}{unit}
          </div>

          <div
            className={`text-[10px] ${
              dark ? "text-gray-600" : "text-gray-400"
            }`}
          >
            in 1 hour
          </div>
        </div>
      )}

    </div>
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

function SensorReadingCard({ reading, subscription, forecast, dark }) {
  // Which params have alerts on?
  const enabledParams = PARAM_LABELS.filter(p => subscription?.[p.key] === true)
  const anyEnabled = enabledParams.length > 0

  // Next-hour prediction (hours_ahead: 1) from AI forecast
  const nextHour = forecast?.forecast?.find(f => f.hours_ahead === 1)

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
          { label: 'Temperature', value: reading.temperature, unit: '°C', icon: ThermometerSun, color: 'red',    predicted: nextHour?.temperature },
          { label: 'Humidity',    value: reading.humidity,    unit: '%',  icon: Droplets,       color: 'blue',   predicted: nextHour?.humidity },
          { label: 'AQI',         value: reading.aqi,         unit: '',   icon: Wind,           color: 'teal',   predicted: nextHour?.aqi },
          { label: 'Pressure',    value: reading.pressure,    unit: ' hPa', icon: Gauge,        color: 'purple', predicted: nextHour?.pressure },
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

const FORECAST_PARAMS = [
  { key: 'temperature', label: 'Temp',     icon: ThermometerSun, unit: '°C',  stroke: '#f87171', fill: '#fee2e2' },
  { key: 'humidity',    label: 'Humidity', icon: Droplets,       unit: '%',   stroke: '#60a5fa', fill: '#dbeafe' },
  { key: 'aqi',         label: 'AQI',      icon: Wind,           unit: '',    stroke: '#2dd4bf', fill: '#ccfbf1' },
  { key: 'pressure',    label: 'Pressure', icon: Gauge,          unit: 'hPa', stroke: '#c084fc', fill: '#f3e8ff' },
]

function ForecastChartCard({ sensorName, forecast, dark }) {
  const [activeParam, setActiveParam] = useState('temperature')
  const param = FORECAST_PARAMS.find(p => p.key === activeParam)

  if (!forecast || !forecast.forecast?.length) {
    return (
      <div className={`rounded-2xl border shadow-sm p-6 flex flex-col items-center justify-center text-center min-h-[220px] ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <Sparkles size={22} className={`mb-2 ${dark ? 'text-gray-700' : 'text-gray-200'}`}/>
        <p className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Forecast building for {sensorName}…</p>
      </div>
    )
  }

  const chartData = forecast.forecast.map(f => ({
    hour: `+${f.hours_ahead}h`,
    value: f[activeParam],
  }))

  const values = chartData.map(d => d.value).filter(v => v != null)
  const peak = values.length ? Math.max(...values) : null
  const low = values.length ? Math.min(...values) : null
  const peakHour = chartData.find(d => d.value === peak)?.hour

  // Compute sensible Y-axis domain per parameter (AQI/Pressure need wider padding)
  const range = (peak != null && low != null) ? peak - low : 0
  const pad = range > 0 ? Math.max(range * 0.15, activeParam === 'aqi' ? 5 : activeParam === 'pressure' ? 0.5 : 0.3) : (activeParam === 'aqi' ? 20 : activeParam === 'pressure' ? 2 : 1)
  const yDomain = low != null && peak != null ? [Math.floor(low - pad), Math.ceil(peak + pad)] : ['auto', 'auto']
  const tickFmt = activeParam === 'aqi' ? (v => Math.round(v)) : (v => Number(v.toFixed(1)))

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
      <div className={`px-5 py-4 border-b flex items-center justify-between ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
            <TrendingUp size={15} className="text-indigo-500"/>
          </div>
          <div>
            <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{sensorName}</div>
            <div className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Next 24 hours</div>
          </div>
        </div>
        {forecast.anomaly_detected && (
          <span className="flex items-center gap-1 text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
            <AlertTriangle size={11}/> Anomaly
          </span>
        )}
      </div>

      {/* Param tabs */}
      <div className={`flex gap-1 px-4 pt-3`}>
        {FORECAST_PARAMS.map(p => (
          <button
            key={p.key}
            onClick={() => setActiveParam(p.key)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
              activeParam === p.key
                ? dark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                : dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <p.icon size={12}/> {p.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="px-2 pt-2">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${activeParam}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={param.stroke} stopOpacity={0.35}/>
                <stop offset="95%" stopColor={param.stroke} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#1f2937' : '#f1f5f9'} vertical={false}/>
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: dark ? '#6b7280' : '#9ca3af' }} interval={3} axisLine={false} tickLine={false}/>
            <YAxis
              tick={{ fontSize: 10, fill: dark ? '#6b7280' : '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={50}
              domain={yDomain}
              tickFormatter={tickFmt}
            />
            <Tooltip
              contentStyle={{
                background: dark ? '#111827' : '#fff',
                border: dark ? '1px solid #374151' : '1px solid #e5e7eb',
                borderRadius: 10, fontSize: 12,
              }}
              labelStyle={{ color: dark ? '#9ca3af' : '#6b7280' }}
              formatter={(v) => [`${v}${param.unit}`, param.label]}
            />
            <Area type="monotone" dataKey="value" stroke={param.stroke} strokeWidth={2.5} fill={`url(#grad-${activeParam})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Peak/low summary */}
      <div className={`px-5 py-3 flex items-center justify-between text-xs border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
        <span className={dark ? 'text-gray-500' : 'text-gray-400'}>
          Peak <span className={`font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{peak}{param.unit}</span> at {peakHour}
        </span>
        <span className={dark ? 'text-gray-500' : 'text-gray-400'}>
          Low <span className={`font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{low}{param.unit}</span>
        </span>
      </div>
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

  // Fetch AI forecast for each assigned sensor
  const forecastQueries = useQueries({
    queries: sensorIdList.map(sensorId => ({
      queryKey: ['forecast', sensorId],
      queryFn: () => api.get(`/ai/forecast/${sensorId}`).then(r => r.data),
      enabled: !!sensorId,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 min — forecast doesn't need to refetch constantly
    }))
  })
  const forecastMap = Object.fromEntries(
    sensorIdList.map((id, i) => [id, forecastQueries[i]?.data])
  )
  const sensorNameMap = Object.fromEntries(
    myReadings.map(r => [r.sensor_id, r.sensor_name])
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
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">

  {[
    {
      title:"Sensors",
      value:myReadings.length,
      icon:Radio,
      color:"teal"
    },
    {
      title:"Alerts",
      value:unreadCount,
      icon:Bell,
      color:"orange"
    },
    {
      title:"Status",
      value:connected ? "Live" : "Off",
      icon:Activity,
      color:"purple",
      status:true
    }
  ].map((item)=>{

    const Icon=item.icon

    return (
      <div
        key={item.title}
        className={`rounded-xl p-3 border shadow-sm ${
          dark
          ? "bg-gray-900 border-gray-800"
          : "bg-white border-gray-100"
        }`}
      >

        <div className="flex items-center">

          <div className="flex flex-col items-center w-14 shrink-0">

            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                item.color==="teal"
                ? dark
                  ?"bg-teal-500/10 text-teal-400 border-teal-500/20"
                  :"bg-teal-50 text-teal-600 border-teal-100"

                : item.color==="orange"
                ? dark
                  ?"bg-orange-500/10 text-orange-400 border-orange-500/20"
                  :"bg-orange-50 text-orange-600 border-orange-100"

                : dark
                  ?"bg-purple-500/10 text-purple-400 border-purple-500/20"
                  :"bg-purple-50 text-purple-600 border-purple-100"
              }`}
            >
              <Icon size={16}/>
            </div>


            <span
              className={`mt-1 text-[11px] ${
                dark ? "text-gray-500":"text-gray-400"
              }`}
            >
              {item.title}
            </span>

          </div>


          <div className="flex-1 flex justify-center items-center gap-2">

            <span
              className={`text-2xl font-bold ${
                dark ? "text-white":"text-gray-900"
              }`}
            >
              {item.value}
            </span>


            {item.status && (
              <span
                className={`w-2 h-2 rounded-full ${
                  connected
                  ?"bg-teal-400 animate-pulse"
                  :"bg-red-400"
                }`}
              />
            )}

          </div>

        </div>

      </div>
    )
  })}

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
        <div className={`rounded-2xl border ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <LoadingSpinner label="Loading sensor data..."/>
        </div>
      ) : myReadings.length === 0 ? (
        <div className={`rounded-2xl border p-10 text-center ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <Radio size={36} className={`mx-auto mb-3 ${dark ? 'text-gray-700' : 'text-gray-200'}`}/>
          <p className={`text-sm font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>No sensors assigned yet</p>
          <p className={`text-xs mt-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Contact your administrator to get sensor access</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myReadings.map(r => <SensorReadingCard key={r.sensor_id} reading={r} subscription={subscriptionMap[r.sensor_id]} forecast={forecastMap[r.sensor_id]} dark={dark}/>)}
        </div>
      )}

      {/* AI Forecast section */}
      {myReadings.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${dark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
              <Sparkles size={13} className="text-indigo-500"/>
            </div>
            <h2 className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-800'}`}>AI Forecast — Next 24 hours</h2>
            <span className={`text-xs ml-auto ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Powered by machine learning</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sensorIdList.map(sensorId => (
              <ForecastChartCard
                key={sensorId}
                sensorName={sensorNameMap[sensorId] || 'Sensor'}
                forecast={forecastMap[sensorId]}
                dark={dark}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
