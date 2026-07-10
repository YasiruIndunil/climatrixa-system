import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Bell, AlertTriangle, Search, X, CheckCheck, Clock, MapPin } from 'lucide-react'
import { useToast } from '../../components/Toast'
import { useTheme } from '../../context/ThemeContext'
import api from '../../utils/api'

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

// ── Emergency Popup ───────────────────────────────────────────────
function EmergencyPopup({ event, sensors, onDismiss, onAcknowledge }) {
  const [countdown, setCountdown] = useState(30)
  const sensor = sensors?.find(s => s.id === event.sensor_id)
  const sensorName = sensor?.name || 'Unknown sensor'
  const sensorLocation = sensor?.location || ''

  const localTime = new Date(event.triggered_at).toLocaleString('en-LK', {
    timeZone: 'Asia/Colombo',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true
  })

  const isHigh = event.alert_type?.includes('high') || event.alert_type?.includes('aqi')
  const borderColor = isHigh ? 'border-red-400' : 'border-orange-400'
  const barColor = isHigh ? 'bg-red-500' : 'bg-orange-500'
  const bgColor = isHigh ? 'bg-red-50' : 'bg-orange-50'
  const iconBg = isHigh ? 'bg-red-100' : 'bg-orange-100'
  const labelColor = isHigh ? 'text-red-500' : 'text-orange-500'
  const titleColor = isHigh ? 'text-red-900' : 'text-orange-900'
  const valueColor = isHigh ? 'text-red-600' : 'text-orange-600'
  const timeColor = isHigh ? 'text-red-400' : 'text-orange-400'
  const ackBtnColor = isHigh ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
  const dismissBtnColor = isHigh ? 'border-red-200 text-red-600 hover:bg-red-100' : 'border-orange-200 text-orange-600 hover:bg-orange-100'

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
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border-2 ${borderColor}`}>
        <div className={`h-2 w-full ${barColor} animate-pulse`} />
        <div className={`${bgColor} px-6 py-5`}>

          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center animate-bounce text-2xl`}>
                {getAlertIcon(event.alert_type)}
              </div>
              <div>
                <div className={`text-xs font-bold uppercase tracking-widest ${labelColor} mb-0.5`}>
                  🚨 Emergency Alert
                </div>
                <div className={`text-lg font-bold ${titleColor}`}>
                  {TYPE_LABELS[event.alert_type] || event.alert_type}
                </div>
              </div>
            </div>
            <button onClick={onDismiss} className="p-1.5 rounded-lg hover:bg-black/10 text-gray-500">
              <X size={16} />
            </button>
          </div>

          {/* Sensor info */}
          <div className={`flex items-center gap-2 text-sm font-semibold ${titleColor} mb-3`}>
            <MapPin size={14} className={labelColor} />
            {sensorName}
            {sensorLocation && <span className={`font-normal text-xs ${timeColor}`}>— {sensorLocation}</span>}
          </div>

          {/* Message + values */}
          <div className="bg-white rounded-xl p-4 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">{event.message}</p>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${valueColor}`}>{event.actual_value?.toFixed(1)}</div>
                <div className="text-xs text-gray-400">Actual</div>
              </div>
              <div className="text-2xl text-gray-300">→</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">{event.threshold_value?.toFixed(1)}</div>
                <div className="text-xs text-gray-400">Limit</div>
              </div>
            </div>
          </div>

          {/* Time + map */}
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center gap-1.5 text-xs ${timeColor}`}>
              <Clock size={12} /> {localTime}
            </div>
            {sensor?.latitude && sensor?.longitude && (
              <a
                href={"https://www.google.com/maps?q=" + sensor.latitude + "," + sensor.longitude}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 bg-white/70 px-2 py-1 rounded-lg"
              >
                <MapPin size={11} /> View on map
              </a>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onDismiss}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${dismissBtnColor}`}>
              Dismiss
            </button>
            <button onClick={() => { onAcknowledge(event.id); onDismiss() }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${ackBtnColor} text-white flex items-center justify-center gap-2`}>
              <CheckCheck size={15} /> Acknowledge
            </button>
          </div>

          {/* Countdown */}
          <div className="mt-3 text-center">
            <div className={`text-xs ${timeColor}`}>Auto-dismissing in {countdown}s</div>
            <div className="w-full bg-black/10 rounded-full h-1 mt-1">
              <div className={`h-1 rounded-full ${barColor} transition-all duration-1000`}
                style={{ width: (countdown / 30 * 100) + '%' }} />
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
  const { dark } = useTheme()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState({
    sensor_id: '', alert_type: 'temperature_high',
    threshold_value: '', notify_email: '', is_active: true,
    trigger_on_actual: true, trigger_on_predicted: false
  })
  const [saving, setSaving] = useState(false)
  const { data: sensors } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => api.get('/sensors/').then(r => r.data)
  })
  const { data: existingRules } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => api.get('/alerts/rules/').then(r => r.data)
  })

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)

    // Check for duplicate sensor + alert_type combination
    const duplicate = existingRules?.find(r =>
      r.sensor_id === form.sensor_id && r.alert_type === form.alert_type
    )
    if (duplicate) {
      toast(`A ${form.alert_type.replace(/_/g, ' ')} rule already exists for this sensor (threshold: ${duplicate.threshold_value}). Edit or delete the existing rule instead.`, 'error')
      setSaving(false)
      return
    }

    try {
      const payload = {
        sensor_id: form.sensor_id,
        alert_type: form.alert_type,
        threshold_value: parseFloat(form.threshold_value),
        is_active: form.is_active,
        trigger_on_actual: form.trigger_on_actual,
        trigger_on_predicted: form.trigger_on_predicted,
        // Send null if empty — backend expects EmailStr or null, not empty string
        notify_email: form.notify_email.trim() || null,
      }
      await api.post('/alerts/rules/', payload)
      queryClient.invalidateQueries(['alert-rules'])
      toast('Alert rule created successfully')
      onClose()
    } catch (err) {
      const detail = err.response?.data?.detail
      // FastAPI 422 returns detail as array of objects — extract messages
      const msg = Array.isArray(detail)
        ? detail.map(d => d.msg).join(', ')
        : (typeof detail === 'string' ? detail : 'Failed to create rule')
      toast(msg, 'error')
    } finally { setSaving(false) }
  }

  const inputClass = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
    dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
  }`

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl border ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className={`px-6 py-5 border-b flex items-center justify-between ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <div>
            <h3 className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>New alert rule</h3>
            <p className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Trigger when a threshold is crossed</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${dark ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Sensor</label>
            <select className={inputClass} value={form.sensor_id} onChange={e => setForm({...form, sensor_id: e.target.value})} required>
              <option value="">Select a sensor...</option>
              {sensors?.filter(s => s.is_active).map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.location}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Alert type</label>
            <select className={inputClass} value={form.alert_type} onChange={e => setForm({...form, alert_type: e.target.value})}>
              {ALERT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Threshold value</label>
            <input type="number" step="any" className={inputClass} placeholder="e.g. 35"
              value={form.threshold_value} onChange={e => setForm({...form, threshold_value: e.target.value})} required />
            <p className={`text-xs mt-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Alert fires when reading goes above/below this value</p>
          </div>
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              Notify email <span className="font-normal normal-case text-gray-400">(optional)</span>
            </label>
            <input type="email" className={inputClass} placeholder="admin@example.com"
              value={form.notify_email} onChange={e => setForm({...form, notify_email: e.target.value})} />
          </div>
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Trigger source</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.trigger_on_actual}
                  onChange={e => setForm({...form, trigger_on_actual: e.target.checked})}
                  className="w-4 h-4 rounded accent-teal-600"/>
                <div>
                  <span className={`text-sm font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>Actual readings</span>
                  <p className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Alert when a live sensor reading crosses the threshold</p>
                </div>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.trigger_on_predicted}
                  onChange={e => setForm({...form, trigger_on_predicted: e.target.checked})}
                  className="w-4 h-4 rounded accent-amber-500"/>
                <div>
                  <span className={`text-sm font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>AI forecast (early warning)</span>
                  <p className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Alert in advance if the 24h forecast predicts a breach</p>
                </div>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className={`flex-1 border rounded-xl py-2.5 text-sm font-medium ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
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
  const { dark } = useTheme()
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
      isUnread
        ? dark ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-50 border-orange-200 shadow-sm'
        : dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
          isUnread ? dark ? 'bg-orange-500/10' : 'bg-orange-100' : dark ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          {getAlertIcon(event.alert_type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-sm font-bold ${
              isUnread ? dark ? 'text-orange-300' : 'text-orange-900' : dark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {TYPE_LABELS[event.alert_type] || event.alert_type}
            </span>
            {isUnread && (
              <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">NEW</span>
            )}
            {event.is_predicted && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                ✨ Predicted {event.predicted_hours_ahead ? `+${event.predicted_hours_ahead}h` : ''}
              </span>
            )}
            {event.acknowledged && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCheck size={10} /> Acknowledged
              </span>
            )}
          </div>

          <div className={`flex items-center gap-1.5 text-xs mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            <MapPin size={11} />
            <span className={`font-semibold ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{sensorName}</span>
            {sensorLocation && <span>— {sensorLocation}</span>}
          </div>

          <p className={`text-sm mb-3 ${
            isUnread ? dark ? 'text-orange-200' : 'text-orange-800' : dark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {event.message}
          </p>

          <div className="flex items-center gap-3 mb-2">
            <div className={`text-center px-3 py-1.5 rounded-lg ${
              isUnread ? dark ? 'bg-orange-500/10' : 'bg-orange-100' : dark ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <div className={`text-base font-bold ${
                isUnread ? dark ? 'text-orange-400' : 'text-orange-700' : dark ? 'text-gray-300' : 'text-gray-600'
              }`}>{event.actual_value?.toFixed(1)}</div>
              <div className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Actual</div>
            </div>
            <div className={`text-sm ${dark ? 'text-gray-600' : 'text-gray-300'}`}>vs</div>
            <div className={`text-center px-3 py-1.5 rounded-lg ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className={`text-base font-bold ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{event.threshold_value?.toFixed(1)}</div>
              <div className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Limit</div>
            </div>
          </div>

          <div className="flex items-center justify-between ">
            <div className={`flex items-center gap-1 text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
              <Clock size={11} /> {localTime}
            </div>
            {sensor?.latitude && sensor?.longitude && (
              <a
                href={"https://www.google.com/maps?q=" + sensor.latitude + "," + sensor.longitude}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                <MapPin size={11} /> View on map
              </a>
            )}
          </div>
        </div>

        {isUnread && (
          <button onClick={() => onAcknowledge(event.id)}
            className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5">
            <CheckCheck size={13} /> Acknowledge
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function Alerts() {
  const { dark } = useTheme()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [ruleSearch, setRuleSearch] = useState('')
  const [ruleSensorFilter, setRuleSensorFilter] = useState('all')
  const [ruleTypeFilter, setRuleTypeFilter] = useState('all')
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

  useEffect(() => {
    if (!events) return
    const newUnread = events.find(e => !e.acknowledged && !seenEventIds.has(e.id))
    if (newUnread && !emergencyEvent) {
      setEmergencyEvent(newUnread)
      setSeenEventIds(prev => new Set([...prev, newUnread.id]))
    }
  }, [events])

  const deleteRule = async id => {
    if (!confirm('Delete this alert rule?')) return
    try {
      await api.delete('/alerts/rules/' + id)
      queryClient.invalidateQueries(['alert-rules'])
      toast('Alert rule deleted')
    } catch { toast('Failed to delete rule', 'error') }
  }

  const acknowledgeAlert = async eventId => {
    queryClient.setQueryData(['alert-events'], old =>
      old?.map(e => e.id === eventId ? { ...e, acknowledged: true } : e)
    )
    try {
      await api.patch('/alerts/events/' + eventId + '/acknowledge')
      toast('Alert acknowledged ✓')
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['alert-events'] })
        queryClient.refetchQueries({ queryKey: ['unread-alerts'] })
      }, 500)
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: ['alert-events'] })
      toast('Failed to acknowledge alert', 'error')
    }
  }

  const unreadCount = events?.filter(e => !e.acknowledged).length ?? 0

  const filteredRules = rules?.filter(r => {
    const sensorName = sensors?.find(s => s.id === r.sensor_id)?.name?.toLowerCase() || ''
    const matchSearch = !ruleSearch ||
      r.alert_type?.toLowerCase().includes(ruleSearch.toLowerCase()) ||
      r.notify_email?.toLowerCase().includes(ruleSearch.toLowerCase()) ||
      sensorName.includes(ruleSearch.toLowerCase())
    const matchSensor = ruleSensorFilter === 'all' || r.sensor_id === ruleSensorFilter
    const matchType = ruleTypeFilter === 'all' || r.alert_type === ruleTypeFilter
    return matchSearch && matchSensor && matchType
  })

  const filteredEvents = events
    ?.filter(e => showAcknowledged ? true : !e.acknowledged)
    ?.filter(e => !eventSearch || e.message?.toLowerCase().includes(eventSearch.toLowerCase()))

  const cardBg = dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
  const divider = dark ? 'divide-gray-800' : 'divide-gray-50'
  const subText = dark ? 'text-gray-500' : 'text-gray-400'
  const headText = dark ? 'text-white' : 'text-gray-800'
  const inputClass = `border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
    dark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900'
  }`

  return (
    <div className={`min-h-full p-6 ${dark ? 'bg-gray-950' : 'bg-gray-50'}`}>

      {emergencyEvent && (
        <EmergencyPopup
          event={emergencyEvent}
          sensors={sensors}
          onDismiss={() => setEmergencyEvent(null)}
          onAcknowledge={acknowledgeAlert}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Alert Rules</h1>
          <p className={`text-sm mt-0.5 ${subText}`}>
            {unreadCount > 0
              ? <span className="text-orange-500 font-medium">{unreadCount} alert{unreadCount > 1 ? 's' : ''} need attention</span>
              : 'All clear — no unacknowledged alerts'}
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
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <Plus size={16} /> New rule
          </button>
        </div>
      </div>

      {/* Rules */}
      <div className={`rounded-2xl border shadow-sm mb-6 overflow-hidden ${cardBg}`}>
        <div className={`px-5 py-4 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3 mb-3">
            <Bell size={16} className="text-teal-500" />
            <h2 className={`font-semibold text-sm ${headText}`}>
              Rules <span className={`font-normal ${subText}`}>({filteredRules?.length ?? 0})</span>
            </h2>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={13} className={`absolute left-3 top-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}/>
              <input className={inputClass + ' pl-8 pr-8 w-full'} placeholder="Search by sensor, type or email..."
                value={ruleSearch} onChange={e => setRuleSearch(e.target.value)} />
              {ruleSearch && (
                <button onClick={() => setRuleSearch('')} className="absolute right-3 top-3">
                  <X size={13} className={dark ? 'text-gray-500' : 'text-gray-400'}/>
                </button>
              )}
            </div>
            <select className={inputClass + ' flex-1'} value={ruleSensorFilter} onChange={e => setRuleSensorFilter(e.target.value)}>
              <option value="all">All sensors</option>
              {sensors?.filter(s => s.is_active).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select className={inputClass + ' flex-1'} value={ruleTypeFilter} onChange={e => setRuleTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              <option value="temperature_high">Temp High</option>
              <option value="temperature_low">Temp Low</option>
              <option value="humidity_high">Humidity High</option>
              <option value="humidity_low">Humidity Low</option>
              <option value="aqi_high">AQI High</option>
              <option value="pressure_high">Pressure High</option>
              <option value="pressure_low">Pressure Low</option>
            </select>
            {(ruleSearch || ruleSensorFilter !== 'all' || ruleTypeFilter !== 'all') && (
              <button
                onClick={() => { setRuleSearch(''); setRuleSensorFilter('all'); setRuleTypeFilter('all') }}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                  dark ? 'border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >Clear</button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className={`px-5 py-10 text-center text-sm ${subText}`}>Loading...</div>
        ) : filteredRules?.length > 0 ? (
          <div className={'divide-y ' + divider}>
            {filteredRules.map(rule => {
              const ruleSensor = sensors?.find(s => s.id === rule.sensor_id)
              return (
                <div key={rule.id} className={`px-5 py-4 flex items-center gap-4 transition-colors ${dark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${dark ? 'bg-teal-500/10' : 'bg-teal-50'}`}>
                    {getAlertIcon(rule.alert_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${headText}`}>{TYPE_LABELS[rule.alert_type] || rule.alert_type}</div>
                    <div className={`text-xs mt-0.5 flex items-center gap-2 flex-wrap ${subText}`}>
                      {ruleSensor && <span className="flex items-center gap-1"><MapPin size={10} /> {ruleSensor.name} — {ruleSensor.location}</span>}
                      <span>Threshold: <strong>{rule.threshold_value}</strong></span>
                      {rule.notify_email && <span>Email: {rule.notify_email}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    rule.is_active ? 'bg-green-100 text-green-700' : dark ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {rule.is_active ? '● Active' : '○ Disabled'}
                  </span>
                  <Tooltip text="Delete rule">
                    <button onClick={() => deleteRule(rule.id)}
                      className={`p-2 rounded-xl transition-colors ${dark ? 'hover:bg-gray-700 text-gray-600 hover:text-red-400' : 'hover:bg-red-50 text-gray-300 hover:text-red-500'}`}>
                      <Trash2 size={15} />
                    </button>
                  </Tooltip>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={`px-5 py-10 text-center ${subText} text-sm`}>
            <Bell size={32} className={`mx-auto mb-2 ${dark ? 'text-gray-700' : 'text-gray-200'}`} />
            No alert rules yet
          </div>
        )}
      </div>

      {/* Events */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${cardBg}`}>
        <div className={`px-5 py-4 border-b flex items-center gap-3 flex-wrap ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <AlertTriangle size={16} className={unreadCount > 0 ? 'text-orange-500' : subText} />
          <h2 className={`font-semibold text-sm ${headText}`}>
            Alert history
            {unreadCount > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{unreadCount} new</span>
            )}
          </h2>
          <label className={`flex items-center gap-2 text-xs cursor-pointer ml-1 ${subText}`}>
            <input type="checkbox" checked={showAcknowledged} onChange={e => setShowAcknowledged(e.target.checked)} className="accent-teal-600 w-3.5 h-3.5" />
            Show acknowledged
          </label>
          <div className="ml-auto">
            <input className={inputClass + ' w-48'} placeholder="Search events..."
              value={eventSearch} onChange={e => setEventSearch(e.target.value)} />
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
            <div className={`py-10 text-center ${subText} text-sm`}>
              <CheckCheck size={32} className={`mx-auto mb-2 ${dark ? 'text-gray-700' : 'text-gray-200'}`} />
              {showAcknowledged ? 'No alerts triggered yet' : 'No unacknowledged alerts'}
              {!showAcknowledged && <p className={`text-xs mt-1 ${dark ? 'text-gray-700' : 'text-gray-300'}`}>Check "Show acknowledged" to see past alerts</p>}
            </div>
          )}
        </div>
      </div>

      {modalOpen && <RuleModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
