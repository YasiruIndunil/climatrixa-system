import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/useAuth'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../components/Toast'
import api from '../../utils/api'
import { Bell, CheckCheck, Clock, MapPin, AlertTriangle, X } from 'lucide-react'

const TYPE_LABELS = {
  temperature_high: '🌡️ Temperature High',
  temperature_low:  '🌡️ Temperature Low',
  humidity_high:    '💧 Humidity High',
  humidity_low:     '💧 Humidity Low',
  aqi_high:         '🌫️ AQI High',
  pressure_high:    '📊 Pressure High',
  pressure_low:     '📊 Pressure Low',
}

function getIcon(type) {
  if (type?.includes('temperature')) return '🌡️'
  if (type?.includes('humidity')) return '💧'
  if (type?.includes('aqi')) return '🌫️'
  if (type?.includes('pressure')) return '📊'
  return '⚠️'
}

export default function PublicAlerts() {
  const { user } = useAuth()
  const { dark } = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [search, setSearch] = useState('')

  const { data: mySensors } = useQuery({
    queryKey: ['my-sensors', user?.id],
    queryFn: () => api.get(`/access/users/${user.id}/sensors`).then(r => r.data),
    enabled: !!user?.id,
  })

  const { data: events, isLoading } = useQuery({
    queryKey: ['public-alert-events'],
    queryFn: () => api.get('/alerts/events').then(r => r.data),
    refetchInterval: 20000,
  })

  const assignedIds = new Set(mySensors?.map(row => row.sensors?.id).filter(Boolean) || [])
  const sensorMap = Object.fromEntries(
    (mySensors || []).map(row => [row.sensors?.id, row.sensors]).filter(([id]) => id)
  )

  // Only show alerts for my sensors
  const myEvents = (events || []).filter(e => assignedIds.has(e.sensor_id))
  const unreadCount = myEvents.filter(e => !e.acknowledged).length

  const filtered = myEvents
    .filter(e => showAcknowledged ? true : !e.acknowledged)
    .filter(e => !search || e.message?.toLowerCase().includes(search.toLowerCase()) ||
      TYPE_LABELS[e.alert_type]?.toLowerCase().includes(search.toLowerCase()))

  const acknowledgeAlert = async id => {
    queryClient.setQueryData(['public-alert-events'], old =>
      old?.map(e => e.id === id ? { ...e, acknowledged: true } : e)
    )
    try {
      await api.patch(`/alerts/events/${id}/acknowledge`)
      toast('Alert acknowledged ✓')
      setTimeout(() => queryClient.refetchQueries({ queryKey: ['public-alert-events'] }), 500)
    } catch {
      queryClient.invalidateQueries({ queryKey: ['public-alert-events'] })
      toast('Failed to acknowledge', 'error')
    }
  }

  const sub   = dark ? 'text-gray-500' : 'text-gray-400'
  const head  = dark ? 'text-white'    : 'text-gray-900'
  const card  = `rounded-2xl border shadow-sm ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`
  const input = `border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
    dark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900'
  }`

  return (
    <div className={`p-6 ${dark ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-xl font-bold ${head}`}>My Alerts</h1>
          <p className={`text-sm mt-0.5 ${sub}`}>
            {unreadCount > 0
              ? <span className="text-orange-500 font-medium">{unreadCount} alert{unreadCount !== 1 ? 's' : ''} need your attention</span>
              : 'All clear — no unacknowledged alerts'}
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-2 rounded-xl text-sm font-medium">
            <AlertTriangle size={15} className="animate-pulse"/> {unreadCount} unread
          </div>
        )}
      </div>

      {/* Filters */}
      <div className={`${card} mb-6`}>
        <div className={`px-5 py-4 border-b flex items-center gap-3 flex-wrap ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <Bell size={16} className={unreadCount > 0 ? 'text-orange-500' : 'text-teal-500'}/>
          <h2 className={`font-semibold text-sm ${head}`}>
            Alert history
            {unreadCount > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{unreadCount} new</span>
            )}
          </h2>
          <label className={`flex items-center gap-2 text-xs cursor-pointer ml-1 ${sub}`}>
            <input type="checkbox" checked={showAcknowledged} onChange={e => setShowAcknowledged(e.target.checked)}
              className="accent-teal-600 w-3.5 h-3.5"/>
            Show acknowledged
          </label>
          <div className="ml-auto">
            <input className={input + ' w-52'} placeholder="Search alerts..."
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className={`py-10 text-center text-sm ${sub}`}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className={`py-10 text-center ${sub}`}>
              <CheckCheck size={32} className={`mx-auto mb-2 ${dark ? 'text-gray-700' : 'text-gray-200'}`}/>
              <p className="text-sm">{showAcknowledged ? 'No alerts triggered yet' : 'No unacknowledged alerts'}</p>
              {!showAcknowledged && (
                <p className={`text-xs mt-1 ${dark ? 'text-gray-700' : 'text-gray-300'}`}>
                  Check "Show acknowledged" to see past alerts
                </p>
              )}
            </div>
          ) : (
            filtered.slice(0, 30).map(event => {
              const isUnread = !event.acknowledged
              const sensor = sensorMap[event.sensor_id]
              const isHigh = event.alert_type?.includes('high') || event.alert_type?.includes('aqi')

              const localTime = new Date(event.triggered_at).toLocaleString('en-LK', {
                timeZone: 'Asia/Colombo',
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
              })

              return (
                <div key={event.id} className={`p-4 rounded-xl border transition-all ${
                  isUnread
                    ? dark ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-50 border-orange-200 shadow-sm'
                    : dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                      isUnread ? dark ? 'bg-orange-500/10' : 'bg-orange-100' : dark ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      {getIcon(event.alert_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-sm font-bold ${isUnread ? dark ? 'text-orange-300' : 'text-orange-900' : dark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {TYPE_LABELS[event.alert_type] || event.alert_type}
                        </span>
                        {isUnread && <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">NEW</span>}
                        {event.acknowledged && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <CheckCheck size={10}/> Acknowledged
                          </span>
                        )}
                      </div>

                      {sensor && (
                        <div className={`flex items-center gap-1.5 text-xs mb-2 ${sub}`}>
                          <MapPin size={11}/>
                          <span className={`font-semibold ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{sensor.name}</span>
                          {sensor.location && <span>— {sensor.location}</span>}
                        </div>
                      )}

                      <p className={`text-sm mb-3 ${isUnread ? dark ? 'text-orange-200' : 'text-orange-800' : dark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {event.message}
                      </p>

                      <div className="flex items-center gap-3 mb-2">
                        <div className={`text-center px-3 py-1.5 rounded-lg ${isUnread ? dark ? 'bg-orange-500/10' : 'bg-orange-100' : dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div className={`text-base font-bold ${isUnread ? dark ? 'text-orange-400' : 'text-orange-700' : dark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {event.actual_value?.toFixed(1)}
                          </div>
                          <div className={`text-xs ${sub}`}>Actual</div>
                        </div>
                        <div className={`text-sm ${dark ? 'text-gray-600' : 'text-gray-300'}`}>vs</div>
                        <div className={`text-center px-3 py-1.5 rounded-lg ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div className={`text-base font-bold ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{event.threshold_value?.toFixed(1)}</div>
                          <div className={`text-xs ${sub}`}>Limit</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-1 text-xs ${sub}`}><Clock size={11}/> {localTime}</div>
                        {sensor?.latitude && sensor?.longitude && (
                          <a href={`https://www.google.com/maps?q=${sensor.latitude},${sensor.longitude}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700">
                            <MapPin size={11}/> View on map
                          </a>
                        )}
                      </div>
                    </div>

                    {isUnread && (
                      <button onClick={() => acknowledgeAlert(event.id)}
                        className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5">
                        <CheckCheck size={13}/> Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
