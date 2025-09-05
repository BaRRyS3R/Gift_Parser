// src/app/profile/page.tsx - Оптимизированная версия с мгновенной загрузкой

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

// Скелетон для заголовка профиля
function ProfileHeaderSkeleton() {
  return (
    <div className="text-center px-4 py-6 animate-fade-in">
      <div className="space-y-2">
        <div className="h-8 bg-white/10 rounded animate-pulse mx-auto w-48" />
        <div className="h-4 bg-white/10 rounded animate-pulse mx-auto w-32" />
      </div>
      
      {/* Скелетон для достижений */}
      <div className="flex justify-center items-center space-x-2 mt-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="w-8 h-8 bg-white/10 rounded-full animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// Скелетон для кнопок действий
function ActionButtonsSkeleton() {
  return (
    <div className="flex justify-center space-x-4 px-4 py-6 animate-fade-in">
      <div className="h-10 bg-white/10 rounded-lg animate-pulse w-32" />
      <div className="h-10 bg-white/10 rounded-lg animate-pulse w-32" />
    </div>
  );
}

// Скелетон для статистики игр
function GameStatsSkeleton() {
  return (
    <div className="px-4 py-6 animate-fade-in">
      <div className="space-y-4">
        {/* Общая статистика */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="h-5 bg-white/10 rounded animate-pulse w-32 mb-3" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="h-6 bg-white/10 rounded animate-pulse w-16 mb-1" />
              <div className="h-3 bg-white/10 rounded animate-pulse w-12" />
            </div>
            <div>
              <div className="h-6 bg-white/10 rounded animate-pulse w-20 mb-1" />
              <div className="h-3 bg-white/10 rounded animate-pulse w-16" />
            </div>
          </div>
        </div>
        
        {/* Статистика по режимам */}
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-5 h-5 bg-white/10 rounded animate-pulse" />
              <div className="h-4 bg-white/10 rounded animate-pulse w-24" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="h-5 bg-white/10 rounded animate-pulse w-16 mb-1" />
                <div className="h-3 bg-white/10 rounded animate-pulse w-12" />
              </div>
              <div>
                <div className="h-5 bg-white/10 rounded animate-pulse w-12 mb-1" />
                <div className="h-3 bg-white/10 rounded animate-pulse w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { authState, telegramUser, profile } = useUser();
  const t = useT();

  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Track total games to detect changes
  const [lastKnownTotalGames, setLastKnownTotalGames] = useState<number | null>(
    null,
  );

  // Track if initial data load has been triggered
  const dataLoadedRef = useRef<boolean>(false);

  // Load profile data when user is authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.user && telegramUser && !dataLoadedRef.current) {
      const loadProfileData = async () => {
        await profile.fetchProfileData();
        setDataLoaded(true);
        dataLoadedRef.current = true;
      };
      
      loadProfileData();
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

  const handleRetry = () => {
    setDataLoaded(false);
    dataLoadedRef.current = false;
    profile.fetchProfileData().then(() => {
      setDataLoaded(true);
      dataLoadedRef.current = true;
    });
  };

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

  // МГНОВЕННЫЙ ПОКАЗ: всегда показываем контент
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
        {/* Error State */}
        {profile.error && (
          <div className="text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 bg-red-500/10 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-red-400 text-2xl">!</span>
            </div>
            <p className="text-white">{profile.error}</p>
            <button
              className="px-4 py-2 bg-white/10 border border-white/30 text-white rounded-lg hover:bg-white/20 transition-colors"
              onClick={handleRetry}
            >
              {t("common.retry")}
            </button>
          </div>
        )}

        {/* Profile Content */}
        {!profile.error && (
          <>
            {/* Enhanced Profile Header с данными или скелетоном */}
            {dataLoaded && profileUser ? (
              <div className="animate-fade-in">
                <EnhancedProfileHeader
                  achievements={achievements?.achievements}
                  user={profileUser}
                />
              </div>
            ) : authState.isAuthenticated && authState.user && telegramUser ? (
              <ProfileHeaderSkeleton />
            ) : (
              <div className="text-center px-4 py-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="h-8 bg-white/10 rounded animate-pulse mx-auto w-48" />
                  <div className="h-4 bg-white/10 rounded animate-pulse mx-auto w-32" />
                </div>
              </div>
            )}

            {/* Action Buttons с данными или скелетоном */}
            {dataLoaded ? (
              <div className="animate-fade-in">
                <MinimalistActionButtons
                  onOpenAchievements={handleOpenAchievements}
                  onOpenReferrals={handleOpenReferrals}
                />
              </div>
            ) : authState.isAuthenticated ? (
              <ActionButtonsSkeleton />
            ) : null}

            {/* Divider */}
            <MinimalistDivider />

            {/* Game Statistics с данными или скелетоном */}
            {dataLoaded ? (
              <div className="animate-fade-in">
                <MinimalistGameStats isLoading={false} user={profileUser} />
              </div>
            ) : authState.isAuthenticated ? (
              <GameStatsSkeleton />
            ) : null}

            {/* Показ сообщения если пользователь не аутентифицирован */}
            {!authState.isAuthenticated && (
              <div className="text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center mx-auto">
                  <span className="text-white/60 text-2xl">?</span>
                </div>
                <p className="text-white">{t("profile.notFound")}</p>
              </div>
            )}
          </>
        )}

        {/* Bottom spacing for safe area */}
        <div className="h-20" />
      </div>

      {/* Modals - показываем только когда данные загружены */}
      {dataLoaded && profileData?.referrals && (
        <ReferralModal
          isOpen={isReferralModalOpen}
          referralInfo={profileData.referrals}
          onClose={() => setIsReferralModalOpen(false)}
        />
      )}

      {/* Updated Achievements Modal with achievements data */}
      {dataLoaded && (
        <AchievementsModal
          achievements={achievements}
          isOpen={isAchievementsModalOpen}
          rankings={rankings}
          user={profileUser}
          onClose={() => setIsAchievementsModalOpen(false)}
        />
      )}
    </div>
  );
}