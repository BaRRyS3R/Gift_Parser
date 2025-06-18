// src/app/profile/page.tsx - Complete gaming-style profile page

"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { userService, type ReferralInfo } from "@/lib/supabase";
import { useT } from "@/contexts/LocalizationContext";

// Import gaming-style components
import GamingProfileHeader from "@/components/Profile/GamingProfileHeader";
import GamingAchievementsSection from "@/components/Profile/GamingAchievementsSection";
import GamingStatsInventory from "@/components/Profile/GamingStatsInventory";
import GamingJourneySection from "@/components/Profile/GamingJourneySection";
import AchievementsModal from "@/components/Profile/AchievementsModal";

interface UserRankings {
  overall: number | null;
  reaction: number | null;
  survival: number | null;
}

export default function GamingProfilePage() {
  const { user, telegramUser, isLoading: userLoading } = useUser();
  const t = useT();

  const [rankings, setRankings] = useState<UserRankings>({
    overall: null,
    reaction: null,
    survival: null,
  });
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
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

  const handleViewAllAchievements = () => {
    setIsAchievementsModalOpen(true);
  };

  if (userLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !telegramUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-gray-500 text-2xl">?</span>
          </div>
          <p className="text-gray-400">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Gaming-style dark background with subtle pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 25px 25px, rgba(255,255,255,0.1) 2px, transparent 0),
            radial-gradient(circle at 75px 75px, rgba(255,255,255,0.05) 2px, transparent 0)
          `,
          backgroundSize: '100px 100px'
        }} />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-6 space-y-8">
        {/* Profile Header */}
        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-xl">
          <GamingProfileHeader user={user} />
        </div>

        {/* Achievements Section */}
        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <GamingAchievementsSection
            user={user}
            onViewAll={handleViewAllAchievements}
          />
        </div>

        {/* Stats Inventory Section */}
        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <GamingStatsInventory user={user} />
        </div>

        {/* Journey Section */}
        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <GamingJourneySection user={user} />
        </div>

        {/* Bottom spacing for safe area */}
        <div className="h-20" />
      </div>

      {/* Achievements Modal */}
      <AchievementsModal
        isOpen={isAchievementsModalOpen}
        onClose={() => setIsAchievementsModalOpen(false)}
        user={user}
        rankings={rankings}
      />
    </div>
  );
}