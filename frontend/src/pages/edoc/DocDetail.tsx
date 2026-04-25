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
  uploader?: { fullname: string; email: string }
}

interface Comment {
  id: string; rating: number; text: string; created_at: string
  user: { fullname: string }
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
  const [editForm, setEditForm] = useState({ title: '', category: '', sub_category: '', area: '', description: '', status: '' })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { showNotif } = useContext(NotifContext)
  const edocPerm = usePermission('edoc')
  const { token } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!id) return
    Promise.all([
      documentsApi.get(id),
      documentsApi.listComments(id),
    ]).then(([docRes, commRes]) => {
      setDoc(docRes.data.data)
      setComments(commRes.data.data)
    }).catch(() => showNotif('error', 'Gagal memuat dokumen'))
    .finally(() => setIsLoading(false))
  }, [id])

  const handleDownload = () => {
    if (!id) return
    const url = documentsApi.downloadUrl(id)
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('Authorization', `Bearer ${token}`)
    // Use fetch with auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob)
        a.href = blobUrl
        a.download = doc?.file_name || 'document'
        a.click()
        URL.revokeObjectURL(blobUrl)
      }).catch(() => showNotif('error', 'Gagal mengunduh dokumen'))
  }

  const handleSaveEdit = async () => {
    if (!id) return
    try {
      await documentsApi.update(id, editForm)
      showNotif('success', 'Dokumen berhasil diupdate')
      setIsEditing(false)
      const res = await documentsApi.get(id)
      setDoc(res.data.data)
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
              <div className="flex items-center gap-2 flex-shrink-0">
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
                    <button onClick={() => { setIsEditing(true); setEditForm({ title: doc.title, category: doc.category, sub_category: doc.sub_category, area: doc.area, description: doc.description, status: doc.status }) }}
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
              {(['info', 'preview', 'comments'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
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
                  <PDFViewer url={previewUrl} token={token || undefined} />
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
