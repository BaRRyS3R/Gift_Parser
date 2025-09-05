// src/app/profile/page.tsx - Updated with centralized Telegram button management

"use client";

import React, { useState, useEffect, useRef } from "react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import { telegramButtonManager } from "@/utils/TelegramButtonManager";

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

  useEffect(() => {
    if (telegramButtonManager.isAvailable()) {
      telegramButtonManager.setClosingState({
        showConfirmation: false
      });
    }

    return () => {
      telegramButtonManager.emergencyReset();
    };
  }, []);

  // **PRINCIPLE 2: Force state changes when modals open/close**
  useEffect(() => {
    const isAnyModalOpen = isReferralModalOpen || isAchievementsModalOpen;

    if (telegramButtonManager.isAvailable()) {
      if (!isAnyModalOpen) {
        // **PRINCIPLE 3: Force normal state when no modals**
        console.log("ProfilePage: No modals open, forcing normal state");

        // Wait for modal cleanup, then force normal state
        setTimeout(() => {
          telegramButtonManager.setNormalState();
        }, 100);
      }
      // Modal state is handled by the modals themselves
    }
  }, [isReferralModalOpen, isAchievementsModalOpen]);

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
      console.log("ProfilePage: Opening ReferralModal");
      setIsReferralModalOpen(true);
    }
  };

  const handleCloseReferrals = () => {
    console.log("ProfilePage: Closing ReferralModal");
    setIsReferralModalOpen(false);
  };

  const handleOpenAchievements = () => {
    console.log("ProfilePage: Opening AchievementsModal");
    setIsAchievementsModalOpen(true);
  };

  const handleCloseAchievements = () => {
    console.log("ProfilePage: Closing AchievementsModal");
    setIsAchievementsModalOpen(false);
  };

  // Show basic error screen if user is not authenticated
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

  const isLoading = profile.isLoading && !profileData;

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
        {/* Enhanced Profile Header with Skeleton */}
        {isLoading ? (
          <div className="text-center px-4 py-6 space-y-4">
            {/* Show user name immediately from telegramUser */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white animate-fade-in">
                {telegramUser.first_name} {telegramUser.last_name || ""}
              </h2>
              {telegramUser.username && (
                <p className="text-white/60 animate-fade-in">
                  @{telegramUser.username}
                </p>
              )}
            </div>

            {/* Achievement Icons Skeleton */}
            <div className="flex justify-center space-x-2 mt-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 bg-white/10 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        ) : profileUser ? (
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

        {/* Action Buttons with Skeleton */}
        {isLoading ? (
          <div className="flex space-x-4 px-4 mb-6">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="flex-1 h-12 bg-white/10 rounded-lg animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : (
          <MinimalistActionButtons
            onOpenAchievements={handleOpenAchievements}
            onOpenReferrals={handleOpenReferrals}
          />
        )}

        {/* Divider */}
        <MinimalistDivider />

        {/* Game Statistics with Skeleton */}
        {isLoading ? (
          <div className="space-y-6 px-4">
            {/* Stats Title Skeleton */}
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-white/10 rounded animate-pulse" />
              <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
            </div>

            {/* Stats Card Skeleton */}
            <div className="bg-black/40 border border-white/20 rounded-lg p-5">
              <div className="space-y-6">
                {/* 5 Stats Sections (Overall + 4 Game Modes) */}
                {[...Array(5)].map((_, sectionIndex) => (
                  <div key={sectionIndex} className={sectionIndex < 4 ? "border-b border-white/10 pb-4" : ""}>
                    {/* Section Header */}
                    <div className="flex items-center space-x-2 mb-3">
                      <div
                        className="w-6 h-6 rounded bg-white/10 animate-pulse"
                        style={{ animationDelay: `${sectionIndex * 0.1}s` }}
                      />
                      <div
                        className="h-4 w-28 bg-white/10 rounded animate-pulse"
                        style={{ animationDelay: `${sectionIndex * 0.1 + 0.05}s` }}
                      />
                    </div>

                    {/* Stats Items */}
                    <div className="ml-8 space-y-1">
                      {[...Array(sectionIndex === 0 ? 1 : 4)].map((_, itemIndex) => (
                        <div key={itemIndex} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-4 h-4 bg-white/5 rounded animate-pulse"
                              style={{ animationDelay: `${sectionIndex * 0.1 + itemIndex * 0.05}s` }}
                            />
                            <div
                              className="h-3 w-20 bg-white/5 rounded animate-pulse"
                              style={{ animationDelay: `${sectionIndex * 0.1 + itemIndex * 0.05 + 0.02}s` }}
                            />
                          </div>
                          <div
                            className="h-3 w-12 bg-white/10 rounded animate-pulse"
                            style={{ animationDelay: `${sectionIndex * 0.1 + itemIndex * 0.05 + 0.04}s` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <MinimalistGameStats isLoading={profile.isLoading} user={profileUser} />
        )}

        {/* Bottom spacing for safe area */}
        <div className="h-20" />
      </div>

      {/* Modals - Updated with centralized button management */}
      {profileData?.referrals && (
        <ReferralModal
          isOpen={isReferralModalOpen}
          referralInfo={profileData.referrals}
          onClose={handleCloseReferrals}
        />
      )}

      {/* Updated Achievements Modal with achievements data */}
      <AchievementsModal
        achievements={achievements}
        isOpen={isAchievementsModalOpen}
        rankings={rankings}
        user={profileUser}
        onClose={handleCloseAchievements}
      />
    </div>
  );
}