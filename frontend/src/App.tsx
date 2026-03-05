import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import PharmacistDashboard from './pages/PharmacistDashboard'
import DriverDashboard from './pages/DriverDashboard'

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

// Redirect to the right dashboard based on role
const HomeRedirect = () => {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  if (!user) return <Navigate to="/login" />
  if (user.role === 'PHARMACIST') return <Navigate to="/pharmacist" />
  if (user.role === 'DELIVERY_DRIVER') return <Navigate to="/driver" />
  return <Navigate to="/dashboard" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/pharmacist" element={<PrivateRoute><PharmacistDashboard /></PrivateRoute>} />
      <Route path="/" element={<PrivateRoute><HomeRedirect /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/login" />} />
      <Route path="/driver" element={<PrivateRoute><DriverDashboard /></PrivateRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
