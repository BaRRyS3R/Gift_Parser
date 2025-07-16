// src/lib/authService.ts - Enhanced with complete profile API integration

import type {
  Tournament,
  TournamentLeaderboardEntry,
  TournamentResult,
  TournamentStatus,
  TournamentListResponse,
} from "@/types/tournaments";

import {
  GameSaveResult,
  AttemptsStatus,
  SecurityCheckResult,
  userService,
} from "@/lib/supabase";
import {
  ReactionGameResult,
  SurvivalGameResult,
  PhysicsGameResult,
  RotationGameResult,
} from "@/types/game-modes";
import { TournamentSaveResponse } from "@/lib/supabase_tournament_extension";

// Enhanced profile types
export interface ProfileData {
  user: {
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    is_premium: boolean;
    current_level: number;
    attempts_remaining: number;
    total_games: number;
    total_score: number;
    best_score: number;

    // Game mode statistics
    reaction_games: number;
    reaction_best_score: number;
    reaction_best_time: number;
    reaction_average_time: number;

    survival_games: number;
    survival_best_score: number;
    survival_best_time: number;
    survival_max_level: number;
    survival_best_streak: number;

    physics_games: number;
    physics_best_score: number;
    physics_best_time: number;
    physics_total_hits: number;
    physics_best_hits: number;
    physics_least_mistakes: number;

    rotation_games: number;
    rotation_best_score: number;
    rotation_best_time: number;
    rotation_max_level: number;
    rotation_best_streak: number;
    rotation_total_hits: number;

    referral_count: number;
    last_played_at?: string;
  };
  rankings: {
    overall: number | null;
    reaction: number | null;
    survival: number | null;
    physics: number | null;
    rotation: number | null;
  };
  referralInfo: any;
  leagueProgress: any;
}

export interface AchievementData {
  categories: any[];
  stats: {
    total: number;
    unlocked: number;
    percentage: number;
  };
}

export interface LeagueData {
  allLeagues: any[];
  userLeagueProgress: any;
  userRewards: any[];
  allLeagueRewards: Record<number, any[]>;
  leagueNeighbors: any;
  leaderboards: Record<number, any>;
}

export interface AuthUser {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  current_level: number;
  attempts_remaining: number;
  total_games: number;
  total_score: number;
  best_score: number;
  current_league_id?: number;
  trust_score: number;
  blocked_until?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface RegistrationResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  referralApplied?: boolean;
  referralBonus?: number;
  error?: string;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  isExistingUser?: boolean;
  needsRegistration?: boolean;
  telegramUser?: any;
  referralCode?: string;
  error?: string;
  isBlocked?: boolean;
  timeUntilUnblock?: number;
  blockReason?: string;
}

export interface LeagueProgressInfo {
  currentLevel: number;
  totalGames: number;
  currentLeague: {
    id: number;
    name: string;
    display_name_en: string;
    color: string;
    icon: string;
  };
  nextLeague?: {
    id: number;
    name: string;
    display_name_en: string;
    color: string;
    icon: string;
  };
  gamesToNextLeague: number;
  progressPercent: number;
  isMaxLeague: boolean;
}

type GameResult =
  | ReactionGameResult
  | SurvivalGameResult
  | PhysicsGameResult
  | RotationGameResult;

class AuthService {
  private token: string | null = null;
  private baseUrl: string;

  constructor() {
    this.baseUrl = this.getApiBaseUrl();
    this.loadTokenFromStorage();
  }

  private getApiBaseUrl(): string {
    if (typeof window !== "undefined") {
      if (process.env.NODE_ENV === "production") {
        return window.location.origin;
      }

      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
      }

      return window.location.origin;
    }

    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  }

  private loadTokenFromStorage(): void {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
  }

  private saveTokenToStorage(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
      this.token = token;
    }
  }

  private removeTokenFromStorage(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      this.token = null;
    }
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      if (response.status === 401) {
        this.removeTokenFromStorage();
        throw new Error("Authentication expired. Please log in again.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          errorData.message || `Request failed with status ${response.status}`,
        );
      }

      return response.json();
    } catch (error) {
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        console.error(
          "Network error - check your connection and API URL:",
          url,
        );
        throw new Error(
          "Network connection failed. Please check your internet connection.",
        );
      }
      throw error;
    }
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  async checkLoginStatus(
    initData: string,
    referralCode?: string,
  ): Promise<LoginResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initData,
          referralCode,
        }),
      });

      const data = await response.json();

      if (response.status === 202) {
        return {
          success: false,
          needsRegistration: true,
          telegramUser: data.telegramUser,
          referralCode: data.referralCode,
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          isBlocked: true,
          timeUntilUnblock: data.timeUntilUnblock,
          blockReason: data.blockReason,
          error: data.error,
        };
      }

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Login failed",
        };
      }

      this.saveTokenToStorage(data.token);

      return {
        success: true,
        user: data.user,
        token: data.token,
        isExistingUser: data.isExistingUser,
      };
    } catch (error) {
      console.error("Login check error:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  }

  async registerUser(
    initData: string,
    referralCode?: string,
  ): Promise<RegistrationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initData,
          referralCode,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Registration failed",
        };
      }

      this.saveTokenToStorage(data.token);

      return {
        success: true,
        user: data.user,
        token: data.token,
        referralApplied: data.referralApplied,
        referralBonus: data.referralBonus,
      };
    } catch (error) {
      console.error("Registration error:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      };
    }
  }

  async authenticateWithTelegram(
    initData: string,
    referralCode?: string,
  ): Promise<AuthUser> {
    const loginResult = await this.checkLoginStatus(initData, referralCode);

    if (loginResult.success && loginResult.user) {
      return loginResult.user;
    }

    if (loginResult.isBlocked) {
      throw new Error(`User is blocked: ${loginResult.error}`);
    }

    if (loginResult.needsRegistration) {
      const registerResult = await this.registerUser(initData, referralCode);

      if (registerResult.success && registerResult.user) {
        return registerResult.user;
      }

      throw new Error(registerResult.error || "Registration failed");
    }

    throw new Error(loginResult.error || "Authentication failed");
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  getToken(): string | null {
    return this.token;
  }

  signOut(): void {
    this.removeTokenFromStorage();
  }

  // ============================================================================
  // PROFILE API METHODS
  // ============================================================================

  async getFullProfile(): Promise<ProfileData> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    return this.makeAuthenticatedRequest<{ profile: ProfileData }>(
      "/profile",
    ).then((data) => data.profile);
  }

  async getAchievements(): Promise<AchievementData> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    return this.makeAuthenticatedRequest<{ achievements: AchievementData }>(
      "/profile/achievements",
    ).then((data) => data.achievements);
  }

  async getLeagueData(): Promise<LeagueData> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    return this.makeAuthenticatedRequest<{ leagueData: LeagueData }>(
      "/profile/leagues",
    ).then((data) => data.leagueData);
  }

  async getAllProfileData(): Promise<{
    profile: ProfileData;
    achievements: AchievementData;
    leagueData: LeagueData;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    try {
      const [profile, achievements, leagueData] = await Promise.all([
        this.getFullProfile(),
        this.getAchievements(),
        this.getLeagueData(),
      ]);

      return {
        profile,
        achievements,
        leagueData,
      };
    } catch (error) {
      console.error("Error fetching all profile data:", error);
      throw error;
    }
  }

  // ============================================================================
  // USER METHODS
  // ============================================================================

  async getAttemptsStatus(): Promise<AttemptsStatus> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    return this.makeAuthenticatedRequest<{ attemptsStatus: AttemptsStatus }>(
      "/user/attempts-status",
    ).then((data) => data.attemptsStatus);
  }

  async refreshUserData(): Promise<AuthUser> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    return this.makeAuthenticatedRequest<{ user: AuthUser }>(
      "/user/profile",
    ).then((data) => data.user);
  }

  async checkUserSecurityStatus(): Promise<SecurityCheckResult> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    return this.makeAuthenticatedRequest<{
      securityResult: SecurityCheckResult;
    }>("/security/check-status").then((data) => data.securityResult);
  }

  async getLeagueProgress(): Promise<LeagueProgressInfo> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    return this.makeAuthenticatedRequest<{ progressInfo: LeagueProgressInfo }>(
      "/leagues/progress",
    ).then((data) => data.progressInfo);
  }

  // ============================================================================
  // GAME METHODS
  // ============================================================================

  async consumeAttempt(): Promise<AttemptsStatus> {
    return this.makeAuthenticatedRequest<{ attemptsStatus: AttemptsStatus }>(
      "/game/consume-attempt",
      { method: "POST" },
    ).then((data) => data.attemptsStatus);
  }

  async saveGameResult(gameResult: GameResult): Promise<GameSaveResult> {
    return this.makeAuthenticatedRequest<{ saveResult: GameSaveResult }>(
      "/game/save-result",
      {
        method: "POST",
        body: JSON.stringify(gameResult),
      },
    ).then((data) => data.saveResult);
  }

  // ============================================================================
  // TOURNAMENT METHODS
  // ============================================================================

  async getActiveTournament(): Promise<Tournament | null> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await this.makeAuthenticatedRequest<{
        tournament: Tournament | null;
      }>("/tournament/active");

      return response.tournament;
    } catch (error) {
      console.error("Error getting active tournament:", error);

      return null;
    }
  }

  async getAllTournaments(): Promise<TournamentListResponse> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await this.makeAuthenticatedRequest<{
        tournaments: TournamentListResponse;
      }>("/tournament/all");

      return response.tournaments;
    } catch (error) {
      console.error("Error getting all tournaments:", error);

      return {
        active: [],
        upcoming: [],
        completed: [],
      };
    }
  }

  async getTournamentWinners(
    tournamentId: string,
    prizeCount: number,
  ): Promise<TournamentLeaderboardEntry[]> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await this.makeAuthenticatedRequest<{
        winners: TournamentLeaderboardEntry[];
      }>(`/tournament/winners?tournamentId=${tournamentId}&limit=${prizeCount}`);

      return response.winners;
    } catch (error) {
      console.error("Error getting tournament winners:", error);
      return [];
    }
  }
  async getTournamentStatus(): Promise<TournamentStatus> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await this.makeAuthenticatedRequest<{
        status: TournamentStatus;
      }>("/tournament/status");

      return response.status;
    } catch (error) {
      console.error("Error getting tournament status:", error);

      return {
        isActive: false,
        activeTournament: null,
      };
    }
  }

  async getTournamentLeaderboard(
    tournamentId: string,
    limit: number = 50,
  ): Promise<TournamentLeaderboardEntry[]> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await this.makeAuthenticatedRequest<{
        leaderboard: TournamentLeaderboardEntry[];
      }>(`/tournament/leaderboard?tournamentId=${tournamentId}&limit=${limit}`);

      return response.leaderboard;
    } catch (error) {
      console.error("Error getting tournament leaderboard:", error);

      return [];
    }
  }

  async getUserTournamentResult(
    tournamentId: string,
  ): Promise<TournamentResult | null> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await this.makeAuthenticatedRequest<{
        result: TournamentResult | null;
      }>(`/tournament/user-result?tournamentId=${tournamentId}`);

      return response.result;
    } catch (error) {
      console.error("Error getting user tournament result:", error);

      return null;
    }
  }

  async saveTournamentResult(
    tournamentId: string,
    gameResult: SurvivalGameResult,
  ): Promise<TournamentSaveResponse> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    return this.makeAuthenticatedRequest<{
      tournamentResult: TournamentSaveResponse;
    }>("/tournament/save-result", {
      method: "POST",
      body: JSON.stringify({
        tournamentId,
        gameResult,
      }),
    }).then((data) => data.tournamentResult);
  }

  // ============================================================================
  // SECURITY METHODS
  // ============================================================================

  async generateCaptcha(): Promise<{
    challenge: string;
    correctAnswer: string;
    expiresAt: number;
  }> {
    return this.makeAuthenticatedRequest<{
      challenge: string;
      correctAnswer: string;
      expiresAt: number;
    }>("/security/generate-captcha", { method: "POST" });
  }

  async validateCaptcha(
    userInput: string,
    correctAnswer: string,
    completedInTime: boolean,
  ): Promise<{ success: boolean; newTrustScore: number }> {
    return this.makeAuthenticatedRequest<{
      success: boolean;
      newTrustScore: number;
    }>("/security/validate-captcha", {
      method: "POST",
      body: JSON.stringify({
        userInput,
        correctAnswer,
        completedInTime,
      }),
    });
  }

  async validateBiometric(
    success: boolean,
    completedInTime: boolean,
  ): Promise<{ success: boolean; newTrustScore: number }> {
    return this.makeAuthenticatedRequest<{
      success: boolean;
      newTrustScore: number;
    }>("/security/validate-biometric", {
      method: "POST",
      body: JSON.stringify({
        success,
        completedInTime,
      }),
    });
  }

  async updateTrustScore(scoreChange: number): Promise<number> {
    return this.makeAuthenticatedRequest<{ newTrustScore: number }>(
      "/security/update-trust-score",
      {
        method: "POST",
        body: JSON.stringify({ scoreChange }),
      },
    ).then((data) => data.newTrustScore);
  }

  async checkUserBlockedStatus(
    telegramId: number,
  ): Promise<SecurityCheckResult> {
    try {
      if (this.isAuthenticated()) {
        return await this.checkUserSecurityStatus();
      } else {
        console.warn("User not authenticated, using direct service call");

        return await userService.checkUserBlockStatus(telegramId);
      }
    } catch (error) {
      console.warn("Auth API failed, using direct service call");

      return await userService.checkUserBlockStatus(telegramId);
    }
  }

  // ============================================================================
  // LEADERBOARD METHODS
  // ============================================================================

  async getReactionLeaderboard(limit: number = 50): Promise<import("@/types/safe-leaderboard").SafeReactionLeaderboardEntry[]> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await this.makeAuthenticatedRequest<import("@/types/safe-leaderboard").LeaderboardResponse<import("@/types/safe-leaderboard").SafeReactionLeaderboardEntry>>(
        `/leaderboard/reaction?limit=${limit}`
      );

      return response.leaderboard;
    } catch (error) {
      console.error("Error fetching reaction leaderboard:", error);
      throw error;
    }
  }

  async getSurvivalLeaderboard(limit: number = 50): Promise<import("@/types/safe-leaderboard").SafeSurvivalLeaderboardEntry[]> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await this.makeAuthenticatedRequest<import("@/types/safe-leaderboard").LeaderboardResponse<import("@/types/safe-leaderboard").SafeSurvivalLeaderboardEntry>>(
        `/leaderboard/survival?limit=${limit}`
      );

      return response.leaderboard;
    } catch (error) {
      console.error("Error fetching survival leaderboard:", error);
      throw error;
    }
  }

  async getPhysicsLeaderboard(limit: number = 50): Promise<import("@/types/safe-leaderboard").SafePhysicsLeaderboardEntry[]> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await this.makeAuthenticatedRequest<import("@/types/safe-leaderboard").LeaderboardResponse<import("@/types/safe-leaderboard").SafePhysicsLeaderboardEntry>>(
        `/leaderboard/physics?limit=${limit}`
      );

      return response.leaderboard;
    } catch (error) {
      console.error("Error fetching physics leaderboard:", error);
      throw error;
    }
  }

  async getRotationLeaderboard(limit: number = 50): Promise<import("@/types/safe-leaderboard").SafeRotationLeaderboardEntry[]> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await this.makeAuthenticatedRequest<import("@/types/safe-leaderboard").LeaderboardResponse<import("@/types/safe-leaderboard").SafeRotationLeaderboardEntry>>(
        `/leaderboard/rotation?limit=${limit}`
      );

      return response.leaderboard;
    } catch (error) {
      console.error("Error fetching rotation leaderboard:", error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async makeRequestWithRetry<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    let lastError: Error = new Error("Unknown error");

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          throw lastError;
        }

        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError;
  }
}

// Singleton instance
export const authService = new AuthService();

// Helper functions for backward compatibility
export async function authenticateUser(
  initData: string,
  referralCode?: string,
): Promise<AuthUser> {
  return authService.authenticateWithTelegram(initData, referralCode);
}

export function isUserAuthenticated(): boolean {
  return authService.isAuthenticated();
}

export function signOutUser(): void {
  authService.signOut();
}

export async function getSecureAttemptsStatus(): Promise<AttemptsStatus> {
  return authService.getAttemptsStatus();
}

export async function consumeSecureAttempt(): Promise<AttemptsStatus> {
  return authService.consumeAttempt();
}

export async function saveSecureGameResult(
  gameResult: GameResult,
): Promise<GameSaveResult> {
  return authService.saveGameResult(gameResult);
}

export async function saveSecureTournamentResult(
  tournamentId: string,
  gameResult: SurvivalGameResult,
): Promise<TournamentSaveResponse> {
  return authService.saveTournamentResult(tournamentId, gameResult);
}

export async function checkSecurityStatus(): Promise<SecurityCheckResult> {
  return authService.checkUserSecurityStatus();
}

export async function generateSecureCaptcha(): Promise<{
  challenge: string;
  correctAnswer: string;
  expiresAt: number;
}> {
  return authService.generateCaptcha();
}

export async function validateSecureCaptcha(
  userInput: string,
  correctAnswer: string,
  completedInTime: boolean,
): Promise<{ success: boolean; newTrustScore: number }> {
  return authService.validateCaptcha(userInput, correctAnswer, completedInTime);
}

export async function validateSecureBiometric(
  success: boolean,
  completedInTime: boolean,
): Promise<{ success: boolean; newTrustScore: number }> {
  return authService.validateBiometric(success, completedInTime);
}

export async function updateSecureTrustScore(
  scoreChange: number,
): Promise<number> {
  return authService.updateTrustScore(scoreChange);
}

export async function getSecureLeagueProgress(): Promise<LeagueProgressInfo> {
  return authService.getLeagueProgress();
}

export async function checkUserLoginStatus(
  initData: string,
  referralCode?: string,
): Promise<LoginResult> {
  return authService.checkLoginStatus(initData, referralCode);
}

export async function registerNewUser(
  initData: string,
  referralCode?: string,
): Promise<RegistrationResult> {
  return authService.registerUser(initData, referralCode);
}

// Enhanced profile helper functions
export async function getSecureProfileData(): Promise<ProfileData> {
  return authService.getFullProfile();
}

export async function getSecureAchievements(): Promise<AchievementData> {
  return authService.getAchievements();
}

export async function getSecureLeagueData(): Promise<LeagueData> {
  return authService.getLeagueData();
}

export async function getAllSecureProfileData(): Promise<{
  profile: ProfileData;
  achievements: AchievementData;
  leagueData: LeagueData;
}> {
  return authService.getAllProfileData();
}
