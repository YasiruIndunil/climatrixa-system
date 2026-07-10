import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastProvider, AlertWSProvider } from './components/Toast'
import Login from './pages/Login'
import AdminLayout from './components/AdminLayout'
import Overview from './pages/admin/Overview'
import Sensors from './pages/admin/Sensors'
import Users from './pages/admin/Users'
import Alerts from './pages/admin/Alerts'
import Export from './pages/admin/Export'
import AdminSensorMap from './pages/admin/SensorMap'
import PublicLayout from './components/PublicLayout'
import Dashboard from './pages/public/Dashboard'
import MySensors from './pages/public/MySensors'
import SensorMap from './pages/public/SensorMap'
import PublicAlerts from './pages/public/PublicAlerts'
import SensorDetail from './pages/public/SensorDetail'
import Profile from './pages/public/Profile'
import PublicExport from './pages/public/PublicExport'
import AIPredictions from './pages/admin/AIPredictions'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AlertWSProvider>
              <BrowserRouter>
                <Routes>

                  <Route path="/login" element={<Login />} />

                  {/* Admin routes */}
                  <Route path="/admin" element={
                    <ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>
                  }>
                    <Route index element={<Overview />} />
                    <Route path="ai-predictions" element={<AIPredictions />} />
                    <Route path="sensors" element={<Sensors />} />
                    <Route path="map" element={<AdminSensorMap />} />                    
                    <Route path="users" element={<Users />} />
                    <Route path="alerts" element={<Alerts />} />
                    <Route path="export" element={<Export />} />
                  </Route>

                  {/* Public user routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute><PublicLayout /></ProtectedRoute>
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="sensors" element={<MySensors />} />
                    <Route path="map" element={<SensorMap />} />
                    <Route path="alerts" element={<PublicAlerts />} />
                    <Route path="sensors/:sensorId" element={<SensorDetail />} />
                    <Route path="export" element={<PublicExport />} />
                    <Route path="profile" element={<Profile />} />
                  </Route>

                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="*" element={<Navigate to="/login" replace />} />

                </Routes>
              </BrowserRouter>
            </AlertWSProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
