// src/app/profile/page.tsx - Final integration with league system, notifications, and compact display

"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { userService, leagueService, type ReferralInfo } from "@/lib/supabase";
import { useT } from "@/contexts/LocalizationContext";

// Import existing components
import MinimalistProfileHeader from "@/components/Profile/MinimalistProfileHeader";
import MinimalistActionButtons from "@/components/Profile/MinimalistActionButtons";
import MinimalistDivider from "@/components/Profile/MinimalistDivider";
import MinimalistGameStats from "@/components/Profile/MinimalistGameStats";
import ReferralModal from "@/components/Profile/ReferralModal";
import AchievementsModal from "@/components/Profile/AchievementsModal";

// Import new league system components
import CompactLeagueDisplay from "@/components/Profile/CompactLeagueDisplay";
import RewardsSystem from "@/components/Profile/RewardsSystem";
import ProgressNotifications, { useProgressNotifications } from "@/components/Notifications/ProgressNotifications";

interface UserRankings {
  overall: number | null;
  reaction: number | null;
  survival: number | null;
  physics: number | null;
  rotation: number | null;
}

export default function EnhancedProfilePageWithNotifications() {
  const { user, telegramUser, isLoading: userLoading, refreshUser } = useUser();
  const t = useT();

  // Progress notifications hook
  const {
    notifications,
    dismissNotification,
    showLevelUp,
    showLeaguePromotion,
    showRewardAvailable,
  } = useProgressNotifications();

  const [rankings, setRankings] = useState<UserRankings>({
    overall: null,
    reaction: null,
    survival: null,
    physics: null,
    rotation: null,
  });
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);

  // Check for league/level changes and trigger notifications
  useEffect(() => {
    const checkForProgressUpdates = async () => {
      if (!user || !telegramUser) return;

      try {
        // Get current calculated stats
        const userWithStats = await leagueService.getUserWithLeagueStats(telegramUser.id);

        if (userWithStats) {
          // Check for level changes
          if (userWithStats.levelChanged && userWithStats.calculatedLevel > (user.player_level || 1)) {
            showLevelUp(userWithStats.calculatedLevel);

            // Check if new level qualifies for a reward
            if (userWithStats.calculatedLevel % 20 === 0) {
              const rewardNumber = userWithStats.calculatedLevel / 20;
              showRewardAvailable(`Test Gift ${rewardNumber}`, userWithStats.calculatedLevel);
            }
          }

          // Check for league changes
          if (userWithStats.leagueChanged && userWithStats.calculatedLeague !== (user.league || "Bronze")) {
            showLeaguePromotion(userWithStats.calculatedLeague, user.league || "Bronze");
          }
        }
      } catch (error) {
        console.error("Error checking for progress updates:", error);
      }
    };

    // Only check for updates if user data is available
    if (user && telegramUser && !userLoading && !isLoadingData) {
      checkForProgressUpdates();
    }
  }, [user, telegramUser, userLoading, isLoadingData, showLevelUp, showLeaguePromotion, showRewardAvailable]);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!telegramUser?.id) return;

      try {
        setIsLoadingData(true);

        // Initialize league system for existing users if needed
        if (user && (user.player_level === undefined || user.league === undefined)) {
          await userService.initializeLeagueSystem(telegramUser.id);
          await refreshUser(); // Refresh user data after initialization
        }

        const [overallRank, reactionRank, survivalRank, physicsRank, rotationRank, refInfo] = await Promise.all([
          userService.getUserRanking(telegramUser.id),
          userService.getUserReactionRanking(telegramUser.id),
          userService.getUserSurvivalRanking(telegramUser.id),
          userService.getUserPhysicsRanking(telegramUser.id),
          userService.getUserRotationRanking(telegramUser.id),
          userService.getReferralInfo(telegramUser.id),
        ]);

        setRankings({
          overall: overallRank,
          reaction: reactionRank,
          survival: survivalRank,
          physics: physicsRank,
          rotation: rotationRank,
        });
        setReferralInfo(refInfo);
      } catch (error) {
        console.error("Error loading profile data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (telegramUser && !userLoading) {
      loadProfileData();
    }
  }, [telegramUser, userLoading, user, refreshUser]);

  const handleOpenReferrals = () => {
    setIsReferralModalOpen(true);
  };

  const handleOpenAchievements = () => {
    setIsAchievementsModalOpen(true);
  };

  const handleRewardClaimed = async () => {
    // Refresh user data after claiming a reward
    await refreshUser();
  };

  if (userLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white">{t("profile.loadingProfile")}</p>
        </div>
      </div>
    );
  }

  if (!user || !telegramUser) {
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

  return (
    <>
      {/* Progress Notifications */}
      <ProgressNotifications
        notifications={notifications}
        onDismiss={dismissNotification}
      />

      <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
        {/* Header - Unified with Game Page */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
            {t("profile.title")}
          </h1>
        </div>

        <MinimalistDivider />

        <div className="max-w-md mx-auto space-y-4">
          {/* Profile Header */}
          <MinimalistProfileHeader user={user} />

          {/* NEW: Compact League and Level Display */}
          <CompactLeagueDisplay user={user} />

          {/* Action Buttons */}
          <MinimalistActionButtons
            onOpenReferrals={handleOpenReferrals}
            onOpenAchievements={handleOpenAchievements}
          />

          {/* NEW: Rewards System */}
          <RewardsSystem
            user={user}
            onRewardClaimed={handleRewardClaimed}
          />

          {/* Divider */}
          <MinimalistDivider />

          {/* Game Statistics */}
          <MinimalistGameStats user={user} />

          {/* Bottom spacing for safe area */}
          <div className="h-20" />
        </div>

        {/* Modals */}
        {referralInfo && (
          <ReferralModal
            isOpen={isReferralModalOpen}
            onClose={() => setIsReferralModalOpen(false)}
            referralInfo={referralInfo}
          />
        )}

        <AchievementsModal
          isOpen={isAchievementsModalOpen}
          onClose={() => setIsAchievementsModalOpen(false)}
          user={user}
          rankings={rankings}
        />
      </div>
    </>
  );
}