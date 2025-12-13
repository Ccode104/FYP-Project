import { createContext } from 'react'
import type { User } from '../utils/auth'

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string, role?: 'student' | 'teacher' | 'ta' | 'admin') => Promise<User>
  loginWithGoogle: (credential: string, role?: 'student' | 'teacher' | 'ta' | 'admin') => Promise<User>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)