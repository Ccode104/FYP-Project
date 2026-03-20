import { apiFetch } from '../../../services/api';

export interface PlannerTask {
  id: number;
  user_id: number;
  course_offering_id: number | null;
  source_type: string;
  source_id: number | null;
  category?: string | null;
  priority?: 'low' | 'medium' | 'high' | string;
  title: string;
  description?: string | null;
  due_at?: string | null;
  estimated_minutes?: number;
  difficulty?: string;
  status?: 'pending' | 'in_progress' | 'done' | 'skipped';
  completed_at?: string | null;
  last_status_at?: string | null;
  time_spent_minutes?: number;
  scheduled_for?: string | null;
  scheduled_block?: string | null;
  reminder_dismissed_until?: string | null;
  order_index?: number;
}

export interface PlannerPreferences {
  user_id: number;
  daily_minutes: number;
  timezone: string;
  preferred_hours: string;
}

export async function fetchPlannerTasks(params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<{ tasks: PlannerTask[] }>(`/api/planner/tasks${suffix}`);
}

export async function createPlannerTask(task: Partial<PlannerTask>) {
  return apiFetch<{ task: PlannerTask }>('/api/planner/tasks', {
    method: 'POST',
    body: task,
  });
}

export async function updatePlannerTask(taskId: number, updates: Partial<PlannerTask>) {
  return apiFetch<{ task: PlannerTask }>(`/api/planner/tasks/${taskId}`, {
    method: 'PATCH',
    body: updates,
  });
}

export async function deletePlannerTask(taskId: number) {
  return apiFetch<{ success: boolean }>(`/api/planner/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export async function reorderPlannerTasks(order: { id: number; order_index: number }[]) {
  return apiFetch<{ success: boolean }>('/api/planner/tasks/reorder', {
    method: 'POST',
    body: { order },
  });
}

export async function logPlannerTaskTime(taskId: number, payload: { minutes: number; note?: string }) {
  return apiFetch<{ task: PlannerTask }>(`/api/planner/tasks/${taskId}/time`, {
    method: 'POST',
    body: payload,
  });
}

export async function generatePlanner(courseIds?: number[]) {
  return apiFetch<{ success: boolean; tasks: PlannerTask[] }>('/api/planner/generate', {
    method: 'POST',
    body: { courseIds: courseIds || [] },
  });
}

export async function generateTeacherPlanner() {
  return apiFetch<{ success: boolean; tasks: PlannerTask[] }>('/api/planner/generate/teacher', {
    method: 'POST',
  });
}

export async function generateTAPlanner() {
  return apiFetch<{ success: boolean; tasks: PlannerTask[] }>('/api/planner/generate/ta', {
    method: 'POST',
  });
}

export async function generateAdminPlanner() {
  return apiFetch<{ success: boolean; tasks: PlannerTask[] }>('/api/planner/generate/admin', {
    method: 'POST',
  });
}

export async function reschedulePlanner() {
  return apiFetch<{ success: boolean; tasks: PlannerTask[] }>('/api/planner/reschedule', {
    method: 'POST',
  });
}

export async function fetchPlannerPreferences() {
  return apiFetch<PlannerPreferences>('/api/planner/preferences');
}

export async function updatePlannerPreferences(prefs: Partial<PlannerPreferences>) {
  return apiFetch<{ success: boolean }>('/api/planner/preferences', {
    method: 'PUT',
    body: prefs,
  });
}

export async function fetchPlannerRecommendations() {
  return apiFetch<{ recommendations: Array<{ best_hours: string[]; reason: string }> }>(
    '/api/planner/recommendations',
  );
}
