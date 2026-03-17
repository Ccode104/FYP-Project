import { apiFetch } from '../../../services/api';

export interface VivaSession {
  id: number;
  course_offering_id: number;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  max_students: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface VivaParticipant {
  id: number;
  viva_session_id: number;
  student_id: number;
  scheduled_order: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'absent' | 'cancelled';
  notes?: string;
  student_name: string;
  student_email: string;
  score?: number;
  feedback?: string;
  graded_at?: string;
}

export interface VivaSessionDetails extends VivaSession {
  course_code: string;
  course_title: string;
  participants: VivaParticipant[];
}

export async function getVivaSessions(courseOfferingId?: number): Promise<{ sessions: VivaSession[] }> {
  const params = courseOfferingId ? `?courseOfferingId=${courseOfferingId}` : '';
  return apiFetch(`/api/viva/sessions${params}`);
}

export async function getVivaSessionDetails(id: number): Promise<{ session: VivaSession; participants: VivaParticipant[] }> {
  return apiFetch(`/api/viva/sessions/${id}`);
}

export async function createVivaSession(data: {
  courseOfferingId: number;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes?: number;
  maxStudents?: number;
  participants?: { studentId: number }[];
}): Promise<{ session: VivaSession; message: string }> {
  return apiFetch('/api/viva/sessions', {
    method: 'POST',
    body: data,
  });
}

export async function generateVivaQuestions(data: {
  vivaSessionId: number;
  studentId: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
}): Promise<{
  questions: string;
  generated_at: string;
  context: {
    studentId: number;
    vivaSessionId: number;
    submissions_count: number;
  };
}> {
  return apiFetch('/api/viva/generate-questions', {
    method: 'POST',
    body: data,
  });
}

export async function gradeVivaParticipant(data: {
  participantId: number;
  score: number;
  feedback?: string;
}): Promise<{ grade: unknown; message: string }> {
  return apiFetch('/api/viva/grade', {
    method: 'POST',
    body: data,
  });
}

export async function updateVivaParticipantStatus(data: {
  participantId: number;
  status: VivaParticipant['status'];
  notes?: string;
}): Promise<{ participant: VivaParticipant; message: string }> {
  return apiFetch('/api/viva/participant/status', {
    method: 'POST',
    body: data,
  });
}

