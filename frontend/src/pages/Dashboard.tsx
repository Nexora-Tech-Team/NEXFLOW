import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePermission } from '../hooks/usePermission'
import Topbar from '../components/Topbar'
import Sidebar from '../components/Sidebar'
import { useState, useEffect } from 'react'
import axiosInstance from '../api/axios'

interface Stats {
  documents: { total: number; active: number }
  tasks: { total: number; my_total: number; my_done: number; my_pending: number }
  status_counts: { status: string; count: number }[]
  categories: { category: string; count: number }[]
  recent_activities: { id: string; activity_type: string; description: string; created_at: string; user?: { fullname: string } }[]
}

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', assigned: 'Ditugaskan', in_progress: 'Dikerjakan', done: 'Selesai', rejected: 'Ditolak' }
const STATUS_COLOR: Record<string, string> = { draft: 'bg-gray-400', assigned: 'bg-yellow-400', in_progress: 'bg-blue-500', done: 'bg-green-500', rejected: 'bg-red-400' }

export default function Dashboard() {
  const { user } = useAuth()
  const edocPerm = usePermission('edoc')
  const ememoPerm = usePermission('ememo')
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    axiosInstance.get('/api/stats').then(res => setStats(res.data)).catch(() => {})
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Selamat Pagi'
    if (h < 17) return 'Selamat Siang'
    return 'Selamat Sore'
  }

  const totalTasksForPct = stats?.status_counts.reduce((s, x) => s + x.count, 0) || 1

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Dashboard" onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Welcome */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {greeting()}, {user?.fullname?.split(' ')[0] || 'Pengguna'}!
            </h2>
            <p className="text-gray-500 mt-1">Selamat datang di NexFlow — Integrated Flow Administration</p>
          </div>

          {/* Stat Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="card p-5">
                <p className="text-2xl font-bold text-primary">{stats.documents.total}</p>
                <p className="text-sm text-gray-600 mt-0.5">Total Dokumen</p>
                <p className="text-xs text-gray-400">{stats.documents.active} aktif</p>
              </div>
              <div className="card p-5">
                <p className="text-2xl font-bold text-accent">{stats.tasks.total}</p>
                <p className="text-sm text-gray-600 mt-0.5">Total Tugas</p>
                <p className="text-xs text-gray-400">{stats.tasks.my_total} milik saya</p>
              </div>
              <div className="card p-5">
                <p className="text-2xl font-bold text-success">{stats.tasks.my_done}</p>
                <p className="text-sm text-gray-600 mt-0.5">Tugas Selesai</p>
                <p className="text-xs text-gray-400">dari {stats.tasks.my_total} tugas saya</p>
              </div>
              <div className="card p-5">
                <p className="text-2xl font-bold text-yellow-500">{stats.tasks.my_pending}</p>
                <p className="text-sm text-gray-600 mt-0.5">Tugas Pending</p>
                <p className="text-xs text-gray-400">perlu diselesaikan</p>
              </div>
            </div>
          )}

          {/* Charts row */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Task status breakdown */}
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Status Tugas</h3>
                <div className="space-y-3">
                  {stats.status_counts.map(sc => {
                    const pct = Math.round((sc.count / totalTasksForPct) * 100)
                    return (
                      <div key={sc.status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{STATUS_LABEL[sc.status] || sc.status}</span>
                          <span className="text-gray-500">{sc.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${STATUS_COLOR[sc.status] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                  {stats.status_counts.length === 0 && <p className="text-sm text-gray-400">Belum ada tugas</p>}
                </div>
              </div>

              {/* Category breakdown */}
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Dokumen per Kategori</h3>
                <div className="space-y-3">
                  {stats.categories.map(cat => {
                    const pct = stats.documents.total ? Math.round((cat.count / stats.documents.total) * 100) : 0
                    return (
                      <div key={cat.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 truncate pr-2">{cat.category || 'Tanpa Kategori'}</span>
                          <span className="text-gray-500 flex-shrink-0">{cat.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                  {stats.categories.length === 0 && <p className="text-sm text-gray-400">Belum ada dokumen</p>}
                </div>
              </div>

              {/* Recent activity */}
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Aktivitas Terbaru</h3>
                <div className="space-y-3">
                  {stats.recent_activities.map(act => (
                    <div key={act.id} className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 flex-shrink-0">{act.activity_type}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate">{act.description}</p>
                        <p className="text-xs text-gray-400">{act.user?.fullname} · {new Date(act.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                  {stats.recent_activities.length === 0 && <p className="text-sm text-gray-400">Belum ada aktivitas</p>}
                </div>
              </div>
            </div>
          )}

          {/* Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {edocPerm.hasAccess && (
              <div className="card p-6 cursor-pointer hover:shadow-lg transition-all duration-200 group border-l-4 border-primary"
                onClick={() => navigate('/edoc/browse')}>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-primary transition-colors">eDoc</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Document Center</p>
                    <p className="text-xs text-gray-400 mt-2">Kelola, cari, dan unduh dokumen perusahaan dengan watermark otomatis</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${edocPerm.isAdmin ? 'bg-purple-100 text-purple-700' : edocPerm.canEdit ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {edocPerm.isAdmin ? 'Admin' : edocPerm.canEdit ? 'Edit' : 'View'}
                      </span>
                      <span className="text-xs text-gray-400">→ Buka modul</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {ememoPerm.hasAccess && (
              <div className="card p-6 cursor-pointer hover:shadow-lg transition-all duration-200 group border-l-4 border-accent"
                onClick={() => navigate('/ememo/tasks')}>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-accent transition-colors">eMemo</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Task & Organization</p>
                    <p className="text-xs text-gray-400 mt-2">Delegasi tugas, kelola organisasi, dan pantau progres tim</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ememoPerm.isAdmin ? 'bg-purple-100 text-purple-700' : ememoPerm.canEdit ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {ememoPerm.isAdmin ? 'Admin' : ememoPerm.canEdit ? 'Edit' : 'View'}
                      </span>
                      <span className="text-xs text-gray-400">→ Buka modul</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick access */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {edocPerm.canView && (
              <button onClick={() => navigate('/edoc/browse')} className="card p-4 text-center hover:shadow-md transition-shadow group">
                <div className="text-2xl mb-2">📄</div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-primary">Browse Dokumen</p>
              </button>
            )}
            {ememoPerm.canView && (
              <button onClick={() => navigate('/ememo/tasks')} className="card p-4 text-center hover:shadow-md transition-shadow group">
                <div className="text-2xl mb-2">✅</div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-primary">Delegasi Tugas</p>
              </button>
            )}
            {ememoPerm.canView && (
              <button onClick={() => navigate('/ememo/orgchart')} className="card p-4 text-center hover:shadow-md transition-shadow group">
                <div className="text-2xl mb-2">🏢</div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-primary">Bagan Organisasi</p>
              </button>
            )}
            <button onClick={() => navigate('/profile')} className="card p-4 text-center hover:shadow-md transition-shadow group">
              <div className="text-2xl mb-2">👤</div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-primary">Profil Saya</p>
            </button>
          </div>

          {!edocPerm.hasAccess && !ememoPerm.hasAccess && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-gray-700">Belum Ada Akses Modul</h3>
              <p className="text-gray-500 mt-2">Hubungi administrator untuk mendapatkan akses.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
