import { apiFetch } from './api';

export interface PlannerTask {
  id: number;
  user_id: number;
  course_offering_id: number | null;
  source_type: string;
  source_id: number | null;
  title: string;
  description?: string | null;
  due_at?: string | null;
  estimated_minutes?: number;
  difficulty?: string;
  status?: 'pending' | 'in_progress' | 'done' | 'skipped';
  scheduled_for?: string | null;
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
    body: task
  });
}

export async function updatePlannerTask(taskId: number, updates: Partial<PlannerTask>) {
  return apiFetch<{ task: PlannerTask }>(`/api/planner/tasks/${taskId}`, {
    method: 'PATCH',
    body: updates
  });
}

export async function deletePlannerTask(taskId: number) {
  return apiFetch<{ success: boolean }>(`/api/planner/tasks/${taskId}`, {
    method: 'DELETE'
  });
}

export async function reorderPlannerTasks(order: { id: number; order_index: number }[]) {
  return apiFetch<{ success: boolean }>('/api/planner/tasks/reorder', {
    method: 'POST',
    body: { order }
  });
}

export async function generatePlanner(courseIds?: number[]) {
  return apiFetch<{ success: boolean; tasks: PlannerTask[] }>('/api/planner/generate', {
    method: 'POST',
    body: { courseIds: courseIds || [] }
  });
}

export async function fetchPlannerPreferences() {
  return apiFetch<PlannerPreferences>('/api/planner/preferences');
}

export async function updatePlannerPreferences(prefs: Partial<PlannerPreferences>) {
  return apiFetch<{ success: boolean }>('/api/planner/preferences', {
    method: 'PUT',
    body: prefs
  });
}
