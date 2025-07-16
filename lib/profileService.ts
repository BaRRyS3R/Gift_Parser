// src/lib/profileService.ts - Updated to use authService API methods exclusively

import { authService } from "./authService";
import type { ProfileData, AchievementData, LeagueData } from "./authService";

class ProfileService {
  constructor() {}

  /**
   * Get comprehensive profile data using authService API
   */
  async getProfileData(): Promise<ProfileData> {
    try {
      console.log("ProfileService: Fetching profile data via authService API...");
      const profile = await authService.getFullProfile();
      console.log("ProfileService: Profile data fetched successfully");
      return profile;
    } catch (error) {
      console.error("ProfileService: Error fetching profile data:", error);
      throw error;
    }
  }

  /**
   * Get user achievements using authService API
   */
  async getAchievements(): Promise<AchievementData> {
    try {
      console.log("ProfileService: Fetching achievements via authService API...");
      const achievements = await authService.getAchievements();
      console.log("ProfileService: Achievements fetched successfully");
      return achievements;
    } catch (error) {
      console.error("ProfileService: Error fetching achievements:", error);
      throw error;
    }
  }

  /**
   * Get league data using authService API
   */
  async getLeagueData(): Promise<LeagueData> {
    try {
      console.log("ProfileService: Fetching league data via authService API...");
      const leagueData = await authService.getLeagueData();
      console.log("ProfileService: League data fetched successfully");
      return leagueData;
    } catch (error) {
      console.error("ProfileService: Error fetching league data:", error);
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
      console.log("ProfileService: Fetching all profile data in parallel via authService API...");
      const result = await authService.getAllProfileData();
      console.log("ProfileService: All profile data fetched successfully");
      return result;
    } catch (error) {
      console.error("ProfileService: Error fetching all profile data:", error);
      throw error;
    }
  }

  /**
   * Refresh profile data with retry logic
   */
  async refreshProfileData(maxRetries: number = 3): Promise<ProfileData> {
    console.log("ProfileService: Refreshing profile data with retry logic...");
    return authService.makeRequestWithRetry(
      () => this.getProfileData(),
      maxRetries,
    );
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return authService.isAuthenticated();
  }

  /**
   * Sign out user
   */
  signOut(): void {
    console.log("ProfileService: Signing out user...");
    authService.signOut();
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

export async function getAllSecureProfileData(): Promise<{
  profile: ProfileData;
  achievements: AchievementData;
  leagueData: LeagueData;
}> {
  return profileService.getAllProfileData();
}