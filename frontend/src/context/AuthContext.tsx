import { useMemo, useState, createContext, useContext } from 'react'
import type { User } from '../utils/auth'
import { mapBackendRole } from '../utils/auth'

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string, role?: 'student' | 'teacher' | 'ta' | 'admin') => Promise<User>
  loginWithGoogle: (credential: string, role?: 'student' | 'teacher' | 'ta' | 'admin') => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('auth:user')
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  })

  const login: AuthContextValue['login'] = async (email, password, role = 'student') => {
    const { loginRequest } = await import('../features/auth/api/auth')
    const res = await loginRequest(email, password, role)
    
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
    const { loginWithGoogle: googleLogin } = await import('../features/auth/api/auth')
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
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function getDashboardPathForRole(role: string | undefined): string {
  if (!role) return '/'
  
  const roleMap: Record<string, string> = {
    student: '/dashboard/student',
    teacher: '/dashboard/teacher',
    ta: '/dashboard/ta',
    admin: '/dashboard/admin'
  }
  
  return roleMap[role] || '/'
}

export { type Role } from '../utils/auth'

