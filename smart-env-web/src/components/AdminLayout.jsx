import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/useAuth'
import { useAlertWS } from './Toast'
import { useEffect, useState } from 'react'
import { X, CheckCheck, AlertTriangle } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutDashboard, Radio, Users, Bell, Download, Map,
  LogOut, Leaf, WifiOff, Sun, Moon
} from 'lucide-react'
import api from '../utils/api'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/admin/sensors', icon: Radio, label: 'Sensors' },
  { to: '/admin/map', icon: Map, label: 'Sensor Map' },
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

  // Trigger dismiss in a separate effect when countdown hits 0
  useEffect(() => {
    if (countdown === 0) onDismiss()
  }, [countdown])

  const isHigh = event.alert_type?.includes('high') || event.alert_type?.includes('aqi')
  const borderColor = isHigh ? 'border-red-400' : 'border-orange-400'
  const barColor = isHigh ? 'bg-red-500' : 'bg-orange-500'
  const ackColor = isHigh ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border-2 ${borderColor} bg-white`}>
        <div className={`h-2 w-full ${barColor} animate-pulse`} />
        <div className="px-6 py-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${isHigh ? 'bg-red-100' : 'bg-orange-100'} flex items-center justify-center animate-bounce text-2xl`}>
                {event.alert_type?.includes('temperature') ? '🌡️' : event.alert_type?.includes('humidity') ? '💧' : event.alert_type?.includes('aqi') ? '🌫️' : '⚠️'}
              </div>
              <div>
                <div className={`text-xs font-bold uppercase tracking-widest ${isHigh ? 'text-red-500' : 'text-orange-500'} mb-0.5`}>🚨 Emergency Alert</div>
                <div className={`text-lg font-bold ${isHigh ? 'text-red-900' : 'text-orange-900'}`}>
                  {event.alert_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </div>
              </div>
            </div>
            <button onClick={onDismiss} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-700 mb-3">{event.message}</p>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${isHigh ? 'text-red-600' : 'text-orange-600'}`}>{event.actual_value?.toFixed(1)}</div>
                <div className="text-xs text-gray-400">Actual</div>
              </div>
              <div className="text-2xl text-gray-300">→</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">{event.threshold_value?.toFixed(1)}</div>
                <div className="text-xs text-gray-400">Limit</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onDismiss}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${isHigh ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-orange-200 text-orange-600 hover:bg-orange-50'}`}>
              Dismiss
            </button>
            <button onClick={() => { onAcknowledge(event.id); onDismiss() }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 ${ackColor}`}>
              <CheckCheck size={15} /> Acknowledge
            </button>
          </div>

          <div className="mt-3 text-center">
            <div className={`text-xs ${isHigh ? 'text-red-400' : 'text-orange-400'}`}>Auto-dismissing in {countdown}s</div>
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
    const REMIND_MS = 60 * 1000
    const now = Date.now()
    const newUnread = events.find(e => {
      if (e.acknowledged) return false
      const dismissedAt = dismissedAlerts[e.id]
      return !dismissedAt || (now - dismissedAt) >= REMIND_MS
    })
    if (newUnread && !emergencyEvent) {
      setEmergencyEvent(newUnread)
    }
  }

  useEffect(() => { checkAlerts() }, [events, dismissedAlerts])

  // Re-check every minute so expired dismissals trigger the popup again
  useEffect(() => {
    const interval = setInterval(checkAlerts, 60 * 1000)
    return () => clearInterval(interval)
  }, [events, dismissedAlerts, emergencyEvent])

  return (
    <div className={`flex h-screen ${dark ? 'bg-gray-950' : 'bg-gray-50'}`}>

      {/* Sidebar */}
      <aside className={`w-60 flex flex-col border-r ${
        dark
          ? 'bg-gray-900 border-gray-800'
          : 'bg-white border-gray-100'
      }`}>

        {/* Logo */}
        <div className={`flex items-center gap-3 px-5 py-5 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Leaf className="text-white" size={18} />
          </div>
          <div>
            <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>Climatrixa</div>
            <div className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Admin Console</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
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

        {/* Live status */}
        <div className={`mx-3 mb-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5 ${
          dark ? 'bg-gray-800' : 'bg-gray-50'
        }`}>
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

        {/* Bottom — theme toggle + user */}
        <div className={`px-3 pb-4 border-t pt-3 ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          {/* Theme toggle */}
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

          {/* User row */}
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
      </aside>

      {/* Main content */}
      <main className={`flex-1 overflow-auto ${dark ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <Outlet />
      </main>

      {/* Global emergency alert popup */}
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
