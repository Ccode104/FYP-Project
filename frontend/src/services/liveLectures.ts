import { apiFetch } from './api';

// Create a new live lecture
export async function createLiveLecture(data: {
  title: string;
  description?: string;
  course_offering_id: number;
  scheduled_at?: string;
}): Promise<unknown> {
  return apiFetch('/api/live-lectures', { method: 'POST', body: data });
}

// Get all live lectures for a course offering
export async function getLiveLecturesByCourse(courseOfferingId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/course/${courseOfferingId}`);
}

// Get a single live lecture by ID
export async function getLiveLectureById(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}`);
}

// Start a live lecture
export async function startLiveLecture(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/start`, { method: 'POST' });
}

// End a live lecture
export async function endLiveLecture(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/end`, { method: 'POST' });
}

// Join a live lecture
export async function joinLiveLecture(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/join`, { method: 'POST' });
}

// Leave a live lecture
export async function leaveLiveLecture(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/leave`, { method: 'POST' });
}

// Get participants for a live lecture
export async function getLiveLectureParticipants(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/participants`);
}

// Clean up orphaned participants for a live lecture (Instructor only)
export async function cleanupLiveLectureParticipants(lectureId: number): Promise<unknown> {
  return apiFetch(`/api/live-lectures/${lectureId}/participants/cleanup`, { method: 'POST' });
}
