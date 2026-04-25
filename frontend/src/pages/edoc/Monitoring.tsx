import { useState, useEffect, useContext } from 'react'
import { monitoringApi } from '../../api/tasks'
import { activityLogApi } from '../../api/activityLog'
import { NotifContext } from '../../context/NotifContext'



interface SummaryData {
  documents: { total: number; active: number; obsolete: number }
  users: { total: number; active: number }
  tasks: { total: number; done: number; pending: number }
  activities: { total: number; recent: ActivityLog[] }
  categories: { category: string; count: number }[]
}

interface ActivityLog {
  id: string; activity_type: string; description: string
  ip_address: string; created_at: string
  user?: { fullname: string; username: string }
  document?: { title: string }
}

const ACT_COLORS: Record<string, string> = {
  view: 'bg-blue-100 text-blue-700',
  download: 'bg-green-100 text-green-700',
  upload: 'bg-purple-100 text-purple-700',
  edit: 'bg-yellow-100 text-yellow-700',
  delete: 'bg-red-100 text-red-700',
  login: 'bg-gray-100 text-gray-700',
  logout: 'bg-gray-100 text-gray-600',
}

export default function EDocMonitoring() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [logFilters, setLogFilters] = useState({ user_id: '', type: '', date_from: '', date_to: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'summary' | 'activity'>('summary')
  const { showNotif } = useContext(NotifContext)

  useEffect(() => {
    monitoringApi.summary()
      .then(res => setSummary(res.data))
      .catch(() => showNotif('error', 'Gagal memuat summary'))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === 'activity') fetchLogs()
  }, [activeTab, logFilters])

  const fetchLogs = async () => {
    try {
      const res = await activityLogApi.list({ ...logFilters, limit: 100 })
      setLogs(res.data.data)
    } catch { showNotif('error', 'Gagal memuat activity log') }
  }

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">Monitoring</h2>
          <p className="text-gray-500 text-sm">Ringkasan aktivitas dan statistik sistem</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['summary', 'activity'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              {tab === 'summary' ? 'Ringkasan' : 'Activity Log'}
            </button>
          ))}
        </div>

        {activeTab === 'summary' && summary && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Dokumen', value: summary.documents.total, sub: `${summary.documents.active} aktif`, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Total User', value: summary.users.total, sub: `${summary.users.active} aktif`, color: 'text-accent', bg: 'bg-accent/10' },
                { label: 'Total Tugas', value: summary.tasks.total, sub: `${summary.tasks.done} selesai`, color: 'text-success', bg: 'bg-success/10' },
                { label: 'Total Aktivitas', value: summary.activities.total, sub: 'semua waktu', color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map(stat => (
                <div key={stat.label} className="card p-5">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                    <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category breakdown */}
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Dokumen per Kategori</h3>
                <div className="space-y-3">
                  {summary.categories.map(cat => {
                    const pct = summary.documents.total ? Math.round((cat.count / summary.documents.total) * 100) : 0
                    return (
                      <div key={cat.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{cat.category || 'Tanpa Kategori'}</span>
                          <span className="text-gray-500">{cat.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent activity */}
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Aktivitas Terbaru</h3>
                <div className="space-y-3">
                  {summary.activities.recent.slice(0, 8).map(act => (
                    <div key={act.id} className="flex items-start gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${ACT_COLORS[act.activity_type] || 'bg-gray-100 text-gray-600'}`}>
                        {act.activity_type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{act.description}</p>
                        <p className="text-xs text-gray-400">
                          {act.user?.fullname} · {new Date(act.created_at).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            {/* Filters */}
            <div className="card p-4 mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="label">Tipe Aktivitas</label>
                  <select className="input-field" value={logFilters.type}
                    onChange={e => setLogFilters(f => ({...f, type: e.target.value}))}>
                    <option value="">Semua</option>
                    {['view', 'download', 'upload', 'edit', 'delete', 'login', 'logout'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Dari Tanggal</label>
                  <input type="date" className="input-field" value={logFilters.date_from}
                    onChange={e => setLogFilters(f => ({...f, date_from: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Sampai Tanggal</label>
                  <input type="date" className="input-field" value={logFilters.date_to}
                    onChange={e => setLogFilters(f => ({...f, date_to: e.target.value}))} />
                </div>
                <div className="flex items-end gap-2">
                  <button onClick={() => setLogFilters({ user_id: '', type: '', date_from: '', date_to: '' })}
                    className="btn-secondary flex-1 text-sm">Reset</button>
                  <button onClick={async () => {
                    try {
                      const res = await activityLogApi.exportCSV({ type: logFilters.type || undefined, date_from: logFilters.date_from || undefined, date_to: logFilters.date_to || undefined })
                      const url = URL.createObjectURL(res.data)
                      const a = document.createElement('a'); a.href = url
                      a.download = `activity-log-${new Date().toISOString().slice(0,10)}.csv`; a.click()
                      URL.revokeObjectURL(url)
                    } catch { showNotif('error', 'Gagal export') }
                  }} className="btn-secondary text-sm flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Excel
                  </button>
                </div>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Waktu</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipe</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Deskripsi</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-400">Tidak ada data</td></tr>
                    ) : logs.map(log => (
                      <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{log.user?.fullname || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACT_COLORS[log.activity_type] || 'bg-gray-100 text-gray-600'}`}>
                            {log.activity_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.description}</td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
