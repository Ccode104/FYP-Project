import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import './Leaderboard.css';

interface LeaderboardEntry {
  user_id: number;
  user_name: string;
  user_email: string;
  score: number;
  time_spent_seconds: number;
  rank: number;
  submission_date: string;
}

interface LeaderboardProps {
  type: 'assignment' | 'course' | 'global';
  referenceId?: number;
  limit?: number;
}

export default function Leaderboard({ type, referenceId, limit = 20 }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [type, referenceId, limit]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        type,
        limit: limit.toString()
      });

      if (referenceId) {
        params.append('referenceId', referenceId.toString());
      }

      const response = await apiFetch(`/api/gamification/leaderboard?${params}`);
      setLeaderboard(response.leaderboard || []);
      setUserRank(response.userRank);
    } catch (err) {
      setError((err as Error).message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h3>Leaderboard</h3>
        </div>
        <div className="leaderboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h3>Leaderboard</h3>
        </div>
        <div className="leaderboard-error">
          <p>{error}</p>
          <button onClick={fetchLeaderboard} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h3>
          {type === 'global' ? 'Global Leaderboard' :
           type === 'course' ? 'Course Leaderboard' :
           'Assignment Leaderboard'}
        </h3>
        {userRank && (
          <div className="user-rank">
            Your Rank: <span className="rank-highlight">{getRankIcon(userRank)}</span>
          </div>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <div className="leaderboard-empty">
          <p>No submissions yet. Be the first to submit!</p>
        </div>
      ) : (
        <div className="leaderboard-list">
          {leaderboard.map((entry) => (
            <div
              key={`${entry.user_id}-${entry.submission_date}`}
              className={`leaderboard-entry ${entry.rank <= 3 ? 'top-three' : ''}`}
            >
              <div className="rank-column">
                <span className="rank-icon">{getRankIcon(entry.rank)}</span>
              </div>

              <div className="user-column">
                <div className="user-name">{entry.user_name}</div>
                <div className="user-email">{entry.user_email}</div>
              </div>

              <div className="score-column">
                <div className="score-value">{entry.score}</div>
                <div className="score-label">points</div>
              </div>

              <div className="time-column">
                <div className="time-value">{formatTime(entry.time_spent_seconds)}</div>
                <div className="time-label">time</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {leaderboard.length >= limit && (
        <div className="leaderboard-footer">
          <p>Showing top {limit} entries</p>
        </div>
      )}
    </div>
  );
}
