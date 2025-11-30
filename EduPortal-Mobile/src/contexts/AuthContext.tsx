import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import type { Role, User } from '../types'
import { loginRequest, loginWithGoogle, getStoredUser, storeAuthData, clearAuthData } from '../services/auth'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string, role?: Role) => Promise<User>
  loginWithGoogle: (credential: string, role?: Role) => Promise<User>
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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load stored user on app start
    getStoredUser().then(storedUser => {
      setUser(storedUser)
      setLoading(false)
    })
  }, [])

  const login: AuthContextValue['login'] = async (email, password, role = 'student') => {
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

    await storeAuthData(res.token, u)
    setUser(u)
    return u
  }

  const loginWithGoogleAuth: AuthContextValue['loginWithGoogle'] = async (credential, role = 'student') => {
    const res = await loginWithGoogle(credential, role)

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

    await storeAuthData(res.token, u)
    setUser(u)
    return u
  }

  const logout = async () => {
    setUser(null)
    await clearAuthData()
  }

  const value = useMemo(() => ({ user, loading, login, loginWithGoogle: loginWithGoogleAuth, logout }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function getDashboardPathForRole(role: Role) {
  // Admins should always go to admin dashboard regardless of role switching
  if (role === 'admin') {
    return 'AdminDashboard'
  }

  switch (role) {
    case 'student':
      return 'StudentDashboard'
    case 'teacher':
      return 'TeacherDashboard'
    case 'ta':
      return 'TADashboard'
    default:
      return 'Login'
  }
}