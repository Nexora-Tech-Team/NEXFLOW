import { useNavigate } from 'react-router-dom'

interface Document {
  id: string
  title: string
  category: string
  sub_category: string
  area: string
  description: string
  file_name: string
  file_size: number
  status: string
  created_at: string
  uploader?: { fullname: string }
}

interface DocCardProps {
  doc: Document
}

function formatFileSize(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(filename: string) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return '📄'
  if (['doc', 'docx'].includes(ext || '')) return '📝'
  if (['xls', 'xlsx'].includes(ext || '')) return '📊'
  if (['ppt', 'pptx'].includes(ext || '')) return '📋'
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return '🖼️'
  return '📁'
}

export default function DocCard({ doc }: DocCardProps) {
  const navigate = useNavigate()

  return (
    <div
      className="card p-4 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => navigate(`/edoc/doc/${doc.id}`)}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0">{getFileIcon(doc.file_name)}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 text-sm group-hover:text-primary transition-colors truncate">
            {doc.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded font-medium">
              {doc.category}
            </span>
            {doc.sub_category && (
              <span className="text-xs text-gray-500">{doc.sub_category}</span>
            )}
            {doc.area && (
              <span className="text-xs text-gray-400">• {doc.area}</span>
            )}
          </div>
          {doc.description && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{doc.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{formatFileSize(doc.file_size)}</span>
              {doc.uploader && <span>• {doc.uploader.fullname}</span>}
            </div>
            <span className={doc.status === 'active' ? 'badge-active' : 'badge-obsolete'}>
              {doc.status === 'active' ? 'Aktif' : 'Usang'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
