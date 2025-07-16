// src/lib/authService.ts - Очищенная версия без устаревших security методов

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
} from "@/lib/supabase";
import {
  ReactionGameResult,
  SurvivalGameResult,
  PhysicsGameResult,
  RotationGameResult,
} from "@/types/game-modes";
import { TournamentSaveResponse } from "@/lib/supabase_tournament_extension";

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

export interface SecurityEvaluation {
  status: "allow" | "require_verification" | "block";
  method?: "interactive" | "biometric";
  token?: string;
  expires?: number;
}

export interface SecurityChallenge {
  question: string;
  expectedAnswer: string;
}

export interface VerificationResult {
  verified: boolean;
  status: string;
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

  async getLeagueProgress(): Promise<LeagueProgressInfo> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    return this.makeAuthenticatedRequest<{ progressInfo: LeagueProgressInfo }>(
      "/leagues/progress",
    ).then((data) => data.progressInfo);
  }

  async evaluateSecurityRequirements(action: string = "game_access"): Promise<SecurityEvaluation> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    return this.makeAuthenticatedRequest<SecurityEvaluation>(
      "/security/evaluate",
      {
        method: "POST",
        body: JSON.stringify({ action }),
      },
    );
  }

  async submitVerification(
    token: string,
    method: "interactive" | "biometric",
    payload: any
  ): Promise<VerificationResult> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    return this.makeAuthenticatedRequest<VerificationResult>(
      "/security/verify",
      {
        method: "POST",
        body: JSON.stringify({ token, method, payload }),
      },
    );
  }

  async generateInteractiveChallenge(): Promise<SecurityChallenge> {
    const operations = [
      { op: "+", symbol: "+" },
      { op: "-", symbol: "-" },
      { op: "*", symbol: "×" }
    ];

    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let result: number;
    switch (operation.op) {
      case "+":
        result = num1 + num2;
        break;
      case "-":
        result = num1 - num2;
        break;
      case "*":
        result = num1 * num2;
        break;
      default:
        result = num1 + num2;
    }

    return {
      question: `${num1} ${operation.symbol} ${num2} = ?`,
      expectedAnswer: result.toString()
    };
  }

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

export const authService = new AuthService();

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