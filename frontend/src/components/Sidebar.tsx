import { NavLink, useNavigate } from 'react-router-dom'
import logoNexora from '../assets/logo.png'
import { useAuth } from '../hooks/useAuth'
import { usePermission } from '../hooks/usePermission'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { user } = useAuth()
  const edocPerm = usePermission('edoc')
  const ememoPerm = usePermission('ememo')
  const navigate = useNavigate()

  return (
    <>
      {/* Mobile overlay */}
      {onClose && (
        <div
          className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-primary flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/10">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <img src={logoNexora} alt="Nexora" className="h-8 object-contain brightness-0 invert" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Dashboard */}
          <div className="mb-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : 'text-white/80'}`
              }
              onClick={onClose}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </NavLink>
          </div>

          {/* eDoc Module */}
          {edocPerm.hasAccess && (
            <div className="mb-4">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider px-4 mb-2">
                eDoc
              </p>
              <div className="space-y-1">
                <NavLink
                  to="/edoc/browse"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : 'text-white/80'}`}
                  onClick={onClose}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Browse Dokumen
                </NavLink>

                {edocPerm.isAdmin && (
                  <>
                    <NavLink
                      to="/edoc/watermark"
                      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : 'text-white/80'}`}
                      onClick={onClose}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      Watermark
                    </NavLink>

                    <NavLink
                      to="/edoc/monitoring"
                      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : 'text-white/80'}`}
                      onClick={onClose}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Monitoring
                    </NavLink>
                  </>
                )}
              </div>
            </div>
          )}

          {/* eMemo Module */}
          {ememoPerm.hasAccess && (
            <div className="mb-4">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider px-4 mb-2">
                eMemo
              </p>
              <div className="space-y-1">
                <NavLink
                  to="/ememo/orgchart"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : 'text-white/80'}`}
                  onClick={onClose}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Bagan Organisasi
                </NavLink>

                <NavLink
                  to="/ememo/tasks"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : 'text-white/80'}`}
                  onClick={onClose}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Delegasi Tugas
                </NavLink>

                {ememoPerm.isAdmin && (
                  <NavLink
                    to="/ememo/monitoring"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : 'text-white/80'}`}
                    onClick={onClose}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Monitoring Tugas
                  </NavLink>
                )}
              </div>
            </div>
          )}

          {/* Profile */}
          <div className="mb-4">
            <NavLink
              to="/profile"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : 'text-white/80'}`}
              onClick={onClose}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profil Saya
            </NavLink>
          </div>

          {/* Admin */}
          {edocPerm.isAdmin && (
            <div className="mb-4">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider px-4 mb-2">
                Admin
              </p>
              <NavLink
                to="/users"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : 'text-white/80'}`}
                onClick={onClose}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                User Management
              </NavLink>
            </div>
          )}
        </nav>
      </aside>
    </>
  )
}
