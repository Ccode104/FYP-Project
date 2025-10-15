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
  login: (email: string, _password: string, role: Role) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

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

  const login: AuthContextValue['login'] = (email, _password, role) => {
    const u: User = {
      id: crypto.randomUUID(),
      name: email.split('@')[0] || 'User',
      email,
      role,
    }
    setUser(u)
    localStorage.setItem('auth:user', JSON.stringify(u))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('auth:user')
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
