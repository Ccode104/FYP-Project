import { apiFetch } from './api';
import type { ProctoringConfig, ProctoringSession } from './proctoring';

export interface ProctoringSessionResponse {
  session: ProctoringSession;
  config: ProctoringConfig;
}

export interface ProctoringConfigResponse {
  config: ProctoringConfig;
  is_default: boolean;
}

export interface ProctoringViolationRequest {
  session_id: number;
  violation_type: string;
  severity: 1 | 2 | 3 | 4;
  evidence_data?: Record<string, unknown>;
  description?: string;
}

export interface ProctoringConfigRequest {
  quiz_id: number;
  name?: string;
  webcam_required?: boolean;
  screen_monitoring?: boolean;
  audio_monitoring?: boolean;
  face_detection_required?: boolean;
  max_warnings?: number;
  auto_suspend_severity?: number;
  allow_recovery?: boolean;
  recovery_wait_seconds?: number;
  violation_score_penalty?: number;
  suspension_requires_teacher?: boolean;
  live_monitoring_enabled?: boolean;
  record_sessions?: boolean;
}

export interface ProctoringAnalytics {
  session_id: number;
  total_violations: number;
  violations_by_type: Record<string, number>;
  violations_by_severity: Record<string, number>;
  session_duration_seconds: number;
  compliance_score: number;
  risk_level: string;
  flagged_for_review: boolean;
}

// Create a new proctoring session
export async function createProctoringSession(data: {
  quiz_attempt_id?: number;
  quiz_id: number;
  student_id: number;
  device_info?: Record<string, unknown>;
  browser_info?: Record<string, unknown>;
  webcam_enabled?: boolean;
  screen_monitoring_enabled?: boolean;
  audio_monitoring_enabled?: boolean;
}): Promise<ProctoringSession> {
  const response = await apiFetch<{ session: ProctoringSession }>('/api/proctoring/sessions', {
    method: 'POST',
    body: data
  });
  return response.session;
}

// Get proctoring session details
export async function getProctoringSession(sessionToken: string): Promise<ProctoringSessionResponse> {
  return await apiFetch<ProctoringSessionResponse>(`/api/proctoring/sessions/${sessionToken}`);
}

// Record a violation
export async function recordViolation(violation: ProctoringViolationRequest): Promise<{ message: string; violation: Record<string, unknown>; auto_suspended: boolean }> {
  return await apiFetch<{ message: string; violation: Record<string, unknown>; auto_suspended: boolean }>('/api/proctoring/violations', {
    method: 'POST',
    body: violation
  });
}

// Suspend a session (teacher/admin only)
export async function suspendSession(sessionId: number, reason: string): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>(`/api/proctoring/sessions/${sessionId}/suspend`, {
    method: 'POST',
    body: {
      reason,
      suspended_by: 'teacher' // This should be the actual user ID
    }
  });
}

// Resume a suspended session (teacher/admin only)
export async function resumeSession(sessionId: number): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>(`/api/proctoring/sessions/${sessionId}/resume`, {
    method: 'POST',
    body: {
      resumed_by: 'teacher' // This should be the actual user ID
    }
  });
}

// Get session analytics
export async function getSessionAnalytics(sessionId: number): Promise<{ analytics: ProctoringAnalytics }> {
  return await apiFetch<{ analytics: ProctoringAnalytics }>(`/api/proctoring/sessions/${sessionId}/analytics`);
}

// Create or update proctoring configuration
export async function createProctoringConfig(config: ProctoringConfigRequest): Promise<{ message: string; config: ProctoringConfig }> {
  return await apiFetch<{ message: string; config: ProctoringConfig }>('/api/proctoring/configs', {
    method: 'POST',
    body: config
  });
}

// Get proctoring configuration for a quiz
export async function getProctoringConfig(quizId: number): Promise<ProctoringConfigResponse> {
  return await apiFetch<ProctoringConfigResponse>(`/api/proctoring/configs/quiz/${quizId}`);
}

// List all proctoring configurations (for teachers/admins)
export async function listProctoringConfigs(): Promise<{ configs: ProctoringConfig[] }> {
  return await apiFetch<{ configs: ProctoringConfig[] }>('/api/proctoring/configs');
}

// Get suspended proctoring sessions (for teachers/admins)
export async function getSuspendedProctoringSessions(): Promise<{ sessions: any[] }> {
  return await apiFetch<{ sessions: any[] }>('/api/proctoring/sessions/suspended-sessions');
}