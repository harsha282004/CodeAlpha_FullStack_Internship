import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import Spinner from './ui/Spinner.jsx'

export default function AdminRoute() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // role comes only from the authenticated /me response stored in context, never from client input
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
