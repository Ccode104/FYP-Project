import { createContext, useContext, useMemo, useState } from 'react'

export type Role = 'student' | 'teacher' | 'ta' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  loginWithGoogle: (credential: string, role?: 'student' | 'teacher' | 'ta' | 'admin') => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function mapBackendRole(r: string): Role {
  if (r === 'faculty') return 'teacher'
  if (r === 'admin') return 'admin'
  if (r === 'ta') return 'ta'
  return 'student'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('auth:user')
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  })

  const login: AuthContextValue['login'] = async (email, password) => {
    const { loginRequest } = await import('../services/auth')
    const res = await loginRequest(email, password)
    
    // Handle case where user object might not be in response
    if (!res.user) {
      throw new Error('Invalid login response: user data missing')
    }
    
    // Map role if provided, otherwise default to 'student'
    const backendRole = res.user.role || 'student'
    const mappedRole = mapBackendRole(backendRole)
    
    const u: User = { 
      id: String(res.user.id || ''), 
      name: res.user.name || email.split('@')[0] || 'User', 
      email: res.user.email || email, 
      role: mappedRole 
    }
    
    localStorage.setItem('auth:token', res.token)
    localStorage.setItem('auth:user', JSON.stringify(u))
    setUser(u)
    return u
  }

  const loginWithGoogle: AuthContextValue['loginWithGoogle'] = async (credential, role = 'student') => {
    const { loginWithGoogle: googleLogin } = await import('../services/auth')
    const res = await googleLogin(credential, role)
    
    // Handle case where user object might not be in response
    if (!res.user) {
      throw new Error('Invalid Google login response: user data missing')
    }
    
    // Map role if provided, otherwise default to 'student'
    const backendRole = res.user.role || 'student'
    const mappedRole = mapBackendRole(backendRole)
    
    const u: User = { 
      id: String(res.user.id || ''), 
      name: res.user.name || 'User', 
      email: res.user.email || '', 
      role: mappedRole 
    }
    
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

  const value = useMemo(() => ({ user, login, loginWithGoogle, logout }), [user])

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
    case 'admin':
      return '/dashboard/admin'
    default:
      return '/login'
  }
}
