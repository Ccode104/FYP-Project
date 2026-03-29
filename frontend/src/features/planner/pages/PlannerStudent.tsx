import { useEffect, useMemo, useState } from 'react';
import '../styles/Planner.css';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/ToastProvider';
import { useAuth } from '../../../hooks/useAuth';
import {
  createPlannerTask,
  deletePlannerTask,
  fetchPlannerPreferences,
  fetchPlannerTasks,
  fetchPlannerRecommendations,
  generatePlanner,
  logPlannerTaskTime,
  reschedulePlanner,
  reorderPlannerTasks,
  updatePlannerPreferences,
  updatePlannerTask,
  type PlannerPreferences,
  type PlannerTask,
} from '../api/planner';

type ViewMode = 'daily' | 'weekly' | 'all';
type LayoutMode = 'list' | 'board';

const difficultyOptions = ['easy', 'medium', 'hard'];
const categoryOptions = ['assignment', 'quiz', 'lecture', 'self-study', 'custom'];
const priorityOptions = ['low', 'medium', 'high'];

function roundToFive(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 5;
  return Math.max(5, Math.ceil(value / 5) * 5);
}

function roundToFiveOrZero(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / 5) * 5;
}

function formatMinutes(value?: number | null, suffix = 'min') {
  const rounded = roundToFiveOrZero(Number(value || 0));
  return `${rounded} ${suffix}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function formatDateOnly(value?: string | null) {
  if (!value) return 'Unscheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unscheduled';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export default function PlannerStudent() {
  const { push } = useToast();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [preferences, setPreferences] = useState<PlannerPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Array<{ best_hours: string[]; reason: string }>>([]);
  const [view, setView] = useState<ViewMode>('weekly');
  const [layout, setLayout] = useState<LayoutMode>('list');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showDismissedReminders, setShowDismissedReminders] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_at: '',
    estimated_minutes: 90,
    difficulty: 'medium',
    category: 'custom',
    priority: 'medium',
    scheduled_for: '',
  });

  const loadPlanner = async () => {
    try {
      setLoading(true);
      const [taskData, prefData, recData] = await Promise.all([
        fetchPlannerTasks(),
        fetchPlannerPreferences(),
        fetchPlannerRecommendations(),
      ]);
      setTasks(taskData.tasks || []);
      setPreferences(prefData);
      setRecommendations(recData.recommendations || []);
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to load planner' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlanner();
  }, []);

  const filteredTasks = useMemo(() => {
    if (view === 'all') return tasks;
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    if (view === 'weekly') {
      end.setDate(end.getDate() + 6);
    }
    end.setHours(23, 59, 59, 999);
    return tasks.filter((task) => {
      // Prefer explicit scheduled_for; fallback to due_at to avoid "missing" tasks in daily/weekly view.
      const anchor = task.scheduled_for || task.due_at;
      if (!anchor) return false;
      const when = new Date(anchor);
      if (Number.isNaN(when.getTime())) return false;
      return when >= start && when <= end;
    });
  }, [tasks, view, selectedDate]);

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((task) => task.status === 'done').length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  const reminders = useMemo(() => {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    return tasks
      .filter((task) => {
        if (!task.due_at || task.status === 'done') return false;
        if (task.reminder_dismissed_until) {
          const until = new Date(task.reminder_dismissed_until);
          if (!Number.isNaN(until.getTime()) && until > now) return false;
        }
        const due = new Date(task.due_at);
        return due <= soon && due >= now;
      })
      .slice(0, 5);
  }, [tasks]);

  const dismissedReminders = useMemo(() => {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    return tasks
      .filter((task) => {
        if (!task.due_at || task.status === 'done') return false;
        if (!task.reminder_dismissed_until) return false;
        const until = new Date(task.reminder_dismissed_until);
        if (Number.isNaN(until.getTime()) || until <= now) return false;
        const due = new Date(task.due_at);
        return due <= soon && due >= now;
      })
      .slice(0, 10);
  }, [tasks]);

  const setReminderDismissUntil = async (task: PlannerTask, until: Date | null) => {
    try {
      const payload = { reminder_dismissed_until: until ? until.toISOString() : null };
      const response = await updatePlannerTask(task.id, payload);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? response.task : t)));
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to update reminder' });
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const response = await generatePlanner();
      // Never wipe tasks on an empty generate response.
      if ((response.tasks || []).length > 0) {
        setTasks(response.tasks || []);
      }
      if ((response.tasks || []).length === 0) {
        push({
          kind: 'success',
          message: 'Planner generated (no upcoming items found). Make sure you are enrolled and your assignments/quizzes have future due dates.',
        });
      } else {
        push({ kind: 'success', message: 'Planner generated' });
      }
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to generate plan' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      push({ kind: 'error', message: 'Title is required' });
      return;
    }
    try {
      // If user didn't set scheduled_for, default it from due_at (keeps the task visible in daily/weekly).
      const scheduledFallback =
        form.scheduled_for || (form.due_at ? new Date(form.due_at).toISOString().slice(0, 10) : '');
      const response = await createPlannerTask({
        title: form.title,
        description: form.description,
        due_at: form.due_at || null,
        estimated_minutes: Number(form.estimated_minutes) || 90,
        difficulty: form.difficulty,
        category: form.category,
        priority: form.priority,
        scheduled_for: scheduledFallback || null,
      });
      setTasks((prev) => [response.task, ...prev]);
      setShowModal(false);
      setForm({
        title: '',
        description: '',
        due_at: '',
        estimated_minutes: 90,
        difficulty: 'medium',
        category: 'custom',
        priority: 'medium',
        scheduled_for: '',
      });
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to create task' });
    }
  };

  const updateStatus = async (task: PlannerTask, status: PlannerTask['status']) => {
    try {
      const response = await updatePlannerTask(task.id, { status });
      setTasks((prev) => prev.map((item) => (item.id === task.id ? response.task : item)));
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to update task' });
    }
  };

  const handleDelete = async (taskId: number) => {
    try {
      await deletePlannerTask(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to delete task' });
    }
  };

  const handleDrop = async (targetId: number) => {
    if (dragId === null || dragId === targetId) return;
    const list = [...filteredTasks];
    const dragIndex = list.findIndex((task) => task.id === dragId);
    const targetIndex = list.findIndex((task) => task.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;
    const reordered = [...list];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Avoid clobbering global ordering when reordering inside a filtered view.
    const viewTaskIds = new Set(reordered.map((t) => t.id));
    const baseOrder = Math.min(
      ...tasks.filter((t) => viewTaskIds.has(t.id)).map((t) => (typeof t.order_index === 'number' ? t.order_index : 0)),
      0,
    );

    const updatedTasks = tasks.map((task) => {
      const newIndex = reordered.findIndex((item) => item.id === task.id);
      if (newIndex === -1) return task;
      return { ...task, order_index: baseOrder + newIndex };
    });
    setTasks(updatedTasks);
    setDragId(null);

    try {
      await reorderPlannerTasks(reordered.map((task, index) => ({ id: task.id, order_index: baseOrder + index })));
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to reorder tasks' });
    }
  };

  const handlePreferenceUpdate = async (next: Partial<PlannerPreferences>) => {
    if (!preferences) return;
    const updated = { ...preferences, ...next };
    setPreferences(updated);
    try {
      await updatePlannerPreferences(updated);
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to update preferences' });
    }
  };

  const handleReschedule = async () => {
    try {
      setLoading(true);
      const response = await reschedulePlanner();
      setTasks(response.tasks || []);
      push({ kind: 'success', message: 'Schedule updated' });
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to reschedule' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogTime = async (taskId: number, minutes: number) => {
    try {
      const response = await logPlannerTaskTime(taskId, { minutes });
      setTasks((prev) => prev.map((item) => (item.id === taskId ? response.task : item)));
      push({ kind: 'success', message: `Logged ${minutes} minutes` });
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to log time' });
    }
  };

  const boardColumns: Array<{ id: PlannerTask['status']; label: string }> = [
    { id: 'pending', label: 'Pending' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'done', label: 'Completed' },
  ];

  const tasksByStatus = useMemo(() => {
    const groups = new Map<PlannerTask['status'], PlannerTask[]>();
    boardColumns.forEach((col) => groups.set(col.id, []));
    filteredTasks.forEach((task) => {
      const status = task.status || 'pending';
      if (!groups.has(status)) {
        groups.set(status, []);
      }
      groups.get(status)?.push(task);
    });
    return groups;
  }, [filteredTasks]);

  return (
    <div className="container container-wide planner-page">
      <div className="planner-header">
        <div>
          <h1 className="planner-title">Coursework Planner{user?.name ? ` — ${user.name}` : ''}</h1>
          <p className="planner-subtitle">A focused timeline built from your coursework and habits.</p>
        </div>
        <div className="planner-actions">
          <button className="btn btn-secondary" onClick={() => setShowModal(true)}>
            Add Task
          </button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
            Auto-Generate Plan
          </button>
          <button className="btn btn-outline" onClick={handleReschedule} disabled={loading}>
            Auto-Reschedule
          </button>
          <button className="btn btn-outline" onClick={loadPlanner} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="planner-grid">
        <section className="planner-panel planner-progress">
          <h3>Progress</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-meta">{progress}% complete</div>
          <div className="planner-preferences">
            <label>
              Daily focus minutes
              <input
                type="number"
                min={30}
                max={600}
                value={preferences?.daily_minutes ?? 120}
                step={5}
                onChange={(event) => handlePreferenceUpdate({ daily_minutes: roundToFive(Number(event.target.value)) })}
              />
            </label>
            <label>
              Preferred hours
              <select
                value={preferences?.preferred_hours ?? 'morning'}
                onChange={(event) => handlePreferenceUpdate({ preferred_hours: event.target.value })}
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="late-night">Late Night</option>
              </select>
            </label>
          </div>
        </section>

        <section className="planner-panel planner-reminders">
          <div className="reminder-header">
            <h3>Smart Reminders</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowDismissedReminders((v) => !v)}>
              {showDismissedReminders ? 'Hide dismissed' : `Dismissed (${dismissedReminders.length})`}
            </button>
          </div>
          {reminders.length === 0 ? (
            <p className="muted">No urgent deadlines in the next 48 hours.</p>
          ) : (
            <ul className="reminder-list">
              {reminders.map((task) => (
                <li key={task.id}>
                  <div className="reminder-row">
                    <div className="reminder-main">
                      <strong>{task.title}</strong>
                      <span>{formatDateTime(task.due_at)}</span>
                    </div>
                    <div className="reminder-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(task, 'done')}>
                        Done
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setReminderDismissUntil(task, new Date(Date.now() + 6 * 60 * 60 * 1000))}
                        title="Hide this reminder for 6 hours"
                      >
                        Dismiss
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setReminderDismissUntil(task, new Date(Date.now() + 24 * 60 * 60 * 1000))}
                        title="Snooze 1 day"
                      >
                        Snooze 1d
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setReminderDismissUntil(task, new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))}
                        title="Snooze 3 days"
                      >
                        Snooze 3d
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {showDismissedReminders && (
            <div className="planner-recommendations">
              <h4>Dismissed reminders</h4>
              {dismissedReminders.length === 0 ? (
                <p className="muted">No dismissed reminders.</p>
              ) : (
                <ul className="reminder-list">
                  {dismissedReminders.map((task) => (
                    <li key={`dismissed-${task.id}`}>
                      <div className="reminder-row">
                        <div className="reminder-main">
                          <strong>{task.title}</strong>
                          <span>
                            Due: {task.due_at ? formatDateTime(task.due_at) : '—'} • Hidden until:{' '}
                            {task.reminder_dismissed_until ? formatDateTime(task.reminder_dismissed_until) : '—'}
                          </span>
                        </div>
                        <div className="reminder-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => setReminderDismissUntil(task, null)}>
                            Undo
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="planner-panel planner-tasks">
        <div className="planner-task-header">
          <h3>Your Plan</h3>
          <div className="planner-view-controls">
            <button className={view === 'daily' ? 'active' : ''} onClick={() => setView('daily')}>
              Daily
            </button>
            <button className={view === 'weekly' ? 'active' : ''} onClick={() => setView('weekly')}>
              Weekly
            </button>
            <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>
              All
            </button>
            {view !== 'all' && (
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            )}
            <button className={layout === 'list' ? 'active' : ''} onClick={() => setLayout('list')}>
              List
            </button>
            <button className={layout === 'board' ? 'active' : ''} onClick={() => setLayout('board')}>
              Board
            </button>
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading planner...</p>
        ) : filteredTasks.length === 0 ? (
          <p className="muted">No tasks scheduled for this view yet.</p>
        ) : layout === 'board' ? (
          <div className="planner-board">
            {boardColumns.map((column) => (
              <div key={column.id} className="planner-board-column">
                <div className="planner-board-header">
                  <h4>{column.label}</h4>
                  <span className="muted">{tasksByStatus.get(column.id)?.length ?? 0}</span>
                </div>
                <div className="planner-board-cards">
                  {(tasksByStatus.get(column.id) || []).map((task) => (
                    <div key={task.id} className={`planner-card ${task.status === 'done' ? 'done' : ''}`}>
                      <div className="planner-card-title">{task.title}</div>
                      <div className="planner-card-meta">
                        <span>{task.category || 'custom'}</span>
                        <span>{task.priority || 'medium'} priority</span>
                        <span>{formatMinutes(task.estimated_minutes)}</span>
                        <span>{formatMinutes(task.time_spent_minutes, 'min logged')}</span>
                        <span>{formatDateTime(task.due_at)}</span>
                      </div>
                      <div className="planner-card-actions">
                        {task.status !== 'done' ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => updateStatus(task, task.status === 'in_progress' ? 'pending' : 'in_progress')}
                          >
                            {task.status === 'in_progress' ? 'Pause' : 'Start'}
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(task, 'pending')}>
                            Reopen
                          </button>
                        )}
                        {task.status !== 'done' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(task, 'done')}>
                            Complete
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => handleLogTime(task.id, 15)}>
                          +15m
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleLogTime(task.id, 30)}>
                          +30m
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(task.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="planner-task-list">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`planner-task ${task.status === 'done' ? 'done' : ''}`}
                draggable
                onDragStart={() => setDragId(task.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(task.id)}
              >
                <div className="task-main">
                  <label className="task-check">
                    <input
                      type="checkbox"
                      checked={task.status === 'done'}
                      onChange={(event) => updateStatus(task, event.target.checked ? 'done' : 'pending')}
                    />
                    <span>{task.title}</span>
                  </label>
                  <div className="task-meta">
                    <span>{task.category || 'custom'}</span>
                    <span>{task.priority || 'medium'} priority</span>
                    <span>{formatMinutes(task.estimated_minutes)}</span>
                    <span>{task.difficulty || 'medium'}</span>
                    {task.scheduled_block ? <span>{task.scheduled_block}</span> : null}
                    <span>{formatDateOnly(task.scheduled_for)}</span>
                    <span>{formatDateTime(task.due_at)}</span>
                    <span>{formatMinutes(task.time_spent_minutes, 'min logged')}</span>
                  </div>
                </div>
                <div className="task-actions">
                  <button
                    className="btn btn-ghost"
                    onClick={() => updateStatus(task, task.status === 'in_progress' ? 'pending' : 'in_progress')}
                  >
                    {task.status === 'in_progress' ? 'Pause' : 'Start'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => handleLogTime(task.id, 15)}>
                    +15m
                  </button>
                  <button className="btn btn-ghost" onClick={() => handleLogTime(task.id, 30)}>
                    +30m
                  </button>
                  <button className="btn btn-ghost" onClick={() => handleDelete(task.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {recommendations.length > 0 && (
          <div className="planner-recommendations">
            <h4>Best Study Hours</h4>
            <ul className="reminder-list">
              {recommendations.map((rec, idx) => (
                <li key={idx}>
                  <strong>{rec.best_hours.join(', ')}</strong>
                  <span>{rec.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Planner Task"
        actions={
          <>
            <button className="btn" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreate}>
              Create
            </button>
          </>
        }
      >
        <div className="planner-form">
          <label>
            Title
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
          <div className="planner-form-grid">
            <label>
              Category
              <select
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input
                type="datetime-local"
                value={form.due_at}
                onChange={(event) => setForm((prev) => ({ ...prev, due_at: event.target.value }))}
              />
            </label>
            <label>
              Scheduled for
              <input
                type="date"
                value={form.scheduled_for}
                onChange={(event) => setForm((prev) => ({ ...prev, scheduled_for: event.target.value }))}
              />
            </label>
            <label>
              Estimated minutes
              <input
                type="number"
                min={15}
                value={form.estimated_minutes}
                step={5}
                onChange={(event) => setForm((prev) => ({ ...prev, estimated_minutes: roundToFive(Number(event.target.value)) }))}
              />
            </label>
            <label>
              Difficulty
              <select
                value={form.difficulty}
                onChange={(event) => setForm((prev) => ({ ...prev, difficulty: event.target.value }))}
              >
                {difficultyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
