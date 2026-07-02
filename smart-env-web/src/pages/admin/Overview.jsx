import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wifi, Users, Bell, Activity, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import api from '../../utils/api'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-800">{value ?? '—'}</div>
    </div>
  )
}

function AQIBadge({ status }) {
  const colors = {
    Good: 'bg-green-100 text-green-700',
    Moderate: 'bg-yellow-100 text-yellow-700',
    'Unhealthy for sensitive groups': 'bg-orange-100 text-orange-700',
    Unhealthy: 'bg-red-100 text-red-700',
    'Very Unhealthy': 'bg-purple-100 text-purple-700',
    Hazardous: 'bg-gray-800 text-white',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export default function Overview() {
  const { data: sensors } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => api.get('/sensors/').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: readings } = useQuery({
    queryKey: ['latest-readings'],
    queryFn: () => api.get('/readings/latest').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: alerts } = useQuery({
    queryKey: ['alert-events'],
    queryFn: () => api.get('/alerts/events').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/auth/users/').then(r => r.data),
    refetchInterval: 120000,
  })

  const activeSensors = sensors?.filter(s => s.is_active)?.length ?? 0
  const totalUsers = users?.length ?? 0
  const todayAlerts = alerts?.filter(a => {
    const d = new Date(a.triggered_at)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  })?.length ?? 0

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Admin Overview</h1>
        <p className="text-sm text-gray-500 mt-1">System status and recent activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Wifi} label="Active sensors" value={activeSensors} color="bg-teal-500" />
        <StatCard icon={Users} label="Total users" value={totalUsers} color="bg-blue-500" />
        <StatCard icon={Bell} label="Alerts today" value={todayAlerts} color="bg-orange-500" />
        <StatCard icon={Activity} label="Readings (live)" value="Every 30s" color="bg-purple-500" />
      </div>

      {/* Live sensor readings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Live sensor readings</h2>
          <span className="text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded-full">● Live</span>
        </div>
        <div className="divide-y divide-gray-50">
          {readings?.length > 0 ? readings.map((r) => (
            <div key={r.sensor_id} className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-gray-800 text-sm">{r.sensor_name}</div>
                  <div className="text-xs text-gray-400">{r.location}</div>
                </div>
                <AQIBadge status={r.aqi_status} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Temp', value: `${r.temperature}°C`, color: 'bg-red-50 text-red-600' },
                  { label: 'Humidity', value: `${r.humidity}%`, color: 'bg-blue-50 text-blue-600' },
                  { label: 'AQI', value: r.aqi, color: 'bg-teal-50 text-teal-600' },
                  { label: 'Pressure', value: `${r.pressure} hPa`, color: 'bg-purple-50 text-purple-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`${color} rounded-lg p-2 text-center`}>
                    <div className="text-xs opacity-70">{label}</div>
                    <div className="font-semibold text-sm">{value}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-400 mt-2">{r.recorded_at_display}</div>
            </div>
          )) : (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No readings yet</div>
          )}
        </div>
      </div>

      {/* Recent alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Recent alerts</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {alerts?.slice(0, 5).map((a) => (
            <div key={a.id} className="px-5 py-3 flex items-start gap-3">
              <AlertTriangle size={16} className="text-orange-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">{a.message}</div>
                <div className="text-xs text-gray-400 mt-0.5">{a.triggered_at}</div>
              </div>
            </div>
          )) ?? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No alerts yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
