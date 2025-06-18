// src/app/profile/page.tsx - Redesigned profile page with modular components

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@nextui-org/react";
import { Share2, Award } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { userService, type ReferralInfo } from "@/lib/supabase";
import { useT } from "@/contexts/LocalizationContext";

// Import the new modular components
import ProfileHeader from "@/components/Profile/ProfileHeader";
import ReferralModal from "@/components/Profile/ReferralModal";
import AchievementsModal from "@/components/Profile/AchievementsModal";
import GameStatistics from "@/components/Profile/GameStatistics";

interface UserRankings {
  overall: number | null;
  reaction: number | null;
  survival: number | null;
}

export default function ProfilePage() {
  const { user, telegramUser, isLoading: userLoading } = useUser();
  const t = useT();

  // State management for modals and data
  const [rankings, setRankings] = useState<UserRankings>({
    overall: null,
    reaction: null,
    survival: null,
  });
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);

  // Load profile data on component mount
  useEffect(() => {
    const loadProfileData = async () => {
      if (!telegramUser?.id) return;

      try {
        setIsLoadingData(true);

        // Fetch rankings and referral information in parallel
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

  // Loading state display
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

  // Error state when user data is not available
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
      <div className="max-w-md mx-auto space-y-6">
        {/* Profile Header Section */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl">
          <ProfileHeader user={user} />
        </div>

        {/* Action Buttons Section */}
        <div className="flex space-x-3">
          <Button
            className="flex-1 bg-white/10 border border-white/30 text-white hover:bg-white/20"
            variant="bordered"
            startContent={<Share2 className="text-white" size={16} />}
            onPress={() => setIsReferralModalOpen(true)}
          >
            Referrals
          </Button>

          <Button
            className="flex-1 bg-white/10 border border-white/30 text-white hover:bg-white/20"
            variant="bordered"
            startContent={<Award className="text-white" size={16} />}
            onPress={() => setIsAchievementsModalOpen(true)}
          >
            Achievements
          </Button>
        </div>

        {/* Decorative Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <div className="bg-black px-4">
              <div className="w-2 h-2 bg-white/20 rounded-full" />
            </div>
          </div>
        </div>

        {/* Game Statistics Section */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl p-6">
          <GameStatistics user={user} rankings={rankings} />
        </div>

        {/* Referral Modal */}
        {referralInfo && (
          <ReferralModal
            isOpen={isReferralModalOpen}
            onClose={() => setIsReferralModalOpen(false)}
            referralInfo={referralInfo}
          />
        )}

        {/* Achievements Modal */}
        <AchievementsModal
          isOpen={isAchievementsModalOpen}
          onClose={() => setIsAchievementsModalOpen(false)}
          user={user}
          rankings={rankings}
        />
      </div>
    </div>
  );
}