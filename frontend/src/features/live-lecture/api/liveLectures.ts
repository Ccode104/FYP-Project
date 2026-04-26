import { apiFetch } from '../../../services/api';

export interface LiveLectureParticipant {
  id: number;
  live_lecture_id: number;
  user_id: number;
  role: 'student' | 'teacher' | 'ta';
  joined_at: string;
  left_at?: string | null;
  is_muted?: boolean;
  is_video_off?: boolean;
  is_hand_raised?: boolean;
  is_screen_sharing?: boolean;
  last_activity?: string;
  name: string;
  email: string;
  attendance_minutes: number;
}

export interface LiveLectureStats {
  total_participants: number;
  active_participants: number;
  total_attendance_minutes: number;
  average_attendance_minutes: number;
}

export interface LiveLecture {
  id: number;
  title: string;
  description?: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  scheduled_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  course_offering_id: number;
  meeting_url?: string | null;
  google_calendar_event_url?: string | null;
  created_by_name?: string;
  created_by_email?: string;
  active_participant_count?: number;
  total_participant_count?: number;
  active_student_count?: number;
  total_student_count?: number;
  average_attendance_minutes?: number;
  total_attendance_minutes?: number;
}

export interface LiveLectureDetailResponse {
  lecture: LiveLecture;
  participants: LiveLectureParticipant[];
  stats: LiveLectureStats;
}

export interface LiveLectureListResponse {
  lectures: LiveLecture[];
}

export interface JoinLiveLectureResponse {
  success: boolean;
  message: string;
  meeting_url: string;
  lecture: LiveLecture;
  participant: LiveLectureParticipant;
}

export async function createLiveLecture(data: {
  title: string;
  description?: string;
  course_offering_id: number;
  scheduled_at: string;
  duration_minutes?: number;
}): Promise<{ success: boolean; message: string; lecture: LiveLecture }> {
  return apiFetch('/api/live-lectures', { method: 'POST', body: data });
}

export async function getLiveLecturesByCourse(
  courseOfferingId: number
): Promise<LiveLectureListResponse> {
  return apiFetch(`/api/live-lectures/course/${courseOfferingId}`);
}

export async function getLiveLectureById(lectureId: number): Promise<LiveLectureDetailResponse> {
  return apiFetch(`/api/live-lectures/${lectureId}`);
}

export async function startLiveLecture(
  lectureId: number
): Promise<{ success: boolean; message: string; lecture: LiveLecture }> {
  return apiFetch(`/api/live-lectures/${lectureId}/start`, { method: 'POST' });
}

export async function endLiveLecture(
  lectureId: number
): Promise<{ success: boolean; message: string; lecture: LiveLecture }> {
  return apiFetch(`/api/live-lectures/${lectureId}/end`, { method: 'POST' });
}

export async function joinLiveLecture(lectureId: number): Promise<JoinLiveLectureResponse> {
  return apiFetch(`/api/live-lectures/${lectureId}/join`, { method: 'POST' });
}

export async function leaveLiveLecture(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/leave`, { method: 'POST' });
}

export async function getLiveLectureParticipants(lectureId: number): Promise<{
  participants: LiveLectureParticipant[];
  stats: LiveLectureStats;
}> {
  return apiFetch(`/api/live-lectures/${lectureId}/participants`);
}

export async function cleanupLiveLectureParticipants(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/participants/cleanup`, { method: 'POST' });
}

export async function generateMeetLink(lectureId: number): Promise<{
  success: boolean;
  meeting_url: string;
  google_calendar_event_url?: string | null;
}> {
  return apiFetch(`/api/live-lectures/${lectureId}/meet-link`, { method: 'POST' });
}

export async function updateLiveLecture(
  lectureId: number,
  data: {
    title?: string;
    description?: string;
    scheduled_at?: string;
    duration_minutes?: number;
  }
): Promise<{ success: boolean; message: string; lecture: LiveLecture }> {
  return apiFetch(`/api/live-lectures/${lectureId}`, { method: 'PUT', body: data });
}

export async function deleteLiveLecture(lectureId: number): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/live-lectures/${lectureId}`, { method: 'DELETE' });
}
