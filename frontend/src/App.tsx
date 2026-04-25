import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotifProvider } from './context/NotifContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import UserManagement from './pages/UserManagement'
import EDocLayout from './pages/edoc/EDocLayout'
import BrowseDocs from './pages/edoc/BrowseDocs'
import DocDetail from './pages/edoc/DocDetail'
import WatermarkSettings from './pages/edoc/WatermarkSettings'
import EDocMonitoring from './pages/edoc/Monitoring'
import EMemoLayout from './pages/ememo/EMemoLayout'
import OrgChart from './pages/ememo/OrgChart'
import TaskList from './pages/ememo/TaskList'
import TaskMonitoring from './pages/ememo/TaskMonitoring'
import Profile from './pages/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotifProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute moduleName="edoc" requiredLevel="admin"><UserManagement /></ProtectedRoute>} />

            {/* eDoc routes */}
            <Route path="/edoc" element={<ProtectedRoute moduleName="edoc" requiredLevel="view"><EDocLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/edoc/browse" replace />} />
              <Route path="browse" element={<BrowseDocs />} />
              <Route path="watermark" element={<WatermarkSettings />} />
              <Route path="monitoring" element={<EDocMonitoring />} />
            </Route>
            <Route path="/edoc/doc/:id" element={<ProtectedRoute moduleName="edoc" requiredLevel="view"><DocDetail /></ProtectedRoute>} />

            {/* eMemo routes */}
            <Route path="/ememo" element={<ProtectedRoute moduleName="ememo" requiredLevel="view"><EMemoLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/ememo/tasks" replace />} />
              <Route path="orgchart" element={<OrgChart />} />
              <Route path="tasks" element={<TaskList />} />
              <Route path="monitoring" element={<TaskMonitoring />} />
            </Route>

            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotifProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
