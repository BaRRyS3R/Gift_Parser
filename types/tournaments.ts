// src/types/tournaments.ts - Updated tournament system types with points-based leaderboard

import { SurvivalGameResult } from "./game-modes/survival";

// Main page tournament button integration
export interface MainPageTournamentInfo {
  isActive: boolean;
  tournament: Tournament | null;
  timeRemaining?: string;
}

export interface Tournament {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  prizes: string[];
  created_at: string;
  updated_at: string;
}

export interface TournamentLeaderboardEntry {
  id: string;
  tournament_id: string;
  user_id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium: boolean;
  survival_time: number; // milliseconds - best survival time
  survival_score: number; // best single game score
  max_level_reached: number; // highest level achieved
  perfect_streak: number; // best perfect streak achieved
  correct_hits: number; // total correct hits across all tournament games
  total_points: number; // NEW: total accumulated points (primary ranking)
  death_cause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  created_at: string;
  rank: number;
}

export interface TournamentResult {
  id?: string;
  tournament_id: string;
  user_id: string;
  survival_time: number; // milliseconds
  survival_score: number;
  max_level_reached: number;
  perfect_streak: number;
  correct_hits: number;
  total_points: number; // NEW: total accumulated points
  death_cause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  rank?: number;
  created_at?: string;
}

export interface TournamentStatus {
  isActive: boolean;
  activeTournament: Tournament | null;
  timeRemaining?: number; // milliseconds until tournament ends
  hasStarted?: boolean;
}

export interface TournamentGameResult extends SurvivalGameResult {
  tournamentId: string;
}

// Tournament game session tracking
export interface TournamentSession {
  tournamentId: string;
  userId: string;
  gamesPlayed: number;
  totalPointsEarned: number;
  bestSingleGameScore: number;
  bestSurvivalTime: number;
  totalCorrectHits: number;
  sessionStartTime: string;
  lastGameTime?: string;
}

// Utility functions for tournament time formatting
export const formatTournamentTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  }

  return `${seconds}.${ms.toString().padStart(3, "0")}s`;
};

export const parseTournamentTime = (timeString: string): number => {
  const timePattern = /^(?:(\d+):)?(\d+)\.(\d{3})s?$/;
  const match = timeString.match(timePattern);

  if (!match) return 0;

  const minutes = parseInt(match[1] || "0", 10);
  const seconds = parseInt(match[2], 10);
  const milliseconds = parseInt(match[3], 10);

  return (minutes * 60 + seconds) * 1000 + milliseconds;
};

export const getTournamentTimeRemaining = (endDate: string): number => {
  const now = new Date();
  const end = new Date(endDate);
  return Math.max(0, end.getTime() - now.getTime());
};

export const isTournamentActive = (tournament: Tournament): boolean => {
  const now = new Date();
  const start = new Date(tournament.start_date);
  const end = new Date(tournament.end_date);

  return now >= start && now < end;
};

export const formatTimeRemaining = (milliseconds: number): string => {
  if (milliseconds <= 0) return "Ended";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);

  if (days > 0) {
    const hours = totalHours % 24;
    return `${days}d ${hours}h`;
  } else if (totalHours > 0) {
    const minutes = totalMinutes % 60;
    return `${totalHours}h ${minutes}m`;
  } else if (totalMinutes > 0) {
    const seconds = totalSeconds % 60;
    return `${totalMinutes}m ${seconds}s`;
  } else {
    return `${totalSeconds}s`;
  }
};

// Points calculation utilities
export const calculateRoundPoints = (correctHits: number): number => {
  // Simple 1:1 ratio - 1 point per correct hit
  return correctHits;
};

export const formatPoints = (points: number): string => {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`;
  } else if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  return points.toString();
};