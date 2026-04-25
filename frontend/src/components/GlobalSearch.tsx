import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../api/axios'

interface DocResult { id: string; title: string; category: string; status: string }
interface TaskResult { id: string; title: string; status: string; to_user?: { fullname: string } }

export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [docs, setDocs] = useState<DocResult[]>([])
  const [tasks, setTasks] = useState<TaskResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (q.length < 2) { setDocs([]); setTasks([]); return }
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await axiosInstance.get('/api/search', { params: { q } })
        setDocs(res.data.documents || [])
        setTasks(res.data.tasks || [])
      } catch {} finally { setIsLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [q])

  const total = docs.length + tasks.length

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16 px-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl" onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari dokumen atau tugas..." className="flex-1 outline-none text-gray-800 placeholder-gray-400" />
          {isLoading && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 border border-gray-200 rounded">ESC</button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {q.length < 2 && (
            <p className="text-center text-gray-400 py-8 text-sm">Ketik minimal 2 karakter untuk mencari</p>
          )}
          {q.length >= 2 && !isLoading && total === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">Tidak ada hasil untuk "{q}"</p>
          )}

          {docs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">Dokumen</p>
              {docs.map(d => (
                <button key={d.id} onClick={() => { navigate(`/edoc/doc/${d.id}`); onClose() }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{d.title}</p>
                    <p className="text-xs text-gray-400">{d.category} · {d.status}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {tasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">Tugas</p>
              {tasks.map(t => (
                <button key={t.id} onClick={() => { navigate('/ememo/tasks'); onClose() }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors">
                  <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                    <p className="text-xs text-gray-400">{t.to_user?.fullname || '-'} · {t.status}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="h-2" />
        </div>
      </div>
    </div>
  )
}
