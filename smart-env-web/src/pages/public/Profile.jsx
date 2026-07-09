import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../components/Toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import api from '../../utils/api'
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react'

// Separate axios instance with NO 401 interceptor.
// The main api.js interceptor redirects to /login on any 401 —
// but a wrong password also returns 401, which would redirect before
// the catch block runs. rawApi lets us catch it properly.
const rawApi = axios.create({
  baseURL: 'https://climatrixa-system-api.onrender.com',
  timeout: 30000,
})
rawApi.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Top-level component — must NOT be defined inside Profile or React remounts on every render
function PasswordInput({ value, onChange, show, onToggle, placeholder, dark, inputClass }) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className={inputClass + ' pr-10'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
      />
      <button type="button" onClick={onToggle}
        className={`absolute right-3 top-3 ${dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
        {show ? <EyeOff size={15}/> : <Eye size={15}/>}
      </button>
    </div>
  )
}

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { dark } = useTheme()
  const toast = useToast()

  // Fetch own profile via /auth/me — works for public users
  const { data: profile } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.get('/auth/me').then(r => r.data),
    enabled: !!user?.id,
  })

  const [nameForm, setNameForm] = useState({ full_name: '' })
  const [passForm, setPassForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingName, setSavingName]   = useState(false)
  const [savingPass, setSavingPass]   = useState(false)
  const [passError, setPassError]     = useState('')

  // Populate name form once profile loads from API
  useEffect(() => {
    if (profile?.full_name != null) {
      setNameForm({ full_name: profile.full_name })
    }
  }, [profile])

  const sub  = dark ? 'text-gray-500' : 'text-gray-400'
  const head = dark ? 'text-white'    : 'text-gray-900'
  const card = `rounded-2xl border shadow-sm ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`
  const inputClass = `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
    dark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900'
  }`
  const labelClass = `block text-xs font-semibold uppercase tracking-wide mb-1.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`

  const saveName = async e => {
    e.preventDefault()
    setSavingName(true)
    try {
      await api.patch('/auth/me', { full_name: nameForm.full_name })
      await queryClient.invalidateQueries({ queryKey: ['auth-me'] })
      toast('Name updated successfully')
    } catch {
      toast('Failed to update name', 'error')
    } finally { setSavingName(false) }
  }

  const savePassword = async e => {
    e.preventDefault()
    setPassError('')

    if (!passForm.old_password) {
      setPassError('Please enter your current password')
      return
    }
    if (passForm.new_password.length < 8) {
      setPassError('New password must be at least 8 characters')
      return
    }
    if (passForm.new_password !== passForm.confirm_password) {
      setPassError('New passwords do not match')
      return
    }
    if (passForm.old_password === passForm.new_password) {
      setPassError('New password must be different from your current password')
      return
    }

    setSavingPass(true)
    try {
      // POST /auth/change-password — backend verifies current password using bcrypt
      // and updates hash. Returns 400 with "Current password is incorrect" if wrong.
      await rawApi.patch('/auth/me/password', {
        old_password: passForm.old_password,
        new_password: passForm.new_password,
      })
      toast('Password updated — please log in again')
      setTimeout(() => {
        logout()
        navigate('/login')
      }, 1500)
    } catch (err) {
      const status = err.response?.status
      const detail = (err.response?.data?.detail || '').toLowerCase()
      // Backend may return 400 "incorrect", 404 "not found", or 401 for wrong password
      if (
        status === 404 ||
        status === 401 ||
        detail.includes('incorrect') ||
        detail.includes('not found') ||
        detail.includes('invalid') ||
        detail.includes('wrong')
      ) {
        setPassError('Current password is incorrect')
      } else {
        setPassError('Failed to update password — please try again')
      }
    } finally { setSavingPass(false) }
  }

  const displayName = profile?.full_name || ''

  return (
    <div className={`p-6 ${dark ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-xl font-bold ${head}`}>My Profile</h1>
        <p className={`text-sm mt-0.5 ${sub}`}>Update your name and password</p>
      </div>

      {/* Avatar card */}
      <div className={`${card} p-5 mb-5 flex items-center gap-4`}>
        <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0">
          {(displayName || user?.email || 'U')[0].toUpperCase()}
        </div>
        <div>
          <div className={`font-semibold ${head}`}>
            {profile === undefined
              ? <span className={`text-sm ${sub}`}>Loading...</span>
              : displayName || <span className={sub}>No name set</span>}
          </div>
          <div className={`text-sm ${sub}`}>{user?.email}</div>
          <span className={`text-xs mt-1 capitalize px-2 py-0.5 rounded-full inline-block ${
            dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
          }`}>{user?.role}</span>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">

        {/* Update name */}
        <div className={`${card} p-5`}>
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-teal-500/10' : 'bg-teal-50'}`}>
              <User size={16} className="text-teal-500"/>
            </div>
            <div>
              <div className={`font-semibold text-sm ${head}`}>Display name</div>
              <div className={`text-xs ${sub}`}>How your name appears in the system</div>
            </div>
          </div>
          <form onSubmit={saveName} className="space-y-4">
            <div>
              <label className={labelClass}>Full name</label>
              <input className={inputClass}
                value={nameForm.full_name}
                onChange={e => setNameForm({ full_name: e.target.value })}
                placeholder="e.g. Kasun Perera"/>
            </div>
            <div>
              <label className={labelClass}>Email address</label>
              <input className={`${inputClass} opacity-60 cursor-not-allowed`}
                value={user?.email || ''} disabled/>
              <p className={`text-xs mt-1 ${sub}`}>Email cannot be changed. Contact your admin.</p>
            </div>
            <button type="submit" disabled={savingName}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors">
              <Save size={15}/> {savingName ? 'Saving...' : 'Save name'}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className={`${card} p-5`}>
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
              <Lock size={16} className="text-orange-500"/>
            </div>
            <div>
              <div className={`font-semibold text-sm ${head}`}>Change password</div>
              <div className={`text-xs ${sub}`}>Enter your current password to confirm</div>
            </div>
          </div>
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className={labelClass}>Current password</label>
              <PasswordInput
                value={passForm.old_password}
                onChange={e => setPassForm(f => ({ ...f, old_password: e.target.value }))}
                show={showCurrent}
                onToggle={() => setShowCurrent(v => !v)}
                placeholder="Your current password"
                dark={dark}
                inputClass={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>New password</label>
              <PasswordInput
                value={passForm.new_password}
                onChange={e => setPassForm(f => ({ ...f, new_password: e.target.value }))}
                show={showNew}
                onToggle={() => setShowNew(v => !v)}
                placeholder="Min 8 characters"
                dark={dark}
                inputClass={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Confirm new password</label>
              <PasswordInput
                value={passForm.confirm_password}
                onChange={e => setPassForm(f => ({ ...f, confirm_password: e.target.value }))}
                show={showConfirm}
                onToggle={() => setShowConfirm(v => !v)}
                placeholder="Re-enter new password"
                dark={dark}
                inputClass={inputClass}
              />
            </div>

            {passError && (
              <div className={`text-sm px-3 py-2.5 rounded-xl border flex items-start gap-2 ${
                dark ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-100 text-red-600'
              }`}>
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{passError}</span>
              </div>
            )}

            <button type="submit" disabled={savingPass}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors">
              <Lock size={15}/> {savingPass ? 'Verifying...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
