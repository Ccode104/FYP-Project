import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import './AchievementBadge.css';

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon?: string;
  category: string;
  rarity: string;
  points_reward: number;
  unlocked_at?: string;
  unlocked?: boolean; // Only present when showAll is true
}

interface AchievementBadgeProps {
  showAll?: boolean; // If true, shows all achievements with lock/unlock status
  compact?: boolean; // Compact display mode
}

interface AllAchievementData {
  id: number;
  name: string;
  description: string;
  icon?: string;
  category: string;
  rarity: string;
  points_reward: number;
}

export default function AchievementBadge({ showAll = false, compact = false }: AchievementBadgeProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showAll) {
      fetchAllAchievements();
    } else {
      fetchUserAchievements();
    }
  }, [showAll]);

  const fetchUserAchievements = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/gamification/achievements');
      setAchievements(response.achievements || []);
    } catch (err) {
      setError((err as Error).message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAchievements = async () => {
    try {
      setLoading(true);
      const [userAchievements, allAchievementsData] = await Promise.all([
        apiFetch('/api/gamification/achievements'),
        apiFetch('/api/gamification/achievements/all')
      ]);

      const unlockedIds = new Set(userAchievements.achievements.map((a: Achievement) => a.id));

      const achievementsWithStatus = allAchievementsData.achievements.map((achievement: AllAchievementData) => ({
        ...achievement,
        unlocked: unlockedIds.has(achievement.id),
        unlocked_at: userAchievements.achievements.find((a: Achievement) => a.id === achievement.id)?.unlocked_at
      }));

      setAchievements(achievementsWithStatus);
    } catch (err) {
      setError((err as Error).message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'legendary': return '#fbbf24';
      case 'epic': return '#a855f7';
      case 'rare': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'solving': return '🧠';
      case 'speed': return '⚡';
      case 'streak': return '🔥';
      case 'consistency': return '📅';
      case 'daily': return '🌅';
      case 'efficiency': return '💎';
      default: return '🏆';
    }
  };

  if (loading) {
    return (
      <div className={`achievement-container ${compact ? 'compact' : ''}`}>
        <div className="achievement-loading">
          <div className="loading-spinner"></div>
          <p>Loading achievements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`achievement-container ${compact ? 'compact' : ''}`}>
        <div className="achievement-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className={`achievement-container ${compact ? 'compact' : ''}`}>
        <div className="achievement-empty">
          <p>No achievements yet. Keep coding to unlock badges!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`achievement-container ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="achievement-header">
          <h3>Achievements</h3>
          <div className="achievement-count">
            {showAll
              ? `${achievements.filter(a => a.unlocked).length}/${achievements.length} unlocked`
              : `${achievements.length} unlocked`
            }
          </div>
        </div>
      )}

      <div className="achievement-grid">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`achievement-badge ${achievement.unlocked ? 'unlocked' : 'locked'} ${achievement.rarity}`}
            title={`${achievement.name}: ${achievement.description}`}
          >
            <div className="badge-icon">
              {achievement.unlocked ? (
                achievement.icon || getCategoryIcon(achievement.category)
              ) : (
                <span className="locked-icon">🔒</span>
              )}
            </div>

            {!compact && (
              <div className="badge-content">
                <div className="badge-name">{achievement.name}</div>
                <div className="badge-description">{achievement.description}</div>
                {achievement.unlocked && achievement.points_reward > 0 && (
                  <div className="badge-reward">+{achievement.points_reward} points</div>
                )}
              </div>
            )}

            <div
              className="badge-rarity-indicator"
              style={{ backgroundColor: getRarityColor(achievement.rarity) }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}