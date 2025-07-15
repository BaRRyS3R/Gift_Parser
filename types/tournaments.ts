// src/types/tournaments.ts - Complete tournament types with sponsor fields

import { SurvivalGameResult } from "./game-modes/survival";

// Interface for displaying tournament information on main page
export interface MainPageTournamentInfo {
  isActive: boolean;
  tournament: Tournament | null;
  timeRemaining?: string;
}

// Main tournament interface with sponsor fields
export interface Tournament {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  prizes: string[];
  created_at: string;
  updated_at: string;

  // Sponsor fields
  sponsor_name?: string;
  sponsor_channel_url?: string;
  sponsor_image_url?: string;
}

// Extended tournament leaderboard entry interface with point accumulation support
export interface TournamentLeaderboardEntry {
  id: string;
  tournament_id: string;
  user_id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium: boolean;
  survival_time: number; // Best survival time
  survival_score: number; // Accumulated points for all tournament games
  last_game_score: number; // Points for last game
  max_level_reached: number; // Maximum level reached
  perfect_streak: number; // Best streak without errors
  correct_hits: number; // Total correct hits for all games
  death_cause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  games_played: number; // Number of games played in tournament
  created_at: string;
  rank: number;
}

// Interface for saving tournament game result
export interface TournamentResult {
  id?: string;
  tournament_id: string;
  user_id: string;
  survival_time: number;
  survival_score: number; // Accumulated points
  last_game_score: number; // Points for current game
  max_level_reached: number;
  perfect_streak: number;
  correct_hits: number;
  death_cause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  games_played: number;
  rank?: number;
  created_at?: string;
}

// Tournament status interface with time calculations
export interface TournamentStatus {
  isActive: boolean;
  activeTournament: Tournament | null;
  timeRemaining?: number; // Time until tournament end in milliseconds
  hasStarted?: boolean;
}

// Extended tournament game result interface
export interface TournamentGameResult extends SurvivalGameResult {
  tournamentId: string;
}

// Server response interface when saving result with point accumulation
export interface TournamentSaveResponse {
  result_id: string;
  total_score: number; // Total accumulated points
  game_score: number; // Points for current game
  games_played: number; // Total number of games
  previous_total: number; // Previous total score
}

// Tournament with status interface for comprehensive tournament listing
export interface TournamentWithStatus extends Tournament {
  status: "upcoming" | "active" | "completed";
  participants_count?: number;
  time_until_start?: number;
  time_until_end?: number;
}

// Response interface for tournament listing API
export interface TournamentListResponse {
  active: TournamentWithStatus[];
  upcoming: TournamentWithStatus[];
  completed: TournamentWithStatus[];
}

// Functions for working with tournament time formatting

/**
 * Format tournament time with error handling
 */
export const formatTournamentTime = (milliseconds: number): string => {
  if (milliseconds < 0 || isNaN(milliseconds) || !isFinite(milliseconds)) {
    return "0.000s";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  }

  return `${seconds}.${ms.toString().padStart(3, "0")}s`;
};

/**
 * Parse time string back to milliseconds
 */
export const parseTournamentTime = (timeString: string): number => {
  const timePattern = /^(?:(\d+):)?(\d+)\.(\d{3})s?$/;
  const match = timeString.match(timePattern);

  if (!match) return 0;

  const minutes = parseInt(match[1] || "0", 10);
  const seconds = parseInt(match[2], 10);
  const milliseconds = parseInt(match[3], 10);

  return (minutes * 60 + seconds) * 1000 + milliseconds;
};

/**
 * Calculate remaining tournament time
 */
export const getTournamentTimeRemaining = (endDate: string): number => {
  const now = new Date();
  const end = new Date(endDate);

  return Math.max(0, end.getTime() - now.getTime());
};

/**
 * Check tournament activity status
 */
export const isTournamentActive = (tournament: Tournament): boolean => {
  const now = new Date();
  const start = new Date(tournament.start_date);
  const end = new Date(tournament.end_date);

  return now >= start && now < end;
};

/**
 * Format remaining time for display
 */
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

/**
 * Format tournament dates for display
 */
export const formatTournamentDate = (
  dateString: string,
  locale: string = "ru-RU",
): string => {
  try {
    const date = new Date(dateString);

    return date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting tournament date:", error);

    return dateString;
  }
};

/**
 * Calculate tournament duration in days
 */
export const getTournamentDuration = (
  startDate: string,
  endDate: string,
): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Check if tournament registration is open
 */
export const isTournamentRegistrationOpen = (
  tournament: Tournament,
): boolean => {
  const now = new Date();
  const start = new Date(tournament.start_date);

  // Registration opens when tournament starts
  return now >= start;
};

/**
 * Get tournament phase (upcoming, registration, active, ended)
 */
export const getTournamentPhase = (
  tournament: Tournament,
): "upcoming" | "registration" | "active" | "ended" => {
  const now = new Date();
  const start = new Date(tournament.start_date);
  const end = new Date(tournament.end_date);

  if (now < start) {
    return "upcoming";
  } else if (now >= start && now < end) {
    return "active";
  } else {
    return "ended";
  }
};

/**
 * Validate tournament data
 */
export const validateTournamentData = (
  tournament: Partial<Tournament>,
): boolean => {
  if (!tournament.id || !tournament.name) return false;
  if (!tournament.start_date || !tournament.end_date) return false;
  if (!tournament.prizes || !Array.isArray(tournament.prizes)) return false;

  const start = new Date(tournament.start_date);
  const end = new Date(tournament.end_date);

  return start < end && !isNaN(start.getTime()) && !isNaN(end.getTime());
};

/**
 * Sort tournaments by priority (active first, then by start date)
 */
export const sortTournamentsByPriority = (
  tournaments: TournamentWithStatus[],
): TournamentWithStatus[] => {
  return tournaments.sort((a, b) => {
    // Active tournaments first
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;

    // Then by start date
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });
};

/**
 * Get user position in tournament
 */
export const getUserPositionInTournament = (
  leaderboard: TournamentLeaderboardEntry[],
  telegramId: number,
): TournamentLeaderboardEntry | null => {
  return leaderboard.find((entry) => entry.telegram_id === telegramId) || null;
};

/**
 * Check if user is in prize position
 */
export const isUserInPrizePosition = (
  userPosition: TournamentLeaderboardEntry | null,
  prizeCount: number,
): boolean => {
  return userPosition !== null && userPosition.rank <= prizeCount;
};

/**
 * Get prize for position
 */
export const getPrizeForPosition = (
  tournament: Tournament,
  position: number,
): string | null => {
  if (position < 1 || position > tournament.prizes.length) return null;

  return tournament.prizes[position - 1];
};

/**
 * Calculate tournament statistics
 */
export interface TournamentStats {
  totalParticipants: number;
  totalPrizes: number;
  topScore: number;
  averageScore: number;
  totalGamesPlayed: number;
}

export const calculateTournamentStats = (
  leaderboard: TournamentLeaderboardEntry[],
): TournamentStats => {
  if (leaderboard.length === 0) {
    return {
      totalParticipants: 0,
      totalPrizes: 0,
      topScore: 0,
      averageScore: 0,
      totalGamesPlayed: 0,
    };
  }

  const totalParticipants = leaderboard.length;
  const scores = leaderboard.map((entry) => entry.survival_score);
  const topScore = Math.max(...scores);
  const averageScore =
    scores.reduce((sum, score) => sum + score, 0) / totalParticipants;
  const totalGamesPlayed = leaderboard.reduce(
    (sum, entry) => sum + (entry.games_played || 1),
    0,
  );

  return {
    totalParticipants,
    totalPrizes: 0, // This would need to be passed separately
    topScore,
    averageScore: Math.round(averageScore),
    totalGamesPlayed,
  };
};
