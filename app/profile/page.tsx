// src/app/profile/page.tsx - Complete minimalist profile page

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

interface UserRankings {
  overall: number | null;
  reaction: number | null;
  survival: number | null;
}

export default function MinimalistProfilePage() {
  const { user, telegramUser, isLoading: userLoading } = useUser();
  const t = useT();

  const [rankings, setRankings] = useState<UserRankings>({
    overall: null,
    reaction: null,
    survival: null,
  });
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!telegramUser?.id) return;

      try {
        setIsLoadingData(true);

        const [overallRank, reactionRank, survivalRank, refInfo] = await Promise.all([
          userService.getUserRanking(telegramUser.id),
          userService.getUserReactionRanking(telegramUser.id),
          userService.getUserSurvivalRanking(telegramUser.id),
          userService.getReferralInfo(telegramUser.id),
        ]);

        setRankings({
          overall: overallRank,
          reaction: reactionRank,
          survival: survivalRank,
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
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto space-y-0">
        {/* Profile Header - No Container */}
        <MinimalistProfileHeader user={user} />

        {/* Action Buttons */}
        <MinimalistActionButtons
          onOpenReferrals={handleOpenReferrals}
          onOpenAchievements={handleOpenAchievements}
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
  );
}