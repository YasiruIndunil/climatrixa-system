import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/ThemeContext'
import { Leaf, Eye, EyeOff, Sun, Moon } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const result = await login(email, password)
    if (result.success) {
      navigate(result.role === 'admin' ? '/admin' : '/dashboard')
    } else {
      setError(result.error)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative ${
      dark ? 'bg-gray-950' : 'bg-gradient-to-br from-teal-50 via-white to-emerald-50'
    }`}>

      {/* Theme toggle */}
      <button onClick={toggle}
        className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${
          dark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-white text-gray-400 hover:text-gray-700 shadow-sm'
        }`}>
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Background decoration */}
      {!dark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-100 rounded-full opacity-50 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-100 rounded-full opacity-50 blur-3xl" />
        </div>
      )}

      <div className={`relative w-full max-w-sm rounded-2xl shadow-xl border p-8 ${
        dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
      }`}>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-teal-500/25">
            <Leaf className="text-white" size={26} />
          </div>
          <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Climatrixa</h1>
          <p className={`text-sm mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Environmental Monitoring System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`w-full rounded-xl px-4 py-3 text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
                dark
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 pr-11 transition-all ${
                  dark
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="••••••••"
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className={`absolute right-3 top-3.5 ${dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className={`rounded-xl px-4 py-3 text-sm border ${
              dark ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-teal-500/20 mt-2"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className={`text-center text-xs mt-6 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
          Accounts are created by administrators only
        </p>
      </div>
    </div>
  )
}
