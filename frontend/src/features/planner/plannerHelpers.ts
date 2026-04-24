import type { PlannerTask } from './api/planner';

export type PlannerLayoutMode = 'list' | 'board' | 'calendar';
export type PlannerViewMode = 'daily' | 'weekly' | 'all';
export type PlannerStatusFilter = 'all' | 'pending' | 'in_progress' | 'done';
export type PlannerSourceFilter = 'all' | 'system' | 'manual';

export const plannerBoardColumns: Array<{ id: PlannerTask['status']; label: string }> = [
  { id: 'pending', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Completed' },
];

export function normalizePlannerDateValue(value?: string | null) {
  if (!value) return null;
  return value.includes('T') ? value.slice(0, 10) : value;
}

export function isSystemTask(task: PlannerTask) {
  return task.source_type !== 'manual';
}

export function priorityTone(priority?: string | null) {
  if (priority === 'high') return 'danger';
  if (priority === 'medium') return 'warning';
  return 'neutral';
}

export function getTaskAnchor(task: PlannerTask) {
  if (task.scheduled_for) {
    const normalized = normalizePlannerDateValue(task.scheduled_for);
    if (normalized) return new Date(`${normalized}T09:00:00`);
  }
  if (task.due_at) return new Date(task.due_at);
  return null;
}

export function formatDateTime(value?: string | null, fallback = 'No due date') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateOnly(value?: string | null, fallback = 'Unscheduled') {
  const normalized = normalizePlannerDateValue(value);
  if (!normalized) return fallback;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function relativeDueLabel(task: PlannerTask) {
  if (!task.due_at) return 'No due date';
  const due = new Date(task.due_at);
  if (Number.isNaN(due.getTime())) return 'No due date';

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startDue = new Date(due);
  startDue.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startDue.getTime() - startToday.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays}d`;
  return formatDateTime(task.due_at);
}

export function buildPlannerWeek(anchorDate: string) {
  const start = new Date(anchorDate);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next;
  });
}

export function matchesPlannerWindow(task: PlannerTask, view: PlannerViewMode, anchorDate: string) {
  if (view === 'all') return true;
  const anchor = getTaskAnchor(task);
  if (!anchor || Number.isNaN(anchor.getTime())) return false;

  const start = new Date(anchorDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (view === 'weekly') end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return anchor >= start && anchor <= end;
}
