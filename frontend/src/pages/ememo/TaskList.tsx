import { useState, useEffect, useContext, useRef } from 'react'
import { tasksApi } from '../../api/tasks'
import { usersApi } from '../../api/users'
import { NotifContext } from '../../context/NotifContext'
import { useAuth } from '../../hooks/useAuth'
import { usePermission } from '../../hooks/usePermission'
import TaskCard from '../../components/TaskCard'
import PermissionGate from '../../components/PermissionGate'

interface Task {
  id: string; title: string; description: string; priority: string; status: string
  progress?: number; deadline?: string; created_at: string
  from_user?: { id: string; fullname: string }
  to_user?: { id: string; fullname: string }
}

interface TaskComment { id: string; text: string; created_at: string; user: { fullname: string } }
interface HistoryItem { id: string; from_status: string; to_status: string; created_at: string; changed_by: { fullname: string } }
interface Attachment { id: string; file_name: string; file_size: number; created_at: string; uploader: { fullname: string } }
interface UserOption { id: string; fullname: string; username: string }

const STATUS_OPTS = [
  { value: '', label: 'Semua Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'assigned', label: 'Ditugaskan' },
  { value: 'in_progress', label: 'Dikerjakan' },
  { value: 'done', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
]

const PRIORITY_OPTS = [
  { value: '', label: 'Semua Prioritas' },
  { value: 'high', label: 'Tinggi' },
  { value: 'medium', label: 'Sedang' },
  { value: 'low', label: 'Rendah' },
]

const NEXT_STATUS: Record<string, string[]> = {
  draft: ['assigned'],
  assigned: ['in_progress', 'rejected'],
  in_progress: ['done', 'rejected'],
  done: [],
  rejected: [],
}

const statusLabel: Record<string, string> = {
  draft: 'Draft', assigned: 'Ditugaskan', in_progress: 'Dikerjakan',
  done: 'Selesai', rejected: 'Ditolak',
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', priority: '', mine: 'false', page: 1, limit: 20 })
  const [showCreate, setShowCreate] = useState(false)
  const [showDetail, setShowDetail] = useState<Task | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'timeline' | 'lampiran'>('info')
  const [comments, setComments] = useState<TaskComment[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [newComment, setNewComment] = useState('')
  const [progressVal, setProgressVal] = useState(0)
  const [form, setForm] = useState({ title: '', description: '', to_user_id: '', priority: 'medium', deadline: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showNotif } = useContext(NotifContext)
  const { user } = useAuth()
  const ememoPerm = usePermission('ememo')

  useEffect(() => { fetchTasks() }, [filters])
  useEffect(() => { usersApi.list().then(res => setUsers(res.data.data)).catch(() => {}) }, [])

  const fetchTasks = async () => {
    setIsLoading(true)
    try {
      const params = { ...filters, mine: filters.mine === 'true' ? true : undefined }
      const res = await tasksApi.list(params)
      setTasks(res.data.data)
      setTotal(res.data.total)
    } catch { showNotif('error', 'Gagal memuat tugas') }
    finally { setIsLoading(false) }
  }

  const openDetail = async (task: Task) => {
    setShowDetail(task)
    setDetailTab('info')
    setProgressVal(task.progress ?? 0)
    loadComments(task.id)
    loadHistory(task.id)
    loadAttachments(task.id)
  }

  const loadComments = async (id: string) => {
    try { const r = await tasksApi.listComments(id); setComments(r.data.data) } catch {}
  }
  const loadHistory = async (id: string) => {
    try { const r = await tasksApi.getHistory(id); setHistory(r.data.data) } catch {}
  }
  const loadAttachments = async (id: string) => {
    try { const r = await tasksApi.listAttachments(id); setAttachments(r.data.data) } catch {}
  }

  const handleCreate = async () => {
    if (!form.title || !form.to_user_id) { showNotif('warning', 'Judul dan penerima wajib diisi'); return }
    try {
      await tasksApi.create({ ...form, deadline: form.deadline || undefined })
      showNotif('success', 'Tugas berhasil dibuat')
      setShowCreate(false)
      setForm({ title: '', description: '', to_user_id: '', priority: 'medium', deadline: '' })
      fetchTasks()
    } catch { showNotif('error', 'Gagal membuat tugas') }
  }

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      await tasksApi.updateStatus(taskId, newStatus)
      showNotif('success', 'Status berhasil diupdate')
      fetchTasks()
      if (showDetail?.id === taskId) {
        const res = await tasksApi.get(taskId)
        setShowDetail(res.data.data)
        loadHistory(taskId)
      }
    } catch { showNotif('error', 'Gagal update status') }
  }

  const handleProgressSave = async () => {
    if (!showDetail) return
    try {
      await tasksApi.updateProgress(showDetail.id, progressVal)
      showNotif('success', 'Progress diperbarui')
      setShowDetail(d => d ? { ...d, progress: progressVal } : d)
      setTasks(ts => ts.map(t => t.id === showDetail.id ? { ...t, progress: progressVal } : t))
    } catch { showNotif('error', 'Gagal update progress') }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !showDetail) return
    try {
      await tasksApi.addComment(showDetail.id, newComment)
      setNewComment('')
      loadComments(showDetail.id)
    } catch { showNotif('error', 'Gagal mengirim komentar') }
  }

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !showDetail) return
    try {
      await tasksApi.uploadAttachment(showDetail.id, file)
      showNotif('success', 'File berhasil diupload')
      loadAttachments(showDetail.id)
    } catch { showNotif('error', 'Gagal upload file') }
    e.target.value = ''
  }

  const handleDownloadFile = async (attachId: string, fileName: string) => {
    if (!showDetail) return
    try {
      const res = await tasksApi.downloadAttachment(showDetail.id, attachId)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = fileName; a.click()
      URL.revokeObjectURL(url)
    } catch { showNotif('error', 'Gagal download file') }
  }

  const handleDeleteFile = async (attachId: string) => {
    if (!showDetail) return
    try {
      await tasksApi.deleteAttachment(showDetail.id, attachId)
      showNotif('success', 'File dihapus')
      loadAttachments(showDetail.id)
    } catch { showNotif('error', 'Gagal menghapus file') }
  }

  const handleExport = async () => {
    try {
      const res = await tasksApi.exportCSV({ status: filters.status || undefined, priority: filters.priority || undefined })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = `delegasi-tugas-${new Date().toISOString().slice(0,10)}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch { showNotif('error', 'Gagal export CSV') }
  }

  const handleExportPDF = () => {
    const priorityLabel: Record<string, string> = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' }
    const sLabel: Record<string, string> = { draft: 'Draft', assigned: 'Ditugaskan', in_progress: 'Dikerjakan', done: 'Selesai', rejected: 'Ditolak' }
    const rows = tasks.map((t, i) => `<tr>
      <td>${i + 1}</td><td>${t.title}</td>
      <td>${t.from_user?.fullname || '-'}</td><td>${t.to_user?.fullname || '-'}</td>
      <td>${priorityLabel[t.priority] || t.priority}</td>
      <td><span class="badge ${t.status}">${sLabel[t.status] || t.status}</span></td>
      <td>${t.progress ?? 0}%</td>
      <td>${t.deadline ? new Date(t.deadline).toLocaleDateString('id-ID') : '-'}</td>
    </tr>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Laporan Delegasi Tugas</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;margin:20px}
      h2{color:#1e3a5f;margin-bottom:4px}p{color:#666;margin:0 0 12px}
      table{width:100%;border-collapse:collapse}
      th{background:#1e3a5f;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
      td{padding:5px 8px;border-bottom:1px solid #eee}
      tr:nth-child(even) td{background:#f9f9f9}
      .badge{display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:bold}
      .done{background:#d1fae5;color:#065f46}.in_progress{background:#dbeafe;color:#1e40af}
      .assigned{background:#fef3c7;color:#92400e}.draft{background:#f3f4f6;color:#374151}
      .rejected{background:#fee2e2;color:#991b1b}
      @media print{body{margin:0}}
    </style></head><body>
    <h2>Laporan Delegasi Tugas</h2>
    <p>Dicetak: ${new Date().toLocaleString('id-ID')} &nbsp;|&nbsp; Total: ${tasks.length} tugas</p>
    <table><thead><tr>
      <th>No</th><th>Judul</th><th>Dari</th><th>Ditugaskan ke</th>
      <th>Prioritas</th><th>Status</th><th>Progress</th><th>Deadline</th>
    </tr></thead><tbody>${rows}</tbody></table>
    </body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 300) }
  }

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Delegasi Tugas</h2>
            <p className="text-gray-500 text-sm">{total} tugas ditemukan</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Excel
            </button>
            <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
            <PermissionGate moduleName="ememo" requiredLevel="edit">
              <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Buat Tugas
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <select className="input-field w-auto text-sm" value={filters.status}
              onChange={e => setFilters(f => ({...f, status: e.target.value, page: 1}))}>
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="input-field w-auto text-sm" value={filters.priority}
              onChange={e => setFilters(f => ({...f, priority: e.target.value, page: 1}))}>
              {PRIORITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={filters.mine === 'true'}
                onChange={e => setFilters(f => ({...f, mine: e.target.checked ? 'true' : 'false', page: 1}))}
                className="rounded" />
              Hanya tugas saya
            </label>
          </div>
        </div>

        {/* Task grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">📋</div>
            <p>Tidak ada tugas ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tasks.map(task => <TaskCard key={task.id} task={task} onClick={() => openDetail(task)} />)}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-fadeIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">Buat Tugas Baru</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="label">Judul Tugas *</label>
                <input className="input-field" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Judul tugas" />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Penjelasan tugas..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Ditugaskan ke *</label>
                  <select className="input-field" value={form.to_user_id} onChange={e => setForm(f => ({...f, to_user_id: e.target.value}))}>
                    <option value="">Pilih user</option>
                    {users.filter(u => u.id !== user?.id).map(u => (
                      <option key={u.id} value={u.id}>{u.fullname}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Prioritas</label>
                  <select className="input-field" value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}>
                    <option value="low">Rendah</option>
                    <option value="medium">Sedang</option>
                    <option value="high">Tinggi</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Deadline</label>
                <input type="date" className="input-field" value={form.deadline} onChange={e => setForm(f => ({...f, deadline: e.target.value}))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Batal</button>
              <button onClick={handleCreate} className="btn-primary">Buat Tugas</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fadeIn">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 flex-1 pr-4">{showDetail.title}</h3>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl flex-shrink-0">×</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6">
              {(['info', 'timeline', 'lampiran'] as const).map(tab => (
                <button key={tab} onClick={() => setDetailTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                    detailTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab === 'info' ? 'Info' : tab === 'timeline' ? 'Timeline' : `Lampiran (${attachments.length})`}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">

              {/* TAB: Info */}
              {detailTab === 'info' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      showDetail.priority === 'high' ? 'badge-high' : showDetail.priority === 'medium' ? 'badge-medium' : 'badge-low'
                    }`}>{showDetail.priority === 'high' ? 'Tinggi' : showDetail.priority === 'medium' ? 'Sedang' : 'Rendah'}</span>
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-700">{statusLabel[showDetail.status] || showDetail.status}</span>
                    {showDetail.deadline && <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">📅 {new Date(showDetail.deadline).toLocaleDateString('id-ID')}</span>}
                  </div>

                  {showDetail.description && <p className="text-sm text-gray-700">{showDetail.description}</p>}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Dari:</span> <span className="font-medium">{showDetail.from_user?.fullname}</span></div>
                    <div><span className="text-gray-500">Ke:</span> <span className="font-medium">{showDetail.to_user?.fullname}</span></div>
                  </div>

                  {/* Progress */}
                  {ememoPerm.canEdit && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-semibold text-gray-700">Progress Tugas</p>
                        <span className="text-sm font-bold text-primary">{progressVal}%</span>
                      </div>
                      <input type="range" min={0} max={100} step={5} value={progressVal}
                        onChange={e => setProgressVal(Number(e.target.value))}
                        className="w-full accent-primary mb-3" />
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div className={`h-2 rounded-full transition-all ${
                          progressVal === 100 ? 'bg-green-500' : progressVal >= 50 ? 'bg-blue-500' : 'bg-yellow-400'
                        }`} style={{ width: `${progressVal}%` }} />
                      </div>
                      <button onClick={handleProgressSave} className="btn-primary text-xs px-3 py-1.5">Simpan Progress</button>
                    </div>
                  )}

                  {/* Status actions */}
                  {ememoPerm.canEdit && NEXT_STATUS[showDetail.status]?.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Update Status:</p>
                      <div className="flex gap-2 flex-wrap">
                        {NEXT_STATUS[showDetail.status].map(s => (
                          <button key={s} onClick={() => handleStatusUpdate(showDetail.id, s)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                              s === 'done' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                              s === 'rejected' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
                              'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            }`}>
                            → {s === 'assigned' ? 'Tugaskan' : s === 'in_progress' ? 'Mulai Kerjakan' : s === 'done' ? 'Tandai Selesai' : 'Tolak'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Komentar ({comments.length})</p>
                    <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
                      {comments.map(c => (
                        <div key={c.id} className="flex gap-2">
                          <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">{c.user?.fullname?.charAt(0)}</div>
                          <div className="flex-1 bg-gray-50 rounded-lg p-2">
                            <p className="text-xs font-medium text-gray-700">{c.user?.fullname}</p>
                            <p className="text-sm text-gray-600">{c.text}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(c.created_at).toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                      ))}
                      {comments.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Belum ada komentar</p>}
                    </div>
                    {ememoPerm.canEdit && (
                      <div className="flex gap-2">
                        <input className="input-field flex-1 text-sm" value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddComment() }}
                          placeholder="Tulis komentar..." />
                        <button onClick={handleAddComment} className="btn-primary text-sm px-3">Kirim</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: Timeline */}
              {detailTab === 'timeline' && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-4">Riwayat Perubahan Status</p>
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Belum ada perubahan status</p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gray-200" />
                      <div className="space-y-4">
                        {history.map((h, i) => (
                          <div key={h.id} className="flex gap-4 relative">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 z-10 ${
                              h.to_status === 'done' ? 'bg-green-500 text-white' :
                              h.to_status === 'rejected' ? 'bg-red-500 text-white' :
                              h.to_status === 'in_progress' ? 'bg-yellow-500 text-white' :
                              'bg-blue-500 text-white'
                            }`}>{i + 1}</div>
                            <div className="flex-1 pb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{statusLabel[h.from_status] || h.from_status}</span>
                                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                  h.to_status === 'done' ? 'bg-green-100 text-green-700' :
                                  h.to_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  h.to_status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>{statusLabel[h.to_status] || h.to_status}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                oleh <span className="font-medium text-gray-700">{h.changed_by?.fullname}</span>
                                {' · '}{new Date(h.created_at).toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Lampiran */}
              {detailTab === 'lampiran' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-gray-700">File Lampiran</p>
                    {ememoPerm.canEdit && (
                      <>
                        <button onClick={() => fileInputRef.current?.click()} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Upload File
                        </button>
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadFile} />
                      </>
                    )}
                  </div>
                  {attachments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">📎</div>
                      <p className="text-sm">Belum ada lampiran</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map(a => (
                        <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{a.file_name}</p>
                            <p className="text-xs text-gray-500">{formatBytes(a.file_size)} · oleh {a.uploader?.fullname} · {new Date(a.created_at).toLocaleDateString('id-ID')}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => handleDownloadFile(a.id, a.file_name)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Download">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                            {ememoPerm.canEdit && (
                              <button onClick={() => handleDeleteFile(a.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Hapus">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
