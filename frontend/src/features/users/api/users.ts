import { apiFetch } from '../../../services/api';

export interface EnrolledCourse {
  enrolled_at: string;
  term: string;
  section?: string;
  course_code: string;
  course_title: string;
  faculty_name?: string;
  max_capacity?: number;
  enrolled_students: number;
}

export interface GamificationStats {
  total_points: number;
  current_streak: number;
  longest_streak: number;
  problems_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  total_submissions: number;
  successful_submissions: number;
  average_time_seconds: number;
  level: number;
  experience_points: number;
}

export interface Achievement {
  name: string;
  description: string;
  icon?: string;
  category: string;
  rarity: string;
  unlocked_at: string;
}

export interface Offering {
  id: number;
  term: string;
  section?: string;
  course_code: string;
  course_title: string;
  max_capacity?: number;
  enrolled_students: number;
}

export interface TaAssignment {
  term: string;
  section?: string;
  course_code: string;
  course_title: string;
  faculty_name?: string;
  assigned_at: string;
}

export interface SystemStats {
  total_users: number;
  total_students: number;
  total_faculty: number;
  total_tas: number;
  total_offerings: number;
  total_courses: number;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: 'student' | 'faculty' | 'ta' | 'admin';
  department_id?: number;
  roll_number?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  department_name?: string;
  department_code?: string;
  enrolledCourses?: EnrolledCourse[];
  gamificationStats?: GamificationStats;
  achievements?: Achievement[];
  offerings?: Offering[];
  totalStudents?: number;
  taAssignments?: TaAssignment[];
  studentsAssisted?: number;
  systemStats?: SystemStats;
}

export async function getUserProfile(): Promise<UserProfile> {
  const response = await apiFetch<{ profile: UserProfile }>('/api/users/profile');
  return response.profile;
}

export async function updateUserProfile(updates: {
  name?: string;
  email?: string;
  roll_number?: string;
}): Promise<{ user: Partial<UserProfile> }> {
  return apiFetch('/api/users/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

