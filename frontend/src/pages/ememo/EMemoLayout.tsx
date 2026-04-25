import { Outlet, NavLink } from 'react-router-dom'
import Topbar from '../../components/Topbar'
import Sidebar from '../../components/Sidebar'
import { useState } from 'react'
import { usePermission } from '../../hooks/usePermission'

export default function EMemoLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const ememoPerm = usePermission('ememo')

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="eMemo - Task & Organization" onMenuToggle={() => setSidebarOpen(true)} />

        <div className="bg-white border-b border-gray-200 px-6">
          <nav className="flex gap-1">
            <NavLink to="/ememo/orgchart"
              className={({ isActive }) => `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Bagan Organisasi
            </NavLink>
            <NavLink to="/ememo/tasks"
              className={({ isActive }) => `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Delegasi Tugas
            </NavLink>
            {ememoPerm.isAdmin && (
              <NavLink to="/ememo/monitoring"
                className={({ isActive }) => `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                Monitoring Tugas
              </NavLink>
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
