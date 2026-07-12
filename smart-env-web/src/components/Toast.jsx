import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react'
import { CheckCircle, XCircle, X, Bell, AlertTriangle } from 'lucide-react'

// ── Toast Context ─────────────────────────────────────────────────
const ToastContext = createContext(null)
const ToastRemoveContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  // refId lets a toast be tied to a specific alert event (see removeByRef)
  // so it can be dismissed early if that event gets acknowledged elsewhere.
  const addToast = useCallback((message, type = 'success', refId = null) => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type, refId }])
    setTimeout(() => {
      setToasts(t => t.filter(toast => toast.id !== id))
    }, 4000)
  }, [])

  const remove = (id) => setToasts(t => t.filter(toast => toast.id !== id))

  const removeByRef = useCallback((refId) => {
    setToasts(t => t.filter(toast => toast.refId !== refId))
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
    <ToastRemoveContext.Provider value={removeByRef}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[200] space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-64 max-w-sm animate-in
              ${toast.type === 'success' ? 'bg-green-600 text-white'
              : toast.type === 'error'   ? 'bg-red-600 text-white'
              : toast.type === 'alert'   ? 'bg-orange-500 text-white'
              :                            'bg-gray-800 text-white'
            }`}>
            {toast.type === 'success' && <CheckCircle size={16} className="shrink-0" />}
            {toast.type === 'error'   && <XCircle size={16} className="shrink-0" />}
            {toast.type === 'alert'   && <AlertTriangle size={16} className="shrink-0" />}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => remove(toast.id)} className="opacity-70 hover:opacity-100 pointer-events-auto">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastRemoveContext.Provider>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
export const useRemoveToast = () => useContext(ToastRemoveContext)

// ── WebSocket Alert Context ───────────────────────────────────────
const AlertWSContext = createContext(null)

const WS_URL = 'wss://climatrixa-system-api.onrender.com/readings/ws/live'

export function AlertWSProvider({ children }) {
  const toast = useToast()
  const removeToastByRef = useRemoveToast()
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [latestAlert, setLatestAlert] = useState(null)
  const [latestAcknowledged, setLatestAcknowledged] = useState(null)
  const reconnectRef = useRef(null)

  const connect = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const ws = new WebSocket(`${WS_URL}?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        console.log('[WS] Connected to live feed')
        // Request browser notification permission
        if (Notification.permission === 'default') {
          Notification.requestPermission()
        }
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)

          if (msg.event === 'alert_triggered') {
            const alert = msg.data
            setLatestAlert(alert)

            // Show toast notification, tagged with the alert id so it can
            // be closed early if someone else acknowledges it first.
            toast(`⚠ Alert: ${alert.message}`, 'alert', alert.id)

            // Show browser notification if permitted
            if (Notification.permission === 'granted') {
              new Notification('Climatrixa Alert', {
                body: alert.message,
                icon: '/vite.svg',
                tag: alert.id,
              })
            }
          }

          if (msg.event === 'alert_acknowledged') {
            setLatestAcknowledged(msg.data)
            // Close this alert's toast if it's still showing on this screen.
            removeToastByRef?.(msg.data.id)
          }
        } catch {}
      }

      ws.onclose = () => {
        setConnected(false)
        console.log('[WS] Disconnected — reconnecting in 5s')
        reconnectRef.current = setTimeout(connect, 5000)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch (err) {
      console.error('[WS] Error:', err)
    }
  }, [toast, removeToastByRef])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return (
    <AlertWSContext.Provider value={{ connected, latestAlert, latestAcknowledged }}>
      {children}
    </AlertWSContext.Provider>
  )
}

export const useAlertWS = () => useContext(AlertWSContext)
