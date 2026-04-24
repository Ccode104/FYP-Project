import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../components/ToastProvider';
import { useAuth } from '../../../context/AuthContext';
import {
  deletePlannerTask,
  fetchPlannerRecommendations,
  fetchPlannerTasks,
  generateAdminPlanner,
  generateTAPlanner,
  generateTeacherPlanner,
  logPlannerTaskTime,
  updatePlannerTask,
  type PlannerTask,
} from '../api/planner';
import {
  buildPlannerWeek,
  formatDateTime,
  isSystemTask,
  normalizePlannerDateValue,
  plannerBoardColumns,
  priorityTone,
  relativeDueLabel,
  type PlannerLayoutMode,
  type PlannerStatusFilter,
} from '../plannerHelpers';
import '../styles/Planner.css';

type Role = 'teacher' | 'ta' | 'admin';

export default function PlannerStaff() {
  const { user } = useAuth();
  const role = (user?.role || 'teacher') as Role;
  const { push } = useToast();

  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [recommendations, setRecommendations] = useState<Array<{ best_hours: string[]; reason: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<PlannerLayoutMode>('board');
  const [statusFilter, setStatusFilter] = useState<PlannerStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [boardDragId, setBoardDragId] = useState<number | null>(null);

  const deferredSearch = useDeferredValue(search);
  const plannerWeek = useMemo(() => buildPlannerWeek(new Date().toISOString().slice(0, 10)), []);

  const headerCopy = {
    teacher: {
      overline: 'Faculty Portal',
      title: 'Workflow Planner',
      subtitle: 'Track grading, lecture preparation, and academic administration.',
    },
    ta: {
      overline: 'TA Portal',
      title: 'Workflow Planner',
      subtitle: 'Stay ahead of grading queues, tutorials, and support sessions.',
    },
    admin: {
      overline: 'Admin Portal',
      title: 'Workflow Planner',
      subtitle: 'Coordinate operational follow-ups, approvals, and institutional tasks.',
    },
  }[role];

  const loadPlanner = useCallback(async () => {
    try {
      setLoading(true);
      const [taskData, recommendationData] = await Promise.all([fetchPlannerTasks(), fetchPlannerRecommendations()]);
      setTasks(taskData.tasks || []);
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
    if (!selectedTaskId && tasks.length > 0) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [selectedTaskId, tasks]);

  const filteredTasks = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return tasks.filter((task) => {
      if (statusFilter !== 'all' && (task.status || 'pending') !== statusFilter) return false;
      if (!query) return true;
      const haystack = [task.title, task.description, task.category, task.priority, task.source_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredSearch, statusFilter, tasks]);

  const selectedTask =
    filteredTasks.find((task) => task.id === selectedTaskId) ||
    tasks.find((task) => task.id === selectedTaskId) ||
    null;

  const boardGroups = useMemo(() => {
    const groups = new Map<PlannerTask['status'], PlannerTask[]>();
    plannerBoardColumns.forEach((column) => groups.set(column.id, []));
    filteredTasks.forEach((task) => {
      const key = task.status || 'pending';
      const existing = groups.get(key) || [];
      existing.push(task);
      groups.set(key, existing);
    });
    return groups;
  }, [filteredTasks]);

  const tasksByDay = useMemo(() => {
    const grouped = new Map<string, PlannerTask[]>();
    filteredTasks.forEach((task) => {
      const key =
        normalizePlannerDateValue(task.scheduled_for) ||
        (task.due_at ? task.due_at.slice(0, 10) : 'unscheduled');
      const existing = grouped.get(key) || [];
      existing.push(task);
      grouped.set(key, existing);
    });
    return grouped;
  }, [filteredTasks]);

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter((task) => task.status === 'done').length / tasks.length) * 100);
  }, [tasks]);

  const generateWorkflow = async () => {
    try {
      setLoading(true);
      const response =
        role === 'teacher' ? await generateTeacherPlanner() : role === 'ta' ? await generateTAPlanner() : await generateAdminPlanner();
      setTasks(response.tasks || []);
      push({ kind: 'success', message: 'Workflow refreshed' });
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to refresh workflow' });
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

  const deleteTask = async (task: PlannerTask) => {
    if (isSystemTask(task)) {
      push({ kind: 'error', message: 'Generated workflow tasks cannot be deleted' });
      return;
    }

    try {
      await deletePlannerTask(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      if (selectedTaskId === task.id) setSelectedTaskId(null);
    } catch (error: unknown) {
      push({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to delete task' });
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

  const dropBoardTask = async (status: PlannerTask['status']) => {
    if (boardDragId === null) return;
    const task = tasks.find((item) => item.id === boardDragId);
    setBoardDragId(null);
    if (!task || task.status === status) return;
    await updateStatus(task, status);
  };

  return (
    <div className="planner-shell">
      <div className="planner-canvas">
        <section className="planner-topbar">
          <div>
            <div className="planner-overline">{headerCopy.overline}</div>
            <h1 className="planner-title">{headerCopy.title}</h1>
            <p className="planner-subtitle">{headerCopy.subtitle}</p>
          </div>
          <div className="planner-topbar-actions">
            <button className="btn btn-primary" onClick={generateWorkflow} disabled={loading}>
              Refresh Workflow
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
                Board
              </button>
              <button className={layout === 'calendar' ? 'active' : ''} onClick={() => setLayout('calendar')}>
                Calendar
              </button>
            </div>
          </div>

          <div className="planner-filter-grid planner-filter-grid-staff">
            <label className="planner-search-box">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search workflow tasks..."
              />
            </label>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as PlannerStatusFilter)}>
              <option value="all">All statuses</option>
              <option value="pending">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Completed</option>
            </select>
          </div>
        </section>

        <div className="planner-layout">
          <main className="planner-main-stage">
            {loading ? (
              <div className="planner-state-card">
                <h3>Loading workflow</h3>
                <p>Gathering staff tasks and recommendations into your workspace.</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="planner-state-card">
                <h3>No workflow tasks found</h3>
                <p>Generate the latest staff workflow to populate this planner.</p>
                <button className="btn btn-primary" onClick={generateWorkflow}>
                  Generate Workflow
                </button>
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
                              {isSystemTask(task) ? <span className="planner-inline-badge">Generated</span> : null}
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
            ) : layout === 'calendar' ? (
              <div className="planner-calendar-stage">
                <div className="planner-calendar-grid">
                  {plannerWeek.map((date) => {
                    const key = date.toISOString().slice(0, 10);
                    const dayTasks = tasksByDay.get(key) || [];
                    return (
                      <article key={key} className="planner-calendar-cell">
                        <div className="planner-calendar-cell-header">
                          <div>
                            <strong>{date.toLocaleDateString('en-US', { weekday: 'short' })}</strong>
                            <p>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>
                          <span className="planner-count neutral">{dayTasks.length}</span>
                        </div>

                        <div className="planner-calendar-task-list">
                          {dayTasks.length === 0 ? (
                            <div className="planner-calendar-empty">No work scheduled</div>
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
            ) : (
              <div className="planner-list-stage">
                <section className="planner-group">
                  <div className="planner-group-header">
                    <div className="planner-group-title">
                      <span className="planner-group-bar primary" />
                      <h2>Workflow Backlog</h2>
                    </div>
                    <span className="planner-count primary">{filteredTasks.length}</span>
                  </div>

                  <div className="planner-task-stack">
                    {filteredTasks.map((task) => (
                      <article
                        key={task.id}
                        className={`planner-task-row ${selectedTaskId === task.id ? 'selected' : ''}`}
                        onClick={() => setSelectedTaskId(task.id)}
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
                            {isSystemTask(task) ? <span className="planner-inline-badge">Generated</span> : null}
                          </div>
                          <div className="planner-task-meta">
                            <span>{relativeDueLabel(task)}</span>
                            <span>{task.category || 'custom'}</span>
                            <span>{task.estimated_minutes || 60} min</span>
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
              </div>
            )}
          </main>

          <aside className="planner-right-rail">
            <section className="planner-rail-card">
              <div className="planner-rail-header">
                <span>Workflow Progress</span>
                <strong>{progress}%</strong>
              </div>
              <div className="planner-progress-bar">
                <div className="planner-progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <p>{tasks.filter((task) => task.status === 'done').length} of {tasks.length} tasks completed</p>
            </section>

            {recommendations.length > 0 ? (
              <section className="planner-rail-card">
                <div className="planner-rail-header">
                  <span>Focus Windows</span>
                </div>
                {recommendations.map((recommendation, index) => (
                  <div key={index} className="planner-insight-copy">
                    <strong>{recommendation.best_hours.join(', ')}</strong>
                    <p>{recommendation.reason}</p>
                  </div>
                ))}
              </section>
            ) : null}

            <section className="planner-rail-card">
              <div className="planner-rail-header">
                <span>Task Details</span>
                {selectedTask ? <strong>#{selectedTask.id}</strong> : null}
              </div>
              {!selectedTask ? (
                <p className="muted">Select a workflow item to inspect it here.</p>
              ) : (
                <div className="planner-detail-form planner-detail-static">
                  <div className="planner-detail-badges">
                    <span className={`planner-priority-badge ${priorityTone(selectedTask.priority)}`}>
                      {selectedTask.priority || 'medium'} priority
                    </span>
                    <span className="planner-inline-badge">{selectedTask.source_type}</span>
                  </div>

                  <h3 className="planner-detail-title">{selectedTask.title}</h3>
                  {selectedTask.description ? <p className="planner-detail-description">{selectedTask.description}</p> : null}

                  <div className="planner-detail-meta-grid">
                    <div>
                      <span>Status</span>
                      <strong>{selectedTask.status || 'pending'}</strong>
                    </div>
                    <div>
                      <span>Due</span>
                      <strong>{formatDateTime(selectedTask.due_at)}</strong>
                    </div>
                    <div>
                      <span>Estimate</span>
                      <strong>{selectedTask.estimated_minutes || 60} min</strong>
                    </div>
                    <div>
                      <span>Logged</span>
                      <strong>{selectedTask.time_spent_minutes || 0} min</strong>
                    </div>
                  </div>

                  <div className="planner-detail-actions">
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
                  </div>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
