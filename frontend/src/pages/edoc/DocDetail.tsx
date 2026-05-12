import { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { documentsApi } from '../../api/documents'
import { NotifContext } from '../../context/NotifContext'
import { usePermission } from '../../hooks/usePermission'
import { useAuth } from '../../hooks/useAuth'
import PDFViewer from '../../components/PDFViewer'
import PermissionGate from '../../components/PermissionGate'
import Topbar from '../../components/Topbar'
import Sidebar from '../../components/Sidebar'

interface Document {
  id: string; title: string; category: string; sub_category: string
  area: string; description: string; file_name: string; file_size: number
  status: string; created_at: string; updated_at: string
  use_global_watermark: boolean; watermark_text: string
  max_print: number; allow_preview: boolean; expiry_date?: string
  uploader?: { fullname: string; email: string }
}

interface Comment {
  id: string; rating: number; text: string; created_at: string
  user: { fullname: string }
}

interface PrintQuota {
  max_print: number
  print_count: number
  remaining: number
}

function formatSize(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const STAR_LABELS = ['', 'Tidak Berguna', 'Cukup', 'Berguna', 'Sangat Berguna']

export default function DocDetail() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<Document | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'preview' | 'comments'>('info')
  const [commentForm, setCommentForm] = useState({ rating: 0, text: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', category: '', sub_category: '', area: '', description: '', status: '', max_print: 0, allow_preview: true, expiry_date: '' })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [printQuota, setPrintQuota] = useState<PrintQuota | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const { showNotif } = useContext(NotifContext)
  const edocPerm = usePermission('edoc')
  const { token, user } = useAuth()
  const navigate = useNavigate()

  const isExpired = doc?.expiry_date ? new Date() > new Date(doc.expiry_date) : false

  useEffect(() => {
    if (!id) return
    Promise.all([
      documentsApi.get(id),
      documentsApi.listComments(id),
      documentsApi.getPrintQuota(id),
    ]).then(([docRes, commRes, quotaRes]) => {
      setDoc(docRes.data.data)
      setComments(commRes.data.data)
      setPrintQuota(quotaRes.data)
    }).catch(() => showNotif('error', 'Gagal memuat dokumen'))
    .finally(() => setIsLoading(false))
  }, [id])

  const handleDownload = () => {
    if (!id) return
    const url = documentsApi.downloadUrl(id)
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        const blobUrl = URL.createObjectURL(blob)
        a.href = blobUrl
        a.download = doc?.file_name || 'document'
        a.click()
        URL.revokeObjectURL(blobUrl)
      }).catch(() => showNotif('error', 'Gagal mengunduh dokumen'))
  }

  const handlePrint = async () => {
    if (!id) return
    setIsPrinting(true)
    try {
      const url = documentsApi.printUrl(id)
      const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const err = await res.json()
        showNotif('error', err.error || 'Gagal mencetak dokumen')
        return
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = blobUrl
      document.body.appendChild(iframe)
      iframe.onload = () => {
        iframe.contentWindow?.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
          URL.revokeObjectURL(blobUrl)
        }, 1000)
      }
      // Refresh quota
      const quotaRes = await documentsApi.getPrintQuota(id)
      setPrintQuota(quotaRes.data)
    } catch { showNotif('error', 'Gagal mencetak dokumen') }
    finally { setIsPrinting(false) }
  }

  const handleSaveEdit = async () => {
    if (!id) return
    try {
      const payload: Record<string, unknown> = { ...editForm }
      if (editForm.expiry_date === '') payload.expiry_date = null
      await documentsApi.update(id, payload)
      showNotif('success', 'Dokumen berhasil diupdate')
      setIsEditing(false)
      const [docRes, quotaRes] = await Promise.all([
        documentsApi.get(id),
        documentsApi.getPrintQuota(id),
      ])
      setDoc(docRes.data.data)
      setPrintQuota(quotaRes.data)
    } catch { showNotif('error', 'Gagal mengupdate dokumen') }
  }

  const handleDelete = async () => {
    if (!id || !confirm('Hapus dokumen ini?')) return
    try {
      await documentsApi.delete(id)
      showNotif('success', 'Dokumen dihapus')
      navigate('/edoc/browse')
    } catch { showNotif('error', 'Gagal menghapus dokumen') }
  }

  const handleAddComment = async () => {
    if (!id || commentForm.rating === 0) { showNotif('warning', 'Pilih rating terlebih dahulu'); return }
    try {
      await documentsApi.addComment(id, commentForm)
      showNotif('success', 'Komentar berhasil ditambahkan')
      setCommentForm({ rating: 0, text: '' })
      const res = await documentsApi.listComments(id)
      setComments(res.data.data)
    } catch { showNotif('error', 'Gagal menambahkan komentar') }
  }

  if (isLoading) return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={false} />
      <div className="flex-1 flex flex-col"><Topbar title="Detail Dokumen" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  )

  if (!doc) return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={false} />
      <div className="flex-1 flex flex-col"><Topbar title="Detail Dokumen" />
        <div className="flex-1 flex items-center justify-center text-gray-500">Dokumen tidak ditemukan</div>
      </div>
    </div>
  )

  const previewUrl = documentsApi.previewUrl(doc.id)
  const isPDF = doc.file_name?.toLowerCase().endsWith('.pdf')
  const printDisabled = printQuota !== null && printQuota.remaining === 0

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Detail Dokumen" onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <button onClick={() => navigate('/edoc/browse')} className="hover:text-primary">Browse Dokumen</button>
            <span>/</span>
            <span className="text-gray-800 font-medium">{doc.title}</span>
          </div>

          {/* Expiry banner */}
          {isExpired && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Akses dokumen ini telah kedaluwarsa sejak {new Date(doc.expiry_date!).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}

          {/* Header */}
          <div className="card p-6 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {isEditing ? (
                  <input className="input-field text-xl font-bold mb-2" value={editForm.title}
                    onChange={e => setEditForm(f => ({...f, title: e.target.value}))} />
                ) : (
                  <h2 className="text-xl font-bold text-gray-800">{doc.title}</h2>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {doc.category && <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded font-medium">{doc.category}</span>}
                  {doc.sub_category && <span className="text-xs text-gray-500">{doc.sub_category}</span>}
                  {doc.area && <span className="text-xs text-gray-400">• {doc.area}</span>}
                  <span className={doc.status === 'active' ? 'badge-active' : 'badge-obsolete'}>
                    {doc.status === 'active' ? 'Aktif' : 'Usang'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {/* Print quota badge */}
                {printQuota && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${printQuota.remaining === -1 ? 'bg-green-50 text-green-700' : printQuota.remaining === 0 ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-700'}`}>
                    {printQuota.remaining === -1 ? 'Cetak: tak terbatas' : printQuota.remaining === 0 ? 'Kuota cetak habis' : `Sisa cetak: ${printQuota.remaining}`}
                  </span>
                )}
                {/* Print button */}
                {isPDF && (
                  <PermissionGate moduleName="edoc" requiredLevel="view">
                    <button onClick={handlePrint} disabled={isPrinting || printDisabled || isExpired}
                      className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      {isPrinting ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      )}
                      Cetak
                    </button>
                  </PermissionGate>
                )}
                <PermissionGate moduleName="edoc" requiredLevel="edit">
                  <button onClick={handleDownload} className="btn-primary flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </PermissionGate>
                <PermissionGate moduleName="edoc" requiredLevel="edit">
                  {isEditing ? (
                    <>
                      <button onClick={handleSaveEdit} className="btn-primary text-sm">Simpan</button>
                      <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm">Batal</button>
                    </>
                  ) : (
                    <button onClick={() => { setIsEditing(true); setEditForm({ title: doc.title, category: doc.category, sub_category: doc.sub_category, area: doc.area, description: doc.description, status: doc.status, max_print: doc.max_print ?? 0, allow_preview: doc.allow_preview ?? true, expiry_date: doc.expiry_date ? doc.expiry_date.slice(0, 10) : '' }) }}
                      className="btn-secondary text-sm">Edit</button>
                  )}
                </PermissionGate>
                <PermissionGate moduleName="edoc" requiredLevel="admin">
                  <button onClick={handleDelete} className="btn-danger text-sm">Hapus</button>
                </PermissionGate>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 rounded-t-xl px-4">
            <nav className="flex gap-1">
              {(['info', ...(doc.allow_preview && !isExpired ? ['preview'] : []), 'comments'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab === 'info' ? 'Informasi' : tab === 'preview' ? 'Preview' : `Komentar (${comments.length})`}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div className="card rounded-t-none p-6">
            {/* Info tab */}
            {activeTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Deskripsi</p>
                    {isEditing ? (
                      <textarea className="input-field" rows={3} value={editForm.description}
                        onChange={e => setEditForm(f => ({...f, description: e.target.value}))} />
                    ) : (
                      <p className="text-sm text-gray-700">{doc.description || '—'}</p>
                    )}
                  </div>
                  {isEditing && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Kategori</label>
                        <input className="input-field" value={editForm.category} onChange={e => setEditForm(f => ({...f, category: e.target.value}))} />
                      </div>
                      <div>
                        <label className="label">Sub Kategori</label>
                        <input className="input-field" value={editForm.sub_category} onChange={e => setEditForm(f => ({...f, sub_category: e.target.value}))} />
                      </div>
                      <div>
                        <label className="label">Area</label>
                        <input className="input-field" value={editForm.area} onChange={e => setEditForm(f => ({...f, area: e.target.value}))} />
                      </div>
                      <div>
                        <label className="label">Status</label>
                        <select className="input-field" value={editForm.status} onChange={e => setEditForm(f => ({...f, status: e.target.value}))}>
                          <option value="active">Aktif</option>
                          <option value="obsolete">Usang</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Maks Cetak <span className="text-gray-400 font-normal">(0 = tak terbatas)</span></label>
                        <input type="number" min={0} className="input-field" value={editForm.max_print}
                          onChange={e => setEditForm(f => ({...f, max_print: parseInt(e.target.value) || 0}))} />
                      </div>
                      <div>
                        <label className="label">Tanggal Kedaluwarsa</label>
                        <input type="date" className="input-field" value={editForm.expiry_date}
                          onChange={e => setEditForm(f => ({...f, expiry_date: e.target.value}))} />
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <input type="checkbox" id="allow_preview" checked={editForm.allow_preview}
                          onChange={e => setEditForm(f => ({...f, allow_preview: e.target.checked}))} />
                        <label htmlFor="allow_preview" className="label mb-0">Izinkan Preview</label>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    ['Nama File', doc.file_name],
                    ['Ukuran', formatSize(doc.file_size)],
                    ['Diupload oleh', doc.uploader?.fullname || '—'],
                    ['Tanggal Upload', new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })],
                    ['Terakhir Diupdate', new Date(doc.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })],
                    ['Watermark', doc.use_global_watermark ? 'Global' : doc.watermark_text || 'Kustom'],
                    ['Maks Cetak', doc.max_print === 0 ? 'Tak terbatas' : String(doc.max_print)],
                    ['Kedaluwarsa', doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('id-ID') : '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-3">
                      <span className="text-gray-500 w-40 flex-shrink-0">{label}</span>
                      <span className="text-gray-800 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview tab */}
            {activeTab === 'preview' && (
              <div>
                {isPDF ? (
                  <PDFViewer url={previewUrl} token={token || undefined} username={user?.fullname} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <div className="text-5xl mb-3">📄</div>
                    <p className="text-sm">Preview tidak tersedia untuk tipe file ini.</p>
                    <PermissionGate moduleName="edoc" requiredLevel="edit">
                      <button onClick={handleDownload} className="btn-primary mt-4 text-sm">Download untuk membuka</button>
                    </PermissionGate>
                  </div>
                )}
              </div>
            )}

            {/* Comments tab */}
            {activeTab === 'comments' && (
              <div>
                <PermissionGate moduleName="edoc" requiredLevel="edit">
                  <div className="card p-4 mb-6 bg-gray-50">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Tambahkan Komentar</p>
                    <div className="flex gap-2 mb-3">
                      {[1, 2, 3, 4].map(star => (
                        <button key={star} onClick={() => setCommentForm(f => ({...f, rating: star}))}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${commentForm.rating === star ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:border-primary'}`}>
                          {'★'.repeat(star)} {STAR_LABELS[star]}
                        </button>
                      ))}
                    </div>
                    <textarea className="input-field mb-3" rows={2} value={commentForm.text}
                      onChange={e => setCommentForm(f => ({...f, text: e.target.value}))}
                      placeholder="Tulis komentar Anda..." />
                    <button onClick={handleAddComment} className="btn-primary text-sm">Kirim Komentar</button>
                  </div>
                </PermissionGate>

                {comments.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Belum ada komentar</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {c.user?.fullname?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-800">{c.user?.fullname}</span>
                            <span className="text-yellow-500 text-sm">{'★'.repeat(c.rating)}</span>
                            <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('id-ID')}</span>
                          </div>
                          {c.text && <p className="text-sm text-gray-600 mt-0.5">{c.text}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
