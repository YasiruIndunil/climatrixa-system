import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/useAuth'
import { useAlertWS } from './Toast'
import { useEffect, useState } from 'react'
import { X, CheckCheck, AlertTriangle, Menu } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutDashboard, Radio, Users, Bell, Download, Map, BrainCircuit,
  LogOut, Leaf, WifiOff, Sun, Moon
} from 'lucide-react'
import api from '../utils/api'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/admin/sensors', icon: Radio, label: 'Sensors' },
  { to: '/admin/map', icon: Map, label: 'Sensor Map' },
  { to: '/admin/ai-predictions', icon: BrainCircuit, label: 'AI Predictions' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/alerts', icon: Bell, label: 'Alerts' },
  { to: '/admin/export', icon: Download, label: 'Export' },
]


function GlobalAlertPopup({ event, onDismiss, onAcknowledge }) {
  const [countdown, setCountdown] = useState(30)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => c <= 1 ? 0 : c - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (countdown === 0) onDismiss()
  }, [countdown])

  const isPredicted = event.is_predicted
  const isAnomaly = event.alert_type === 'anomaly'
  const isHigh = event.alert_type?.includes('high') || event.alert_type?.includes('aqi')
  const borderColor = isPredicted ? 'border-amber-400' : isAnomaly ? 'border-purple-400' : isHigh ? 'border-red-400' : 'border-orange-400'
  const barColor = isPredicted ? 'bg-amber-500' : isAnomaly ? 'bg-purple-500' : isHigh ? 'bg-red-500' : 'bg-orange-500'
  const ackColor = isPredicted ? 'bg-amber-600 hover:bg-amber-700' : isAnomaly ? 'bg-purple-600 hover:bg-purple-700' : isHigh ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
  const iconBg = isPredicted ? 'bg-amber-100' : isAnomaly ? 'bg-purple-100' : isHigh ? 'bg-red-100' : 'bg-orange-100'
  const labelColor = isPredicted ? 'text-amber-500' : isAnomaly ? 'text-purple-500' : isHigh ? 'text-red-500' : 'text-orange-500'
  const titleColor = isPredicted ? 'text-amber-900' : isAnomaly ? 'text-purple-900' : isHigh ? 'text-red-900' : 'text-orange-900'
  const valueColor = isPredicted ? 'text-amber-600' : isAnomaly ? 'text-purple-600' : isHigh ? 'text-red-600' : 'text-orange-600'
  const dismissBorder = isPredicted ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : isAnomaly ? 'border-purple-200 text-purple-600 hover:bg-purple-50' : isHigh ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-orange-200 text-orange-600 hover:bg-orange-50'
  const countdownColor = isPredicted ? 'text-amber-400' : isAnomaly ? 'text-purple-400' : isHigh ? 'text-red-400' : 'text-orange-400'

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border-2 ${borderColor} bg-white`}>
        <div className={`h-2 w-full ${barColor} animate-pulse`} />
        <div className="px-6 py-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center animate-bounce text-2xl`}>
                {isPredicted ? '✨' : isAnomaly ? '🔍' : event.alert_type?.includes('temperature') ? '🌡️' : event.alert_type?.includes('humidity') ? '💧' : event.alert_type?.includes('aqi') ? '🌫️' : '⚠️'}
              </div>
              <div>
                <div className={`text-xs font-bold uppercase tracking-widest ${labelColor} mb-0.5`}>
                  {isPredicted ? '✨ AI Predicted Warning' : isAnomaly ? '🔍 AI Anomaly Detected' : '🚨 Emergency Alert'}
                </div>
                <div className={`text-lg font-bold ${titleColor}`}>
                  {isAnomaly ? 'Unusual Pattern' : event.alert_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </div>
                {isPredicted && event.predicted_hours_ahead && (
                  <div className="text-xs font-medium text-amber-600 mt-0.5">Expected in ~{event.predicted_hours_ahead}h — not yet happened</div>
                )}
                {isAnomaly && (
                  <div className="text-xs font-medium text-purple-600 mt-0.5">Detected by machine learning, not a fixed threshold</div>
                )}
              </div>
            </div>
            <button onClick={onDismiss} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-700 mb-3">{event.message}</p>
            {!isAnomaly && (
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${valueColor}`}>{event.actual_value?.toFixed(1)}</div>
                  <div className="text-xs text-gray-400">{isPredicted ? 'Predicted' : 'Actual'}</div>
                </div>
                <div className="text-2xl text-gray-300">→</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400">{event.threshold_value?.toFixed(1)}</div>
                  <div className="text-xs text-gray-400">Limit</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={onDismiss}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${dismissBorder}`}>
              Dismiss
            </button>
            <button onClick={() => { onAcknowledge(event.id); onDismiss() }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 ${ackColor}`}>
              <CheckCheck size={15} /> Acknowledge
            </button>
          </div>

          <div className="mt-3 text-center">
            <div className={`text-xs ${countdownColor}`}>Auto-dismissing in {countdown}s</div>
            <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
              <div className={`h-1 rounded-full ${barColor} transition-all duration-1000`}
                style={{ width: (countdown / 30 * 100) + '%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { connected } = useAlertWS()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const { data: unreadCount } = useQuery({
    queryKey: ['unread-alerts'],
    queryFn: () => api.get('/alerts/events').then(r =>
      r.data.filter(a => !a.acknowledged).length
    ),
    refetchInterval: 30000,
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const [emergencyEvent, setEmergencyEvent] = useState(null)
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    try {
      const stored = sessionStorage.getItem('dismissedAlerts')
      return stored ? JSON.parse(stored) : {}
    } catch { return {} }
  })

  const { data: events } = useQuery({
    queryKey: ['alert-events'],
    queryFn: () => api.get('/alerts/events').then(r => r.data),
    refetchInterval: 15000,
  })

  const acknowledgeGlobal = async eventId => {
    try {
      await api.patch('/alerts/events/' + eventId + '/acknowledge')
      queryClient.invalidateQueries({ queryKey: ['alert-events'] })
      queryClient.invalidateQueries({ queryKey: ['unread-alerts'] })
    } catch {}
  }

  const checkAlerts = () => {
    if (!events) return
    const REMIND_MS = 60 * 1000            // threshold/predicted alerts — remind every 1 min
    const ANOMALY_REMIND_MS = 15 * 60 * 1000  // anomaly alerts — remind every 15 min (lower urgency, exploratory)
    const now = Date.now()
    const newUnread = events.find(e => {
      if (e.acknowledged) return false
      const dismissedAt = dismissedAlerts[e.id]
      const interval = e.alert_type === 'anomaly' ? ANOMALY_REMIND_MS : REMIND_MS
      return !dismissedAt || (now - dismissedAt) >= interval
    })
    if (newUnread && !emergencyEvent) {
      setEmergencyEvent(newUnread)
    }
  }

  useEffect(() => { checkAlerts() }, [events, dismissedAlerts])

  useEffect(() => {
    const interval = setInterval(checkAlerts, 60 * 1000)
    return () => clearInterval(interval)
  }, [events, dismissedAlerts, emergencyEvent])

  const sidebar = `flex flex-col border-r h-full ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`

  const NavContent = () => (
    <>
      <div className={`flex items-center gap-3 px-5 py-5 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Leaf className="text-white" size={18} />
        </div>
        <div>
          <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>Climatrixa</div>
          <div className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Admin Console</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? dark
                    ? 'bg-teal-500/15 text-teal-400 shadow-sm'
                    : 'bg-teal-50 text-teal-700'
                  : dark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`
            }
          >
            <Icon size={17} />
            <span className="flex-1">{label}</span>
            {label === 'Alerts' && unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={`mx-3 mb-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5 ${dark ? 'bg-gray-800' : 'bg-gray-50'}`}>
        {connected ? (
          <>
            <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse shrink-0" />
            <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Live feed active</span>
          </>
        ) : (
          <>
            <WifiOff size={13} className="text-red-400 shrink-0" />
            <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Reconnecting...</span>
          </>
        )}
      </div>

      <div className={`px-3 pb-4 border-t pt-3 ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
        <button
          onClick={toggle}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all ${
            dark
              ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`}
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
          {dark ? 'Light mode' : 'Dark mode'}
        </button>

        <div className={`flex items-center gap-3 px-3 py-2 mb-1 rounded-xl ${dark ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <div className="w-7 h-7 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-medium truncate ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
              {user?.email}
            </div>
            <div className={`text-xs capitalize ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              {user?.role}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
            dark
              ? 'text-gray-500 hover:bg-gray-800 hover:text-red-400'
              : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
          }`}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className={`flex h-screen ${dark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <aside className={`w-60 hidden md:flex ${sidebar}`}><NavContent/></aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)}/>
          <aside className={`absolute left-0 top-0 bottom-0 w-64 flex flex-col ${sidebar}`}><NavContent/></aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className={`md:hidden flex items-center justify-between px-4 py-3 border-b ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <button onClick={() => setMobileOpen(true)} className={`p-2 rounded-lg ${dark ? 'text-gray-400' : 'text-gray-500'}`}><Menu size={20}/></button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center"><Leaf className="text-white" size={14}/></div>
            <span className={`font-bold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>Climatrixa</span>
          </div>
          <button onClick={toggle} className={`p-2 rounded-lg ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
        </div>
        <main className={`flex-1 overflow-auto ${dark ? 'bg-gray-950' : 'bg-gray-50'}`}><Outlet/></main>
      </div>

      {emergencyEvent && (
        <GlobalAlertPopup
          event={emergencyEvent}
          onDismiss={() => {
            const updated = { ...dismissedAlerts, [emergencyEvent.id]: Date.now() }
            setDismissedAlerts(updated)
            try { sessionStorage.setItem('dismissedAlerts', JSON.stringify(updated)) } catch {}
            setEmergencyEvent(null)
          }}
          onAcknowledge={acknowledgeGlobal}
        />
      )}
    </div>
  )
}
