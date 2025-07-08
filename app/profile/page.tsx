// src/app/profile/page.tsx - Исправленная версия без циклических перезагрузок

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
import EnhancedProgressNotifications, { useEnhancedProgressNotifications } from "@/components/Notifications/EnhancedProgressNotifications";

interface UserRankings {
  overall: number | null;
  reaction: number | null;
  survival: number | null;
  physics: number | null;
  rotation: number | null;
}

interface InitializationState {
  completed: boolean;
  inProgress: boolean;
  dataLoaded: boolean;
}

// Interface for persistent notification tracking
interface NotificationPersistence {
  lastSeenLevel: number;
  lastSeenLeague: string;
  sessionId: string;
  timestamp: number;
}

export default function FixedProfilePage() {
  const { user, telegramUser, isLoading: userLoading, refreshUser } = useUser();
  const t = useT();

  // Progress notifications hook
  const {
    notifications,
    dismissNotification,
    showLevelUp,
    showLeaguePromotion,
    showRewardAvailable,
} = useEnhancedProgressNotifications();

  const [rankings, setRankings] = useState<UserRankings>({
    overall: null,
    reaction: null,
    survival: null,
    physics: null,
    rotation: null,
  });
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);

  // Centralized initialization state
  const [initState, setInitState] = useState<InitializationState>({
    completed: false,
    inProgress: false,
    dataLoaded: false,
  });

  // Persistent storage key for notification tracking
  const getStorageKey = () => `profile_notifications_${telegramUser?.id || 'unknown'}`;

  // Get persistent notification state
  const getPersistentState = (): NotificationPersistence | null => {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(getStorageKey());
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load persistent notification state:', error);
      return null;
    }
  };

  // Save persistent notification state
  const savePersistentState = (state: NotificationPersistence) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save persistent notification state:', error);
    }
  };

  // Clear notifications when component unmounts
  useEffect(() => {
    return () => {
      notifications.forEach(notification => {
        dismissNotification(notification.id);
      });
    };
  }, [notifications, dismissNotification]);

  // CENTRALIZED INITIALIZATION EFFECT - Prevents multiple initialization cycles
  useEffect(() => {
    const performCentralizedInitialization = async () => {
      // Prevent multiple simultaneous initializations
      if (!user || !telegramUser || userLoading || initState.inProgress || initState.completed) {
        return;
      }

      try {
        setInitState(prev => ({ ...prev, inProgress: true }));

        console.log('Starting centralized profile initialization');

        // Check if league system needs initialization
        const needsLeagueInit = user.player_level === undefined ||
          user.league === undefined ||
          user.total_qualifying_games === undefined;

        if (needsLeagueInit) {
          console.log('Initializing league system for user:', telegramUser.id);

          // Initialize league system
          const initResult = await leagueService.initializeLeagueSystem(telegramUser.id);

          if (initResult.success) {
            console.log('League system initialized successfully');
            // Refresh user data after initialization
            await refreshUser();
          } else {
            console.error('League system initialization failed:', initResult.error);
          }
        }

        // Load additional profile data
        console.log('Loading profile rankings and referral info');

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

        setInitState({
          completed: true,
          inProgress: false,
          dataLoaded: true,
        });

        console.log('Centralized profile initialization completed');

      } catch (error) {
        console.error('Error during centralized initialization:', error);
        setInitState(prev => ({
          ...prev,
          inProgress: false
        }));
      }
    };

    performCentralizedInitialization();
  }, [user, telegramUser, userLoading, initState.inProgress, initState.completed, refreshUser]);

  // NOTIFICATION CHECK EFFECT - Only runs after initialization is complete
  useEffect(() => {
    const checkForProgressNotifications = () => {
      // Only run after initialization is complete and data is loaded
      if (!initState.completed || !initState.dataLoaded || !user || !telegramUser) {
        return;
      }

      try {
        console.log('Checking for progress notifications');

        // Get current calculated stats
        const currentLevel = calculatePlayerLevel(user);
        const currentLeague = calculateLeague(user);

        console.log('Current stats:', { currentLevel, currentLeague });

        // Get persistent state
        const persistentState = getPersistentState();

        // If no persistent state exists, create initial state from current values
        if (!persistentState) {
          console.log('No persistent state found, creating initial state');
          savePersistentState({
            lastSeenLevel: currentLevel,
            lastSeenLeague: currentLeague,
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
          });
          return;
        }

        console.log('Previous state:', {
          lastSeenLevel: persistentState.lastSeenLevel,
          lastSeenLeague: persistentState.lastSeenLeague,
        });

        // Check for level increase
        if (currentLevel > persistentState.lastSeenLevel) {
          console.log(`Level progression detected: ${persistentState.lastSeenLevel} → ${currentLevel}`);

          // Show notifications for each level gained
          for (let level = persistentState.lastSeenLevel + 1; level <= currentLevel; level++) {
            showLevelUp(level);

            // Check for reward eligibility
            if (level % 20 === 0) {
              const rewardNumber = level / 20;
              showRewardAvailable(`Test Gift ${rewardNumber}`, level);
            }
          }
        }

        // Check for league change
        if (currentLeague !== persistentState.lastSeenLeague) {
          console.log(`League change detected: ${persistentState.lastSeenLeague} → ${currentLeague}`);
          showLeaguePromotion(currentLeague as any, persistentState.lastSeenLeague as any);
        }

        // Update persistent state with current values
        savePersistentState({
          lastSeenLevel: currentLevel,
          lastSeenLeague: currentLeague,
          sessionId: persistentState.sessionId,
          timestamp: Date.now(),
        });

      } catch (error) {
        console.error('Error checking for progress notifications:', error);
      }
    };

    // Use a timeout to ensure this runs after the initialization effect
    const timeoutId = setTimeout(checkForProgressNotifications, 200);
    return () => clearTimeout(timeoutId);

  }, [initState.completed, initState.dataLoaded, user, telegramUser, showLevelUp, showLeaguePromotion, showRewardAvailable]);

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

  // Show loading state during initialization
  if (userLoading || initState.inProgress || !initState.dataLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white">
            {userLoading ? t("profile.loadingProfile") : "Initializing profile..."}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-white/40">
              Init: {initState.inProgress ? 'In Progress' : 'Waiting'} |
              Data: {initState.dataLoaded ? 'Loaded' : 'Loading'}
            </div>
          )}
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
      <EnhancedProgressNotifications
        notifications={notifications}
        onDismiss={dismissNotification}
      />

      <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
            {t("profile.title")}
          </h1>
        </div>

        <MinimalistDivider />

        <div className="max-w-md mx-auto space-y-4">
          {/* Profile Header */}
          <MinimalistProfileHeader user={user} />

          {/* Debug Information - Shows initialization state */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-2 text-xs">
              <div className="text-blue-300">Debug Info:</div>
              <div className="text-white/60">
                Calculated Level: {calculatePlayerLevel(user)} |
                Stored Level: {user.player_level || 'undefined'} |
                Calculated League: {calculateLeague(user)} |
                Stored League: {user.league || 'undefined'}
              </div>
              <div className="text-white/60">
                Init State: {JSON.stringify(initState)} |
                Notifications: {notifications.length}
              </div>
              <div className="text-white/60">
                Persistent State: {JSON.stringify(getPersistentState())}
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