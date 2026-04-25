import { useState, useEffect, useContext } from 'react'
import { usersApi } from '../api/users'
import { NotifContext } from '../context/NotifContext'
import Topbar from '../components/Topbar'
import Sidebar from '../components/Sidebar'

interface User {
  id: string
  username: string
  fullname: string
  email: string
  is_active: boolean
  created_at: string
}

interface PermMatrix {
  module_id: number
  module_name: string
  module_label: string
  access_level: string
}

const ACCESS_LEVELS = ['none', 'view', 'edit', 'admin']
const ACCESS_COLORS: Record<string, string> = {
  none: 'bg-gray-100 text-gray-600',
  view: 'bg-green-100 text-green-700',
  edit: 'bg-blue-100 text-blue-700',
  admin: 'bg-purple-100 text-purple-700',
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPermModal, setShowPermModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<PermMatrix[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', fullname: '', email: '', is_active: true })
  const { showNotif } = useContext(NotifContext)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const res = await usersApi.list()
      setUsers(res.data.data)
    } catch { showNotif('error', 'Gagal memuat data user') }
    finally { setIsLoading(false) }
  }

  const openCreate = () => {
    setEditUser(null)
    setForm({ username: '', password: '', fullname: '', email: '', is_active: true })
    setShowModal(true)
  }

  const openEdit = (user: User) => {
    setEditUser(user)
    setForm({ username: user.username, password: '', fullname: user.fullname, email: user.email, is_active: user.is_active })
    setShowModal(true)
  }

  const openPermissions = async (user: User) => {
    setSelectedUser(user)
    try {
      const res = await usersApi.getPermissions(user.id)
      setPermissions(res.data.data)
      setShowPermModal(true)
    } catch { showNotif('error', 'Gagal memuat permissions') }
  }

  const handleSave = async () => {
    try {
      if (editUser) {
        const payload: Record<string, unknown> = { fullname: form.fullname, email: form.email, is_active: form.is_active }
        if (form.password) payload.password = form.password
        await usersApi.update(editUser.id, payload)
        showNotif('success', 'User berhasil diupdate')
      } else {
        await usersApi.create({ ...form })
        showNotif('success', 'User berhasil dibuat')
      }
      setShowModal(false)
      fetchUsers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal menyimpan user'
      showNotif('error', msg)
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`Hapus user "${user.fullname}"?`)) return
    try {
      await usersApi.delete(user.id)
      showNotif('success', 'User berhasil dihapus')
      fetchUsers()
    } catch { showNotif('error', 'Gagal menghapus user') }
  }

  const handlePermissionChange = (moduleId: number, level: string) => {
    setPermissions(prev => prev.map(p => p.module_id === moduleId ? { ...p, access_level: level } : p))
  }

  const savePermissions = async () => {
    if (!selectedUser) return
    try {
      await usersApi.updatePermissions(selectedUser.id, permissions.map(p => ({
        module_id: p.module_id,
        access_level: p.access_level,
      })))
      showNotif('success', 'Permissions berhasil diupdate')
      setShowPermModal(false)
    } catch { showNotif('error', 'Gagal menyimpan permissions') }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="User Management" onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Manajemen Pengguna</h2>
              <p className="text-gray-500 text-sm">{users.length} pengguna terdaftar</p>
            </div>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah User
            </button>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nama</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Username</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">Memuat...</td></tr>
                ) : users.map(user => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {user.fullname.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800">{user.fullname}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.username}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={user.is_active ? 'badge-active' : 'badge-obsolete'}>
                        {user.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openPermissions(user)}
                          className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors">
                          Akses
                        </button>
                        <button onClick={() => openEdit(user)}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(user)}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-fadeIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">{editUser ? 'Edit User' : 'Tambah User Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {!editUser && (
                <div>
                  <label className="label">Username *</label>
                  <input className="input-field" value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))} placeholder="username" />
                </div>
              )}
              <div>
                <label className="label">Nama Lengkap *</label>
                <input className="input-field" value={form.fullname} onChange={e => setForm(f => ({...f, fullname: e.target.value}))} placeholder="Nama lengkap" />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input-field" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@example.com" />
              </div>
              <div>
                <label className="label">{editUser ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}</label>
                <input type="password" className="input-field" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="Minimal 6 karakter" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({...f, is_active: e.target.checked}))} className="rounded" />
                <label htmlFor="is_active" className="text-sm text-gray-700">Akun Aktif</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
              <button onClick={handleSave} className="btn-primary">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-fadeIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-gray-800">Permission Matrix</h3>
                <p className="text-sm text-gray-500">{selectedUser.fullname}</p>
              </div>
              <button onClick={() => setShowPermModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold text-gray-600">Modul</th>
                    {ACCESS_LEVELS.map(level => (
                      <th key={level} className="text-center py-2 font-semibold text-gray-600 capitalize">{level}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map(perm => (
                    <tr key={perm.module_id} className="border-b border-gray-100">
                      <td className="py-3 font-medium text-gray-700">{perm.module_label}</td>
                      {ACCESS_LEVELS.map(level => (
                        <td key={level} className="text-center py-3">
                          <button
                            onClick={() => handlePermissionChange(perm.module_id, level)}
                            className={`w-8 h-8 rounded-full text-xs font-medium transition-all
                              ${perm.access_level === level
                                ? `${ACCESS_COLORS[level]} ring-2 ring-offset-1 ring-current`
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                          >
                            {level === 'none' ? '✕' : level === 'view' ? 'V' : level === 'edit' ? 'E' : 'A'}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-3 mt-3 text-xs text-gray-500">
                {ACCESS_LEVELS.map(l => (
                  <span key={l} className={`px-2 py-0.5 rounded ${ACCESS_COLORS[l]}`}>{l}</span>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowPermModal(false)} className="btn-secondary">Batal</button>
              <button onClick={savePermissions} className="btn-primary">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
