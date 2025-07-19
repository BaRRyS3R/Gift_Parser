// src/app/profile/page.tsx - Исправленная версия с автообновлением данных лиг

"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

// Import components
import EnhancedProfileHeader from "@/components/Profile/EnhancedProfileHeader";
import MinimalistActionButtons from "@/components/Profile/MinimalistActionButtons";
import MinimalistDivider from "@/components/Profile/MinimalistDivider";
import MinimalistGameStats from "@/components/Profile/MinimalistGameStats";
import ReferralModal from "@/components/Profile/ReferralModal";
import AchievementsModal from "@/components/Profile/AchievementsModal";
import LeaguesModal from "@/components/LeagueProgress/LeaguesModal";

export default function ProfilePage() {
  const { authState, telegramUser, profile, leagues } = useUser();
  const t = useT();

  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
  const [isLeaguesModalOpen, setIsLeaguesModalOpen] = useState(false);

  // Track total games to detect changes
  const [lastKnownTotalGames, setLastKnownTotalGames] = useState<number | null>(null);

  // Load profile data when user is authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.user && telegramUser) {
      console.log("User authenticated, loading fresh profile data...");
      profile.fetchProfileData();
    }
  }, [authState.isAuthenticated, authState.user, telegramUser]);

  // ALWAYS load fresh league data when user is authenticated (regardless of cached data)
  useEffect(() => {
    if (authState.isAuthenticated && authState.user && telegramUser && !leagues.isLoading) {
      console.log("Loading fresh league data on profile page entry...");
      leagues.fetchLeagueData();
    }
  }, [authState.isAuthenticated, authState.user, telegramUser, leagues.isLoading]);

  // Update league data when total games changes (for immediate updates after playing)
  useEffect(() => {
    const currentTotalGames = profile.profileData?.user?.total_games;

    if (currentTotalGames !== undefined && currentTotalGames !== null) {
      // If this is the first time we see the total games, just store it
      if (lastKnownTotalGames === null) {
        setLastKnownTotalGames(currentTotalGames);
        return;
      }

      // If total games changed, update league data immediately
      if (currentTotalGames !== lastKnownTotalGames) {
        console.log(`Total games changed from ${lastKnownTotalGames} to ${currentTotalGames}, updating league data...`);
        setLastKnownTotalGames(currentTotalGames);

        // Force refresh league data
        leagues.fetchLeagueData();
      }
    }
  }, [profile.profileData?.user?.total_games, lastKnownTotalGames, leagues.fetchLeagueData]);

  // Reset data when leaving the page (cleanup)
  useEffect(() => {
    return () => {
      console.log("ProfilePage unmounting, resetting league data for fresh load next time");
      leagues.resetLeagueData();
    };
  }, []);

  const handleOpenReferrals = () => {
    if (profile.profileData?.referrals) {
      setIsReferralModalOpen(true);
    }
  };

  const handleOpenAchievements = () => {
    if (profile.profileData?.user) {
      setIsAchievementsModalOpen(true);
    }
  };

  const handleOpenLeagues = () => {
    // Ensure we have fresh league data when opening the modal
    if (profile.profileData?.user && !leagues.isLoading) {
      console.log("Opening leagues modal, ensuring fresh data...");
      leagues.fetchLeagueData().then(() => {
        setIsLeaguesModalOpen(true);
      });
    } else {
      setIsLeaguesModalOpen(true);
    }
  };

  // Show loading while user data is being authenticated or profile data is loading
  if (authState.isLoading || (authState.isAuthenticated && !profile.profileData && profile.isLoading)) {
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
            onClick={() => {
              profile.fetchProfileData();
              leagues.fetchLeagueData();
            }}
            className="px-4 py-2 bg-white/10 border border-white/30 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  // Get profile data and convert undefined to null for type compatibility
  const profileData = profile.profileData;
  const profileUser = profileData?.user ?? null;
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
        {/* Enhanced Profile Header with Level and League */}
        {profileUser ? (
          <EnhancedProfileHeader user={profileUser} />
        ) : (
          <div className="text-center space-y-3 px-4 py-6">
            <div className="space-y-2">
              <div className="h-8 bg-white/10 rounded animate-pulse mx-auto w-48" />
              <div className="h-4 bg-white/10 rounded animate-pulse mx-auto w-32" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <MinimalistActionButtons
          onOpenReferrals={handleOpenReferrals}
          onOpenAchievements={handleOpenAchievements}
          onOpenLeagues={handleOpenLeagues}
        />

        {/* Divider */}
        <MinimalistDivider />

        {/* Game Statistics with Level Progress */}
        <MinimalistGameStats
          user={profileUser}
          isLoading={profile.isLoading}
        />

        {/* Bottom spacing for safe area */}
        <div className="h-20" />
      </div>

      {/* Modals */}
      {profileData?.referrals && (
        <ReferralModal
          isOpen={isReferralModalOpen}
          onClose={() => setIsReferralModalOpen(false)}
          referralInfo={profileData.referrals}
        />
      )}

      {profileUser && (
        <AchievementsModal
          isOpen={isAchievementsModalOpen}
          onClose={() => setIsAchievementsModalOpen(false)}
          user={profileUser}
          rankings={rankings}
        />
      )}

      {/* Leagues Modal */}
      <LeaguesModal
        isOpen={isLeaguesModalOpen}
        onClose={() => setIsLeaguesModalOpen(false)}
      />
    </div>
  );
}