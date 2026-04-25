interface Task {
  id: string
  title: string
  description: string
  priority: string
  status: string
  progress?: number
  deadline?: string
  from_user?: { fullname: string }
  to_user?: { fullname: string }
  created_at: string
}

interface TaskCardProps {
  task: Task
  onClick?: () => void
}

const priorityMap: Record<string, { label: string; class: string }> = {
  low: { label: 'Rendah', class: 'badge-low' },
  medium: { label: 'Sedang', class: 'badge-medium' },
  high: { label: 'Tinggi', class: 'badge-high' },
}

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'text-gray-500 bg-gray-100' },
  assigned: { label: 'Ditugaskan', color: 'text-blue-700 bg-blue-100' },
  in_progress: { label: 'Dikerjakan', color: 'text-yellow-700 bg-yellow-100' },
  done: { label: 'Selesai', color: 'text-green-700 bg-green-100' },
  rejected: { label: 'Ditolak', color: 'text-red-700 bg-red-100' },
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function isOverdue(deadline?: string) {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const prio = priorityMap[task.priority] || priorityMap.medium
  const status = statusMap[task.status] || statusMap.draft
  const overdue = isOverdue(task.deadline) && task.status !== 'done'
  const progress = task.progress ?? 0

  return (
    <div
      className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-800 text-sm flex-1">{task.title}</h3>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={prio.class}>{prio.label}</span>
        {task.deadline && (
          <span className={`text-xs font-medium ${overdue ? 'text-danger' : 'text-gray-500'}`}>
            {overdue ? '⚠️ ' : '📅 '}
            {formatDate(task.deadline)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">Progress</span>
          <span className="text-xs font-semibold text-gray-700">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              progress === 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-yellow-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-2">
        <span>Dari: <span className="text-gray-600 font-medium">{task.from_user?.fullname || '—'}</span></span>
        <span>Ke: <span className="text-gray-600 font-medium">{task.to_user?.fullname || '—'}</span></span>
      </div>
    </div>
  )
}
