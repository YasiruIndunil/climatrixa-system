import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, UserCheck, UserX, Shield, User, Link, Edit2, Search } from 'lucide-react'
import api from '../../utils/api'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../context/useAuth'

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
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
      toast('User account created successfully')
      onClose()
    } catch (err) {
      toast('Something went wrong', 'error')
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
              className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
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
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const { data: allSensors } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => api.get('/sensors/').then(r => r.data),
  })

  const { data: assigned, refetch } = useQuery({
    queryKey: ['user-sensors', user.id],
    queryFn: () => api.get(`/access/users/${user.id}/sensors`).then(r => r.data),
  })

  const assignedIds = new Set(assigned?.map(row => row.sensors?.id).filter(Boolean) || [])

  const filtered = allSensors?.filter(s =>
    s.is_active &&
    (s.name.toLowerCase().includes(search.toLowerCase()) ||
     s.location.toLowerCase().includes(search.toLowerCase()))
  )

  const toggle = async (sensorId) => {
    setSaving(true)
    try {
      if (assignedIds.has(sensorId)) {
        await api.delete(`/access/sensors/${sensorId}/users/${user.id}`)
        toast(assignedIds.has(sensorId) ? 'Sensor removed' : 'Sensor assigned')
      } else {
        await api.post(`/access/sensors/${sensorId}/users/${user.id}`)
        toast(user.is_active ? 'Account disabled' : 'Account enabled')
      }
      refetch()
    } finally {
      toast('Something went wrong', 'error')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Assign sensors — {user.full_name || user.email}</h3>
        </div>
        <div className="px-6 pt-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="Search sensors..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="px-6 py-3 space-y-1 max-h-64 overflow-y-auto">
          {filtered?.map(sensor => (
            <label key={sensor.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
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
          {filtered?.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-4">No sensors found</div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="w-full bg-purple-700 hover:bg-purple-800 text-white rounded-lg py-2 text-sm font-medium">Done</button>
        </div>
      </div>
    </div>
  )
}

function EditUserModal({ user, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ full_name: user.full_name || '', role: user.role })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (form.full_name !== user.full_name) {
        await api.patch(`/auth/users/${user.id}`, { full_name: form.full_name })
      }
      if (form.role !== user.role) {
        await api.patch(`/auth/users/${user.id}/role`, { role: form.role })
      }
      if (newPassword.length >= 8) {
        await api.patch(`/auth/users/${user.id}/reset-password`, { new_password: newPassword })
      }
      queryClient.invalidateQueries(['users'])
      toast('User updated successfully')
      onClose()
    } catch (err) {
      toast('User updated successfully')
      setError(err.response?.data?.detail || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Edit user — {user.email}</h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <div className="flex gap-4">
              {['public', 'admin'].map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="role" checked={form.role === r}
                    onChange={() => setForm({...form, role: r})} />
                  <span className="text-sm capitalize">{r}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reset password</label>
            <input type="password" placeholder="Leave blank to keep current"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Minimum 8 characters to apply</p>
          </div>
          {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Users() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [assignUser, setAssignUser] = useState(null)
  const [editUser, setEditUser] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/auth/users/').then(r => r.data),
  })

  const toggleActive = async (user) => {
    const endpoint = user.is_active
      ? `/auth/users/${user.id}/disable`
      : `/auth/users/${user.id}/enable`
    await api.patch(endpoint)
    queryClient.invalidateQueries(['users'])
  }

  const filtered = users?.filter(u => {
    const matchSearch = !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' ? u.is_active : !u.is_active)
    return matchSearch && matchRole && matchStatus
  })

  if (isLoading) return <div className="p-6 text-gray-400">Loading users...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Users</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered?.length ?? 0} of {users?.length ?? 0} users
          </p>
        </div>
        <Tooltip text="Create a new user account">
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Add user
          </button>
        </Tooltip>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="public">Public</option>
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="divide-y divide-gray-50">
          {filtered?.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No users match your search</div>
          )}
          {filtered?.map(user => (
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
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {user.is_active ? 'Active' : 'Disabled'}
              </span>
              <div className="flex items-center gap-1">
                <Tooltip text="Edit name, role or reset password">
                  <button onClick={() => setEditUser(user)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-500">
                    <Edit2 size={15} />
                  </button>
                </Tooltip>
                <Tooltip text="Assign sensors to this user">
                  <button onClick={() => setAssignUser(user)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-purple-600">
                    <Link size={15} />
                  </button>
                </Tooltip>
                <Tooltip text={user.is_active ? 'Disable account' : 'Enable account'}>
                  <button onClick={() => toggleActive(user)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                    {user.is_active
                      ? <UserX size={15} className="text-red-400" />
                      : <UserCheck size={15} className="text-green-500" />}
                  </button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      </div>

      {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} />}
      {assignUser && <AssignModal user={assignUser} onClose={() => setAssignUser(null)} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
    </div>
  )
}
