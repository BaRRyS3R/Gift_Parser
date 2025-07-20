// src/types/tournaments.ts - Обновленные типы данных для системы накопления турнирных очков

import { SurvivalGameResult } from "./game-modes/survival";

// Интерфейс для отображения информации о турнире на главной странице
export interface MainPageTournamentInfo {
  isActive: boolean;
  tournament: Tournament | null;
  timeRemaining?: string;
}

// Основной интерфейс турнира
export interface Tournament {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  prizes: string[];
  created_at: string;
  updated_at: string;
}

// Расширенный интерфейс записи турнирного лидерборда с поддержкой накопления очков
export interface TournamentLeaderboardEntry {
  id: string;
  tournament_id: string;
  user_id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium: boolean;
  survival_time: number; // Лучшее время выживания
  survival_score: number; // Накопленные очки за все игры турнира
  last_game_score: number; // Очки за последнюю игру
  max_level_reached: number; // Максимальный достигнутый уровень
  perfect_streak: number; // Лучшая серия без ошибок
  correct_hits: number; // Общее количество правильных попаданий за все игры
  death_cause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  games_played: number; // Количество сыгранных игр в турнире
  created_at: string;
  rank: number;
}

// Интерфейс для сохранения результата турнирной игры
export interface TournamentResult {
  id?: string;
  tournament_id: string;
  user_id: string;
  survival_time: number;
  survival_score: number; // Накопленные очки
  last_game_score: number; // Очки за текущую игру
  max_level_reached: number;
  perfect_streak: number;
  correct_hits: number;
  death_cause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  games_played: number;
  rank?: number;
  created_at?: string;
}

// Интерфейс статуса турнира с временными расчетами
export interface TournamentStatus {
  isActive: boolean;
  activeTournament: Tournament | null;
  timeRemaining?: number; // Время до окончания турнира в миллисекундах
  hasStarted?: boolean;
}

// Расширенный интерфейс результата турнирной игры
export interface TournamentGameResult extends SurvivalGameResult {
  tournamentId: string;
}

// Интерфейс ответа сервера при сохранении результата с накоплением очков
export interface TournamentSaveResponse {
  result_id: string;
  total_score: number; // Общие накопленные очки
  game_score: number; // Очки за текущую игру
  games_played: number; // Общее количество игр
  previous_total: number; // Предыдущий общий счет
}

// Функции для работы с турнирным временем
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

// Парсинг строки времени обратно в миллисекунды
export const parseTournamentTime = (timeString: string): number => {
  const timePattern = /^(?:(\d+):)?(\d+)\.(\d{3})s?$/;
  const match = timeString.match(timePattern);

  if (!match) return 0;

  const minutes = parseInt(match[1] || "0", 10);
  const seconds = parseInt(match[2], 10);
  const milliseconds = parseInt(match[3], 10);

  return (minutes * 60 + seconds) * 1000 + milliseconds;
};

// Расчет оставшегося времени турнира
export const getTournamentTimeRemaining = (endDate: string): number => {
  const now = new Date();
  const end = new Date(endDate);

  return Math.max(0, end.getTime() - now.getTime());
};

// Проверка активности турнира
export const isTournamentActive = (tournament: Tournament): boolean => {
  const now = new Date();
  const start = new Date(tournament.start_date);
  const end = new Date(tournament.end_date);

  return now >= start && now < end;
};

// Форматирование оставшегося времени
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
