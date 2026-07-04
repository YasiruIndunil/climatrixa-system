import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/useAuth'
import { useAlertWS } from './Toast'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutDashboard, Radio, Users, Bell, Download,
  LogOut, Leaf, WifiOff, Sun, Moon, AlertTriangle
} from 'lucide-react'
import api from '../utils/api'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/admin/sensors', icon: Radio, label: 'Sensors' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/alerts', icon: Bell, label: 'Alerts' },
  { to: '/admin/export', icon: Download, label: 'Export' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { connected } = useAlertWS()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

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
    </div>
  )
}
