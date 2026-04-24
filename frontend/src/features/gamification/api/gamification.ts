import { apiFetch } from '../../../services/api';

export interface GamificationStats {
  total_points?: number;
  experience_points?: number;
  current_streak?: number;
  longest_streak?: number;
  problems_solved?: number;
  easy_solved?: number;
  medium_solved?: number;
  hard_solved?: number;
  total_submissions?: number;
  successful_submissions?: number;
  average_time_seconds?: number;
  last_submission_date?: string | null;
  level?: number;
  quizzes_completed?: number;
  perfect_quiz_scores?: number;
  high_quiz_scores?: number;
  fast_quiz_completions?: number;
  total_quiz_score?: number;
  average_quiz_score?: number;
  quiz_streak?: number;
  last_quiz_date?: string | null;
  unique_course_quizzes?: number;
}

export interface GamificationAchievement {
  id: number;
  name: string;
  description: string;
  icon?: string | null;
  category: string;
  rarity: string;
  points_reward: number;
  requirement_type: string;
  requirement_value: number;
  unlocked_at?: string | null;
}

export interface LeaderboardEntry {
  user_id: number;
  user_name: string;
  user_email: string;
  score: number;
  time_spent_seconds?: number | null;
  rank: number;
  submission_date?: string | null;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  userPercentile: number | null;
  totalEntries: number;
  averageScore: number;
  currentUserEntry: LeaderboardEntry | null;
  type: string;
  referenceId: string | null;
}

export interface XpSource {
  key: string;
  label: string;
  xp: number;
}

export interface XpTransaction {
  id: string;
  category: string;
  title: string;
  context: string;
  occurred_at: string;
  xp_delta: number;
}

export interface GamificationSummaryResponse {
  stats: GamificationStats;
  sources: XpSource[];
  recentTransactions: XpTransaction[];
  totals: {
    totalXp: number;
    achievementsUnlocked: number;
    dailyChallengesCompleted: number;
    codeSubmissionCount: number;
  };
}

export async function fetchGamificationStats() {
  return apiFetch<GamificationStats>('/api/gamification/stats');
}

export async function fetchLeaderboard(params: {
  type: 'assignment' | 'course' | 'quiz' | 'global' | 'contest';
  referenceId?: number | string;
  limit?: number;
}) {
  const query = new URLSearchParams({
    type: params.type,
    limit: String(params.limit || 50),
  });

  if (params.referenceId !== undefined && params.referenceId !== null) {
    query.set('referenceId', String(params.referenceId));
  }

  return apiFetch<LeaderboardResponse>(`/api/gamification/leaderboard?${query.toString()}`);
}

export async function fetchGamificationAchievements() {
  return apiFetch<{ achievements: GamificationAchievement[] }>('/api/gamification/achievements');
}

export async function fetchAllGamificationAchievements() {
  return apiFetch<{ achievements: GamificationAchievement[] }>('/api/gamification/achievements/all');
}

export async function fetchGamificationSummary() {
  return apiFetch<GamificationSummaryResponse>('/api/gamification/summary');
}
