import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { Role } from '../context/AuthContext'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({
  roles,
  children,
}: {
  roles?: Role[]
  children: ReactNode
}) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
