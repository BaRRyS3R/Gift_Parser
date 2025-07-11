// src/app/profile/page.tsx - Enhanced profile page with league neighbors

"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { userService, type ReferralInfo } from "@/lib/supabase";
import { useT } from "@/contexts/LocalizationContext";

// Import minimalist components
import MinimalistProfileHeader from "@/components/Profile/MinimalistProfileHeader";
import MinimalistActionButtons from "@/components/Profile/MinimalistActionButtons";
import MinimalistDivider from "@/components/Profile/MinimalistDivider";
import MinimalistGameStats from "@/components/Profile/MinimalistGameStats";
import ReferralModal from "@/components/Profile/ReferralModal";
import AchievementsModal from "@/components/Profile/AchievementsModal";
import LeaguesModal from "@/components/LeagueProgress/LeaguesModal";
import LeagueProgressDisplay from "@/components/LeagueProgress/LeagueProgressDisplay";
import LeagueNeighborsDisplay from "@/components/LeagueProgress/LeagueNeighborsDisplay";

interface UserRankings {
  overall: number | null;
  reaction: number | null;
  survival: number | null;
  physics?: number | null;
  rotation?: number | null;
}

export default function ProfilePage() {
  const { user, telegramUser, isLoading: userLoading } = useUser();
  const t = useT();

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
  const [isLeaguesModalOpen, setIsLeaguesModalOpen] = useState(false);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!telegramUser?.id) return;

      try {
        setIsLoadingData(true);

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
  }, [telegramUser, userLoading]);

  const handleOpenReferrals = () => {
    setIsReferralModalOpen(true);
  };

  const handleOpenAchievements = () => {
    setIsAchievementsModalOpen(true);
  };

  const handleOpenLeagues = () => {
    setIsLeaguesModalOpen(true);
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
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
      {/* Header - Unified with Game Page */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
          {t("profile.title")}
        </h1>
      </div>

      <MinimalistDivider />

      <div className="max-w-md mx-auto">
        {/* Profile Header */}
        <MinimalistProfileHeader user={user} />

        {/* Action Buttons - Updated with leagues */}
        <MinimalistActionButtons
          onOpenReferrals={handleOpenReferrals}
          onOpenAchievements={handleOpenAchievements}
          onOpenLeagues={handleOpenLeagues}
        />

        {/* Divider */}
        <MinimalistDivider />

        {/* League Progress Display - Enhanced with level progress */}
        <div className="px-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <span>League & Level Progress</span>
          </h3>
          <LeagueProgressDisplay showLevelProgress={true} className="mb-4" />
        </div>

        {/* League Neighbors Display - NEW */}
        {user.total_games > 0 && (
          <div className="px-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <span>League Position</span>
            </h3>
            <LeagueNeighborsDisplay />
          </div>
        )}

        {/* Divider */}
        <MinimalistDivider />

        {/* Game Statistics - Enhanced with level progress */}
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

      <LeaguesModal
        isOpen={isLeaguesModalOpen}
        onClose={() => setIsLeaguesModalOpen(false)}
      />
    </div>
  );
}