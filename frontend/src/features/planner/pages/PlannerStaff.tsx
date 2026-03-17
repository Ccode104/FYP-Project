import { useEffect, useMemo, useState } from 'react';
import '../styles/Planner.css';
import { useToast } from '../../../components/ToastProvider';
import {
  deletePlannerTask,
  fetchPlannerRecommendations,
  fetchPlannerTasks,
  generateAdminPlanner,
  generateTAPlanner,
  generateTeacherPlanner,
  reorderPlannerTasks,
  updatePlannerTask,
  type PlannerTask,
} from '../api/planner';
import { useAuth } from '../../../context/AuthContext';

type Role = 'teacher' | 'ta' | 'admin';

export default function PlannerStaff() {
  const { user } = useAuth();
  const role = (user?.role || 'teacher') as Role;
  const { push } = useToast();
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Array<{ best_hours: string[]; reason: string }>>([]);
  const [aiTips, setAiTips] = useState<string | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);

  const loadPlanner = async () => {
    try {
      setLoading(true);
      const [taskData, recData] = await Promise.all([fetchPlannerTasks(), fetchPlannerRecommendations()]);
      setTasks(taskData.tasks || []);
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

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((task) => task.status === 'done').length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const response =
        role === 'teacher' ? await generateTeacherPlanner() : role === 'ta' ? await generateTAPlanner() : await generateAdminPlanner();
      setTasks(response.tasks || []);
      setAiTips(response.aiTips || null);
      push({ kind: 'success', message: 'Planner generated' });
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to generate plan' });
    } finally {
      setLoading(false);
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
    const list = [...tasks];
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

  const headerCopy = {
    teacher: {
      title: 'Teacher Planner',
      subtitle: 'Track grading windows, lecture prep, and evaluation flow.',
    },
    ta: {
      title: 'TA Planner',
      subtitle: 'Stay on top of grading queues and session coverage.',
    },
    admin: {
      title: 'Admin Planner',
      subtitle: 'Coordinate platform priorities, tickets, and rollout timelines.',
    },
  }[role];

  return (
    <div className="container container-wide planner-page">
      <div className="planner-header">
        <div>
          <h1 className="planner-title">{headerCopy.title}</h1>
          <p className="planner-subtitle">{headerCopy.subtitle}</p>
        </div>
        <div className="planner-actions">
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
        </section>

        <section className="planner-panel planner-reminders">
          <h3>Best Focus Windows</h3>
          {recommendations.length === 0 ? (
            <p className="muted">We will learn your best hours from activity.</p>
          ) : (
            <ul className="reminder-list">
              {recommendations.map((rec, idx) => (
                <li key={idx}>
                  <strong>{rec.best_hours.join(', ')}</strong>
                  <span>{rec.reason}</span>
                </li>
              ))}
            </ul>
          )}
          {aiTips && (
            <div className="planner-recommendations">
              <h4>AI Tips</h4>
              <pre className="planner-ai-tips">{aiTips}</pre>
            </div>
          )}
        </section>
      </div>

      <section className="planner-panel planner-tasks">
        <div className="planner-task-header">
          <h3>Your Plan</h3>
        </div>

        {loading ? (
          <p className="muted">Loading planner...</p>
        ) : tasks.length === 0 ? (
          <p className="muted">No tasks yet. Generate a plan to get started.</p>
        ) : (
          <div className="planner-task-list">
            {tasks.map((task) => (
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
                    <span>{task.estimated_minutes || 30} min</span>
                    <span>{task.difficulty || 'medium'}</span>
                    <span>{task.due_at ? new Date(task.due_at).toLocaleString('en-US') : 'No due date'}</span>
                  </div>
                </div>
                <div className="task-actions">
                  <button className="btn btn-ghost" onClick={() => handleDelete(task.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

