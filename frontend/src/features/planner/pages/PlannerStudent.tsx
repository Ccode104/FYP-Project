import { useEffect, useMemo, useState } from 'react';
import '../styles/Planner.css';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/ToastProvider';
import {
  createPlannerTask,
  deletePlannerTask,
  fetchPlannerPreferences,
  fetchPlannerTasks,
  fetchPlannerRecommendations,
  generatePlanner,
  reorderPlannerTasks,
  updatePlannerPreferences,
  updatePlannerTask,
  type PlannerPreferences,
  type PlannerTask,
} from '../api/planner';

type ViewMode = 'daily' | 'weekly' | 'all';

const difficultyOptions = ['easy', 'medium', 'hard'];

export default function PlannerStudent() {
  const { push } = useToast();
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [preferences, setPreferences] = useState<PlannerPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Array<{ best_hours: string[]; reason: string }>>([]);
  const [aiTips, setAiTips] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('weekly');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showModal, setShowModal] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_at: '',
    estimated_minutes: 90,
    difficulty: 'medium',
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
      setAiTips(recData.aiTips || null);
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
    const end = new Date(selectedDate);
    if (view === 'weekly') {
      end.setDate(end.getDate() + 6);
    }
    return tasks.filter((task) => {
      if (!task.scheduled_for) return false;
      const scheduled = new Date(task.scheduled_for);
      return scheduled >= start && scheduled <= end;
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
        const due = new Date(task.due_at);
        return due <= soon && due >= now;
      })
      .slice(0, 5);
  }, [tasks]);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const response = await generatePlanner();
      setTasks(response.tasks || []);
      setAiTips(response.aiTips || null);
      push({ kind: 'success', message: 'Planner generated' });
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
      const response = await createPlannerTask({
        title: form.title,
        description: form.description,
        due_at: form.due_at || null,
        estimated_minutes: Number(form.estimated_minutes) || 90,
        difficulty: form.difficulty,
        scheduled_for: form.scheduled_for || null,
      });
      setTasks((prev) => [response.task, ...prev]);
      setShowModal(false);
      setForm({
        title: '',
        description: '',
        due_at: '',
        estimated_minutes: 90,
        difficulty: 'medium',
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

    const updatedTasks = tasks.map((task) => {
      const newIndex = reordered.findIndex((item) => item.id === task.id);
      if (newIndex === -1) return task;
      return { ...task, order_index: newIndex };
    });
    setTasks(updatedTasks);
    setDragId(null);

    try {
      await reorderPlannerTasks(reordered.map((task, index) => ({ id: task.id, order_index: index })));
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

  return (
    <div className="container container-wide planner-page">
      <div className="planner-header">
        <div>
          <h1 className="planner-title">AI Academic Planner</h1>
          <p className="planner-subtitle">A focused timeline built from your coursework and habits.</p>
        </div>
        <div className="planner-actions">
          <button className="btn btn-secondary" onClick={() => setShowModal(true)}>
            Add Task
          </button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
            Auto-Generate Plan
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
                onChange={(event) => handlePreferenceUpdate({ daily_minutes: Number(event.target.value) })}
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
          <h3>Smart Reminders</h3>
          {reminders.length === 0 ? (
            <p className="muted">No urgent deadlines in the next 48 hours.</p>
          ) : (
            <ul className="reminder-list">
              {reminders.map((task) => (
                <li key={task.id}>
                  <strong>{task.title}</strong>
                  <span>{task.due_at ? new Date(task.due_at).toLocaleString('en-US') : 'No due date'}</span>
                </li>
              ))}
            </ul>
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
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading planner...</p>
        ) : filteredTasks.length === 0 ? (
          <p className="muted">No tasks scheduled for this view yet.</p>
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
                    <span>{task.estimated_minutes || 90} min</span>
                    <span>{task.difficulty || 'medium'}</span>
                    <span>{task.scheduled_for || 'Unscheduled'}</span>
                    <span>{task.due_at ? new Date(task.due_at).toLocaleString('en-US') : 'No due date'}</span>
                  </div>
                </div>
                <div className="task-actions">
                  <button
                    className="btn btn-ghost"
                    onClick={() => updateStatus(task, task.status === 'in_progress' ? 'pending' : 'in_progress')}
                  >
                    {task.status === 'in_progress' ? 'Pause' : 'Start'}
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
        {aiTips && (
          <div className="planner-recommendations">
            <h4>AI Tips</h4>
            <pre className="planner-ai-tips">{aiTips}</pre>
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
                onChange={(event) => setForm((prev) => ({ ...prev, estimated_minutes: Number(event.target.value) }))}
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

