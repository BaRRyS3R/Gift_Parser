// src/types/daily-quests.ts - Daily Quests System Types

import { GameMode } from "./game-modes/common";

// Quest type enumeration
export enum QuestType {
  PLAY_GAMES = "play_games",
  SCORE_POINTS = "score_points", 
  HIT_CIRCLES = "hit_circles",
}

// Daily quest interface
export interface DailyQuest {
  id: string;
  quest_date: string; // ISO date string (YYYY-MM-DD)
  quest_type: QuestType;
  game_mode: GameMode | "any"; // Any mode or specific game mode
  target_value: number; // Target value to complete quest
  reward_attempts: number; // Attempts rewarded for completion
  created_at: string;
  updated_at: string;
}

// User quest progress interface
export interface UserDailyQuest {
  id: string;
  user_id: string;
  quest_id: string;
  progress_value: number; // Current progress towards target
  is_completed: boolean;
  completed_at?: string; // ISO timestamp when completed
  started_at: string; // ISO timestamp when started
  created_at: string;
  updated_at: string;
}

// Combined quest data with progress
export interface DailyQuestWithProgress {
  quest: DailyQuest;
  progress: UserDailyQuest | null; // null if user hasn't started quest
}

// Quest progress update data
export interface QuestProgressUpdate {
  questId: string;
  gameMode: GameMode;
  questType: QuestType;
  value: number; // Value to add to progress (games played, points scored, circles hit)
}

// Quest completion result
export interface QuestCompletionResult {
  questId: string;
  completed: boolean;
  attemptsAwarded: number;
  previousProgress: number;
  newProgress: number;
  targetValue: number;
}

// API response interfaces
export interface DailyQuestResponse {
  success: boolean;
  quest?: DailyQuestWithProgress;
  error?: string;
}

export interface QuestProgressResponse {
  success: boolean;
  completion?: QuestCompletionResult;
  error?: string;
}

// Quest localization keys
export interface QuestLocalizedContent {
  title: string;
  description: string;
  progressText: string;
  completedText: string;
  rewardText: string;
}

// Helper type for quest content generation
export interface QuestContentParams {
  questType: QuestType;
  gameMode: GameMode | "any";
  targetValue: number;
  rewardAttempts: number;
  currentProgress: number;
}

// Quest validation result
export interface QuestValidation {
  isValid: boolean;
  shouldUpdate: boolean;
  error?: string;
}

// Re-export GameMode for convenience
export { GameMode };