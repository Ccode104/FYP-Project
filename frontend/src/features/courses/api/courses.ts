import { apiFetch } from '../../../services/api';

export async function enrollStudent(offeringId: number, studentId: number) {
  return apiFetch(`/api/courses/offerings/${offeringId}/enroll`, {
    method: 'POST',
    body: { student_id: studentId },
  });
}

export async function unenrollStudent(offeringId: number, studentId?: number) {
  return apiFetch(`/api/courses/offerings/${offeringId}/enroll`, {
    method: 'DELETE',
    body: studentId ? { student_id: studentId } : undefined,
  });
}

export async function createCourse(payload: {
  code: string;
  title: string;
  description?: string;
  department_id?: number;
  credits?: number;
}) {
  return apiFetch(`/api/courses`, { method: 'POST', body: payload });
}

export async function listCourses() {
  return apiFetch(`/api/courses`);
}

export interface CourseOfferingOption {
  id: number;
  course_id: number;
  term?: string;
  section?: string;
  max_capacity?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  course_code?: string;
  course_title?: string;
  course_description?: string;
  faculty_name?: string;
  enrolled_count?: number;
  is_enrolled?: boolean;
}

export async function listOfferings(q = '') {
  const sp = new URLSearchParams();
  if (q.trim()) sp.set('q', q.trim());
  return apiFetch<{ offerings: CourseOfferingOption[] }>(`/api/courses/offerings${sp.toString() ? `?${sp.toString()}` : ''}`);
}

export async function listMyOfferings() {
  return apiFetch(`/api/courses/mine/offerings`);
}

export async function listMyCourses() {
  return apiFetch(`/api/courses/mine/courses`);
}

export async function createOffering(payload: {
  course_id: number;
  term: string;
  section?: string;
  faculty_id: number;
  max_capacity?: number;
  start_date?: string;
  end_date?: string;
}) {
  return apiFetch(`/api/courses/${payload.course_id}/offerings`, { method: 'POST', body: payload });
}

