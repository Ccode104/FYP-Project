import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { apiFetch } from '../../services/api';
import { fetchPlannerTasks, type PlannerTask } from '../../features/planner/api/planner';
import { getMyProgress, type ProgressRow } from '../../features/progress/api/progress';
import {
  fetchAllGamificationAchievements,
  fetchGamificationAchievements,
  fetchGamificationSummary,
  fetchLeaderboard,
  type GamificationAchievement,
  type GamificationSummaryResponse,
  type LeaderboardResponse,
} from '../../features/gamification/api/gamification';
import './ProgressExperience.css';

type CourseCardData = {
  id: number;
  term?: string;
  section?: string;
  course_code?: string;
  course_title?: string;
  course_description?: string;
  faculty_name?: string;
  pending_assignments?: number;
  pending_quizzes?: number;
  overdue_assignments?: number;
  missed_quizzes?: number;
  completed_assignments?: number;
  completed_quizzes?: number;
  assignment_average?: number | null;
  quiz_average?: number | null;
  unread_notifications?: number;
};

type Timeframe = 'weekly' | 'monthly';

function formatRelativeTime(dateString?: string | null) {
  if (!dateString) return 'No recent activity';
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getCourseCompletion(course: CourseCardData) {
  const completed = (course.completed_assignments || 0) + (course.completed_quizzes || 0);
  const pending = (course.pending_assignments || 0) + (course.pending_quizzes || 0);
  const overdue = (course.overdue_assignments || 0) + (course.missed_quizzes || 0);
  const total = completed + pending + overdue;
  return total > 0 ? clampPercent((completed / total) * 100) : 0;
}

function getAchievementProgress(
  achievement: GamificationAchievement,
  summary: GamificationSummaryResponse | null
) {
  if (!summary) return 0;
  const stats = summary.stats;
  switch (achievement.requirement_type) {
    case 'problems_solved':
      return Number(stats.problems_solved || 0);
    case 'easy_solved':
      return Number(stats.easy_solved || 0);
    case 'medium_solved':
      return Number(stats.medium_solved || 0);
    case 'hard_solved':
      return Number(stats.hard_solved || 0);
    case 'streak':
      return Number(stats.current_streak || 0);
    case 'quizzes_completed':
      return Number(stats.quizzes_completed || 0);
    case 'perfect_quiz_score':
      return Number(stats.perfect_quiz_scores || 0);
    case 'high_quiz_scores':
      return Number(stats.high_quiz_scores || 0);
    case 'quiz_streak':
      return Number(stats.quiz_streak || 0);
    case 'daily_challenge':
      return Number(summary.totals.dailyChallengesCompleted || 0);
    default:
      return 0;
  }
}

function getStatusVariant(status?: string | null) {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('overdue') || normalized.includes('missed')) return 'overdue';
  if (normalized.includes('grade') || normalized.includes('complete')) return 'completed';
  if (normalized.includes('submit')) return 'submitted';
  if (normalized.includes('pending') || normalized.includes('not_attempted')) return 'pending';
  return 'pending';
}

function buildHeatmap(activityDates: string[]) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const dateMap = new Map<string, number>();
  activityDates.forEach(dateString => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return;
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString().slice(0, 10);
    dateMap.set(key, (dateMap.get(key) || 0) + 1);
  });

  const cells: Array<{ key: string; value: number; intensity: number }> = [];
  const start = new Date(end);
  start.setDate(start.getDate() - 181);

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const key = cursor.toISOString().slice(0, 10);
    const value = dateMap.get(key) || 0;
    let intensity = 0;
    if (value >= 4) intensity = 4;
    else if (value === 3) intensity = 3;
    else if (value === 2) intensity = 2;
    else if (value === 1) intensity = 1;

    cells.push({ key, value, intensity });
  }

  return cells;
}

export default function StudentProgress() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();

  const [courses, setCourses] = useState<CourseCardData[]>([]);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [plannerTasks, setPlannerTasks] = useState<PlannerTask[]>([]);
  const [summary, setSummary] = useState<GamificationSummaryResponse | null>(null);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [allAchievements, setAllAchievements] = useState<GamificationAchievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<GamificationAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | 'all'>('all');
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly');

  useEffect(() => {
    let cancelled = false;

    async function loadProgressExperience() {
      setLoading(true);
      setError(null);

      try {
        const [
          courseResponse,
          myProgress,
          planner,
          gamificationSummary,
          leaderboard,
          allAchievementResponse,
          userAchievementResponse,
        ] = await Promise.all([
          apiFetch<{ courses: CourseCardData[] }>('/api/courses/card-data'),
          getMyProgress(),
          fetchPlannerTasks(),
          fetchGamificationSummary(),
          fetchLeaderboard({ type: 'global', limit: 100 }),
          fetchAllGamificationAchievements(),
          fetchGamificationAchievements(),
        ]);

        if (cancelled) return;

        setCourses(courseResponse.courses || []);
        setProgressRows(myProgress.rows || []);
        setPlannerTasks(planner.tasks || []);
        setSummary(gamificationSummary);
        setGlobalLeaderboard(leaderboard);
        setAllAchievements(allAchievementResponse.achievements || []);
        setUserAchievements(userAchievementResponse.achievements || []);
        setSelectedCourseId(courseResponse.courses?.[0]?.id || 'all');
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load progress';
        if (!cancelled) {
          setError(message);
          push({ kind: 'error', message: 'Failed to load the new progress experience' });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProgressExperience();
    return () => {
      cancelled = true;
    };
  }, [push]);

  const selectedCourse = useMemo(
    () => courses.find(course => course.id === selectedCourseId) || courses[0] || null,
    [courses, selectedCourseId]
  );

  const combinedActivityDates = useMemo(() => {
    return [
      ...progressRows
        .map(row => row.submitted_at)
        .filter((value): value is string => Boolean(value)),
      ...plannerTasks
        .map(task => task.completed_at)
        .filter((value): value is string => Boolean(value)),
      ...(summary?.recentTransactions || []).map(transaction => transaction.occurred_at),
    ];
  }, [plannerTasks, progressRows, summary]);

  const heatmapCells = useMemo(() => buildHeatmap(combinedActivityDates), [combinedActivityDates]);

  const weeklyActivity = useMemo(() => {
    const lastDays = timeframe === 'weekly' ? 7 : 30;
    const recentCells = heatmapCells.slice(-lastDays);
    const activeDays = recentCells.filter(cell => cell.value > 0).length;
    const peakCell = recentCells.reduce(
      (best, cell) => (cell.value > best.value ? cell : best),
      recentCells[0] || { key: '', value: 0, intensity: 0 }
    );
    const completedTasks = plannerTasks.filter(task => task.completed_at).length;
    return {
      activeDays,
      totalEvents: recentCells.reduce((sum, cell) => sum + cell.value, 0),
      peakDay:
        peakCell.key && peakCell.value > 0
          ? new Date(peakCell.key).toLocaleDateString('en-US', { weekday: 'long' })
          : 'None yet',
      completedTasks,
    };
  }, [heatmapCells, plannerTasks, timeframe]);

  const unlockedAchievementIds = useMemo(
    () => new Set(userAchievements.map(achievement => achievement.id)),
    [userAchievements]
  );

  const nextAchievement = useMemo(() => {
    return allAchievements
      .filter(achievement => !unlockedAchievementIds.has(achievement.id))
      .map(achievement => {
        const current = getAchievementProgress(achievement, summary);
        return {
          ...achievement,
          current,
          progressPercent: achievement.requirement_value
            ? clampPercent((current / achievement.requirement_value) * 100)
            : 0,
        };
      })
      .sort((a, b) => b.progressPercent - a.progressPercent)[0];
  }, [allAchievements, summary, unlockedAchievementIds]);

  const xpGoal = useMemo(() => {
    const totalXp = summary?.totals.totalXp || 0;
    const level = summary?.stats.level || 1;
    const nextLevelXp = level * 1000;
    return {
      totalXp,
      level,
      nextLevelXp,
      progressPercent: nextLevelXp > 0 ? clampPercent((totalXp / nextLevelXp) * 100) : 0,
    };
  }, [summary]);

  const globalStanding = useMemo(() => {
    if (!globalLeaderboard) {
      return { rank: null, percentile: null, gapToNext: null, userScore: 0 };
    }

    const userScore = globalLeaderboard.currentUserEntry?.score || 0;
    const sorted = [...globalLeaderboard.leaderboard].sort((a, b) => a.rank - b.rank);
    const currentRank = globalLeaderboard.userRank;
    const nextHigher = currentRank
      ? sorted.find(entry => entry.rank === currentRank - 1)
      : sorted[0] || null;

    return {
      rank: currentRank,
      percentile: globalLeaderboard.userPercentile,
      gapToNext:
        nextHigher && userScore
          ? Math.max(Number(nextHigher.score) - Number(userScore), 0)
          : nextHigher
            ? Number(nextHigher.score)
            : null,
      userScore,
    };
  }, [globalLeaderboard]);

  const courseRows = useMemo(
    () =>
      [...courses]
        .map(course => ({
          ...course,
          completion: getCourseCompletion(course),
          activityCount: (course.completed_assignments || 0) + (course.completed_quizzes || 0),
        }))
        .sort((a, b) => b.completion - a.completion),
    [courses]
  );

  const xpSources = summary?.sources.filter(source => source.xp > 0) || [];

  const handleSectionChange = (section: 'overview' | 'academics' | 'leaderboard' | 'achievements') => {
    if (section === 'overview') {
      navigate('/progress');
      return;
    }

    if (section === 'academics') {
      if (selectedCourse?.id) {
        navigate(`/progress/course/${selectedCourse.id}`);
      }
      return;
    }

    const suffix = section === 'achievements' ? '?view=achievements' : '';
    navigate(`/progress/leaderboard${suffix}`);
  };

  return (
    <div className="progress-experience">
      {loading && <div className="progress-page__loading">Loading progress experience...</div>}
      {!loading && error && <div className="progress-page__error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="progress-page__section-head" style={{ marginBottom: '2rem' }}>
            <div>
              <p className="progress-page__eyebrow">Progress Overview</p>
              <h1 className="progress-page__section-title">My Progress</h1>
            </div>
            <div className="progress-page__filter-actions">
              <button className="progress-page__action-button" onClick={() => handleSectionChange('leaderboard')}>
                Leaderboard
              </button>
              <button className="progress-page__ghost-button" onClick={() => handleSectionChange('academics')}>
                Course Drilldown
              </button>
              <button className="progress-page__ghost-button" onClick={() => handleSectionChange('achievements')}>
                Achievements
              </button>
            </div>
          </section>

          <section className="progress-page__grid">
            <article className="progress-page__hero-card progress-page__identity">
              <div className="progress-page__identity-header">
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flex: 1 }}>
                  <div className="progress-page__level-badge">L{xpGoal.level}</div>
                  <div style={{ flex: 1 }}>
                    <div className="progress-page__hero-actions">
                      <div>
                        <h1 className="progress-page__section-title">{user?.name || 'Student'}</h1>
                        <p className="progress-page__muted">
                          {selectedCourse?.course_title || 'Academic progress overview'}
                        </p>
                      </div>
                      <span className="progress-page__status-pill progress-page__status-pill--graded">
                        Top {globalStanding.percentile ? `${100 - globalStanding.percentile + 1}%` : 'Learner'}
                      </span>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <div className="progress-page__metric-row" style={{ justifyContent: 'space-between' }}>
                        <span className="progress-page__eyebrow" style={{ margin: 0 }}>
                          XP Progress
                        </span>
                        <strong>
                          {xpGoal.totalXp.toLocaleString()} / {xpGoal.nextLevelXp.toLocaleString()} XP
                        </strong>
                      </div>
                      <div className="progress-page__progress-track" style={{ marginTop: '0.5rem' }}>
                        <div
                          className="progress-page__progress-fill"
                          style={{ width: `${xpGoal.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="progress-page__stats-grid">
                <div className="progress-page__stat">
                  <div className="progress-page__stat-label">Rank</div>
                  <div className="progress-page__stat-value">
                    {globalStanding.rank ? `#${globalStanding.rank}` : 'Unranked'}
                  </div>
                </div>
                <div className="progress-page__stat">
                  <div className="progress-page__stat-label">Percentile</div>
                  <div className="progress-page__stat-value">
                    {globalStanding.percentile ? `${globalStanding.percentile}th` : 'N/A'}
                  </div>
                </div>
                <div className="progress-page__stat">
                  <div className="progress-page__stat-label">Streak</div>
                  <div className="progress-page__stat-value">
                    {summary?.stats.current_streak || 0} days
                  </div>
                </div>
                <div className="progress-page__stat">
                  <div className="progress-page__stat-label">Longest Streak</div>
                  <div className="progress-page__stat-value">
                    {summary?.stats.longest_streak || 0} days
                  </div>
                </div>
              </div>
            </article>

            <aside className="progress-page__hero-card progress-page__hero-card--accent progress-page__callout">
              <p className="progress-page__eyebrow" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Upcoming Achievement
              </p>
              {nextAchievement ? (
                <>
                  <h2 style={{ margin: '0.25rem 0 0.5rem', fontSize: '1.4rem' }}>{nextAchievement.name}</h2>
                  <p style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>
                    {nextAchievement.description}
                  </p>
                  <div style={{ marginTop: '1.25rem' }}>
                    <div
                      className="progress-page__metric-row"
                      style={{ justifyContent: 'space-between', color: '#fff' }}
                    >
                      <span>
                        {nextAchievement.current} / {nextAchievement.requirement_value}
                      </span>
                      <strong>{nextAchievement.progressPercent}%</strong>
                    </div>
                    <div
                      className="progress-page__progress-track"
                      style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.18)' }}
                    >
                      <div
                        className="progress-page__progress-fill"
                        style={{ width: `${nextAchievement.progressPercent}%`, background: '#fff' }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.82)' }}>All achievements unlocked.</p>
              )}
              <div style={{ marginTop: '1.5rem' }}>
                <button
                  className="progress-page__ghost-button"
                  onClick={() => navigate('/progress/leaderboard?view=achievements')}
                >
                  View Achievements
                </button>
              </div>
            </aside>
          </section>

          <div className="progress-page__filterbar">
            <div className="progress-page__filters">
              <label className="progress-page__search">
                <span className="material-symbols-outlined">search</span>
                <input readOnly value={selectedCourse?.course_title || 'All activity'} />
              </label>
              <select
                className="progress-page__select"
                value={selectedCourseId}
                onChange={event => {
                  const nextValue = event.target.value === 'all' ? 'all' : Number(event.target.value);
                  setSelectedCourseId(nextValue);
                }}
              >
                <option value="all">All Courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} - {course.course_title}
                  </option>
                ))}
              </select>
            </div>

            <div className="progress-page__filter-actions">
              <div className="progress-page__segmented">
                <button
                  className={timeframe === 'weekly' ? 'is-active' : ''}
                  onClick={() => setTimeframe('weekly')}
                >
                  Weekly
                </button>
                <button
                  className={timeframe === 'monthly' ? 'is-active' : ''}
                  onClick={() => setTimeframe('monthly')}
                >
                  Monthly
                </button>
              </div>
              <button className="progress-page__date-button" onClick={() => navigate('/planner')}>
                <span className="material-symbols-outlined">calendar_month</span>
              </button>
            </div>
          </div>

          <section className="progress-page__columns">
            <article className="progress-page__panel">
              <div className="progress-page__section-head">
                <div>
                  <h2 className="progress-page__section-title">Consistency Heatmap</h2>
                  <p className="progress-page__eyebrow">Last 6 Months Activity</p>
                </div>
              </div>

              <div className="progress-page__heatmap">
                <div className="progress-page__heatmap-grid">
                  {heatmapCells.map(cell => (
                    <div
                      key={cell.key}
                      className={`progress-page__heatmap-cell${cell.intensity > 0 ? ` progress-page__heatmap-cell--${cell.intensity}` : ''}`}
                      title={`${cell.key}: ${cell.value} activities`}
                    />
                  ))}
                </div>
              </div>

              <div className="progress-page__stats-grid" style={{ marginTop: '2rem' }}>
                <div className="progress-page__stat">
                  <div className="progress-page__stat-label">
                    {timeframe === 'weekly' ? 'Weekly' : 'Monthly'} Active Days
                  </div>
                  <div className="progress-page__stat-value">{weeklyActivity.activeDays}</div>
                </div>
                <div className="progress-page__stat">
                  <div className="progress-page__stat-label">Peak Day</div>
                  <div className="progress-page__stat-value">{weeklyActivity.peakDay}</div>
                </div>
                <div className="progress-page__stat">
                  <div className="progress-page__stat-label">Activity Events</div>
                  <div className="progress-page__stat-value">{weeklyActivity.totalEvents}</div>
                </div>
                <div className="progress-page__stat">
                  <div className="progress-page__stat-label">Planner Completions</div>
                  <div className="progress-page__stat-value">{weeklyActivity.completedTasks}</div>
                </div>
              </div>
            </article>

            <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <section className="progress-page__panel">
                <div className="progress-page__card-head" style={{ justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0 }}>XP Sources</h3>
                </div>
                {xpSources.length === 0 ? (
                  <div className="progress-page__empty">No XP source data available yet.</div>
                ) : (
                  <div className="progress-page__insight-list">
                    {xpSources.map(source => {
                      const percent = summary?.totals.totalXp
                        ? clampPercent((source.xp / summary.totals.totalXp) * 100)
                        : 0;
                      return (
                        <div key={source.key} className="progress-page__transaction-row">
                          <div style={{ flex: 1 }}>
                            <div
                              className="progress-page__metric-row"
                              style={{ justifyContent: 'space-between' }}
                            >
                              <strong>{source.label}</strong>
                              <strong>{source.xp.toLocaleString()} XP</strong>
                            </div>
                            <div className="progress-page__progress-track" style={{ marginTop: '0.45rem' }}>
                              <div
                                className="progress-page__progress-fill"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="progress-page__panel">
                <div className="progress-page__card-head" style={{ justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0 }}>Recent Transactions</h3>
                </div>
                {summary?.recentTransactions.length ? (
                  <div className="progress-page__transaction-list">
                    {summary.recentTransactions.slice(0, 4).map(transaction => (
                      <div key={transaction.id} className="progress-page__transaction-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className="progress-page__icon-circle">
                            <span className="material-symbols-outlined">
                              {transaction.category === 'achievement'
                                ? 'emoji_events'
                                : transaction.category === 'daily_challenge'
                                  ? 'bolt'
                                  : 'terminal'}
                            </span>
                          </span>
                          <div>
                            <strong>{transaction.title}</strong>
                            <div className="progress-page__muted" style={{ fontSize: '0.78rem' }}>
                              {transaction.context} • {formatRelativeTime(transaction.occurred_at)}
                            </div>
                          </div>
                        </div>
                        <strong>+{transaction.xp_delta} XP</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="progress-page__empty">No recent XP transactions.</div>
                )}
              </section>
            </aside>
          </section>

          <section style={{ marginTop: '3rem' }}>
            <div className="progress-page__section-head">
              <div>
                <h2 className="progress-page__section-title">Peer Insights</h2>
                <p className="progress-page__muted">Based on your current global leaderboard standing.</p>
              </div>
              <button className="progress-page__action-button" onClick={() => navigate('/progress/leaderboard')}>
                View Detailed Report
              </button>
            </div>

            <div className="progress-page__cards-grid">
              <div className="progress-page__panel">
                <div className="progress-page__stat-label">Current Standing</div>
                <div className="progress-page__stat-value">
                  {globalStanding.rank ? `#${globalStanding.rank}` : 'Unranked'}
                </div>
                <p className="progress-page__muted" style={{ marginTop: '0.75rem' }}>
                  {globalStanding.percentile
                    ? `You are ahead of ${globalStanding.percentile}% of ranked learners.`
                    : 'Complete more scored activity to appear in the global leaderboard.'}
                </p>
              </div>

              <div className="progress-page__panel">
                <div className="progress-page__stat-label">XP To Next Rank</div>
                <div className="progress-page__stat-value">
                  {globalStanding.gapToNext !== null ? `${globalStanding.gapToNext} XP` : 'N/A'}
                </div>
                <p className="progress-page__muted" style={{ marginTop: '0.75rem' }}>
                  {globalStanding.gapToNext !== null
                    ? 'Close the gap with one more high-value submission or achievement unlock.'
                    : 'No comparable rank gap available yet.'}
                </p>
              </div>

              <div className="progress-page__panel">
                <div className="progress-page__stat-label">Best Course Momentum</div>
                <div className="progress-page__stat-value">
                  {courseRows[0]?.course_code || 'No courses'}
                </div>
                <p className="progress-page__muted" style={{ marginTop: '0.75rem' }}>
                  {courseRows[0]
                    ? `${courseRows[0].completion}% complete in ${courseRows[0].course_title}.`
                    : 'Enroll in a course to start tracking momentum.'}
                </p>
              </div>
            </div>
          </section>

          <section style={{ marginTop: '3rem' }}>
            <div className="progress-page__section-head">
              <div>
                <h2 className="progress-page__section-title">Course Progress</h2>
                <p className="progress-page__muted">Real completion data across your enrolled offerings.</p>
              </div>
            </div>

            {courseRows.length === 0 ? (
              <div className="progress-page__empty">No enrolled courses yet.</div>
            ) : (
              <div className="progress-page__course-grid">
                {courseRows.map(course => (
                  <article
                    key={course.id}
                    className={`progress-page__course-item${selectedCourseId === course.id ? ' is-selected' : ''}`}
                    onClick={() => {
                      setSelectedCourseId(course.id);
                      navigate(`/progress/course/${course.id}`);
                    }}
                  >
                    <div className="progress-page__course-item-head">
                      <div style={{ flex: 1 }}>
                        <strong>
                          {course.course_code} • {course.course_title}
                        </strong>
                        <div className="progress-page__muted" style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                          {course.faculty_name ? `Instructor: ${course.faculty_name}` : 'Instructor unavailable'}
                        </div>
                      </div>
                      <strong>{course.completion}%</strong>
                    </div>
                    <div className="progress-page__course-progress-track" style={{ marginTop: '0.75rem' }}>
                      <div
                        className="progress-page__course-progress-fill"
                        style={{ width: `${course.completion}%` }}
                      />
                    </div>
                    <div
                      className="progress-page__metric-row"
                      style={{ justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.8rem' }}
                    >
                      <span>
                        {course.activityCount} completed
                      </span>
                      <span>{course.pending_assignments || 0} pending assignments</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
