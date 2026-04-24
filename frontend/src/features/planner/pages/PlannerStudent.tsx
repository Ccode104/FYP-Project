import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/ToastProvider';
import { useAuth } from '../../../hooks/useAuth';
import {
  createPlannerTask,
  deletePlannerTask,
  fetchPlannerPreferences,
  fetchPlannerRecommendations,
  fetchPlannerTasks,
  logPlannerTaskTime,
  reorderPlannerTasks,
  reschedulePlanner,
  updatePlannerPreferences,
  updatePlannerTask,
  generatePlanner,
  type PlannerPreferences,
  type PlannerTask,
} from '../api/planner';
import {
  buildPlannerWeek,
  formatDateOnly,
  formatDateTime,
  isSystemTask,
  matchesPlannerWindow,
  normalizePlannerDateValue,
  plannerBoardColumns,
  priorityTone,
  relativeDueLabel,
  type PlannerLayoutMode,
  type PlannerSourceFilter,
  type PlannerStatusFilter,
  type PlannerViewMode,
} from '../plannerHelpers';
import '../styles/Planner.css';

const difficultyOptions = ['easy', 'medium', 'hard'];
const categoryOptions = ['assignment', 'quiz', 'lecture', 'self-study', 'custom'];
const priorityOptions = ['low', 'medium', 'high'];

export default function PlannerStudent() {
  const { push } = useToast();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [preferences, setPreferences] = useState<PlannerPreferences | null>(null);
  const [recommendations, setRecommendations] = useState<Array<{ best_hours: string[]; reason: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<PlannerLayoutMode>('list');
  const [view, setView] = useState<PlannerViewMode>('weekly');
  const [statusFilter, setStatusFilter] = useState<PlannerStatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<PlannerSourceFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [anchorDate, setAnchorDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [boardDragId, setBoardDragId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [showDismissedReminders, setShowDismissedReminders] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
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
  const [detailDraft, setDetailDraft] = useState({
    title: '',
    description: '',
    category: 'custom',
    priority: 'medium',
    due_at: '',
    scheduled_for: '',
  });

  const deferredSearch = useDeferredValue(search);
  const pinKey = user?.id ? `planner:pins:${user.id}` : 'planner:pins:anonymous';

  const loadPlanner = useCallback(async () => {
    try {
      setLoading(true);
      const [taskData, preferenceData, recommendationData] = await Promise.all([
        fetchPlannerTasks(),
        fetchPlannerPreferences(),
        fetchPlannerRecommendations(),
      ]);
      setTasks(taskData.tasks || []);
      setPreferences(preferenceData);
      setRecommendations(recommendationData.recommendations || []);
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to load planner' });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void loadPlanner();
  }, [loadPlanner]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(pinKey);
      const parsed = saved ? (JSON.parse(saved) as number[]) : [];
      setPinnedIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setPinnedIds([]);
    }
  }, [pinKey]);

  useEffect(() => {
    window.localStorage.setItem(pinKey, JSON.stringify(pinnedIds));
  }, [pinKey, pinnedIds]);

  const filteredTasks = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return tasks.filter((task) => {
      if (statusFilter !== 'all' && (task.status || 'pending') !== statusFilter) return false;
      if (statusFilter !== 'done' && !matchesPlannerWindow(task, view, anchorDate)) return false;
      if (priorityFilter !== 'all' && (task.priority || 'medium') !== priorityFilter) return false;
      if (sourceFilter === 'system' && !isSystemTask(task)) return false;
      if (sourceFilter === 'manual' && isSystemTask(task)) return false;

      if (!query) return true;
      const haystack = [
        task.title,
        task.description,
        task.category,
        task.priority,
        task.source_type,
        task.scheduled_block,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [anchorDate, deferredSearch, priorityFilter, sourceFilter, statusFilter, tasks, view]);

  const selectedTask =
    filteredTasks.find((task) => task.id === selectedTaskId) ||
    tasks.find((task) => task.id === selectedTaskId) ||
    null;

  useEffect(() => {
    if (selectedTask) {
      setDetailDraft({
        title: selectedTask.title,
        description: selectedTask.description || '',
        category: selectedTask.category || 'custom',
        priority: selectedTask.priority || 'medium',
        due_at: selectedTask.due_at ? new Date(selectedTask.due_at).toISOString().slice(0, 16) : '',
        scheduled_for: normalizePlannerDateValue(selectedTask.scheduled_for) || '',
      });
      return;
    }

    if (filteredTasks.length > 0) {
      setSelectedTaskId(filteredTasks[0].id);
    }
  }, [filteredTasks, selectedTask]);

  const reminders = useMemo(() => {
    const now = new Date();
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 2);

    return tasks
      .filter((task) => {
        if (!task.due_at || task.status === 'done') return false;
        if (task.reminder_dismissed_until) {
          const until = new Date(task.reminder_dismissed_until);
          if (!Number.isNaN(until.getTime()) && until > now) return false;
        }
        const due = new Date(task.due_at);
        return due >= now && due <= soon;
      })
      .sort((a, b) => new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime())
      .slice(0, 5);
  }, [tasks]);

  const dismissedReminders = useMemo(() => {
    const now = new Date();
    return tasks.filter((task) => {
      if (!task.reminder_dismissed_until || task.status === 'done') return false;
      const until = new Date(task.reminder_dismissed_until);
      return !Number.isNaN(until.getTime()) && until > now;
    });
  }, [tasks]);

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter((task) => task.status === 'done').length / tasks.length) * 100);
  }, [tasks]);

  const pinnedTasks = useMemo(() => {
    return tasks.filter((task) => pinnedIds.includes(task.id)).slice(0, 4);
  }, [pinnedIds, tasks]);

  const groupedSections = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const activeTasks = filteredTasks.filter((task) => task.status !== 'done');
    const completedTasks = filteredTasks.filter((task) => task.status === 'done');

    if (statusFilter === 'done') {
      return [{ key: 'completed', label: 'Completed', tone: 'success', tasks: completedTasks }];
    }

    return [
      {
        key: 'overdue',
        label: 'Overdue Tasks',
        tone: 'danger',
        tasks: activeTasks.filter((task) => !!task.due_at && new Date(task.due_at) < now),
      },
      {
        key: 'today',
        label: 'Due Today',
        tone: 'primary',
        tasks: activeTasks.filter((task) => !!task.due_at && new Date(task.due_at).toDateString() === now.toDateString()),
      },
      {
        key: 'week',
        label: 'This Week',
        tone: 'neutral',
        tasks: activeTasks.filter((task) => {
          if (!task.due_at) return false;
          const due = new Date(task.due_at);
          return due >= today && due <= weekEnd && due.toDateString() !== now.toDateString();
        }),
      },
      {
        key: 'upcoming',
        label: 'Upcoming',
        tone: 'neutral',
        tasks: activeTasks.filter((task) => {
          if (!task.due_at) return true;
          return new Date(task.due_at) > weekEnd;
        }),
      },
    ].filter((section) => section.tasks.length > 0);
  }, [filteredTasks, statusFilter]);

  const boardGroups = useMemo(() => {
    const groups = new Map<PlannerTask['status'], PlannerTask[]>();
    plannerBoardColumns.forEach((column) => groups.set(column.id, []));

    filteredTasks.forEach((task) => {
      const key = task.status || 'pending';
      const existing = groups.get(key) || [];
      existing.push(task);
      groups.set(key, existing);
    });

    groups.forEach((group, key) => {
      group.sort((a, b) => {
        const aPinned = pinnedIds.includes(a.id) ? 1 : 0;
        const bPinned = pinnedIds.includes(b.id) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return (a.order_index || 0) - (b.order_index || 0);
      });
      groups.set(key, group);
    });

    return groups;
  }, [filteredTasks, pinnedIds]);

  const plannerWeek = useMemo(() => buildPlannerWeek(anchorDate), [anchorDate]);

  const tasksByDay = useMemo(() => {
    const grouped = new Map<string, PlannerTask[]>();
    filteredTasks.forEach((task) => {
      const key =
        normalizePlannerDateValue(task.scheduled_for) ||
        (task.due_at ? task.due_at.slice(0, 10) : 'unscheduled');
      const next = grouped.get(key) || [];
      next.push(task);
      grouped.set(key, next);
    });
    return grouped;
  }, [filteredTasks]);

  const activeFilters = [
    statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter.replace('_', ' ')}` } : null,
    priorityFilter !== 'all' ? { key: 'priority', label: `Priority: ${priorityFilter}` } : null,
    sourceFilter !== 'all' ? { key: 'source', label: sourceFilter === 'system' ? 'System tasks' : 'Custom tasks' } : null,
    search.trim() ? { key: 'search', label: `Search: ${search.trim()}` } : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  const detailDirty =
    !!selectedTask &&
    (
      detailDraft.title !== selectedTask.title ||
      detailDraft.description !== (selectedTask.description || '') ||
      detailDraft.category !== (selectedTask.category || 'custom') ||
      detailDraft.priority !== (selectedTask.priority || 'medium') ||
      detailDraft.scheduled_for !== (selectedTask.scheduled_for || '') ||
      detailDraft.due_at !== (selectedTask.due_at ? new Date(selectedTask.due_at).toISOString().slice(0, 16) : '')
    );

  const clearFilter = (key: string) => {
    if (key === 'status') setStatusFilter('all');
    if (key === 'priority') setPriorityFilter('all');
    if (key === 'source') setSourceFilter('all');
    if (key === 'search') setSearch('');
  };

  const togglePin = (taskId: number) => {
    setPinnedIds((current) => (current.includes(taskId) ? current.filter((id) => id !== taskId) : [taskId, ...current]));
  };

  const setReminderDismissUntil = async (task: PlannerTask, until: Date | null) => {
    try {
      const response = await updatePlannerTask(task.id, {
        reminder_dismissed_until: until ? until.toISOString() : null,
      });
      setTasks((current) => current.map((item) => (item.id === task.id ? response.task : item)));
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to update reminder' });
    }
  };

  const refreshGeneratedTasks = async () => {
    try {
      setLoading(true);
      const response = await generatePlanner();
      setTasks(response.tasks || []);
      push({ kind: 'success', message: 'Planner refreshed' });
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to refresh planner' });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (task: PlannerTask, status: PlannerTask['status']) => {
    try {
      const response = await updatePlannerTask(task.id, { status });
      setTasks((current) => current.map((item) => (item.id === task.id ? response.task : item)));
      setSelectedTaskId(task.id);
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to update task status' });
    }
  };

  const createTask = async () => {
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
        category: form.category,
        priority: form.priority,
        scheduled_for: form.scheduled_for || (form.due_at ? new Date(form.due_at).toISOString().slice(0, 10) : null),
      });
      setTasks((current) => [response.task, ...current]);
      setSelectedTaskId(response.task.id);
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
      push({ kind: 'success', message: 'Task created' });
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to create task' });
    }
  };

  const deleteTask = async (task: PlannerTask) => {
    if (isSystemTask(task)) {
      push({ kind: 'error', message: 'System tasks cannot be deleted' });
      return;
    }

    try {
      await deletePlannerTask(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setPinnedIds((current) => current.filter((id) => id !== task.id));
      if (selectedTaskId === task.id) setSelectedTaskId(null);
      push({ kind: 'success', message: 'Task removed' });
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to delete task' });
    }
  };

  const reorderVisibleTasks = async (targetId: number) => {
    if (dragId === null || dragId === targetId) return;

    const visible = [...filteredTasks];
    const dragIndex = visible.findIndex((task) => task.id === dragId);
    const targetIndex = visible.findIndex((task) => task.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;

    const reordered = [...visible];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const baseOrder = Math.min(
      ...reordered.map((task) => task.order_index ?? 0),
      0,
    );

    setTasks((current) =>
      current.map((task) => {
        const index = reordered.findIndex((item) => item.id === task.id);
        if (index === -1) return task;
        return { ...task, order_index: baseOrder + index };
      }),
    );
    setDragId(null);

    try {
      await reorderPlannerTasks(reordered.map((task, index) => ({ id: task.id, order_index: baseOrder + index })));
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to reorder tasks' });
    }
  };

  const dropBoardTask = async (status: PlannerTask['status']) => {
    if (boardDragId === null) return;
    const task = tasks.find((item) => item.id === boardDragId);
    setBoardDragId(null);
    if (!task || task.status === status) return;
    await updateStatus(task, status);
  };

  const saveTaskDetails = async () => {
    if (!selectedTask) return;
    if (!detailDraft.title.trim() && !isSystemTask(selectedTask)) {
      push({ kind: 'error', message: 'Title is required' });
      return;
    }

    const payload: Partial<PlannerTask> = isSystemTask(selectedTask)
      ? {
          priority: detailDraft.priority,
          scheduled_for: detailDraft.scheduled_for || null,
        }
      : {
          title: detailDraft.title,
          description: detailDraft.description,
          category: detailDraft.category,
          priority: detailDraft.priority,
          due_at: detailDraft.due_at ? new Date(detailDraft.due_at).toISOString() : null,
          scheduled_for: detailDraft.scheduled_for || null,
        };

    try {
      setSavingTask(true);
      const response = await updatePlannerTask(selectedTask.id, payload);
      setTasks((current) => current.map((item) => (item.id === selectedTask.id ? response.task : item)));
      push({ kind: 'success', message: 'Task updated' });
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to save task' });
    } finally {
      setSavingTask(false);
    }
  };

  const updatePreferences = async (changes: Partial<PlannerPreferences>) => {
    if (!preferences) return;
    const next = { ...preferences, ...changes };
    setPreferences(next);
    try {
      await updatePlannerPreferences(next);
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to save preferences' });
    }
  };

  const runReschedule = async () => {
    try {
      setLoading(true);
      const response = await reschedulePlanner();
      setTasks(response.tasks || []);
      push({ kind: 'success', message: 'Planner rescheduled' });
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to reschedule planner' });
    } finally {
      setLoading(false);
    }
  };

  const logTime = async (taskId: number, minutes: number) => {
    try {
      const response = await logPlannerTaskTime(taskId, { minutes });
      setTasks((current) => current.map((item) => (item.id === taskId ? response.task : item)));
      push({ kind: 'success', message: `Logged ${minutes} minutes` });
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to log time' });
    }
  };

  const completedCount = tasks.filter((task) => task.status === 'done').length;

  return (
    <div className="planner-shell">
      <div className="planner-canvas">
        <section className="planner-topbar">
          <div>
            <div className="planner-overline">Scholaris Planner</div>
            <h1 className="planner-title">Academic Planner</h1>
            <p className="planner-subtitle">
              Manage your coursework timeline, personal tasks, and study schedule{user?.name ? ` for ${user.name}` : ''}.
            </p>
          </div>
          <div className="planner-topbar-actions">
            <button className="btn btn-secondary" onClick={() => setShowModal(true)}>
              Add Task
            </button>
            <button className="btn btn-primary" onClick={refreshGeneratedTasks} disabled={loading}>
              Refresh Coursework
            </button>
            <button className="btn btn-outline" onClick={runReschedule} disabled={loading}>
              Auto-Reschedule
            </button>
          </div>
        </section>

        <section className="planner-control-card">
          <div className="planner-control-header">
            <div className="planner-view-switch">
              <button className={layout === 'list' ? 'active' : ''} onClick={() => setLayout('list')}>
                List
              </button>
              <button className={layout === 'board' ? 'active' : ''} onClick={() => setLayout('board')}>
                Kanban
              </button>
              <button className={layout === 'calendar' ? 'active' : ''} onClick={() => setLayout('calendar')}>
                Calendar
              </button>
            </div>
          </div>

          <div className="planner-filter-grid">
            <label className="planner-search-box">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks..."
              />
            </label>

            <div className="planner-pill-switch">
              <button className={view === 'daily' ? 'active' : ''} onClick={() => setView('daily')}>
                Daily
              </button>
              <button className={view === 'weekly' ? 'active' : ''} onClick={() => setView('weekly')}>
                Weekly
              </button>
              <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>
                All
              </button>
            </div>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as PlannerStatusFilter)}>
              <option value="all">All statuses</option>
              <option value="pending">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as 'all' | 'low' | 'medium' | 'high')}
            >
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as PlannerSourceFilter)}>
              <option value="all">All sources</option>
              <option value="system">System tasks</option>
              <option value="manual">Custom tasks</option>
            </select>

            {view !== 'all' ? (
              <input type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} />
            ) : (
              <div className="planner-preference-pair">
                <input
                  type="number"
                  min={30}
                  max={600}
                  value={preferences?.daily_minutes ?? 120}
                  onChange={(event) => updatePreferences({ daily_minutes: Number(event.target.value) })}
                />
                <select
                  value={preferences?.preferred_hours ?? 'morning'}
                  onChange={(event) => updatePreferences({ preferred_hours: event.target.value })}
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="late-night">Late Night</option>
                </select>
              </div>
            )}
          </div>

          {activeFilters.length > 0 ? (
            <div className="planner-active-chip-row">
              <span className="planner-filter-prefix">Filters:</span>
              {activeFilters.map((chip) => (
                <button key={chip.key} className="planner-chip" onClick={() => clearFilter(chip.key)}>
                  {chip.label}
                  <span>close</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div className="planner-layout">
          <main className="planner-main-stage">
            {loading ? (
              <div className="planner-state-card">
                <h3>Loading planner</h3>
                <p>Pulling assignments, deadlines, and reminders into your workspace.</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="planner-state-card">
                <h3>No tasks found</h3>
                <p>Try widening the view, clearing filters, or add a custom task to start planning.</p>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                  Add your first task
                </button>
              </div>
            ) : layout === 'list' ? (
              <div className="planner-list-stage">
                {groupedSections.map((section) => (
                  <section key={section.key} className="planner-group">
                    <div className="planner-group-header">
                      <div className="planner-group-title">
                        <span className={`planner-group-bar ${section.tone}`} />
                        <h2>{section.label}</h2>
                      </div>
                      <span className={`planner-count ${section.tone}`}>{section.tasks.length}</span>
                    </div>

                    <div className="planner-task-stack">
                      {section.tasks.map((task) => (
                        <article
                          key={task.id}
                          className={`planner-task-row ${selectedTaskId === task.id ? 'selected' : ''}`}
                          draggable
                          onClick={() => setSelectedTaskId(task.id)}
                          onDragStart={() => setDragId(task.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => void reorderVisibleTasks(task.id)}
                        >
                          <label className="planner-task-check" onClick={(event) => event.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={task.status === 'done'}
                              onChange={(event) => void updateStatus(task, event.target.checked ? 'done' : 'pending')}
                            />
                          </label>

                          <div className="planner-task-copy">
                            <div className="planner-task-title-row">
                              <h3>{task.title}</h3>
                              <div className="planner-inline-badges">
                                {isSystemTask(task) ? <span className="planner-inline-badge">System</span> : null}
                                {pinnedIds.includes(task.id) ? <span className="planner-inline-badge">Pinned</span> : null}
                              </div>
                            </div>
                            <div className="planner-task-meta">
                              <span>{relativeDueLabel(task)}</span>
                              <span>{task.category || 'custom'}</span>
                              <span>{formatDateOnly(task.scheduled_for)}</span>
                              <span>{task.estimated_minutes || 90} min</span>
                            </div>
                          </div>

                          <div className="planner-task-side">
                            <span className={`planner-priority-badge ${priorityTone(task.priority)}`}>
                              {task.priority || 'medium'} priority
                            </span>
                            <div className="planner-task-actions">
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  togglePin(task.id);
                                }}
                              >
                                {pinnedIds.includes(task.id) ? 'Unpin' : 'Pin'}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void logTime(task.id, 15);
                                }}
                              >
                                +15m
                              </button>
                              {!isSystemTask(task) ? (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void deleteTask(task);
                                  }}
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : layout === 'board' ? (
              <div className="planner-board-stage">
                {plannerBoardColumns.map((column) => (
                  <section
                    key={column.id}
                    className={`planner-board-lane ${column.id === 'done' ? 'completed' : ''}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => void dropBoardTask(column.id)}
                  >
                    <div className="planner-board-lane-header">
                      <div className="planner-board-lane-title">
                        <span className={`planner-lane-dot ${column.id}`} />
                        <h3>{column.label}</h3>
                      </div>
                      <span>{boardGroups.get(column.id)?.length ?? 0}</span>
                    </div>

                    <div className="planner-board-card-stack">
                      {(boardGroups.get(column.id) || []).length === 0 ? (
                        <div className="planner-board-empty">No tasks in this lane</div>
                      ) : (
                        (boardGroups.get(column.id) || []).map((task) => (
                          <article
                            key={task.id}
                            className={`planner-board-card ${selectedTaskId === task.id ? 'selected' : ''}`}
                            draggable
                            onClick={() => setSelectedTaskId(task.id)}
                            onDragStart={() => setBoardDragId(task.id)}
                          >
                            <div className="planner-board-card-top">
                              <span className={`planner-priority-badge ${priorityTone(task.priority)}`}>
                                {task.priority || 'medium'}
                              </span>
                              {isSystemTask(task) ? <span className="planner-inline-badge">System</span> : null}
                            </div>
                            <h4>{task.title}</h4>
                            {task.description ? <p>{task.description}</p> : null}
                            <div className="planner-board-card-meta">
                              <span>{task.category || 'custom'}</span>
                              <span>{relativeDueLabel(task)}</span>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="planner-calendar-stage">
                <div className="planner-calendar-grid">
                  {plannerWeek.map((date) => {
                    const dayKey = date.toISOString().slice(0, 10);
                    const dayTasks = tasksByDay.get(dayKey) || [];
                    return (
                      <article key={dayKey} className="planner-calendar-cell">
                        <div className="planner-calendar-cell-header">
                          <div>
                            <strong>{date.toLocaleDateString('en-US', { weekday: 'short' })}</strong>
                            <p>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>
                          <span className="planner-count neutral">{dayTasks.length}</span>
                        </div>

                        <div className="planner-calendar-task-list">
                          {dayTasks.length === 0 ? (
                            <div className="planner-calendar-empty">No tasks scheduled</div>
                          ) : (
                            dayTasks.map((task) => (
                              <button
                                key={task.id}
                                className={`planner-calendar-task ${selectedTaskId === task.id ? 'selected' : ''}`}
                                onClick={() => setSelectedTaskId(task.id)}
                              >
                                <span className={`planner-calendar-accent ${priorityTone(task.priority)}`} />
                                <div>
                                  <strong>{task.title}</strong>
                                  <span>{task.scheduled_block || relativeDueLabel(task)}</span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            <section className="planner-rail-card planner-detail-panel">
              <div className="planner-rail-header">
                <span>Task Details</span>
                {selectedTask ? <strong>#{selectedTask.id}</strong> : null}
              </div>
              {!selectedTask ? (
                <p className="muted">Select a task from the planner to inspect and edit it here.</p>
              ) : (
                <div className="planner-detail-form">
                  <div className="planner-detail-badges">
                    <span className={`planner-priority-badge ${priorityTone(selectedTask.priority)}`}>
                      {selectedTask.priority || 'medium'} priority
                    </span>
                    <span className="planner-inline-badge">{isSystemTask(selectedTask) ? 'System task' : 'Custom task'}</span>
                  </div>

                  <label>
                    Title
                    <input
                      type="text"
                      value={detailDraft.title}
                      disabled={isSystemTask(selectedTask)}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>

                  <label>
                    Description
                    <textarea
                      value={detailDraft.description}
                      disabled={isSystemTask(selectedTask)}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, description: event.target.value }))}
                    />
                  </label>

                  <div className="planner-detail-grid">
                    <label>
                      Category
                      <select
                        value={detailDraft.category}
                        disabled={isSystemTask(selectedTask)}
                        onChange={(event) => setDetailDraft((current) => ({ ...current, category: event.target.value }))}
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
                        value={detailDraft.priority}
                        onChange={(event) => setDetailDraft((current) => ({ ...current, priority: event.target.value }))}
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
                        value={detailDraft.due_at}
                        disabled={isSystemTask(selectedTask)}
                        onChange={(event) => setDetailDraft((current) => ({ ...current, due_at: event.target.value }))}
                      />
                    </label>

                    <label>
                      Scheduled for
                      <input
                        type="date"
                        value={detailDraft.scheduled_for}
                        onChange={(event) => setDetailDraft((current) => ({ ...current, scheduled_for: event.target.value }))}
                      />
                    </label>
                  </div>

                  <div className="planner-detail-meta-grid">
                    <div>
                      <span>Source</span>
                      <strong>{selectedTask.source_type}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>{selectedTask.status || 'pending'}</strong>
                    </div>
                    <div>
                      <span>Estimate</span>
                      <strong>{selectedTask.estimated_minutes || 90} min</strong>
                    </div>
                    <div>
                      <span>Logged</span>
                      <strong>{selectedTask.time_spent_minutes || 0} min</strong>
                    </div>
                  </div>

                  <div className="planner-detail-actions">
                    <button className="btn btn-ghost" onClick={() => togglePin(selectedTask.id)}>
                      {pinnedIds.includes(selectedTask.id) ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() =>
                        void updateStatus(
                          selectedTask,
                          selectedTask.status === 'done'
                            ? 'pending'
                            : selectedTask.status === 'in_progress'
                              ? 'done'
                              : 'in_progress',
                        )
                      }
                    >
                      {selectedTask.status === 'done'
                        ? 'Reopen'
                        : selectedTask.status === 'in_progress'
                          ? 'Complete'
                          : 'Start'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => void logTime(selectedTask.id, 30)}>
                      Log 30m
                    </button>
                    {!isSystemTask(selectedTask) ? (
                      <button className="btn btn-ghost" onClick={() => void deleteTask(selectedTask)}>
                        Delete
                      </button>
                    ) : null}
                  </div>

                  {isSystemTask(selectedTask) ? (
                    <p className="planner-system-note">
                      This is a system-owned task. Core source fields stay locked so planner refreshes can update it safely.
                    </p>
                  ) : null}

                  <button className="btn btn-primary planner-detail-save" disabled={!detailDirty || savingTask} onClick={() => void saveTaskDetails()}>
                    {savingTask ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </section>
          </main>

          <aside className="planner-right-rail">
            <section className="planner-rail-card">
              <div className="planner-rail-header">
                <span>Weekly Progress</span>
                <strong>{progress}%</strong>
              </div>
              <div className="planner-progress-bar">
                <div className="planner-progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <p>{completedCount} of {tasks.length} tasks completed</p>
            </section>

            <section className="planner-rail-card">
              <div className="planner-rail-header">
                <span>Pinned Projects</span>
              </div>
              {pinnedTasks.length === 0 ? (
                <p className="muted">Pin a task to keep it here.</p>
              ) : (
                <div className="planner-rail-stack">
                  {pinnedTasks.map((task) => (
                    <button key={task.id} className="planner-rail-item" onClick={() => setSelectedTaskId(task.id)}>
                      <strong>{task.title}</strong>
                      <span>{relativeDueLabel(task)}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="planner-rail-card">
              <div className="planner-rail-header">
                <span>Upcoming Reminders</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowDismissedReminders((value) => !value)}>
                  {showDismissedReminders ? 'Hide' : `Dismissed (${dismissedReminders.length})`}
                </button>
              </div>
              {reminders.length === 0 ? (
                <p className="muted">No urgent reminders in the next 48 hours.</p>
              ) : (
                <div className="planner-rail-stack">
                  {reminders.map((task) => (
                    <div key={task.id} className="planner-reminder-row">
                      <button className="planner-rail-item" onClick={() => setSelectedTaskId(task.id)}>
                        <strong>{task.title}</strong>
                        <span>{formatDateTime(task.due_at)}</span>
                      </button>
                      <div className="planner-reminder-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => void updateStatus(task, 'done')}>
                          Done
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => void setReminderDismissUntil(task, new Date(Date.now() + 6 * 60 * 60 * 1000))}
                        >
                          Snooze
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showDismissedReminders && dismissedReminders.length > 0 ? (
                <div className="planner-dismissed-list">
                  {dismissedReminders.map((task) => (
                    <div key={task.id} className="planner-dismissed-item">
                      <div>
                        <strong>{task.title}</strong>
                        <span>{formatDateTime(task.reminder_dismissed_until, 'Hidden')}</span>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => void setReminderDismissUntil(task, null)}>
                        Undo
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {recommendations.length > 0 ? (
              <section className="planner-rail-card">
                <div className="planner-rail-header">
                  <span>Recommended Focus Windows</span>
                </div>
                {recommendations.map((recommendation, index) => (
                  <div key={index} className="planner-insight-copy">
                    <strong>{recommendation.best_hours.join(', ')}</strong>
                    <p>{recommendation.reason}</p>
                  </div>
                ))}
              </section>
            ) : null}
          </aside>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Planner Task"
        actions={
          <>
            <button className="btn" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => void createTask()}>
              Create
            </button>
          </>
        }
      >
        <div className="planner-modal-form">
          <label>
            Title
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <div className="planner-modal-grid">
            <label>
              Category
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
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
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
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
                onChange={(event) => setForm((current) => ({ ...current, due_at: event.target.value }))}
              />
            </label>

            <label>
              Scheduled for
              <input
                type="date"
                value={form.scheduled_for}
                onChange={(event) => setForm((current) => ({ ...current, scheduled_for: event.target.value }))}
              />
            </label>

            <label>
              Estimate
              <input
                type="number"
                min={15}
                step={15}
                value={form.estimated_minutes}
                onChange={(event) => setForm((current) => ({ ...current, estimated_minutes: Number(event.target.value) }))}
              />
            </label>

            <label>
              Difficulty
              <select
                value={form.difficulty}
                onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}
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
