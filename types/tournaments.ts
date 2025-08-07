// src/types/tournaments.ts - Типы для турнирной системы

import { GameMode } from "./game-modes/common";

// Статус турнира
export enum TournamentStatus {
  UPCOMING = "upcoming",
  ACTIVE = "active",
  ENDED = "ended",
}

// Режимы игр для турниров (без Reaction)
export enum TournamentGameMode {
  SURVIVAL = "survival",
  PHYSICS = "physics",
  ROTATION = "rotation",
}

// Приз турнира
export interface TournamentPrize {
  position: number;
  title: string;
  description: string;
  value?: string; // Например, "100 TON" или "Premium статус"
}

// Основная структура турнира
export interface Tournament {
  id: string;
  name: string;
  description?: string;
  game_mode: TournamentGameMode;
  start_date: string; // ISO timestamp
  end_date: string; // ISO timestamp
  status: TournamentStatus;
  prizes: TournamentPrize[];
  max_participants?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Результат участника турнира
export interface TournamentResult {
  id: string;
  tournament_id: string;
  user_id: string;
  telegram_id: number;
  best_score: number;
  games_played: number;
  total_score: number;
  first_game_at?: string;
  last_game_at?: string;
  created_at: string;
  updated_at: string;
}

// Участник турнирного лидерборда (безопасная версия для клиента)
export interface TournamentLeaderboardEntry {
  position: number;
  user_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  best_score: number;
  games_played: number;
  total_score: number;
  last_game_at?: string;
  isCurrentUser?: boolean;
}

// Детальная информация о турнире с участниками
export interface TournamentDetails extends Tournament {
  participant_count: number;
  user_result?: TournamentResult;
  user_position?: number;
}

// Статистика турнира
export interface TournamentStats {
  total_participants: number;
  total_games_played: number;
  average_score: number;
  highest_score: number;
  games_per_day: number[];
}

// Ответы API
export interface TournamentListResponse {
  success: boolean;
  data?: Tournament[];
  error?: string;
}

export interface TournamentDetailsResponse {
  success: boolean;
  data?: TournamentDetails;
  error?: string;
}

export interface TournamentLeaderboardResponse {
  success: boolean;
  data?: {
    leaderboard: TournamentLeaderboardEntry[];
    user_position?: number;
    total_participants: number;
    stats: TournamentStats;
  };
  error?: string;
}

export interface TournamentSubmitResponse {
  success: boolean;
  data?: {
    result: TournamentResult;
    position: number;
    position_changed: boolean;
    is_new_best: boolean;
  };
  error?: string;
}

// Фильтры для турниров
export interface TournamentFilters {
  status?: TournamentStatus;
  game_mode?: TournamentGameMode;
  limit?: number;
  offset?: number;
}

// Утилитарные типы
export type TournamentCreateData = Omit<
  Tournament,
  "id" | "status" | "created_at" | "updated_at"
>;
export type TournamentUpdateData = Partial<
  Pick<
    Tournament,
    | "name"
    | "description"
    | "start_date"
    | "end_date"
    | "prizes"
    | "max_participants"
    | "is_active"
  >
>;

// Маппинг игровых режимов к турнирным
export const GAME_MODE_TO_TOURNAMENT_MODE: Record<
  GameMode,
  TournamentGameMode | null
> = {
  [GameMode.REACTION]: null, // Reaction режим не участвует в турнирах
  [GameMode.SURVIVAL]: TournamentGameMode.SURVIVAL,
  [GameMode.PHYSICS]: TournamentGameMode.PHYSICS,
  [GameMode.ROTATION]: TournamentGameMode.ROTATION,
};

// Обратный маппинг
export const TOURNAMENT_MODE_TO_GAME_MODE: Record<
  TournamentGameMode,
  GameMode
> = {
  [TournamentGameMode.SURVIVAL]: GameMode.SURVIVAL,
  [TournamentGameMode.PHYSICS]: GameMode.PHYSICS,
  [TournamentGameMode.ROTATION]: GameMode.ROTATION,
};

// Константы
export const TOURNAMENT_CONSTANTS = {
  MIN_DURATION_HOURS: 24, // Минимальная длительность турнира - 24 часа
  MAX_DURATION_DAYS: 14, // Максимальная длительность турнира - 14 дней
  DEFAULT_LEADERBOARD_LIMIT: 100,
  MAX_LEADERBOARD_LIMIT: 500,
} as const;

// Функции-хелперы
export function getTournamentStatusFromDates(
  startDate: string,
  endDate: string,
): TournamentStatus {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) {
    return TournamentStatus.UPCOMING;
  } else if (now >= start && now <= end) {
    return TournamentStatus.ACTIVE;
  } else {
    return TournamentStatus.ENDED;
  }
}

export function isTournamentActive(tournament: Tournament): boolean {
  return (
    tournament.status === TournamentStatus.ACTIVE &&
    tournament.is_active === true
  );
}

export function getTournamentDuration(tournament: Tournament): number {
  const start = new Date(tournament.start_date);
  const end = new Date(tournament.end_date);

  return end.getTime() - start.getTime();
}

export function getTournamentTimeRemaining(tournament: Tournament): number {
  if (tournament.status !== TournamentStatus.ACTIVE) {
    return 0;
  }

  const now = new Date();
  const end = new Date(tournament.end_date);

  return Math.max(0, end.getTime() - now.getTime());
}

export function getTournamentTimeUntilStart(tournament: Tournament): number {
  if (tournament.status !== TournamentStatus.UPCOMING) {
    return 0;
  }

  const now = new Date();
  const start = new Date(tournament.start_date);

  return Math.max(0, start.getTime() - now.getTime());
}

// Функция для проверки совместимости режима игры с турнирами
export function isGameModeEligibleForTournaments(gameMode: GameMode): boolean {
  return GAME_MODE_TO_TOURNAMENT_MODE[gameMode] !== null;
}
