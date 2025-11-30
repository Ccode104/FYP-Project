import { apiFetch } from './api';

// User stats
export async function getUserStats() {
  return apiFetch('/gamification/stats');
}

// Leaderboards
export async function getLeaderboard() {
  return apiFetch('/gamification/leaderboard');
}

// Achievements
export async function getUserAchievements() {
  return apiFetch('/gamification/achievements');
}

export async function getAllAchievements() {
  return apiFetch('/gamification/achievements/all');
}

// Daily challenges
export async function getDailyChallenge() {
  return apiFetch('/gamification/daily-challenge');
}

export async function completeDailyChallenge() {
  return apiFetch('/gamification/daily-challenge/complete', {
    method: 'POST'
  });
}

// Submission history
export async function getUserSubmissionHistory() {
  return apiFetch('/gamification/submissions/history');
}