import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Bell, AlertTriangle, Search } from 'lucide-react'
import { useToast } from '../../components/Toast'
import api from '../../utils/api'

const ALERT_TYPES = ['temperature_high','temperature_low','humidity_high','humidity_low','aqi_high','pressure_high','pressure_low']

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

function RuleModal({ onClose }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState({ sensor_id: '', alert_type: 'temperature_high', threshold_value: '', notify_email: '', is_active: true })
  const [saving, setSaving] = useState(false)
  const { data: sensors } = useQuery({ queryKey: ['sensors'], queryFn: () => api.get('/sensors/').then(r => r.data) })

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Add alert rule</h3></div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sensor</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={form.sensor_id} onChange={e => setForm({...form, sensor_id: e.target.value})} required>
              <option value="">Select sensor...</option>
              {sensors?.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Alert type</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={form.alert_type} onChange={e => setForm({...form, alert_type: e.target.value})}>
              {ALERT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Threshold value</label>
            <input type="number" step="any" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={form.threshold_value} onChange={e => setForm({...form, threshold_value: e.target.value})} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notify email (optional)</label>
            <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={form.notify_email} onChange={e => setForm({...form, notify_email: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
              {saving ? 'Creating...' : 'Create rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Alerts() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [ruleSearch, setRuleSearch] = useState('')
  const [eventSearch, setEventSearch] = useState('')

  const { data: rules, isLoading } = useQuery({ queryKey: ['alert-rules'], queryFn: () => api.get('/alerts/rules/').then(r => r.data) })
  const { data: events } = useQuery({ queryKey: ['alert-events'], queryFn: () => api.get('/alerts/events').then(r => r.data), refetchInterval: 30000 })

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

  const filteredRules = rules?.filter(r =>
    !ruleSearch || r.alert_type?.includes(ruleSearch.toLowerCase()) ||
    r.notify_email?.toLowerCase().includes(ruleSearch.toLowerCase())
  )

  const filteredEvents = events?.filter(e =>
    !eventSearch || e.message?.toLowerCase().includes(eventSearch.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Alert Rules</h1>
          <p className="text-sm text-gray-500 mt-1">Configure threshold-based alerts per sensor</p>
        </div>
        <Tooltip text="Add a new threshold alert rule">
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Add rule
          </button>
        </Tooltip>
      </div>

      {/* Rules */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <h2 className="font-semibold text-gray-800 text-sm shrink-0">Rules ({filteredRules?.length ?? 0})</h2>
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search size={13} className="absolute left-2.5 top-2 text-gray-400" />
            <input className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="Search rules..." value={ruleSearch} onChange={e => setRuleSearch(e.target.value)} />
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {isLoading ? <div className="px-5 py-8 text-center text-gray-400 text-sm">Loading...</div>
          : filteredRules?.length > 0 ? filteredRules.map(rule => (
            <div key={rule.id} className="px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                <Bell size={16} className="text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 text-sm">{rule.alert_type?.replace(/_/g, ' ')}</div>
                <div className="text-xs text-gray-400">Threshold: {rule.threshold_value} · {rule.notify_email || 'No email'}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {rule.is_active ? 'Active' : 'Disabled'}
              </span>
              <Tooltip text="Delete this rule">
                <button onClick={() => deleteRule(rule.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </Tooltip>
            </div>
          )) : <div className="px-5 py-8 text-center text-gray-400 text-sm">No alert rules yet</div>}
        </div>
      </div>

      {/* Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <h2 className="font-semibold text-gray-800 text-sm shrink-0">Recent events ({filteredEvents?.length ?? 0})</h2>
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search size={13} className="absolute left-2.5 top-2 text-gray-400" />
            <input className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="Search events..." value={eventSearch} onChange={e => setEventSearch(e.target.value)} />
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {filteredEvents?.slice(0, 20).map(event => (
            <div key={event.id} className="px-5 py-3 flex items-start gap-3">
              <AlertTriangle size={15} className="text-orange-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-gray-800">{event.message}</div>
                <div className="text-xs text-gray-400 mt-0.5">{event.triggered_at}</div>
              </div>
              <div className="text-xs text-gray-500 shrink-0">Value: <strong>{event.actual_value}</strong></div>
            </div>
          )) ?? <div className="px-5 py-8 text-center text-gray-400 text-sm">No alerts yet</div>}
        </div>
      </div>

      {modalOpen && <RuleModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
