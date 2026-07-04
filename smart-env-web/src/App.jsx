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
                  <Route path="/admin" element={
                    <ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>
                  }>
                    <Route index element={<Overview />} />
                    <Route path="sensors" element={<Sensors />} />
                    <Route path="users" element={<Users />} />
                    <Route path="alerts" element={<Alerts />} />
                    <Route path="export" element={<Export />} />
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
