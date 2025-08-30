// src/types/tournaments.ts - ИСПРАВЛЕНО: оптимизированы типы для уменьшения нагрузки на Redis

// Tournament status enum
export enum TournamentStatus {
  UPCOMING = "upcoming",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

// Tournament mode enum
export enum TournamentMode {
  SURVIVAL = "survival",
  PHYSICS = "physics",
  ROTATION = "rotation",
}

// Prize interface
export interface Prize {
  position: number;
  description: string;
  attempts?: number;
  special_title?: string;
  reward_type?: "attempts" | "title" | "custom";
}

// Основной интерфейс турнира (остается без изменений)
export interface Tournament {
  id: string;
  name: string;
  description?: string;
  mode: TournamentMode;
  start_time: string;
  end_time: string;
  status: TournamentStatus;
  prizes: Prize[];
  created_at: string;
  updated_at: string;
}

// 🚨 ИЗБЫТОЧНАЯ структура для внутренних операций (НЕ для кеширования)
export interface FullTournamentLeaderboardEntry {
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

// ✅ ОПТИМИЗИРОВАННАЯ структура для кеширования (только необходимые поля)
export interface OptimizedTournamentLeaderboardEntry {
  first_name: string;
  last_name?: string;
  username?: string;
  best_score: number;
  updated_at: string; // Для разрешения ничьих по времени
  isCurrentUser?: boolean; // Добавляется при персонализации
}

// ✅ ПУБЛИЧНАЯ структура для API ответов (БЕЗ чувствительных данных)
export interface PublicTournamentLeaderboardEntry {
  first_name: string;
  last_name?: string;
  username?: string;
  best_score: number;
  position?: number; // Добавляется при обработке
}

// Позиция пользователя в турнире (оптимизированная)
export interface TournamentUserPosition {
  position: number;
  entry: OptimizedTournamentLeaderboardEntry;
}

// Упрощенная структура данных турниров (только активный)
export interface TournamentsData {
  active?: Tournament;
  // УБРАНО: upcoming и completed для упрощения
}

// Данные лидерборда турнира с оптимизацией
export interface TournamentLeaderboardData {
  tournament: Tournament;
  leaderboard: OptimizedTournamentLeaderboardEntry[];
  userPosition?: TournamentUserPosition;
}

// Информация об участии в турнире (упрощенная)
export interface TournamentParticipation {
  isParticipating: boolean;
  userPosition?: TournamentUserPosition;
  gamesPlayed: number;
  bestScore: number;
  firstGameAt?: string;
  lastGameAt?: string;
}

// Упрощенная статистика турнира
export interface TournamentStats {
  totalParticipants: number;
  totalGames: number;
  averageScore: number;
  highestScore: number;
}

// Результат обновления турнира
export interface TournamentResultUpdate {
  tournamentId: string;
  tournamentName: string;
  newBestScore: boolean;
  position?: number;
  improved: boolean;
  previousPosition?: number;
  scoreImprovement?: number;
}

// API ответы с оптимизированными данными
export interface TournamentsApiResponse {
  success: boolean;
  data?: TournamentsData;
  error?: string;
}

export interface TournamentLeaderboardApiResponse {
  success: boolean;
  tournament?: Tournament;
  leaderboard?: OptimizedTournamentLeaderboardEntry[];
  userPosition?: TournamentUserPosition;
  stats?: TournamentStats;
  error?: string;
}

// Упрощенные запросы
export interface TournamentQuery {
  tournamentId?: string;
  mode?: TournamentMode;
  status?: TournamentStatus;
  limit?: number;
}

// Информация о времени турнира
export interface TournamentTimeInfo {
  isActive: boolean;
  timeRemaining?: number;
  timeUntilStart?: number;
  hasEnded: boolean;
  formattedTime: string;
}

// Маппинг режимов (остается без изменений)
export const TOURNAMENT_MODE_TO_GAME_MODE: Record<TournamentMode, string> = {
  [TournamentMode.SURVIVAL]: "survival",
  [TournamentMode.PHYSICS]: "physics",
  [TournamentMode.ROTATION]: "rotation",
};

export const GAME_MODE_TO_TOURNAMENT_MODE: Record<
  string,
  TournamentMode | null
> = {
  reaction: null,
  survival: TournamentMode.SURVIVAL,
  physics: TournamentMode.PHYSICS,
  rotation: TournamentMode.ROTATION,
};

// ✅ ОПТИМИЗИРОВАННАЯ функция санитизации (минимум полей)
export function sanitizeLeaderboardEntry(
  entry: FullTournamentLeaderboardEntry,
): OptimizedTournamentLeaderboardEntry {
  return {
    first_name: entry.first_name,
    last_name: entry.last_name,
    username: entry.username,
    best_score: entry.best_score,
    updated_at: entry.updated_at,
    // isCurrentUser добавляется при персонализации
  };
}

// ✅ ФУНКЦИЯ для создания публичной записи из оптимизированной
export function createPublicEntry(
  entry: OptimizedTournamentLeaderboardEntry,
  position: number,
): PublicTournamentLeaderboardEntry {
  return {
    first_name: entry.first_name,
    last_name: entry.last_name,
    username: entry.username,
    best_score: entry.best_score,
    position,
  };
}

// Валидация (остается без изменений)
export function isValidTournamentMode(mode: string): mode is TournamentMode {
  return Object.values(TournamentMode).includes(mode as TournamentMode);
}

export function isValidTournamentStatus(
  status: string,
): status is TournamentStatus {
  return Object.values(TournamentStatus).includes(status as TournamentStatus);
}

// Расчет времени турнира (остается без изменений)
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

// Утилиты позиций (остается без изменений)
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

// ✅ ОПТИМИЗИРОВАННАЯ функция подсчета очков (без изменений логики)
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