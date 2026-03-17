import { apiFetch } from '../../../services/api';

export async function createLiveLecture(data: {
  title: string;
  description?: string;
  course_offering_id: number;
  scheduled_at?: string;
}): Promise<unknown> {
  return apiFetch('/api/live-lectures', { method: 'POST', body: data });
}

export async function getLiveLecturesByCourse(courseOfferingId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/course/${courseOfferingId}`);
}

export async function getLiveLectureById(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}`);
}

export async function startLiveLecture(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/start`, { method: 'POST' });
}

export async function endLiveLecture(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/end`, { method: 'POST' });
}

export async function joinLiveLecture(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/join`, { method: 'POST' });
}

export async function leaveLiveLecture(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/leave`, { method: 'POST' });
}

export async function getLiveLectureParticipants(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/participants`);
}

export async function cleanupLiveLectureParticipants(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/participants/cleanup`, { method: 'POST' });
}

