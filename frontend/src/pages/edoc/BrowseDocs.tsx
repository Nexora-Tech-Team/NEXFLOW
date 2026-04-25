import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentsApi } from '../../api/documents'
import { NotifContext } from '../../context/NotifContext'
import { usePermission } from '../../hooks/usePermission'
import DocCard from '../../components/DocCard'
import PermissionGate from '../../components/PermissionGate'

interface Category { name: string; sub_categories: string[] }
interface Document {
  id: string; title: string; category: string; sub_category: string
  area: string; description: string; file_name: string; file_size: number
  status: string; created_at: string; uploader?: { fullname: string }
}

export default function BrowseDocs() {
  const [docs, setDocs] = useState<Document[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [filters, setFilters] = useState({ category: '', sub_category: '', keyword: '', status: '', page: 1, limit: 20 })
  const [uploadForm, setUploadForm] = useState({ title: '', category: '', sub_category: '', area: '', description: '', status: 'active' })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { showNotif } = useContext(NotifContext)
  const edocPerm = usePermission('edoc')
  const navigate = useNavigate()

  useEffect(() => {
    fetchCategories()
    fetchDocs()
  }, [filters])

  const fetchDocs = async () => {
    setIsLoading(true)
    try {
      const res = await documentsApi.list(filters)
      setDocs(res.data.data)
      setTotal(res.data.total)
    } catch { showNotif('error', 'Gagal memuat dokumen') }
    finally { setIsLoading(false) }
  }

  const fetchCategories = async () => {
    try {
      const res = await documentsApi.getCategories()
      setCategories(res.data.data)
    } catch {}
  }

  const handleUpload = async () => {
    if (!uploadFile) { showNotif('warning', 'Pilih file terlebih dahulu'); return }
    if (!uploadForm.title) { showNotif('warning', 'Judul dokumen wajib diisi'); return }
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      Object.entries(uploadForm).forEach(([k, v]) => fd.append(k, v))
      await documentsApi.upload(fd)
      showNotif('success', 'Dokumen berhasil diupload')
      setShowUpload(false)
      setUploadFile(null)
      setUploadForm({ title: '', category: '', sub_category: '', area: '', description: '', status: 'active' })
      fetchDocs()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal upload dokumen'
      showNotif('error', msg)
    } finally { setIsUploading(false) }
  }

  const selectedCategory = categories.find(c => c.name === filters.category)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar filter */}
      <aside className="w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Kategori</p>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => setFilters(f => ({ ...f, category: '', sub_category: '', page: 1 }))}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!filters.category ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Semua Dokumen
            </button>
          </li>
          {categories.map(cat => (
            <li key={cat.name}>
              <button
                onClick={() => setFilters(f => ({ ...f, category: cat.name, sub_category: '', page: 1 }))}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filters.category === cat.name && !filters.sub_category ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {cat.name}
              </button>
              {filters.category === cat.name && cat.sub_categories?.filter(Boolean).map(sub => (
                <button
                  key={sub}
                  onClick={() => setFilters(f => ({ ...f, sub_category: sub, page: 1 }))}
                  className={`w-full text-left pl-7 pr-3 py-1.5 rounded-lg text-xs transition-colors ${filters.sub_category === sub ? 'bg-primary-100 text-primary font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {sub}
                </button>
              ))}
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</p>
          {['', 'active', 'obsolete'].map(s => (
            <button key={s}
              onClick={() => setFilters(f => ({ ...f, status: s, page: 1 }))}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm mb-0.5 transition-colors ${filters.status === s ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              {s === '' ? 'Semua Status' : s === 'active' ? 'Aktif' : 'Usang'}
            </button>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" placeholder="Cari dokumen..."
              className="input-field pl-10 py-2"
              value={filters.keyword}
              onChange={e => setFilters(f => ({ ...f, keyword: e.target.value, page: 1 }))}
            />
          </div>
          <span className="text-sm text-gray-500">{total} dokumen</span>
          <PermissionGate moduleName="edoc" requiredLevel="edit">
            <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </button>
          </PermissionGate>
        </div>

        {/* Doc list */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Tidak ada dokumen ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {docs.map(doc => <DocCard key={doc.id} doc={doc} />)}
            </div>
          )}

          {/* Pagination */}
          {total > filters.limit && (
            <div className="flex justify-center gap-2 mt-6">
              <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Hal {filters.page} / {Math.ceil(total / filters.limit)}
              </span>
              <button disabled={filters.page >= Math.ceil(total / filters.limit)}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                className="btn-secondary text-sm disabled:opacity-40">Next →</button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-fadeIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">Upload Dokumen</h3>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="label">File *</label>
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.png"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-sm hover:file:bg-primary-900 cursor-pointer" />
                {uploadFile && <p className="text-xs text-gray-500 mt-1">{uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)</p>}
              </div>
              <div>
                <label className="label">Judul *</label>
                <input className="input-field" value={uploadForm.title} onChange={e => setUploadForm(f => ({...f, title: e.target.value}))} placeholder="Judul dokumen" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Kategori</label>
                  <input className="input-field" value={uploadForm.category} onChange={e => setUploadForm(f => ({...f, category: e.target.value}))} placeholder="ESTATES, MILLS..." list="cat-list" />
                  <datalist id="cat-list">{categories.map(c => <option key={c.name} value={c.name} />)}</datalist>
                </div>
                <div>
                  <label className="label">Sub Kategori</label>
                  <input className="input-field" value={uploadForm.sub_category} onChange={e => setUploadForm(f => ({...f, sub_category: e.target.value}))} placeholder="SOP, Report..." />
                </div>
              </div>
              <div>
                <label className="label">Area</label>
                <input className="input-field" value={uploadForm.area} onChange={e => setUploadForm(f => ({...f, area: e.target.value}))} placeholder="North Sumatra, Head Office..." />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input-field" rows={3} value={uploadForm.description} onChange={e => setUploadForm(f => ({...f, description: e.target.value}))} placeholder="Deskripsi singkat dokumen" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowUpload(false)} className="btn-secondary">Batal</button>
              <button onClick={handleUpload} disabled={isUploading} className="btn-primary flex items-center gap-2">
                {isUploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Uploading...</> : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
