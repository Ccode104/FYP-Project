import { apiFetch } from './api';

export interface TADashboardData {
  courses: Course[];
  pendingAssignments: PendingItem[];
  pendingQuizzes: PendingItem[];
  pendingViva: PendingItem[];
  stats: {
    total_graded_assignments: number;
    total_graded_quizzes: number;
    total_graded_viva: number;
    students_helped_assignments: number;
    students_helped_quizzes: number;
    students_helped_viva: number;
  };
}

export interface Course {
  id: number;
  course_code: string;
  course_title: string;
  term: string;
  section?: string;
  role: string;
}

export interface PendingItem {
  id: number;
  title: string;
  course_code: string;
  course_title: string;
  ungraded_count?: number;
  total_submissions?: number;
  total_attempts?: number;
  ungraded_attempts?: number;
  pending_participants?: number;
  total_participants?: number;
  due_date?: string;
  end_time?: string;
  scheduled_at?: string;
}

export async function getTAAssignments(courseId?: string): Promise<any[]> {
  const url = courseId ? `/api/ta/assignments?courseId=${courseId}` : '/api/ta/assignments';
  return apiFetch(url);
}

export async function getGradingSubmissions(assignmentId: number): Promise<any[]> {
  return apiFetch(`/api/ta/grading/${assignmentId}/submissions`);
}

export async function submitGrading(data: {
  submissionId: number;
  rubricGrades?: Array<{ criterionId: number; score: number; feedback?: string }>;
  overallComments?: string;
}): Promise<unknown> {
  return apiFetch('/api/ta/grading/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getTADashboardData(): Promise<TADashboardData> {
  return apiFetch('/api/ta/dashboard');
}
