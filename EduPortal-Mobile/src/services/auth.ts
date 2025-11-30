import { apiFetch } from './api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User, Role } from '../types'

export interface LoginResponse {
  token: string
  user: {
    id: number
    name: string
    email: string
    role: string
  }
}

function mapBackendRole(r: string): Role {
  if (r === 'faculty') return 'teacher'
  if (r === 'admin') return 'admin'
  if (r === 'ta') return 'ta'
  return 'student'
}

export async function loginRequest(email: string, password: string, role: Role = 'student'): Promise<LoginResponse> {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: { email, password, role }
  })
}

export async function loginWithGoogle(credential: string, role: Role = 'student'): Promise<LoginResponse> {
  return apiFetch('/auth/google', {
    method: 'POST',
    body: { credential, role }
  })
}

export async function getStoredUser(): Promise<User | null> {
  try {
    const userJson = await AsyncStorage.getItem('auth:user')
    return userJson ? JSON.parse(userJson) : null
  } catch {
    return null
  }
}

export async function getStoredToken(): Promise<string | null> {
  return await AsyncStorage.getItem('auth:token')
}

export async function storeAuthData(token: string, user: User): Promise<void> {
  await AsyncStorage.setItem('auth:token', token)
  await AsyncStorage.setItem('auth:user', JSON.stringify(user))
}

export async function clearAuthData(): Promise<void> {
  await AsyncStorage.removeItem('auth:user')
  await AsyncStorage.removeItem('auth:token')
}