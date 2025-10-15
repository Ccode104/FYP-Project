import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Role = 'student' | 'teacher' | 'ta'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string, role: Role) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function mapBackendRole(r: string): Role {
  if (r === 'faculty') return 'teacher'
  if (r === 'admin') return 'ta' // map admin to TA permissions in UI for now
  if (r === 'ta') return 'ta'
  return 'student'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('auth:user')
    if (raw) {
      try {
        setUser(JSON.parse(raw))
      } catch {
        // ignore
      }
    }
  }, [])

  const login: AuthContextValue['login'] = async (email, password, role) => {
    const { loginRequest } = await import('../services/auth')
    const res = await loginRequest(email, password)
    const mappedRole = mapBackendRole(res.user.role)
    const u: User = { id: String(res.user.id), name: res.user.name || email.split('@')[0] || 'User', email: res.user.email, role: mappedRole }
    localStorage.setItem('auth:token', res.token)
    localStorage.setItem('auth:user', JSON.stringify(u))
    setUser(u)
    return u
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('auth:user')
    localStorage.removeItem('auth:token')
  }

  const value = useMemo(() => ({ user, login, logout }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function getDashboardPathForRole(role: Role) {
  switch (role) {
    case 'student':
      return '/dashboard/student'
    case 'teacher':
      return '/dashboard/teacher'
    case 'ta':
      return '/dashboard/ta'
    default:
      return '/login'
  }
}
