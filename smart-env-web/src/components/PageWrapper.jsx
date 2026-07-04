import { useState } from "react"
import { useTheme } from '../context/ThemeContext'

export default function PageWrapper({ children, className = '' }) {
  const { dark } = useTheme()
  return (
    <div className={`min-h-full p-6 ${dark ? 'bg-gray-950' : 'bg-gray-50'} ${className}`}>
      {children}
    </div>
  )
}

// Reusable themed card
export function Card({ children, className = '' }) {
  const { dark } = useTheme()
  return (
    <div className={`rounded-2xl border shadow-sm ${
      dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
    } ${className}`}>
      {children}
    </div>
  )
}

// Reusable section header inside a card
export function CardHeader({ children, className = '' }) {
  const { dark } = useTheme()
  return (
    <div className={`px-5 py-4 border-b flex items-center gap-3 ${
      dark ? 'border-gray-800' : 'border-gray-100'
    } ${className}`}>
      {children}
    </div>
  )
}

// Page title + subtitle
export function PageTitle({ title, subtitle }) {
  const { dark } = useTheme()
  return (
    <div className="mb-6">
      <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
      {subtitle && <p className={`text-sm mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{subtitle}</p>}
    </div>
  )
}

// Themed input
export function ThemedInput({ className = '', ...props }) {
  const { dark } = useTheme()
  return (
    <input
      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
        dark
          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
      } ${className}`}
      {...props}
    />
  )
}

// Themed select
export function ThemedSelect({ children, className = '', ...props }) {
  const { dark } = useTheme()
  return (
    <select
      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
        dark
          ? 'bg-gray-800 border-gray-700 text-white'
          : 'bg-gray-50 border-gray-200 text-gray-900'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

// Primary button
export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center gap-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// Ghost button
export function GhostButton({ children, className = '', ...props }) {
  const { dark } = useTheme()
  return (
    <button
      className={`border rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
        dark
          ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// Label above inputs
export function FieldLabel({ children }) {
  const { dark } = useTheme()
  return (
    <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${
      dark ? 'text-gray-400' : 'text-gray-500'
    }`}>
      {children}
    </label>
  )
}

// Tooltip
export function Tooltip({ text, children }) {
  const { dark } = useTheme()
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-xs rounded-lg whitespace-nowrap z-50 shadow-lg ${
          dark ? 'bg-gray-700 text-gray-200' : 'bg-gray-800 text-white'
        }`}>
          {text}
          <div className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${
            dark ? 'border-t-gray-700' : 'border-t-gray-800'
          }`} />
        </div>
      )}
    </div>
  )
}
