import { useState, useEffect, useContext, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { NotifContext } from '../context/NotifContext'
import Topbar from '../components/Topbar'
import Sidebar from '../components/Sidebar'
import axiosInstance from '../api/axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export default function Profile() {
  const { user, refreshMe } = useAuth()
  const { showNotif } = useContext(NotifContext)
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({ fullname: '', email: '', old_password: '', new_password: '', confirm_password: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [photoURL, setPhotoURL] = useState('')

  useEffect(() => {
    axiosInstance.get('/api/profile').then(res => {
      const u = res.data.data
      setForm(f => ({ ...f, fullname: u.fullname, email: u.email }))
      setPhotoURL(u.photo_url || '')
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (form.new_password && form.new_password !== form.confirm_password) {
      showNotif('warning', 'Konfirmasi password tidak cocok')
      return
    }
    if (form.new_password && !form.old_password) {
      showNotif('warning', 'Masukkan password lama')
      return
    }
    setIsSaving(true)
    try {
      const payload: Record<string, string> = {}
      if (form.fullname) payload.fullname = form.fullname
      if (form.email) payload.email = form.email
      if (form.new_password) { payload.old_password = form.old_password; payload.new_password = form.new_password }
      await axiosInstance.put('/api/profile', payload)
      showNotif('success', 'Profil berhasil diperbarui')
      setForm(f => ({ ...f, old_password: '', new_password: '', confirm_password: '' }))
      if (refreshMe) refreshMe()
    } catch (e: any) {
      showNotif('error', e.response?.data?.error || 'Gagal memperbarui profil')
    } finally { setIsSaving(false) }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingPhoto(true)
    try {
      const form = new FormData()
      form.append('avatar', file)
      const res = await axiosInstance.post('/api/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPhotoURL(res.data.photo_url)
      showNotif('success', 'Foto profil diperbarui')
      if (refreshMe) refreshMe()
    } catch (e: any) {
      showNotif('error', e.response?.data?.error || 'Gagal upload foto')
    } finally { setIsUploadingPhoto(false); e.target.value = '' }
  }

  const avatarSrc = photoURL ? `${API_URL}${photoURL}` : null

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Profil Saya" onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Avatar */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Foto Profil</h3>
              <div className="flex items-center gap-5">
                <div className="relative">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-primary/30" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                      {form.fullname?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary text-sm" disabled={isUploadingPhoto}>
                    Ganti Foto
                  </button>
                  <p className="text-xs text-gray-400 mt-1">JPG atau PNG, maks 5MB</p>
                  <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handlePhotoChange} />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Informasi Akun</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Username</label>
                  <input className="input-field bg-gray-50 text-gray-500 cursor-not-allowed" value={user?.username || ''} disabled />
                </div>
                <div>
                  <label className="label">Nama Lengkap</label>
                  <input className="input-field" value={form.fullname}
                    onChange={e => setForm(f => ({ ...f, fullname: e.target.value }))} placeholder="Nama lengkap" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input-field" type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Ganti Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Password Lama</label>
                  <input className="input-field" type="password" value={form.old_password}
                    onChange={e => setForm(f => ({ ...f, old_password: e.target.value }))} placeholder="Password saat ini" />
                </div>
                <div>
                  <label className="label">Password Baru</label>
                  <input className="input-field" type="password" value={form.new_password}
                    onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))} placeholder="Minimal 6 karakter" />
                </div>
                <div>
                  <label className="label">Konfirmasi Password Baru</label>
                  <input className="input-field" type="password" value={form.confirm_password}
                    onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))} placeholder="Ulangi password baru" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => navigate(-1)} className="btn-secondary">Batal</button>
              <button onClick={handleSave} className="btn-primary" disabled={isSaving}>
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
