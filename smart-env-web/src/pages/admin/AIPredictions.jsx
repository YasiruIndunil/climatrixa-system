import { useState } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import {
  BrainCircuit, CheckCircle, RefreshCw, ThermometerSun, Droplets, Wind, Gauge,
  Sparkles, TrendingUp
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../components/Toast'
import PageWrapper, { Card, CardHeader, PageTitle, LoadingSpinner } from '../../components/PageWrapper'
import api from '../../utils/api'

const FORECAST_PARAMS = [
  { key: 'temperature', label: 'Temp',     icon: ThermometerSun, unit: '°C',  stroke: '#f87171' },
  { key: 'humidity',    label: 'Humidity', icon: Droplets,       unit: '%',   stroke: '#60a5fa' },
  { key: 'aqi',         label: 'AQI',      icon: Wind,           unit: '',    stroke: '#2dd4bf' },
  { key: 'pressure',    label: 'Pressure', icon: Gauge,          unit: 'hPa', stroke: '#c084fc' },
]

function SensorAIPanel({ sensor, forecast, isTraining, isTrained, onTrain, dark }) {
  const [activeParam, setActiveParam] = useState('temperature')
  const param = FORECAST_PARAMS.find(p => p.key === activeParam)

  const chartData = forecast?.forecast?.map(f => ({
    hour: `+${f.hours_ahead}h`,
    value: f[activeParam],
  })) || []
  const values = chartData.map(d => d.value).filter(v => v != null)
  const peak = values.length ? Math.max(...values) : null
  const low = values.length ? Math.min(...values) : null
  const range = (peak != null && low != null) ? peak - low : 0
  const pad = range > 0 ? Math.max(range * 0.15, activeParam === 'aqi' ? 5 : activeParam === 'pressure' ? 0.5 : 0.3) : (activeParam === 'aqi' ? 20 : activeParam === 'pressure' ? 2 : 1)
  const yDomain = low != null && peak != null ? [Math.floor(low - pad), Math.ceil(peak + pad)] : ['auto', 'auto']

  return (
    <Card>
      <CardHeader>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
          <BrainCircuit size={16} className="text-indigo-500"/>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-800'}`}>{sensor.name}</h2>
          <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{sensor.location}</p>
        </div>
        <button
          onClick={() => onTrain(sensor)}
          disabled={isTraining}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
            isTraining
              ? dark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isTraining ? <RefreshCw size={12} className="animate-spin"/> : <RefreshCw size={12}/>}
          {isTraining ? 'Training...' : 'Retrain'}
        </button>
      </CardHeader>

      <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
        {isTrained ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-1 rounded-full">
            <CheckCircle size={11}/> Model trained
          </span>
        ) : (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${dark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
            Not trained yet
          </span>
        )}
      </div>

      {!forecast?.forecast?.length ? (
        <div className="px-5 pb-6">
          <div className={`rounded-xl p-6 text-center text-xs ${dark ? 'bg-gray-800/50 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
            <Sparkles size={18} className="mx-auto mb-2 opacity-40"/>
            No forecast available — train the model to generate one
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-1 px-5 pb-2">
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
          <div className="px-2">
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`admin-grad-${sensor.id}-${activeParam}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={param.stroke} stopOpacity={0.35}/>
                    <stop offset="95%" stopColor={param.stroke} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#1f2937' : '#f1f5f9'} vertical={false}/>
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: dark ? '#6b7280' : '#9ca3af' }} interval={3} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: dark ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} width={50} domain={yDomain}/>
                <Tooltip
                  contentStyle={{ background: dark ? '#111827' : '#fff', border: dark ? '1px solid #374151' : '1px solid #e5e7eb', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: dark ? '#9ca3af' : '#6b7280' }}
                  formatter={(v) => [`${v}${param.unit}`, param.label]}
                />
                <Area type="monotone" dataKey="value" stroke={param.stroke} strokeWidth={2.5} fill={`url(#admin-grad-${sensor.id}-${activeParam})`}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className={`px-5 py-3 flex items-center justify-between text-xs border-t mt-2 ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
            <span className={dark ? 'text-gray-500' : 'text-gray-400'}>
              Peak <span className={`font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{peak}{param.unit}</span>
            </span>
            <span className={dark ? 'text-gray-500' : 'text-gray-400'}>
              Low <span className={`font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{low}{param.unit}</span>
            </span>
            {forecast.generated_at && (
              <span className={dark ? 'text-gray-600' : 'text-gray-400'}>
                {new Date(forecast.generated_at).toLocaleTimeString('en-LK', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </>
      )}
    </Card>
  )
}

export default function AIPredictions() {
  const { dark } = useTheme()
  const toast = useToast()
  const [trainingIds, setTrainingIds] = useState(new Set())

  const { data: sensors, isLoading: sensorsLoading } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => api.get('/sensors/').then(r => r.data),
  })

  const activeSensors = sensors?.filter(s => s.is_active) || []

  const forecastQueries = useQueries({
    queries: activeSensors.map(s => ({
      queryKey: ['forecast', s.id],
      // Longer timeout than the default 30s — a sensor not yet retrained
      // under the pre-fitted-model scheme falls back to a live model fit,
      // which can take longer than the default on Render's shared vCPU.
      queryFn: () => api.get(`/ai/forecast/${s.id}`, { timeout: 60000 }).then(r => r.data),
      retry: false,
      staleTime: 5 * 60 * 1000,
    }))
  })

  const statusQueries = useQueries({
    queries: activeSensors.map(s => ({
      queryKey: ['train-status', s.id],
      queryFn: () => api.get(`/ai/train/status/${s.id}`).then(r => r.data),
      retry: false,
    }))
  })

  const forecastMap = Object.fromEntries(activeSensors.map((s, i) => [s.id, forecastQueries[i]?.data]))
  const trainedMap = Object.fromEntries(activeSensors.map((s, i) => [s.id, statusQueries[i]?.data?.is_trained]))

  const trainModel = async (sensor) => {
    setTrainingIds(prev => new Set([...prev, sensor.id]))
    try {
      await api.post(`/ai/train/${sensor.id}`)
      toast(`Training started for ${sensor.name} — takes ~60-90 seconds`)
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          const res = await api.get(`/ai/train/status/${sensor.id}`)
          if (res.data.is_trained) {
            clearInterval(poll)
            setTrainingIds(prev => { const n = new Set(prev); n.delete(sensor.id); return n })
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

  return (
    <PageWrapper>
      <PageTitle title="AI Predictions" subtitle="Manage forecasting models, view predictions, and monitor training across all sensors" />

      {sensorsLoading ? (
        <LoadingSpinner label="Loading sensors..." fullHeight/>
      ) : activeSensors.length === 0 ? (
        <div className={`rounded-2xl border p-10 text-center text-sm ${dark ? 'bg-gray-900 border-gray-800 text-gray-500' : 'bg-white border-gray-100 text-gray-400'}`}>
          No active sensors found
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          {activeSensors.map(sensor => (
            <SensorAIPanel
              key={sensor.id}
              sensor={sensor}
              forecast={forecastMap[sensor.id]}
              isTraining={trainingIds.has(sensor.id)}
              isTrained={trainedMap[sensor.id]}
              onTrain={trainModel}
              dark={dark}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
