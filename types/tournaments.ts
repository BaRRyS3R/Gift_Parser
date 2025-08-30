// src/types/tournaments.ts - Исправленные типы турниров с корректной структурой призов

// Tournament status enum
export enum TournamentStatus {
  UPCOMING = "upcoming",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

// Tournament mode enum (subset of GameMode for tournaments only)
export enum TournamentMode {
  SURVIVAL = "survival",
  PHYSICS = "physics",
  ROTATION = "rotation",
}

// ✅ ИСПРАВЛЕННЫЙ Prize interface - соответствует структуре БД
export interface Prize {
  place: number | string; // БД может содержать как числа, так и строки типа "4-10"
  prize: string; // Полное описание приза из БД
}

// Tournament interface
export interface Tournament {
  id: string;
  name: string;
  description?: string;
  mode: TournamentMode;
  start_time: string;
  end_time: string;
  status: TournamentStatus;
  prizes: Prize[]; // ✅ Исправлено: теперь соответствует структуре БД
  created_at: string;
  updated_at: string;
}

// Full tournament leaderboard entry interface (internal use only)
export interface TournamentLeaderboardEntry {
  id: string;
  tournament_id: string;
  user_id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium: boolean;
  best_score: number;
  total_games: number;
  best_time?: number;
  max_level?: number;
  best_streak?: number;
  total_hits?: number;
  least_mistakes?: number;
  first_game_at?: string;
  last_game_at?: string;
  created_at: string;
  updated_at: string;
}

// Sanitized tournament leaderboard entry interface (public API)
export interface PublicTournamentLeaderboardEntry {
  tournament_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  best_score: number;
}

// Tournament user position interface with sanitized entry
export interface TournamentUserPosition {
  position: number;
  entry: PublicTournamentLeaderboardEntry;
}

// Tournament data groupings
export interface TournamentsData {
  active?: Tournament;
  upcoming: Tournament[];
  completed: Tournament[];
}

// Tournament leaderboard response with sanitized data
export interface TournamentLeaderboardData {
  tournament: Tournament;
  leaderboard: PublicTournamentLeaderboardEntry[];
  userPosition?: TournamentUserPosition;
}

// Tournament participation info
export interface TournamentParticipation {
  isParticipating: boolean;
  userPosition?: TournamentUserPosition;
  gamesPlayed: number;
  bestScore: number;
  firstGameAt?: string;
  lastGameAt?: string;
}

// Tournament statistics
export interface TournamentStats {
  totalParticipants: number;
  totalGames: number;
  averageScore: number;
  highestScore: number;
  mostActivePlayer?: {
    name: string;
    username?: string;
    gamesPlayed: number;
  };
}

// Tournament result update interface
export interface TournamentResultUpdate {
  tournamentId: string;
  tournamentName: string;
  newBestScore: boolean;
  position?: number;
  improved: boolean;
  previousPosition?: number;
  scoreImprovement?: number;
}

// API Response interfaces with sanitized data
export interface TournamentsApiResponse {
  success: boolean;
  data?: TournamentsData;
  error?: string;
}

export interface TournamentLeaderboardApiResponse {
  success: boolean;
  tournament?: Tournament;
  leaderboard?: PublicTournamentLeaderboardEntry[];
  userPosition?: TournamentUserPosition;
  stats?: TournamentStats;
  error?: string;
}

// Tournament query parameters
export interface TournamentQuery {
  tournament?: string;
  mode?: TournamentMode;
  status?: TournamentStatus;
  limit?: number;
  offset?: number;
}

// Tournament creation interface (for future admin functionality)
export interface CreateTournamentRequest {
  name: string;
  description?: string;
  mode: TournamentMode;
  start_time: string;
  end_time: string;
  prizes: Prize[];
}

// Tournament update interface (for future admin functionality)
export interface UpdateTournamentRequest {
  name?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  status?: TournamentStatus;
  prizes?: Prize[];
}

// Tournament time remaining interface
export interface TournamentTimeInfo {
  isActive: boolean;
  timeRemaining?: number;
  timeUntilStart?: number;
  hasEnded: boolean;
  formattedTime: string;
}

// Tournament mode mapping utilities
export const TOURNAMENT_MODE_TO_GAME_MODE: Record<TournamentMode, string> = {
  [TournamentMode.SURVIVAL]: "survival",
  [TournamentMode.PHYSICS]: "physics",
  [TournamentMode.ROTATION]: "rotation",
};

export const GAME_MODE_TO_TOURNAMENT_MODE: Record<
  string,
  TournamentMode | null
> = {
  reaction: null, // Reaction mode doesn't have tournaments
  survival: TournamentMode.SURVIVAL,
  physics: TournamentMode.PHYSICS,
  rotation: TournamentMode.ROTATION,
};

// Data sanitization utility
export function sanitizeLeaderboardEntry(
  entry: TournamentLeaderboardEntry,
): PublicTournamentLeaderboardEntry {
  return {
    tournament_id: entry.tournament_id,
    first_name: entry.first_name,
    last_name: entry.last_name,
    username: entry.username,
    best_score: entry.best_score,
  };
}

// Tournament validation utilities
export function isValidTournamentMode(mode: string): mode is TournamentMode {
  return Object.values(TournamentMode).includes(mode as TournamentMode);
}

export function isValidTournamentStatus(
  status: string,
): status is TournamentStatus {
  return Object.values(TournamentStatus).includes(status as TournamentStatus);
}

// ✅ ИСПРАВЛЕННЫЕ утилиты для работы с призами
export function getPrizePosition(prize: Prize): string {
  if (typeof prize.place === "string") {
    return prize.place; // Для диапазонов типа "4-10"
  }
  return `#${prize.place}`; // Для конкретных позиций
}

export function getPrizeDescription(prize: Prize): string {
  return prize.prize;
}

export function extractAttemptsFromPrize(prize: Prize): number | undefined {
  const match = prize.prize.match(/(\d+)\s+(?:bonus\s+)?attempts/i);
  return match ? parseInt(match[1]) : undefined;
}

export function hasBadgeReward(prize: Prize): boolean {
  return prize.prize.toLowerCase().includes("badge");
}

// Tournament time calculation utilities
export function calculateTournamentTimeInfo(
  tournament: Tournament,
): TournamentTimeInfo {
  const now = new Date().getTime();
  const start = new Date(tournament.start_time).getTime();
  const end = new Date(tournament.end_time).getTime();

  const isActive = now >= start && now <= end;
  const hasEnded = now > end;
  const timeRemaining = isActive ? Math.max(0, end - now) : undefined;
  const timeUntilStart =
    !isActive && !hasEnded ? Math.max(0, start - now) : undefined;

  let formattedTime = "";
  const timeToFormat = timeRemaining || timeUntilStart;

  if (timeToFormat) {
    const days = Math.floor(timeToFormat / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeToFormat % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((timeToFormat % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeToFormat % (1000 * 60)) / 1000);

    if (days > 0) formattedTime = `${days}d ${hours}h`;
    else if (hours > 0) formattedTime = `${hours}h ${minutes}m`;
    else if (minutes > 0) formattedTime = `${minutes}m ${seconds}s`;
    else formattedTime = `${seconds}s`;
  } else if (hasEnded) {
    formattedTime = "Ended";
  }

  return {
    isActive,
    timeRemaining,
    timeUntilStart,
    hasEnded,
    formattedTime,
  };
}

// Tournament position utilities
export function getTournamentPositionColor(position: number): string {
  switch (position) {
    case 1:
      return "text-yellow-400";
    case 2:
      return "text-gray-300";
    case 3:
      return "text-amber-600";
    default:
      return position <= 10 ? "text-blue-400" : "text-white/60";
  }
}

export function getTournamentPositionTitle(position: number): string {
  switch (position) {
    case 1:
      return "Winner";
    case 2:
      return "Runner-up";
    case 3:
      return "Third Place";
    default:
      return position <= 10 ? "Top 10" : `#${position}`;
  }
}

// Tournament scoring utilities
export function calculateTournamentScore(
  gameMode: string,
  baseScore: number,
): number {
  switch (gameMode) {
    case "survival":
      return baseScore * 2;
    case "physics":
      return baseScore * 4;
    case "rotation":
      return baseScore * 3;
    default:
      return baseScore;
  }
}