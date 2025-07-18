// src/hooks/modules/useProfile.ts - Updated profile hook with correct types

import type {
  SafeProfileData,
  SafeReferralData,
  UserRankings,
  ProfileResponse,
} from "@/lib/server/profileService";

import { useState, useCallback, useRef } from "react";

// Profile state interface
interface ProfileState {
  profile: SafeProfileData | null;
  referrals: SafeReferralData | null;
  rankings: UserRankings | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Profile management hook with centralized state and API communication
 * Provides profile data, referrals information, and user rankings
 * Data is always fetched fresh without caching
 */
export function useProfile(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<ProfileState>({
    profile: null,
    referrals: null,
    rankings: null,
    isLoading: false,
    error: null,
  });

  // Track current request to prevent duplicates
  const fetchingRef = useRef<boolean>(false);

  /**
   * Fetch complete profile data from API (always fresh data)
   */
  const fetchProfile = useCallback(
    async (forceRefresh = false): Promise<ProfileResponse | null> => {
      // Prevent duplicate requests
      if (fetchingRef.current) {
        console.log("Profile fetch already in progress");

        return state.profile && state.referrals && state.rankings
          ? {
              profile: state.profile,
              referrals: state.referrals,
              rankings: state.rankings,
            }
          : null;
      }

      fetchingRef.current = true;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log("Fetching fresh profile data from API...");

        const response = await makeAuthenticatedRequest("/api/profile");

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch profile data");
        }

        const profileData: ProfileResponse = result.data;

        setState({
          profile: profileData.profile,
          referrals: profileData.referrals,
          rankings: profileData.rankings,
          isLoading: false,
          error: null,
        });

        console.log("Successfully fetched fresh profile data:", {
          hasProfile: !!profileData.profile,
          hasReferrals: !!profileData.referrals,
          rankingsCount: Object.keys(profileData.rankings).length,
        });

        return profileData;
      } catch (error) {
        console.error("Error fetching profile data:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        return null;
      } finally {
        fetchingRef.current = false;
      }
    },
    [makeAuthenticatedRequest],
  );

  /**
   * Update profile data
   */
  const updateProfile = useCallback(
    async (
      updates: Partial<SafeProfileData>,
    ): Promise<SafeProfileData | null> => {
      if (fetchingRef.current) {
        console.log("Profile update already in progress");

        return state.profile;
      }

      fetchingRef.current = true;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log("Updating profile data...", updates);

        const response = await makeAuthenticatedRequest("/api/profile", {
          method: "PATCH",
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to update profile");
        }

        const profileData: ProfileResponse = result.data;

        setState({
          profile: profileData.profile,
          referrals: profileData.referrals,
          rankings: profileData.rankings,
          isLoading: false,
          error: null,
        });

        console.log("Successfully updated profile data");

        return profileData.profile;
      } catch (error) {
        console.error("Error updating profile:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        return null;
      } finally {
        fetchingRef.current = false;
      }
    },
    [makeAuthenticatedRequest],
  );

  /**
   * Get current profile data (if available)
   */
  const getCurrentProfile = useCallback((): ProfileResponse | null => {
    if (state.profile && state.referrals && state.rankings) {
      return {
        profile: state.profile,
        referrals: state.referrals,
        rankings: state.rankings,
      };
    }

    return null;
  }, [state.profile, state.referrals, state.rankings]);

  /**
   * Invalidate cache (now just resets data)
   */
  const invalidateCache = useCallback(() => {
    console.log("Invalidating profile data");
    setState((prev) => ({
      ...prev,
      profile: null,
      referrals: null,
      rankings: null,
    }));
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Reset profile state
   */
  const resetProfile = useCallback(() => {
    setState({
      profile: null,
      referrals: null,
      rankings: null,
      isLoading: false,
      error: null,
    });
  }, []);

  /**
   * Check if profile data is available
   */
  const hasProfileData = useCallback((): boolean => {
    return !!(state.profile && state.referrals && state.rankings);
  }, [state.profile, state.referrals, state.rankings]);

  return {
    // State with correct types
    profile: state.profile,
    referrals: state.referrals,
    rankings: state.rankings,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    fetchProfile,
    updateProfile,
    getCurrentProfile,
    invalidateCache,
    clearError,
    resetProfile,

    // Utility functions
    hasProfileData,
    hasValidCache: false, // Caching disabled, always false
  };
}
