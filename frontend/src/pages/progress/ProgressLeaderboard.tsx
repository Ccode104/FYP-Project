import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { apiFetch } from '../../services/api';
import ProgressShell from './ProgressShell';
import {
  fetchAllGamificationAchievements,
  fetchGamificationAchievements,
  fetchGamificationSummary,
  fetchLeaderboard,
  type GamificationAchievement,
  type GamificationSummaryResponse,
  type LeaderboardResponse,
} from '../../features/gamification/api/gamification';

type CourseCardData = {
  id: number;
  course_code?: string;
  course_title?: string;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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

export default function ProgressLeaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses, setCourses] = useState<CourseCardData[]>([]);
  const [summary, setSummary] = useState<GamificationSummaryResponse | null>(null);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [courseLeaderboard, setCourseLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [allAchievements, setAllAchievements] = useState<GamificationAchievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<GamificationAchievement[]>([]);
  const [selectedScope, setSelectedScope] = useState<'global' | 'course'>('global');
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const view = searchParams.get('view') === 'achievements' ? 'achievements' : 'leaderboard';

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboardPage() {
      setLoading(true);
      setError(null);

      try {
        const [courseResponse, gamificationSummary, globalBoard, allAchievementsResponse, userAchievementsResponse] =
          await Promise.all([
            apiFetch<{ courses: CourseCardData[] }>('/api/courses/card-data'),
            fetchGamificationSummary(),
            fetchLeaderboard({ type: 'global', limit: 100 }),
            fetchAllGamificationAchievements(),
            fetchGamificationAchievements(),
          ]);

        if (cancelled) return;

        const nextCourseId = courseResponse.courses?.[0]?.id || '';
        setCourses(courseResponse.courses || []);
        setSelectedCourseId(nextCourseId);
        setSummary(gamificationSummary);
        setGlobalLeaderboard(globalBoard);
        setAllAchievements(allAchievementsResponse.achievements || []);
        setUserAchievements(userAchievementsResponse.achievements || []);

        if (nextCourseId) {
          const nextCourseBoard = await fetchLeaderboard({
            type: 'course',
            referenceId: nextCourseId,
            limit: 100,
          });
          if (!cancelled) {
            setCourseLeaderboard(nextCourseBoard);
          }
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load leaderboard';
        if (!cancelled) {
          setError(message);
          push({ kind: 'error', message: 'Failed to load leaderboard and achievements' });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLeaderboardPage();
    return () => {
      cancelled = true;
    };
  }, [push]);

  useEffect(() => {
    let cancelled = false;
    async function loadCourseBoard() {
      if (!selectedCourseId) {
        setCourseLeaderboard(null);
        return;
      }
      try {
        const nextBoard = await fetchLeaderboard({
          type: 'course',
          referenceId: selectedCourseId,
          limit: 100,
        });
        if (!cancelled) {
          setCourseLeaderboard(nextBoard);
        }
      } catch (boardError) {
        if (!cancelled) {
          console.warn('Failed to load course leaderboard', boardError);
        }
      }
    }
    loadCourseBoard();
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId]);

  const activeLeaderboard = selectedScope === 'course' ? courseLeaderboard : globalLeaderboard;
  const unlockedIds = useMemo(() => new Set(userAchievements.map(item => item.id)), [userAchievements]);

  const achievements = useMemo(
    () =>
      allAchievements.map(achievement => {
        const progress = getAchievementProgress(achievement, summary);
        return {
          ...achievement,
          unlocked: unlockedIds.has(achievement.id),
          progress,
          progressPercent: achievement.requirement_value
            ? clampPercent((progress / achievement.requirement_value) * 100)
            : 0,
          unlockedAt: userAchievements.find(item => item.id === achievement.id)?.unlocked_at,
        };
      }),
    [allAchievements, summary, unlockedIds, userAchievements]
  );

  const currentUserEntry = activeLeaderboard?.currentUserEntry;
  const topTenGap = useMemo(() => {
    if (!activeLeaderboard?.leaderboard?.length || !currentUserEntry) return null;
    const topTen = activeLeaderboard.leaderboard.find(entry => entry.rank === 10);
    if (!topTen) return null;
    return Math.max(Number(topTen.score) - Number(currentUserEntry.score || 0), 0);
  }, [activeLeaderboard, currentUserEntry]);

  const sortedAchievements = useMemo(() => {
    return [...achievements].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return b.points_reward - a.points_reward;
    });
  }, [achievements]);

  const handleSectionChange = (section: 'overview' | 'academics' | 'leaderboard' | 'achievements') => {
    if (section === 'overview') {
      navigate('/progress');
      return;
    }
    if (section === 'academics') {
      if (selectedCourseId) navigate(`/progress/course/${selectedCourseId}`);
      return;
    }
    setSearchParams(section === 'achievements' ? { view: 'achievements' } : {});
  };

  return (
    <ProgressShell
      activeSection={view === 'achievements' ? 'achievements' : 'leaderboard'}
      onSectionChange={handleSectionChange}
    >
      {loading && <div className="progress-page__loading">Loading leaderboard and achievements...</div>}
      {!loading && error && <div className="progress-page__error">{error}</div>}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <header className="progress-page__section-head" style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(226,232,240,0.9)' }}>
            <div>
              <p className="progress-page__eyebrow">Student Standing</p>
              <h1 className="progress-page__section-title">Academic Excellence Leaderboard</h1>
              <p className="progress-page__muted" style={{ maxWidth: '42rem', marginTop: '0.6rem' }}>
                Compare your global standing, switch to course leaderboards, and review unlocked and upcoming achievements.
              </p>
            </div>
            <div className="progress-page__filter-actions">
              <select
                className="progress-page__select"
                value={selectedScope}
                onChange={event => setSelectedScope(event.target.value as 'global' | 'course')}
              >
                <option value="global">Global Ranking</option>
                <option value="course">Course Ranking</option>
              </select>
              <select
                className="progress-page__select"
                value={selectedCourseId}
                onChange={event => setSelectedCourseId(event.target.value ? Number(event.target.value) : '')}
                disabled={!courses.length}
              >
                {courses.length === 0 && <option value="">No Courses</option>}
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} - {course.course_title}
                  </option>
                ))}
              </select>
              <button className="progress-page__action-button" onClick={() => navigate('/progress')}>
                Return to Overview
              </button>
            </div>
          </header>

          <section className="progress-page__grid">
            <article className="progress-page__leaderboard-card" style={{ gridColumn: 'span 8' }}>
              <div className="progress-page__leaderboard-toolbar">
                <h2 className="progress-page__section-title" style={{ fontSize: '1.4rem' }}>
                  Top Performers
                </h2>
                <button className="progress-page__ghost-button" onClick={() => setSearchParams(view === 'achievements' ? { view: 'achievements' } : {})}>
                  <span className="material-symbols-outlined">filter_list</span>
                  {selectedScope === 'global' ? 'Global' : 'Course'}
                </button>
              </div>

              {!activeLeaderboard?.leaderboard.length ? (
                <div className="progress-page__empty" style={{ marginTop: '1rem' }}>
                  No leaderboard entries available yet.
                </div>
              ) : (
                <div className="progress-page__table-wrapper" style={{ marginTop: '1rem' }}>
                  <table className="progress-page__table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Student</th>
                        <th>Points</th>
                        <th>Streak</th>
                        <th>Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeLeaderboard.leaderboard.slice(0, 12).map(entry => {
                        const isCurrentUser = entry.user_email === user?.email;
                        const derivedLevel = Math.max(1, Math.floor(Number(entry.score || 0) / 1000) + 1);
                        return (
                          <tr
                            key={`${entry.user_id}-${entry.rank}`}
                            style={
                              isCurrentUser
                                ? {
                                    background: 'rgba(215, 226, 255, 0.35)',
                                    boxShadow: 'inset 4px 0 0 #00346f',
                                  }
                                : undefined
                            }
                          >
                            <td>
                              <span className="progress-page__rank-badge">{entry.rank}</span>
                            </td>
                            <td>
                              <div className="progress-page__metric-row">
                                <span className="progress-page__avatar-circle">
                                  {(entry.user_name || entry.user_email || 'U')
                                    .split(' ')
                                    .map(part => part[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </span>
                                <div>
                                  <strong>{entry.user_name || entry.user_email}</strong>
                                  {isCurrentUser && (
                                    <span className="progress-page__eyebrow" style={{ marginLeft: '0.4rem' }}>
                                      You
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>{Number(entry.score || 0).toLocaleString()} XP</td>
                            <td>{summary?.stats.current_streak || 0} days</td>
                            <td>Lvl {derivedLevel}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <aside style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <section className="progress-page__hero-card progress-page__hero-card--accent">
                <p className="progress-page__eyebrow" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Current Rank
                </p>
                <h2 style={{ fontSize: '2rem', margin: '0.25rem 0' }}>
                  {activeLeaderboard?.userRank ? `${activeLeaderboard.userRank}th Place` : 'Unranked'}
                </h2>
                <div style={{ marginTop: '1rem' }}>
                  <div className="progress-page__metric-row" style={{ justifyContent: 'space-between', color: '#fff' }}>
                    <span>Progress to Top 10</span>
                    <strong>
                      {topTenGap !== null && currentUserEntry
                        ? `${clampPercent((currentUserEntry.score / (currentUserEntry.score + topTenGap || 1)) * 100)}%`
                        : 'N/A'}
                    </strong>
                  </div>
                  <div
                    className="progress-page__progress-track"
                    style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.18)' }}
                  >
                    <div
                      className="progress-page__progress-fill"
                      style={{
                        width:
                          topTenGap !== null && currentUserEntry
                            ? `${clampPercent((currentUserEntry.score / (currentUserEntry.score + topTenGap || 1)) * 100)}%`
                            : '0%',
                        background: '#fff',
                      }}
                    />
                  </div>
                </div>
                <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.85)' }}>
                  {topTenGap !== null
                    ? `You are ${topTenGap} XP away from the top 10 in this leaderboard.`
                    : 'Keep submitting scored work to enter the leaderboard.'}
                </p>
              </section>

              <section className="progress-page__panel">
                <h3 style={{ marginTop: 0 }}>Rank Movement</h3>
                <div className="progress-page__insight-list">
                  <div className="progress-page__transaction-row">
                    <div>
                      <strong>{activeLeaderboard?.userPercentile || 0}th percentile</strong>
                      <div className="progress-page__muted" style={{ fontSize: '0.8rem' }}>
                        Across {activeLeaderboard?.totalEntries || 0} ranked learners
                      </div>
                    </div>
                  </div>
                  <div className="progress-page__transaction-row">
                    <div>
                      <strong>{summary?.stats.current_streak || 0} day streak</strong>
                      <div className="progress-page__muted" style={{ fontSize: '0.8rem' }}>
                        Longest streak: {summary?.stats.longest_streak || 0} days
                      </div>
                    </div>
                  </div>
                  <div className="progress-page__transaction-row">
                    <div>
                      <strong>{summary?.totals.achievementsUnlocked || 0} achievements</strong>
                      <div className="progress-page__muted" style={{ fontSize: '0.8rem' }}>
                        Total XP: {summary?.totals.totalXp.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </aside>
          </section>

          <section>
            <div className="progress-page__section-head">
              <div>
                <h2 className="progress-page__section-title">Achievements Gallery</h2>
                <p className="progress-page__muted">Unlocked and in-progress milestones tied to your real gamification data.</p>
              </div>
              <button
                className="progress-page__ghost-button"
                onClick={() => setSearchParams(view === 'achievements' ? {} : { view: 'achievements' })}
              >
                {view === 'achievements' ? 'Show Leaderboard First' : 'Focus Achievements'}
              </button>
            </div>

            {sortedAchievements.length === 0 ? (
              <div className="progress-page__empty">No achievements configured yet.</div>
            ) : (
              <div className="progress-page__cards-grid">
                {sortedAchievements.map(achievement => (
                  <article
                    key={achievement.id}
                    className={`progress-page__achievement-card${achievement.unlocked ? '' : ' is-locked'}`}
                  >
                    <div className="progress-page__card-head" style={{ justifyContent: 'space-between' }}>
                      <span className="progress-page__icon-circle">
                        <span className="material-symbols-outlined">
                          {achievement.unlocked ? 'workspace_premium' : 'lock'}
                        </span>
                      </span>
                      <span className="progress-page__status-pill progress-page__status-pill--pending">
                        {achievement.rarity}
                      </span>
                    </div>
                    <h3 style={{ marginBottom: '0.35rem' }}>{achievement.name}</h3>
                    <p className="progress-page__muted" style={{ minHeight: '3rem' }}>
                      {achievement.description}
                    </p>
                    {achievement.unlocked ? (
                      <div style={{ marginTop: '1rem' }}>
                        <strong>{achievement.points_reward} XP awarded</strong>
                        <div className="progress-page__muted" style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>
                          Unlocked {achievement.unlockedAt ? new Date(achievement.unlockedAt).toLocaleDateString() : 'recently'}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '1rem' }}>
                        <div className="progress-page__metric-row" style={{ justifyContent: 'space-between' }}>
                          <strong>Progress</strong>
                          <strong>
                            {achievement.progress} / {achievement.requirement_value}
                          </strong>
                        </div>
                        <div className="progress-page__progress-track" style={{ marginTop: '0.45rem' }}>
                          <div
                            className="progress-page__progress-fill"
                            style={{ width: `${achievement.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </ProgressShell>
  );
}
