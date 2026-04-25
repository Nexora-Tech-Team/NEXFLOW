import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  moduleName?: string
  requiredLevel?: 'view' | 'edit' | 'admin'
}

export default function ProtectedRoute({ children, moduleName, requiredLevel = 'view' }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, permissions } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (moduleName) {
    const levelOrder: Record<string, number> = { none: 0, view: 1, edit: 2, admin: 3 }
    const perm = permissions.find(p => p.module_name === moduleName)
    const userLevel = perm?.access_level || 'none'

    if (levelOrder[userLevel] < levelOrder[requiredLevel]) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="card p-8 text-center max-w-sm">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Akses Ditolak</h2>
            <p className="text-gray-500 text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}
