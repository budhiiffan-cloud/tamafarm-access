import { Navigate, useLocation } from 'react-router-dom'
import { homeFor, useAuth } from '../context/AuthContext'
import { Spinner } from './ui'

export default function RequireRole({ roles, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="mx-auto max-w-md px-4"><Spinner /></div>
  if (!user) return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} state={{ from: location.pathname }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />
  return children
}
