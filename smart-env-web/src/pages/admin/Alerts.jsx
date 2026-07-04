import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Bell, AlertTriangle, Search, X, CheckCheck, Clock, MapPin } from 'lucide-react'
import { useToast } from '../../components/Toast'
import api from '../../utils/api'
import { useTheme } from '../../context/ThemeContext'

// Then use dark ? 'dark classes' : 'light classes' on containers

const ALERT_TYPES = ['temperature_high','temperature_low','humidity_high','humidity_low','aqi_high','pressure_high','pressure_low']

const TYPE_LABELS = {
  temperature_high: '🌡️ Temperature High',
  temperature_low:  '🌡️ Temperature Low',
  humidity_high:    '💧 Humidity High',
  humidity_low:     '💧 Humidity Low',
  aqi_high:         '🌫️ AQI High',
  pressure_high:    '📊 Pressure High',
  pressure_low:     '📊 Pressure Low',
}

function getAlertIcon(type) {
  if (type?.includes('temperature')) return '🌡️'
  if (type?.includes('humidity')) return '💧'
  if (type?.includes('aqi')) return '🌫️'
  if (type?.includes('pressure')) return '📊'
  return '⚠️'
}

function getAlertColor(type) {
  if (type?.includes('temperature_high') || type?.includes('aqi')) return {
    border: 'border-red-400', bar: 'bg-red-500', bg: 'bg-red-50',
    iconBg: 'bg-red-100', label: 'text-red-500', title: 'text-red-900',
    messageBg: 'bg-white', messageText: 'text-red-800',
    value: 'text-red-600', threshold: 'text-gray-500', valueLabel: 'text-gray-400',
    arrow: 'text-red-400', time: 'text-red-400',
    dismiss: 'hover:bg-red-100 text-red-400',
    dismissBtn: 'border-red-200 text-red-600 hover:bg-red-100',
    ackBtn: 'bg-red-600 hover:bg-red-700 text-white',
    countdown: 'text-red-400',
  }
  if (type?.includes('humidity_high')) return {
    border: 'border-blue-400', bar: 'bg-blue-500', bg: 'bg-blue-50',
    iconBg: 'bg-blue-100', label: 'text-blue-500', title: 'text-blue-900',
    messageBg: 'bg-white', messageText: 'text-blue-800',
    value: 'text-blue-600', threshold: 'text-gray-500', valueLabel: 'text-gray-400',
    arrow: 'text-blue-400', time: 'text-blue-400',
    dismiss: 'hover:bg-blue-100 text-blue-400',
    dismissBtn: 'border-blue-200 text-blue-600 hover:bg-blue-100',
    ackBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
    countdown: 'text-blue-400',
  }
  return {
    border: 'border-orange-400', bar: 'bg-orange-500', bg: 'bg-orange-50',
    iconBg: 'bg-orange-100', label: 'text-orange-500', title: 'text-orange-900',
    messageBg: 'bg-white', messageText: 'text-orange-800',
    value: 'text-orange-600', threshold: 'text-gray-500', valueLabel: 'text-gray-400',
    arrow: 'text-orange-400', time: 'text-orange-400',
    dismiss: 'hover:bg-orange-100 text-orange-400',
    dismissBtn: 'border-orange-200 text-orange-600 hover:bg-orange-100',
    ackBtn: 'bg-orange-600 hover:bg-orange-700 text-white',
    countdown: 'text-orange-400',
  }
}

// ── Emergency Popup ───────────────────────────────────────────────
function EmergencyPopup({ event, sensors, onDismiss, onAcknowledge }) {
  const [countdown, setCountdown] = useState(30)
  const color = getAlertColor(event.alert_type)

  // Find sensor name + location
  const sensor = sensors?.find(s => s.id === event.sensor_id)
  const sensorName = sensor?.name || 'Unknown sensor'
  const sensorLocation = sensor?.location || ''

  const localTime = new Date(event.triggered_at).toLocaleString('en-LK', {
    timeZone: 'Asia/Colombo',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); onDismiss(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border-2 ${color.border}`}>
        <div className={`h-2 w-full ${color.bar} animate-pulse`} />
        <div className={`${color.bg} px-6 py-5`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${color.iconBg} flex items-center justify-center animate-bounce text-2xl`}>
                {getAlertIcon(event.alert_type)}
              </div>
              <div>
                <div className={`text-xs font-bold uppercase tracking-widest ${color.label} mb-0.5`}>
                  🚨 Emergency Alert
                </div>
                <div className={`text-lg font-bold ${color.title}`}>
                  {TYPE_LABELS[event.alert_type] || event.alert_type}
                </div>
              </div>
            </div>
            <button onClick={onDismiss} className={`p-1.5 rounded-lg ${color.dismiss}`}>
              <X size={16} />
            </button>
          </div>

          {/* Sensor info */}
          <div className={`flex items-center gap-2 text-sm font-semibold ${color.title} mb-3`}>
            <MapPin size={14} className={color.label} />
            {sensorName}
            {sensorLocation && <span className={`font-normal text-xs ${color.time}`}>— {sensorLocation}</span>}
          </div>

          {/* Message */}
          <div className={`${color.messageBg} rounded-xl p-4 mb-4`}>
            <p className={`text-sm font-medium ${color.messageText} mb-3`}>{event.message}</p>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${color.value}`}>{event.actual_value?.toFixed(1)}</div>
                <div className={`text-xs ${color.valueLabel}`}>Actual</div>
              </div>
              <div className={`text-2xl ${color.arrow}`}>→</div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${color.threshold}`}>{event.threshold_value?.toFixed(1)}</div>
                <div className={`text-xs ${color.valueLabel}`}>Limit</div>
              </div>
            </div>
          </div>

          {/* Time + Map link */}
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center gap-1.5 text-xs ${color.time}`}>
              <Clock size={12} /> {localTime}
            </div>
            {sensor?.latitude && sensor?.longitude && (
              
                href={`https://www.google.com/maps?q=${sensor.latitude},${sensor.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 bg-white/50 px-2 py-1 rounded-lg"
              >
                <MapPin size={11} /> View location
              </a>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onDismiss}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${color.dismissBtn}`}>
              Dismiss
            </button>
            <button onClick={() => { onAcknowledge(event.id); onDismiss() }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${color.ackBtn} flex items-center justify-center gap-2`}>
              <CheckCheck size={15} /> Acknowledge
            </button>
          </div>

          {/* Countdown */}
          <div className="mt-3 text-center">
            <div className={`text-xs ${color.countdown}`}>Auto-dismissing in {countdown}s</div>
            <div className="w-full bg-black/10 rounded-full h-1 mt-1">
              <div className={`h-1 rounded-full ${color.bar} transition-all duration-1000`}
                style={{ width: `${(countdown / 30) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────
function Tooltip({ text, children }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  )
}

// ── Rule Modal ────────────────────────────────────────────────────
function RuleModal({ onClose }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState({
    sensor_id: '', alert_type: 'temperature_high',
    threshold_value: '', notify_email: '', is_active: true
  })
  const [saving, setSaving] = useState(false)
  const { data: sensors } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => api.get('/sensors/').then(r => r.data)
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/alerts/rules/', { ...form, threshold_value: parseFloat(form.threshold_value) })
      queryClient.invalidateQueries(['alert-rules'])
      toast('Alert rule created successfully')
      onClose()
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to create rule', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">New alert rule</h3>
            <p className="text-xs text-gray-400 mt-0.5">Trigger when a threshold is crossed</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sensor</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
              value={form.sensor_id} onChange={e => setForm({...form, sensor_id: e.target.value})} required>
              <option value="">Select a sensor...</option>
              {sensors?.filter(s => s.is_active).map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.location}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Alert type</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
              value={form.alert_type} onChange={e => setForm({...form, alert_type: e.target.value})}>
              {ALERT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Threshold value</label>
            <input type="number" step="any"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
              placeholder="e.g. 35"
              value={form.threshold_value} onChange={e => setForm({...form, threshold_value: e.target.value})} required />
            <p className="text-xs text-gray-400 mt-1">Alert fires when reading goes above/below this value</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Notify email <span className="font-normal normal-case text-gray-400">(optional)</span>
            </label>
            <input type="email"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
              placeholder="admin@example.com"
              value={form.notify_email} onChange={e => setForm({...form, notify_email: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-purple-700 hover:bg-purple-800 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
              {saving ? 'Creating...' : 'Create rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Alert Event Card ──────────────────────────────────────────────
function AlertEventCard({ event, sensors, onAcknowledge }) {
  const isUnread = !event.acknowledged
  const sensor = sensors?.find(s => s.id === event.sensor_id)
  const sensorName = sensor?.name || 'Unknown sensor'
  const sensorLocation = sensor?.location || ''

  const localTime = new Date(event.triggered_at).toLocaleString('en-LK', {
    timeZone: 'Asia/Colombo',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true
  })

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isUnread ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white border-gray-100'
    }`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
          isUnread ? 'bg-orange-100' : 'bg-gray-100'
        }`}>
          {getAlertIcon(event.alert_type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Type + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-sm font-bold ${isUnread ? 'text-orange-900' : 'text-gray-700'}`}>
              {TYPE_LABELS[event.alert_type] || event.alert_type}
            </span>
            {isUnread && (
              <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                NEW
              </span>
            )}
            {event.acknowledged && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCheck size={10} /> Acknowledged
              </span>
            )}
          </div>

          {/* Sensor + location */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <MapPin size={11} className="text-gray-400" />
            <span className="font-semibold">{sensorName}</span>
            {sensorLocation && <span className="text-gray-400">— {sensorLocation}</span>}
          </div>

          {/* Message */}
          <p className={`text-sm mb-3 ${isUnread ? 'text-orange-800' : 'text-gray-500'}`}>
            {event.message}
          </p>

          {/* Values */}
          <div className="flex items-center gap-3 mb-2">
            <div className={`text-center px-3 py-1.5 rounded-lg ${isUnread ? 'bg-orange-100' : 'bg-gray-100'}`}>
              <div className={`text-base font-bold ${isUnread ? 'text-orange-700' : 'text-gray-600'}`}>
                {event.actual_value?.toFixed(1)}
              </div>
              <div className="text-xs text-gray-400">Actual</div>
            </div>
            <div className="text-gray-300">vs</div>
            <div className="text-center px-3 py-1.5 rounded-lg bg-gray-100">
              <div className="text-base font-bold text-gray-500">{event.threshold_value?.toFixed(1)}</div>
              <div className="text-xs text-gray-400">Limit</div>
            </div>
          </div>

          {/* Time + Map link */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={11} /> {localTime}
            </div>
            {sensor?.latitude && sensor?.longitude && (
              
                href={`https://www.google.com/maps?q=${sensor.latitude},${sensor.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                <MapPin size={11} /> View on map
              </a>
            )}
          </div>
        </div>

        {/* Acknowledge button */}
        {isUnread && (
          <button onClick={() => onAcknowledge(event.id)}
            className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5">
            <CheckCheck size={13} />
            Acknowledge
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function Alerts() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [ruleSearch, setRuleSearch] = useState('')
  const [eventSearch, setEventSearch] = useState('')
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [emergencyEvent, setEmergencyEvent] = useState(null)
  const [seenEventIds, setSeenEventIds] = useState(new Set())

  const { data: sensors } = useQuery({
    queryKey: ['sensors-all'],
    queryFn: () => api.get('/sensors/').then(r => r.data),
  })

  const { data: rules, isLoading } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => api.get('/alerts/rules/').then(r => r.data)
  })

  const { data: events } = useQuery({
    queryKey: ['alert-events'],
    queryFn: () => api.get('/alerts/events').then(r => r.data),
    refetchInterval: 15000,
  })

  // Show emergency popup for new unacknowledged alerts
  useEffect(() => {
    if (!events) return
    const newUnread = events.find(e => !e.acknowledged && !seenEventIds.has(e.id))
    if (newUnread && !emergencyEvent) {
      setEmergencyEvent(newUnread)
      setSeenEventIds(prev => new Set([...prev, newUnread.id]))
    }
  }, [events])

  const deleteRule = async (id) => {
    if (!confirm('Delete this alert rule?')) return
    try {
      await api.delete(`/alerts/rules/${id}`)
      queryClient.invalidateQueries(['alert-rules'])
      toast('Alert rule deleted')
    } catch {
      toast('Failed to delete rule', 'error')
    }
  }

  const acknowledgeAlert = async (eventId) => {
  // Optimistic update
  queryClient.setQueryData(['alert-events'], (old) =>
    old?.map(e => e.id === eventId ? { ...e, acknowledged: true } : e)
  )

  try {
    await api.patch(`/alerts/events/${eventId}/acknowledge`)
    toast('Alert acknowledged ✓')
    // Force refetch after short delay to sync with server
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['alert-events'] })
      queryClient.refetchQueries({ queryKey: ['unread-alerts'] })
    }, 500)
  } catch (err) {
    // Revert optimistic update on failure
    queryClient.invalidateQueries({ queryKey: ['alert-events'] })
    toast(err.response?.data?.detail || 'Failed to acknowledge', 'error')
  }
}

  const unreadCount = events?.filter(e => !e.acknowledged).length ?? 0

  const filteredRules = rules?.filter(r =>
    !ruleSearch ||
    r.alert_type?.includes(ruleSearch.toLowerCase()) ||
    r.notify_email?.toLowerCase().includes(ruleSearch.toLowerCase())
  )

  const filteredEvents = events
    ?.filter(e => {
      if (!showAcknowledged && e.acknowledged) return false
      if (eventSearch && !e.message?.toLowerCase().includes(eventSearch.toLowerCase())) return false
      return true
    })

  return (
    <div className="p-6 space-y-6">

      {/* Emergency popup */}
      {emergencyEvent && (
        <EmergencyPopup
          event={emergencyEvent}
          sensors={sensors}
          onDismiss={() => setEmergencyEvent(null)}
          onAcknowledge={acknowledgeAlert}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Alert Rules</h1>
          <p className="text-sm mt-0.5">
            {unreadCount > 0
              ? <span className="text-orange-600 font-medium">{unreadCount} alert{unreadCount > 1 ? 's' : ''} need attention</span>
              : <span className="text-gray-400">All clear — no unacknowledged alerts</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-2 rounded-xl text-sm font-medium">
              <AlertTriangle size={15} className="animate-pulse" />
              {unreadCount} unread
            </div>
          )}
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors">
            <Plus size={16} /> New rule
          </button>
        </div>
      </div>

      {/* Rules */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <Bell size={16} className="text-purple-500" />
          <h2 className="font-semibold text-gray-800 text-sm">
            Active rules <span className="text-gray-400 font-normal">({filteredRules?.length ?? 0})</span>
          </h2>
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
              placeholder="Search rules..." value={ruleSearch} onChange={e => setRuleSearch(e.target.value)} />
          </div>
        </div>
        {isLoading ? (
          <div className="px-5 py-10 text-center text-gray-300 text-sm">Loading...</div>
        ) : filteredRules?.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {filteredRules.map(rule => {
              const ruleSensor = sensors?.find(s => s.id === rule.sensor_id)
              return (
                <div key={rule.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0 text-lg">
                    {getAlertIcon(rule.alert_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 text-sm">{TYPE_LABELS[rule.alert_type] || rule.alert_type}</div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      {ruleSensor && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} /> {ruleSensor.name} — {ruleSensor.location}
                        </span>
                      )}
                      <span>Threshold: <strong>{rule.threshold_value}</strong></span>
                      {rule.notify_email && <span>Email: {rule.notify_email}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {rule.is_active ? '● Active' : '○ Disabled'}
                  </span>
                  <Tooltip text="Delete rule">
                    <button onClick={() => deleteRule(rule.id)}
                      className="p-2 hover:bg-red-50 rounded-xl text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </Tooltip>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <Bell size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No alert rules yet</p>
            <p className="text-gray-300 text-xs mt-1">Click "New rule" to get started</p>
          </div>
        )}
      </div>

      {/* Events */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <AlertTriangle size={16} className={unreadCount > 0 ? 'text-orange-500' : 'text-gray-400'} />
          <h2 className="font-semibold text-gray-800 text-sm">
            Alert history
            {unreadCount > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                {unreadCount} new
              </span>
            )}
          </h2>
          {/* Toggle acknowledged */}
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer ml-2">
            <input type="checkbox" checked={showAcknowledged}
              onChange={e => setShowAcknowledged(e.target.checked)}
              className="accent-purple-600 w-3.5 h-3.5" />
            Show acknowledged
          </label>
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
              placeholder="Search events..." value={eventSearch} onChange={e => setEventSearch(e.target.value)} />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {filteredEvents?.length > 0 ? (
            filteredEvents.slice(0, 20).map(event => (
              <AlertEventCard
                key={event.id}
                event={event}
                sensors={sensors}
                onAcknowledge={acknowledgeAlert}
              />
            ))
          ) : (
            <div className="py-10 text-center">
              <CheckCheck size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">
                {showAcknowledged ? 'No alerts triggered yet' : 'No unacknowledged alerts'}
              </p>
              <p className="text-gray-300 text-xs mt-1">
                {!showAcknowledged && 'Check "Show acknowledged" to see past alerts'}
              </p>
            </div>
          )}
        </div>
      </div>

      {modalOpen && <RuleModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
