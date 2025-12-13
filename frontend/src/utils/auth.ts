export type Role = 'student' | 'teacher' | 'ta' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export function getDashboardPathForRole(role: Role) {
  // Admins should always go to admin dashboard regardless of role switching
  if (role === 'admin') {
    return '/dashboard/admin'
  }

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

export function mapBackendRole(r: string): Role {
  if (r === 'faculty') return 'teacher'
  if (r === 'admin') return 'admin'
  if (r === 'ta') return 'ta'
  return 'student'
}