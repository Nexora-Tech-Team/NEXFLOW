import { useState, useEffect, useContext } from 'react'
import { monitoringApi } from '../../api/tasks'
import { NotifContext } from '../../context/NotifContext'

interface UserTaskStat {
  user_id: string; username: string; fullname: string
  assigned: number; done: number; pending: number; total: number
}

interface StatusCount { status: string; count: number }

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', assigned: 'Ditugaskan', in_progress: 'Dikerjakan',
  done: 'Selesai', rejected: 'Ditolak',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  done: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function TaskMonitoring() {
  const [perUser, setPerUser] = useState<UserTaskStat[]>([])
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { showNotif } = useContext(NotifContext)

  useEffect(() => {
    monitoringApi.tasks()
      .then(res => {
        setPerUser(res.data.per_user)
        setStatusCounts(res.data.status_counts)
      })
      .catch(() => showNotif('error', 'Gagal memuat data monitoring'))
      .finally(() => setIsLoading(false))
  }, [])

  const totalTasks = statusCounts.reduce((sum, s) => sum + s.count, 0)
  const doneTasks = statusCounts.find(s => s.status === 'done')?.count || 0
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">Monitoring Tugas</h2>
          <p className="text-gray-500 text-sm">Ringkasan status tugas per pengguna</p>
        </div>

        {/* Status overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {statusCounts.map(sc => (
            <div key={sc.status} className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{sc.count}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${STATUS_COLORS[sc.status]}`}>
                {STATUS_LABELS[sc.status] || sc.status}
              </span>
            </div>
          ))}
        </div>

        {/* Overall progress */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Progress Keseluruhan</h3>
            <span className="text-lg font-bold text-primary">{progressPct}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}></div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{doneTasks} selesai</span>
            <span>{totalTasks} total</span>
          </div>
        </div>

        {/* Per user table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Detail per Pengguna</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Pengguna</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-blue-600">Ditugaskan</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-yellow-600">Berjalan</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-green-600">Selesai</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Progress</th>
                </tr>
              </thead>
              <tbody>
                {perUser.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">Tidak ada data</td></tr>
                ) : perUser.map(stat => {
                  const pct = stat.total > 0 ? Math.round((stat.done / stat.total) * 100) : 0
                  return (
                    <tr key={stat.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {stat.fullname.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{stat.fullname}</p>
                            <p className="text-xs text-gray-400">{stat.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-4 py-3 font-bold text-gray-800">{stat.total}</td>
                      <td className="text-center px-4 py-3 text-blue-600 font-medium">{stat.assigned}</td>
                      <td className="text-center px-4 py-3 text-yellow-600 font-medium">{stat.pending}</td>
                      <td className="text-center px-4 py-3 text-green-600 font-medium">{stat.done}</td>
                      <td className="px-5 py-3 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-success rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-500 w-9 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
