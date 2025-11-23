import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import './UserStats.css';

interface UserStats {
  total_points: number;
  current_streak: number;
  longest_streak: number;
  problems_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  total_submissions: number;
  successful_submissions: number;
  average_time_seconds: number;
  level: number;
  experience_points: number;
}

interface UserStatsProps {
  compact?: boolean;
}

export default function UserStats({ compact = false }: UserStatsProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch('/api/gamification/stats');
      setStats(response);
    } catch (err) {
      setError((err as Error).message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getLevelProgress = (): { current: number; next: number; percentage: number } => {
    if (!stats) return { current: 0, next: 1000, percentage: 0 };

    const currentLevelXP = (stats.level - 1) * 1000;
    const currentXPInLevel = stats.experience_points - currentLevelXP;
    const xpForNextLevel = 1000;

    return {
      current: currentXPInLevel,
      next: xpForNextLevel,
      percentage: Math.min((currentXPInLevel / xpForNextLevel) * 100, 100)
    };
  };

  const getSuccessRate = (): number => {
    if (!stats || stats.total_submissions === 0) return 0;
    return Math.round((stats.successful_submissions / stats.total_submissions) * 100);
  };

  if (loading) {
    return (
      <div className={`user-stats-container ${compact ? 'compact' : ''}`}>
        <div className="stats-loading">
          <div className="loading-spinner"></div>
          <p>Loading stats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`user-stats-container ${compact ? 'compact' : ''}`}>
        <div className="stats-error">
          <p>{error}</p>
          <button onClick={fetchUserStats} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`user-stats-container ${compact ? 'compact' : ''}`}>
        <div className="stats-empty">
          <p>Unable to load statistics</p>
        </div>
      </div>
    );
  }

  const levelProgress = getLevelProgress();
  const successRate = getSuccessRate();

  if (compact) {
    return (
      <div className="user-stats-container compact">
        <div className="stats-compact">
          <div className="stat-item">
            <span className="stat-value">{stats.total_points}</span>
            <span className="stat-label">Points</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">#{stats.level}</span>
            <span className="stat-label">Level</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.problems_solved}</span>
            <span className="stat-label">Solved</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{successRate}%</span>
            <span className="stat-label">Success</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-stats-container">
      <div className="stats-header">
        <h3>Your Statistics</h3>
      </div>

      <div className="stats-content">
        {/* Level and XP */}
        <div className="stats-section">
          <div className="level-display">
            <div className="level-info">
              <span className="level-number">Level {stats.level}</span>
              <span className="xp-display">
                {levelProgress.current} / {levelProgress.next} XP
              </span>
            </div>
            <div className="level-progress">
              <div
                className="level-progress-bar"
                style={{ width: `${levelProgress.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-value">{stats.total_points.toLocaleString()}</div>
              <div className="stat-label">Total Points</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">{stats.problems_solved}</div>
              <div className="stat-label">Problems Solved</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{successRate}%</div>
              <div className="stat-label">Success Rate</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-value">{formatTime(stats.average_time_seconds)}</div>
              <div className="stat-label">Avg. Time</div>
            </div>
          </div>
        </div>

        {/* Difficulty Breakdown */}
        <div className="stats-section">
          <h4>Problems by Difficulty</h4>
          <div className="difficulty-breakdown">
            <div className="difficulty-item">
              <span className="difficulty-label easy">Easy</span>
              <span className="difficulty-count">{stats.easy_solved}</span>
            </div>
            <div className="difficulty-item">
              <span className="difficulty-label medium">Medium</span>
              <span className="difficulty-count">{stats.medium_solved}</span>
            </div>
            <div className="difficulty-item">
              <span className="difficulty-label hard">Hard</span>
              <span className="difficulty-count">{stats.hard_solved}</span>
            </div>
          </div>
        </div>

        {/* Streaks */}
        <div className="stats-section">
          <h4>Streaks</h4>
          <div className="streak-info">
            <div className="streak-item">
              <span className="streak-icon">🔥</span>
              <div className="streak-details">
                <div className="streak-value">{stats.current_streak}</div>
                <div className="streak-label">Current Streak</div>
              </div>
            </div>
            <div className="streak-item">
              <span className="streak-icon">🏆</span>
              <div className="streak-details">
                <div className="streak-value">{stats.longest_streak}</div>
                <div className="streak-label">Longest Streak</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}