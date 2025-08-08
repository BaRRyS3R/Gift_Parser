// src/app/profile/page.tsx - Updated with achievements integration

"use client";

import React, { useState, useEffect, useRef } from "react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

// Import components
import EnhancedProfileHeader from "@/components/Profile/EnhancedProfileHeader";
import MinimalistActionButtons from "@/components/Profile/MinimalistActionButtons";
import MinimalistDivider from "@/components/Profile/MinimalistDivider";
import MinimalistGameStats from "@/components/Profile/MinimalistGameStats";
import ReferralModal from "@/components/Profile/ReferralModal";
import AchievementsModal from "@/components/Profile/AchievementsModal";

export default function ProfilePage() {
  const { authState, telegramUser, profile } = useUser();
  const t = useT();

  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);

  // Track total games to detect changes
  const [lastKnownTotalGames, setLastKnownTotalGames] = useState<number | null>(
    null,
  );

  // Track if initial data load has been triggered
  const dataLoadedRef = useRef<boolean>(false);

  // Load profile data when user is authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.user && telegramUser) {
      // Load profile data including achievements
      if (!dataLoadedRef.current) {
        profile.fetchProfileData();
        dataLoadedRef.current = true;
      }
    }
  }, [authState.isAuthenticated, authState.user, telegramUser]);

  // Refresh achievements when game count changes
  useEffect(() => {
    const currentTotalGames = profile.profileData?.user?.total_games;

    if (currentTotalGames !== undefined && currentTotalGames !== null) {
      // If this is the first time we see the total games, just store it
      if (lastKnownTotalGames === null) {
        setLastKnownTotalGames(currentTotalGames);

        return;
      }

      // If total games changed, refresh achievements to check for new unlocks
      if (currentTotalGames !== lastKnownTotalGames) {
        setLastKnownTotalGames(currentTotalGames);
        // Refresh achievements to check for new unlocks
        profile.fetchAchievements();
      }
    }
  }, [profile.profileData?.user?.total_games, lastKnownTotalGames]);

  const handleOpenReferrals = () => {
    if (profile.profileData?.referrals) {
      setIsReferralModalOpen(true);
    }
  };

  const handleOpenAchievements = () => {
    setIsAchievementsModalOpen(true);
  };

  // Show loading while user data is being authenticated or profile data is loading
  if (
    authState.isLoading ||
    (authState.isAuthenticated && !profile.profileData && profile.isLoading)
  ) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white">{t("profile.loadingProfile")}</p>
        </div>
      </div>
    );
  }

  // Check if user is not authenticated
  if (!authState.isAuthenticated || !authState.user || !telegramUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white/60 text-2xl">?</span>
          </div>
          <p className="text-white">{t("profile.notFound")}</p>
        </div>
      </div>
    );
  }

  // Show error if profile data failed to load
  if (profile.error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-red-400 text-2xl">!</span>
          </div>
          <p className="text-white">{profile.error}</p>
          <button
            className="px-4 py-2 bg-white/10 border border-white/30 text-white rounded-lg hover:bg-white/20 transition-colors"
            onClick={() => {
              profile.fetchProfileData();
            }}
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  // Get profile data
  const profileData = profile.profileData;
  const profileUser = profileData?.user ?? null;
  const achievements = profileData?.achievements;
  const rankings = profileData?.rankings || {
    overall: null,
    reaction: null,
    survival: null,
    physics: null,
    rotation: null,
  };

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
          {t("profile.title")}
        </h1>
      </div>

      <MinimalistDivider />

      <div className="max-w-md mx-auto">
        {/* Enhanced Profile Header with Achievement Icons */}
        {profileUser ? (
          <EnhancedProfileHeader
            achievements={achievements?.achievements}
            user={profileUser}
          />
        ) : (
          <div className="text-center px-4 py-6">
            <div className="space-y-2">
              <div className="h-8 bg-white/10 rounded animate-pulse mx-auto w-48" />
              <div className="h-4 bg-white/10 rounded animate-pulse mx-auto w-32" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <MinimalistActionButtons
          onOpenAchievements={handleOpenAchievements}
          onOpenReferrals={handleOpenReferrals}
        />

        {/* Divider */}
        <MinimalistDivider />

        {/* Game Statistics */}
        <MinimalistGameStats isLoading={profile.isLoading} user={profileUser} />

        {/* Bottom spacing for safe area */}
        <div className="h-20" />
      </div>

      {/* Modals */}
      {profileData?.referrals && (
        <ReferralModal
          isOpen={isReferralModalOpen}
          referralInfo={profileData.referrals}
          onClose={() => setIsReferralModalOpen(false)}
        />
      )}

      {/* Updated Achievements Modal with achievements data */}
      <AchievementsModal
        achievements={achievements}
        isOpen={isAchievementsModalOpen}
        rankings={rankings}
        user={profileUser}
        onClose={() => setIsAchievementsModalOpen(false)}
      />
    </div>
  );
}
