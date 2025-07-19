// src/app/profile/page.tsx - Updated profile page using new profile module

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
  const { user, telegramUser, isLoading: userLoading, profile } = useUser();
  const t = useT();

  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
  const [isLeaguesModalOpen, setIsLeaguesModalOpen] = useState(false);

  // Load profile data when page loads
  useEffect(() => {
    if (user && telegramUser) {
      console.log("Loading fresh profile data...");
      profile.fetchProfileData();
    }
  }, [user, telegramUser, profile.fetchProfileData]);

  const handleOpenReferrals = () => {
    setIsReferralModalOpen(true);
  };

  const handleOpenAchievements = () => {
    setIsAchievementsModalOpen(true);
  };

  const handleOpenLeagues = () => {
    setIsLeaguesModalOpen(true);
  };

  // Show loading while user data or profile data is loading
  if (userLoading || (user && !profile.profileData && profile.isLoading)) {
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

  // Show error if profile data failed to load
  if (profile.error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-red-400 text-2xl">!</span>
          </div>
          <p className="text-white">{t("common.error")}</p>
          <button
            onClick={() => profile.fetchProfileData()}
            className="px-4 py-2 bg-white/10 border border-white/30 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  const profileData = profile.profileData;
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
        <EnhancedProfileHeader user={user} />

        {/* Action Buttons */}
        <MinimalistActionButtons
          onOpenReferrals={handleOpenReferrals}
          onOpenAchievements={handleOpenAchievements}
          onOpenLeagues={handleOpenLeagues}
        />

        {/* Divider */}
        <MinimalistDivider />

        {/* Game Statistics with Level Progress */}
        <MinimalistGameStats user={user} />

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

      <AchievementsModal
        isOpen={isAchievementsModalOpen}
        onClose={() => setIsAchievementsModalOpen(false)}
        user={user}
        rankings={rankings}
      />

      {/* Leagues Modal */}
      <LeaguesModal
        isOpen={isLeaguesModalOpen}
        onClose={() => setIsLeaguesModalOpen(false)}
      />
    </div>
  );
}