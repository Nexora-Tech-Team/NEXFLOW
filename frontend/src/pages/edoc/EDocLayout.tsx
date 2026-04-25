import { Outlet, NavLink } from 'react-router-dom'
import Topbar from '../../components/Topbar'
import Sidebar from '../../components/Sidebar'
import { useState } from 'react'
import { usePermission } from '../../hooks/usePermission'

export default function EDocLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const edocPerm = usePermission('edoc')

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="eDoc - Document Center" onMenuToggle={() => setSidebarOpen(true)} />

        {/* Sub-tabs */}
        <div className="bg-white border-b border-gray-200 px-6">
          <nav className="flex gap-1">
            <NavLink
              to="/edoc/browse"
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }
            >
              Browse Dokumen
            </NavLink>
            {edocPerm.isAdmin && (
              <>
                <NavLink
                  to="/edoc/watermark"
                  className={({ isActive }) =>
                    `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      isActive ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`
                  }
                >
                  Watermark
                </NavLink>
                <NavLink
                  to="/edoc/monitoring"
                  className={({ isActive }) =>
                    `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      isActive ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`
                  }
                >
                  Monitoring
                </NavLink>
              </>
            )}
          </nav>
        </div>

        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
