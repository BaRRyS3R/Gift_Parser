// src/lib/profileService.ts - Client-side profile service with JWT protection

import { authService } from "./authService";

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

class ProfileService {
  private baseUrl: string;

  constructor() {
    // Use the same URL configuration as AuthService
    this.baseUrl = this.getApiBaseUrl();
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

  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = authService.getToken();

    if (!token) {
      throw new Error("Authentication required");
    }

    const url = `${this.baseUrl}/api${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        // Token expired - clear authentication
        authService.signOut();
        throw new Error("Authentication expired. Please log in again.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          errorData.message || `Request failed with status ${response.status}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Request failed");
      }

      return data;
    } catch (error) {
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        throw new Error(
          "Network connection failed. Please check your internet connection.",
        );
      }
      throw error;
    }
  }

  /**
   * Get comprehensive profile data
   */
  async getProfileData(): Promise<ProfileData> {
    try {
      const response = await this.makeAuthenticatedRequest<{
        profile: ProfileData;
      }>("/profile");

      return response.profile;
    } catch (error) {
      console.error("Error fetching profile data:", error);
      throw error;
    }
  }

  /**
   * Get user achievements
   */
  async getAchievements(): Promise<AchievementData> {
    try {
      const response = await this.makeAuthenticatedRequest<{
        achievements: AchievementData;
      }>("/profile/achievements");

      return response.achievements;
    } catch (error) {
      console.error("Error fetching achievements:", error);
      throw error;
    }
  }

  /**
   * Get league data
   */
  async getLeagueData(): Promise<LeagueData> {
    try {
      const response = await this.makeAuthenticatedRequest<{
        leagueData: LeagueData;
      }>("/profile/leagues");

      return response.leagueData;
    } catch (error) {
      console.error("Error fetching league data:", error);
      throw error;
    }
  }

  /**
   * Get all profile data in parallel for better performance
   */
  async getAllProfileData(): Promise<{
    profile: ProfileData;
    achievements: AchievementData;
    leagueData: LeagueData;
  }> {
    try {
      const [profile, achievements, leagueData] = await Promise.all([
        this.getProfileData(),
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

  /**
   * Refresh profile data with retry logic
   */
  async refreshProfileData(maxRetries: number = 3): Promise<ProfileData> {
    return authService.makeRequestWithRetry(
      () => this.getProfileData(),
      maxRetries,
    );
  }
}

// Singleton instance
export const profileService = new ProfileService();

// Helper functions for backward compatibility
export async function getSecureProfileData(): Promise<ProfileData> {
  return profileService.getProfileData();
}

export async function getSecureAchievements(): Promise<AchievementData> {
  return profileService.getAchievements();
}

export async function getSecureLeagueData(): Promise<LeagueData> {
  return profileService.getLeagueData();
}

export async function getAllSecureProfileData() {
  return profileService.getAllProfileData();
}
