import { apiFetch } from '../../../services/api';

export interface ProgressRow {
  course_offering_id: number;
  course_code?: string;
  course_title?: string;
  term?: string;
  section?: string | null;
  student_id?: number;
  student_name?: string;
  student_email?: string;
  activity_type: 'assignment' | 'quiz' | string;
  activity_id: number;
  activity_title?: string;
  max_score?: number;
  score?: number | null;
  status?: string;
  due_at?: string | null;
  submitted_at?: string | null;
}

export interface CourseSupportStudent {
  student_id: number;
  student_name?: string;
  student_email?: string;
  marks_pct: number;
  consistency_pct: number;
  attendance_pct: number;
  overall_score: number;
  assignment_completion_pct: number;
  on_time_pct: number;
  performanceLabel: string;
  consistencyLabel: string;
  attendanceLabel: string;
  profileLabel: string;
  labels: string[];
  supportLevel: 'high_priority' | 'watchlist' | 'on_track';
  metrics: {
    total_assignments: number;
    submitted_assignments: number;
    total_quizzes: number;
    attempted_quizzes: number;
    total_lectures: number;
    attended_lectures: number;
    total_points_possible: number;
    total_points_scored: number;
  };
}

export interface CourseSupportInsights {
  offering: {
    id: number;
    term?: string;
    section?: string | null;
    course_code?: string;
    course_title?: string;
  };
  formula: {
    overall_score: string;
    consistency_score: string;
  };
  students: CourseSupportStudent[];
}

export async function getMyProgress(): Promise<{ rows: ProgressRow[] }> {
  return apiFetch('/api/progress/me');
}

export async function getCourseProgress(offeringId: number | string): Promise<{ rows: ProgressRow[] }> {
  return apiFetch(`/api/progress/course/${offeringId}`);
}

export async function getStudentProgress(
  studentId: number | string,
  courseOfferingId?: number | string,
): Promise<{ rows: ProgressRow[] }> {
  const q = courseOfferingId ? `?course_offering_id=${courseOfferingId}` : '';
  return apiFetch(`/api/progress/student/${studentId}${q}`);
}

export async function getCourseSupportInsights(offeringId: number | string): Promise<CourseSupportInsights> {
  return apiFetch(`/api/progress/course/${offeringId}/support-insights`);
}

