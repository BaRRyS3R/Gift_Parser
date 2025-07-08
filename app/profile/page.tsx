// src/app/profile/page.tsx - Fixed profile page without notification duplication

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUser } from "@/hooks/useUser";
import { userService, leagueService, type ReferralInfo } from "@/lib/supabase";
import { calculatePlayerLevel, calculateLeague } from "@/utils/leagueSystem";
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

// Interface for tracking shown notifications to prevent duplicates
interface NotificationTracker {
  lastShownLevel?: number;
  lastShownLeague?: string;
  lastShownRewardLevel?: number;
  sessionId: string;
}

export default function FixedProfilePageWithNotifications() {
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

  // Track notifications to prevent duplicates
  const notificationTracker = useRef<NotificationTracker>({
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });

  // Flag to prevent multiple notification checks
  const notificationCheckPerformed = useRef<boolean>(false);

  // Store initial user state to compare changes
  const initialUserState = useRef<{
    level: number;
    league: string;
  } | null>(null);

  // Clear notifications when component unmounts
  useEffect(() => {
    return () => {
      // Clear all notifications when leaving the profile page
      notifications.forEach(notification => {
        dismissNotification(notification.id);
      });
    };
  }, [notifications, dismissNotification]);

  // Initialize user state tracking and check for notifications ONCE
  useEffect(() => {
    const checkForProgressUpdatesOnce = async () => {
      // Prevent multiple executions
      if (notificationCheckPerformed.current || !user || !telegramUser || userLoading || isLoadingData) {
        return;
      }

      try {
        // Get current calculated stats
        const currentLevel = calculatePlayerLevel(user);
        const currentLeague = calculateLeague(user);

        // Initialize tracking if first time
        if (!initialUserState.current) {
          initialUserState.current = {
            level: user.player_level || 1,
            league: user.league || "Bronze"
          };

          // Update database if calculated values differ from stored values
          if (currentLevel !== (user.player_level || 1) || currentLeague !== (user.league || "Bronze")) {
            console.log("Syncing calculated stats with database:", {
              calculatedLevel: currentLevel,
              storedLevel: user.player_level,
              calculatedLeague: currentLeague,
              storedLeague: user.league
            });

            // Initialize league system to sync values
            await leagueService.initializeLeagueSystem(telegramUser.id);
            await refreshUser();
          }

          // Mark check as performed to prevent re-execution
          notificationCheckPerformed.current = true;
          return;
        }

        const previousState = initialUserState.current;
        const tracker = notificationTracker.current;

        // Check for level changes (only show if we haven't shown this level before)
        if (currentLevel > previousState.level && 
            (!tracker.lastShownLevel || currentLevel > tracker.lastShownLevel)) {
          
          console.log(`Level up detected: ${previousState.level} → ${currentLevel}`);
          showLevelUp(currentLevel);
          tracker.lastShownLevel = currentLevel;
          
          // Check if new level qualifies for a reward
          if (currentLevel % 20 === 0 && 
              (!tracker.lastShownRewardLevel || currentLevel > tracker.lastShownRewardLevel)) {
            const rewardNumber = currentLevel / 20;
            console.log(`Reward available for level ${currentLevel}`);
            showRewardAvailable(`Test Gift ${rewardNumber}`, currentLevel);
            tracker.lastShownRewardLevel = currentLevel;
          }
        }

        // Check for league changes (only show if we haven't shown this league before)
        if (currentLeague !== previousState.league && 
            (!tracker.lastShownLeague || currentLeague !== tracker.lastShownLeague)) {
          
          console.log(`League promotion detected: ${previousState.league} → ${currentLeague}`);
          showLeaguePromotion(currentLeague as any, previousState.league as any);
          tracker.lastShownLeague = currentLeague;
        }

        // Update the initial state to current values
        initialUserState.current = {
          level: currentLevel,
          league: currentLeague
        };

        // Mark check as performed
        notificationCheckPerformed.current = true;

      } catch (error) {
        console.error("Error checking for progress updates:", error);
        notificationCheckPerformed.current = true; // Still mark as performed to prevent retry loops
      }
    };

    // Use setTimeout to ensure this runs after all other effects and only once
    const timeoutId = setTimeout(() => {
      checkForProgressUpdatesOnce();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [user, telegramUser, userLoading, isLoadingData, showLevelUp, showLeaguePromotion, showRewardAvailable, refreshUser]);

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
      {/* Progress Notifications - Limited to prevent spam */}
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

          {/* Debug Information - Remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-2 text-xs">
              <div className="text-red-300">Debug Info:</div>
              <div className="text-white/60">
                Calculated Level: {calculatePlayerLevel(user)} | 
                Stored Level: {user.player_level || 'undefined'} | 
                Calculated League: {calculateLeague(user)} | 
                Stored League: {user.league || 'undefined'}
              </div>
              <div className="text-white/60">
                Session: {notificationTracker.current.sessionId.slice(-8)} | 
                Check Performed: {notificationCheckPerformed.current ? 'Yes' : 'No'}
              </div>
            </div>
          )}

          {/* Compact League and Level Display */}
          <CompactLeagueDisplay user={user} />

          {/* Action Buttons */}
          <MinimalistActionButtons
            onOpenReferrals={handleOpenReferrals}
            onOpenAchievements={handleOpenAchievements}
          />

          {/* Rewards System */}
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