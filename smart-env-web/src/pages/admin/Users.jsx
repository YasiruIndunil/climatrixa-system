import { useState } from 'react'
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { Plus, UserCheck, UserX, Shield, User, Link, Edit2, Search, X, Bell, BellOff } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../components/Toast'
import PageWrapper, { Card, CardHeader, PageTitle, ThemedInput, ThemedSelect, PrimaryButton, GhostButton, FieldLabel, Tooltip } from '../../components/PageWrapper'
import api from '../../utils/api'

function Modal({ title, subtitle, onClose, children }) {
  const { dark } = useTheme()
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className={`px-6 py-5 border-b flex items-center justify-between ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <div>
            <h3 className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            {subtitle && <p className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${dark ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}>
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function CreateUserModal({ onClose }) {
  const { dark } = useTheme()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'public' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/auth/register', form)
      queryClient.invalidateQueries(['users'])
      toast('User account created successfully')
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user')
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Create new user" subtitle="Add a team member or public user" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><FieldLabel>Full name</FieldLabel><ThemedInput value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="e.g. Kasun Perera" required /></div>
        <div><FieldLabel>Email address</FieldLabel><ThemedInput type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="kasun@example.com" required /></div>
        <div><FieldLabel>Temporary password</FieldLabel><ThemedInput type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 8 characters" required /></div>
        <div>
          <FieldLabel>Role</FieldLabel>
          <div className="flex gap-3">
            {['public', 'admin'].map(r => (
              <label key={r} className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border transition-all text-sm ${
                form.role === r
                  ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400'
                  : dark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
              }`}>
                <input type="radio" className="sr-only" value={r} checked={form.role === r} onChange={() => setForm({...form, role: r})} />
                {r === 'admin' ? <Shield size={14} /> : <User size={14} />}
                <span className="capitalize">{r}</span>
              </label>
            ))}
          </div>
        </div>
        {error && <div className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl border border-red-100">{error}</div>}
        <div className="flex gap-3 pt-2">
          <GhostButton type="button" onClick={onClose} className="flex-1 justify-center">Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving} className="flex-1 justify-center">{saving ? 'Creating...' : 'Create account'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}

const SUB_PARAMS = ['temperature', 'humidity', 'aqi', 'pressure']

function AssignModal({ user, onClose }) {
  const { dark } = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedSensor, setExpandedSensor] = useState(null)

  const { data: allSensors } = useQuery({ queryKey: ['sensors'], queryFn: () => api.get('/sensors/').then(r => r.data) })
  const { data: assigned, refetch } = useQuery({
    queryKey: ['user-sensors', user.id],
    queryFn: () => api.get(`/access/users/${user.id}/sensors`).then(r => r.data),
  })

  const assignedIds = new Set(assigned?.map(row => row.sensors?.id).filter(Boolean) || [])
  const filtered = allSensors?.filter(s => s.is_active && (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.location.toLowerCase().includes(search.toLowerCase())))

  // Fetch subscriptions for all assigned sensors
  // Use assigned data directly so queries update when assignment changes
  const assignedSensorIds = (assigned || []).map(row => row.sensors?.id).filter(Boolean)
  const subQueries = useQueries({
    queries: assignedSensorIds.map(sensorId => ({
      queryKey: ['subscriptions', sensorId, user.id],
      queryFn: async () => {
        try {
          const r = await api.get(`/subscriptions/${user.id}/${sensorId}`)
          return { sensorId, data: r.data }
        } catch { return { sensorId, data: null } }
      },
      retry: false,
      staleTime: 0,
    }))
  })
  const subMap = Object.fromEntries(
    subQueries.filter(q => q.data?.sensorId).map(q => [q.data.sensorId, q.data.data])
  )

  const toggle = async sensorId => {
    setSaving(true)
    try {
      if (assignedIds.has(sensorId)) {
        await api.delete(`/access/sensors/${sensorId}/users/${user.id}`)
        toast('Sensor removed')
        if (expandedSensor === sensorId) setExpandedSensor(null)
      } else {
        await api.post(`/access/sensors/${sensorId}/users/${user.id}`)
        toast('Sensor assigned')
      }
      refetch()
    } catch { toast('Failed to update assignment', 'error') }
    finally { setSaving(false) }
  }

  const toggleSub = async (sensorId, param) => {
    const current = subMap[sensorId]
    const currently = current?.[param] === true
    try {
      if (current) {
        await api.patch(`/subscriptions/${user.id}/${sensorId}`, {
          temperature: param === 'temperature' ? !currently : (current.temperature ?? false),
          humidity:    param === 'humidity'    ? !currently : (current.humidity    ?? false),
          aqi:         param === 'aqi'         ? !currently : (current.aqi         ?? false),
          pressure:    param === 'pressure'    ? !currently : (current.pressure    ?? false),
        })
      } else {
        await api.post(`/subscriptions/${user.id}/${sensorId}`, {
          temperature: param === 'temperature',
          humidity:    param === 'humidity',
          aqi:         param === 'aqi',
          pressure:    param === 'pressure',
        })
      }
      queryClient.invalidateQueries({ queryKey: ['subscriptions', sensorId, user.id] })
      toast(`${param} alert ${currently ? 'disabled' : 'enabled'}`)
    } catch { toast('Failed to update subscription', 'error') }
  }

  return (
    <Modal title={`Assign sensors`} subtitle={`For ${user.full_name || user.email}`} onClose={onClose}>
      <div className="mb-3">
        <ThemedInput placeholder="Search sensors..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {filtered?.map(sensor => {
          const isAssigned = assignedIds.has(sensor.id)
          const sub = subMap[sensor.id]
          const isExpanded = expandedSensor === sensor.id && isAssigned
          return (
            <div key={sensor.id} className={`rounded-xl border transition-colors ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
              <label className={`flex items-center gap-3 p-3 cursor-pointer ${dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                <input type="checkbox" checked={isAssigned} onChange={() => toggle(sensor.id)}
                  disabled={saving} className="w-4 h-4 accent-teal-600" />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{sensor.name}</div>
                  <div className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{sensor.location}</div>
                </div>
                {isAssigned && (
                  <button type="button"
                    onClick={e => { e.preventDefault(); setExpandedSensor(isExpanded ? null : sensor.id) }}
                    className={`p-1.5 rounded-lg transition-colors ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                    title="Manage alert subscriptions">
                    <Bell size={13} className={SUB_PARAMS.some(p => sub?.[p]) ? 'text-teal-500' : ''}/>
                  </button>
                )}
              </label>
              {isExpanded && (
                <div className={`px-4 pb-3 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide pt-2 pb-1.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Alert subscriptions</p>
                  <div className="flex flex-wrap gap-2">
                    {SUB_PARAMS.map(param => {
                      const on = sub?.[param] === true
                      return (
                        <button key={param} type="button" onClick={() => toggleSub(sensor.id, param)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            on ? 'bg-teal-500 border-teal-500 text-white' : dark ? 'border-gray-700 text-gray-400 hover:border-teal-500' : 'border-gray-200 text-gray-500 hover:border-teal-400'
                          }`}>
                          {on ? <Bell size={10}/> : <BellOff size={10}/>}
                          {param.charAt(0).toUpperCase() + param.slice(1)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered?.length === 0 && <p className={`text-sm text-center py-4 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>No sensors found</p>}
      </div>
      <div className="mt-4">
        <PrimaryButton onClick={onClose} className="w-full justify-center">Done</PrimaryButton>
      </div>
    </Modal>
  )
}

function EditUserModal({ user, onClose }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { dark } = useTheme()
  const [form, setForm] = useState({ full_name: user.full_name || '', role: user.role })
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (form.full_name !== user.full_name) await api.patch(`/auth/users/${user.id}`, { full_name: form.full_name })
      if (form.role !== user.role) await api.patch(`/auth/users/${user.id}/role`, { role: form.role })
      if (newPassword.length >= 8) await api.patch(`/auth/users/${user.id}/reset-password`, { new_password: newPassword })
      queryClient.invalidateQueries(['users'])
      toast('User updated successfully')
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user')
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Edit user" subtitle={user.email} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><FieldLabel>Full name</FieldLabel><ThemedInput value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} /></div>
        <div>
          <FieldLabel>Role</FieldLabel>
          <div className="flex gap-3">
            {['public', 'admin'].map(r => (
              <label key={r} className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border transition-all text-sm flex-1 justify-center ${
                form.role === r
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : dark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
              }`}>
                <input type="radio" className="sr-only" checked={form.role === r} onChange={() => setForm({...form, role: r})} />
                {r === 'admin' ? <Shield size={13} /> : <User size={13} />}
                <span className="capitalize">{r}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Reset password <span className="normal-case font-normal text-gray-400">(optional)</span></FieldLabel>
          <ThemedInput type="password" placeholder="Leave blank to keep current" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <p className={`text-xs mt-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Minimum 8 characters to apply</p>
        </div>
        {error && <div className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl border border-red-100">{error}</div>}
        <div className="flex gap-3 pt-2">
          <GhostButton type="button" onClick={onClose} className="flex-1 justify-center">Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving} className="flex-1 justify-center">{saving ? 'Saving...' : 'Save changes'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}

export default function Users() {
  const { dark } = useTheme()
  const queryClient = useQueryClient()
  const toast = useToast()
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

  const toggleActive = async user => {
    const endpoint = user.is_active ? `/auth/users/${user.id}/disable` : `/auth/users/${user.id}/enable`
    try {
      await api.patch(endpoint)
      queryClient.invalidateQueries(['users'])
      toast(user.is_active ? 'Account disabled' : 'Account enabled')
    } catch { toast('Failed to update account', 'error') }
  }

  const filtered = users?.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.is_active : !u.is_active)
    return matchSearch && matchRole && matchStatus
  })

  if (isLoading) return <PageWrapper><div className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Loading users...</div></PageWrapper>

  return (
    <PageWrapper>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <PageTitle title="Users" subtitle={`${filtered?.length ?? 0} of ${users?.length ?? 0} accounts`} />
        <Tooltip text="Create a new user account">
          <PrimaryButton onClick={() => setCreateOpen(true)}><Plus size={16} /> Add user</PrimaryButton>
        </Tooltip>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="relative sm:col-span-1">
          <Search size={14} className={`absolute left-3 top-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
          <ThemedInput className="pl-9 pr-8 w-full" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-3">
              <X size={14} className={dark ? 'text-gray-500' : 'text-gray-400'} />
            </button>
          )}
        </div>
        <ThemedSelect value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full">
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="public">Public</option>
        </ThemedSelect>
        <ThemedSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </ThemedSelect>
        {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all') }}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap w-full sm:w-auto ${
              dark ? 'border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            Clear
          </button>
        )}
      </div>

      <Card>
        <div className={`divide-y ${dark ? 'divide-gray-800' : 'divide-gray-50'}`}>
          {filtered?.length === 0 && (
            <div className={`px-5 py-10 text-center text-sm ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
              No users match your search
            </div>
          )}
          {filtered?.map(user => (
            <div
                key={user.id}
                className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-colors ${
                  dark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                }`}
              >
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
               <div className={`font-medium text-sm truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{user.full_name || '—'}</div>
               <div className={`text-xs truncate ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{user.email}</div>
              </div>
              <span className={`self-start sm:self-auto text-xs px-2.5 py-1 rounded-full ${
                user.role === 'admin'
                  ? dark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-700'
                  : dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
              }`}>
                {user.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                {user.role}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full ${
                user.is_active
                  ? dark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'
                  : dark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'
              }`}>
                {user.is_active ? 'Active' : 'Disabled'}
              </span>
              <div className="flex items-center gap-1 self-end sm:self-auto">
                <Tooltip text="Edit user details">
                  <button onClick={() => setEditUser(user)} className={`p-2 rounded-xl transition-colors ${dark ? 'hover:bg-gray-800 text-gray-500 hover:text-teal-400' : 'hover:bg-gray-100 text-gray-400 hover:text-teal-600'}`}>
                    <Edit2 size={15} />
                  </button>
                </Tooltip>
                <Tooltip text="Assign sensors">
                  <button onClick={() => setAssignUser(user)} className={`p-2 rounded-xl transition-colors ${dark ? 'hover:bg-gray-800 text-gray-500 hover:text-teal-400' : 'hover:bg-gray-100 text-gray-400 hover:text-teal-600'}`}>
                    <Link size={15} />
                  </button>
                </Tooltip>
                <Tooltip text={user.is_active ? 'Disable account' : 'Enable account'}>
                  <button onClick={() => toggleActive(user)} className={`p-2 rounded-xl transition-colors ${dark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                    {user.is_active
                      ? <UserX size={15} className="text-red-400" />
                      : <UserCheck size={15} className="text-green-500" />}
                  </button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} />}
      {assignUser && <AssignModal user={assignUser} onClose={() => setAssignUser(null)} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
    </PageWrapper>
  )
}
