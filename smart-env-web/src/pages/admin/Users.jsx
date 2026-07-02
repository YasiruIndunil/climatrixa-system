import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, UserCheck, UserX, Shield, User, Link } from 'lucide-react'
import api from '../../utils/api'

function CreateUserModal({ onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'public' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/auth/register', form)
      queryClient.invalidateQueries(['users'])
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Create new user</h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
            <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Temporary password</label>
            <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <div className="flex gap-3">
              {['public', 'admin'].map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="role" value={r}
                    checked={form.role === r} onChange={() => setForm({...form, role: r})} />
                  <span className="text-sm capitalize">{r}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
              {saving ? 'Creating...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AssignModal({ user, onClose }) {
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const { data: allSensors } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => api.get('/sensors/').then(r => r.data),
  })

  const { data: assigned, refetch } = useQuery({
    queryKey: ['user-sensors', user.id],
    queryFn: () => api.get(`/access/users/${user.id}/sensors`).then(r => r.data),
  })

  const assignedIds = new Set(assigned?.map(s => s.id) || [])

  const toggle = async (sensorId) => {
    setSaving(true)
    try {
      if (assignedIds.has(sensorId)) {
        await api.delete(`/access/sensors/${sensorId}/users/${user.id}`)
      } else {
        await api.post(`/access/sensors/${sensorId}/users/${user.id}`)
      }
      refetch()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Assign sensors to {user.full_name}</h3>
        </div>
        <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
          {allSensors?.filter(s => s.is_active).map(sensor => (
            <label key={sensor.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox"
                checked={assignedIds.has(sensor.id)}
                onChange={() => toggle(sensor.id)}
                disabled={saving}
                className="w-4 h-4 accent-purple-600"
              />
              <div>
                <div className="text-sm font-medium text-gray-800">{sensor.name}</div>
                <div className="text-xs text-gray-400">{sensor.location}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="w-full bg-purple-700 hover:bg-purple-800 text-white rounded-lg py-2 text-sm font-medium">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Users() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [assignUser, setAssignUser] = useState(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/auth/users/').then(r => r.data),
  })

  const toggleActive = async (user) => {
    await api.patch(`/auth/users/${user.id}`, { is_active: !user.is_active })
    queryClient.invalidateQueries(['users'])
  }

  if (isLoading) return <div className="p-6 text-gray-400">Loading users...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Users</h1>
          <p className="text-sm text-gray-500 mt-1">Manage user accounts and sensor access</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Add user
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="divide-y divide-gray-50">
          {users?.map(user => (
            <div key={user.id} className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
                {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 text-sm">{user.full_name || '—'}</div>
                <div className="text-xs text-gray-400">{user.email}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {user.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                {user.role}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {user.is_active ? 'Active' : 'Disabled'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setAssignUser(user)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-purple-600"
                  title="Assign sensors"
                >
                  <Link size={15} />
                </button>
                <button
                  onClick={() => toggleActive(user)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
                  title={user.is_active ? 'Disable account' : 'Enable account'}
                >
                  {user.is_active ? <UserX size={15} className="text-red-400" /> : <UserCheck size={15} className="text-green-500" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} />}
      {assignUser && <AssignModal user={assignUser} onClose={() => setAssignUser(null)} />}
    </div>
  )
}
