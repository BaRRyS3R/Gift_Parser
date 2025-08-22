// src/lib/server/gameSessionService.ts - Service for managing game sessions

import { supabaseServer } from "@/lib/supabase_server";
import { GameMode } from "@/types/game-modes/common";

// Session status enum
export enum SessionStatus {
  ACTIVE = "active",
  FINISHED = "finished",
  EXPIRED = "expired",
}

// Game session interface
export interface GameSession {
  session_id: string;
  user_id: string;
  telegram_id: number;
  game_mode: GameMode;
  started_at: string;
  expires_at: string;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

// Create session result
export interface CreateSessionResult {
  success: boolean;
  session_id?: string;
  expires_at?: Date;
  error?: string;
}

// Validate session result
export interface ValidateSessionResult {
  success: boolean;
  was_valid: boolean;
  error?: string;
}

// Session configuration
const SESSION_CONFIG = {
  DURATION_MINUTES: 2,
  CLEANUP_BATCH_SIZE: 1000,
} as const;

/**
 * Server-side game session service
 */
export const serverGameSessionService = {
  /**
   * Create a new game session
   */
  async createSession(
    userId: string,
    telegramId: number,
    gameMode: GameMode,
  ): Promise<CreateSessionResult> {
    try {
      const { data, error } = await supabaseServer.rpc("create_game_session", {
        p_user_id: userId,
        p_telegram_id: telegramId,
        p_game_mode: gameMode,
        p_session_duration_minutes: SESSION_CONFIG.DURATION_MINUTES,
      });

      if (error) {
        console.error("Error creating game session:", error);

        return {
          success: false,
          error: "Failed to create game session",
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: "No session data returned",
        };
      }

      const sessionData = data[0];

      return {
        success: true,
        session_id: sessionData.session_id,
        expires_at: new Date(sessionData.expires_at),
      };
    } catch (error) {
      console.error("Error in createSession:", error);

      return {
        success: false,
        error: "Internal server error",
      };
    }
  },

  /**
   * Validate and finish a game session
   */
  async validateAndFinishSession(
    sessionId: string,
    telegramId: number,
  ): Promise<ValidateSessionResult> {
    try {
      const { data, error } = await supabaseServer.rpc("finish_game_session", {
        p_session_id: sessionId,
        p_telegram_id: telegramId,
      });

      if (error) {
        console.error("Error validating session:", error);

        return {
          success: false,
          was_valid: false,
          error: "Failed to validate session",
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          was_valid: false,
          error: "No session validation data returned",
        };
      }

      const result = data[0];

      return {
        success: result.success,
        was_valid: result.was_valid,
        error: result.error_message || undefined,
      };
    } catch (error) {
      console.error("Error in validateAndFinishSession:", error);

      return {
        success: false,
        was_valid: false,
        error: "Internal server error",
      };
    }
  },

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<GameSession | null> {
    try {
      const { data, error } = await supabaseServer
        .from("game_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (error) {
        console.error("Error getting session:", error);

        return null;
      }

      return data as GameSession;
    } catch (error) {
      console.error("Error in getSession:", error);

      return null;
    }
  },

  /**
   * Get active sessions for user
   */
  async getActiveSessions(telegramId: number): Promise<GameSession[]> {
    try {
      const { data, error } = await supabaseServer
        .from("game_sessions")
        .select("*")
        .eq("telegram_id", telegramId)
        .eq("status", SessionStatus.ACTIVE)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error getting active sessions:", error);

        return [];
      }

      return data as GameSession[];
    } catch (error) {
      console.error("Error in getActiveSessions:", error);

      return [];
    }
  },

  /**
   * Force expire a session (for emergency cleanup)
   */
  async expireSession(sessionId: string, telegramId: number): Promise<boolean> {
    try {
      const { error } = await supabaseServer
        .from("game_sessions")
        .update({
          status: SessionStatus.EXPIRED,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId)
        .eq("telegram_id", telegramId)
        .eq("status", SessionStatus.ACTIVE);

      if (error) {
        console.error("Error expiring session:", error);

        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in expireSession:", error);

      return false;
    }
  },

  /**
   * Cleanup expired sessions (CRON function placeholder)
   */
  async cleanupExpiredSessions(): Promise<{
    cleaned_count: number;
    cleanup_timestamp: Date;
  }> {
    try {
      const { data, error } = await supabaseServer.rpc(
        "cleanup_expired_game_sessions",
      );

      if (error) {
        console.error("Error cleaning up sessions:", error);

        return {
          cleaned_count: 0,
          cleanup_timestamp: new Date(),
        };
      }

      if (!data || data.length === 0) {
        return {
          cleaned_count: 0,
          cleanup_timestamp: new Date(),
        };
      }

      const result = data[0];

      return {
        cleaned_count: result.cleaned_count,
        cleanup_timestamp: new Date(result.cleanup_timestamp),
      };
    } catch (error) {
      console.error("Error in cleanupExpiredSessions:", error);

      return {
        cleaned_count: 0,
        cleanup_timestamp: new Date(),
      };
    }
  },

  /**
   * Get session statistics (for monitoring)
   */
  async getSessionStats(): Promise<{
    active_sessions: number;
    finished_sessions_today: number;
    expired_sessions_today: number;
  }> {
    try {
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      const [activeResult, finishedResult, expiredResult] = await Promise.all([
        supabaseServer
          .from("game_sessions")
          .select("session_id", { count: "exact" })
          .eq("status", SessionStatus.ACTIVE),

        supabaseServer
          .from("game_sessions")
          .select("session_id", { count: "exact" })
          .eq("status", SessionStatus.FINISHED)
          .gte("updated_at", startOfDay.toISOString()),

        supabaseServer
          .from("game_sessions")
          .select("session_id", { count: "exact" })
          .eq("status", SessionStatus.EXPIRED)
          .gte("updated_at", startOfDay.toISOString()),
      ]);

      return {
        active_sessions: activeResult.count || 0,
        finished_sessions_today: finishedResult.count || 0,
        expired_sessions_today: expiredResult.count || 0,
      };
    } catch (error) {
      console.error("Error getting session stats:", error);

      return {
        active_sessions: 0,
        finished_sessions_today: 0,
        expired_sessions_today: 0,
      };
    }
  },

  /**
   * Session configuration getters
   */
  getSessionConfig() {
    return SESSION_CONFIG;
  },

  /**
   * Generate session ID (fallback if needed)
   */
  generateSessionId(): string {
    return crypto.randomUUID();
  },
};
