// src/app/profile/page.tsx - Final fixed profile page using complete server architecture

"use client";

import type { UserRankings } from "@/lib/server/profileService";

import React, { useState, useEffect } from "react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

// Import updated components
import EnhancedProfileHeader from "@/components/Profile/EnhancedProfileHeader";
import MinimalistActionButtons from "@/components/Profile/MinimalistActionButtons";
import MinimalistDivider from "@/components/Profile/MinimalistDivider";
import MinimalistGameStats from "@/components/Profile/MinimalistGameStats";
import ReferralModal from "@/components/Profile/ReferralModal";
import AchievementsModal from "@/components/Profile/AchievementsModal";
import LeaguesModal from "@/components/LeagueProgress/LeaguesModal";

// Import server types

// Interface for referral modal compatibility
interface ReferralInfo {
  referralCode: string;
  referralLink: string;
  referralCount: number;
  referralBonus: number;
  referredBy?: string;
  referredByName?: string;
}

export default function ProfilePage() {
  const {
    user,
    telegramUser,
    isLoading: userLoading,
    profile,
    leagues,
  } = useUser();
  const t = useT();

  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
  const [isLeaguesModalOpen, setIsLeaguesModalOpen] = useState(false);

  // Preload all required data when component mounts
  useEffect(() => {
    if (user && telegramUser && !profile.hasProfileData()) {
      console.log("Preloading profile data for authenticated user...");
      profile.fetchProfile();
    }
  }, [user, telegramUser, profile]);

  // Preload league data
  useEffect(() => {
    if (user && telegramUser && !leagues.hasCompactData()) {
      console.log("Preloading compact league data...");
      leagues.fetchCompactLeagues();
    }
  }, [user, telegramUser, leagues]);

  // Create referral info object from profile data
  const referralInfo: ReferralInfo | null = profile.referrals
    ? {
        referralCode: profile.referrals.referral_code,
        referralLink: `https://t.me/CircusleBot/play?startapp=${profile.referrals.referral_code}`,
        referralCount: profile.referrals.referral_count,
        referralBonus: profile.referrals.referral_bonus,
        referredBy: profile.referrals.referred_by,
        referredByName: profile.referrals.referred_by_name,
      }
    : null;

  // Get rankings data with proper type
  const rankings: UserRankings = profile.rankings || {
    overall: null,
    reaction: null,
    survival: null,
    physics: null,
    rotation: null,
  };

  const handleOpenReferrals = () => {
    setIsReferralModalOpen(true);
  };

  const handleOpenAchievements = () => {
    setIsAchievementsModalOpen(true);
  };

  const handleOpenLeagues = () => {
    setIsLeaguesModalOpen(true);
  };

  // Show loading while any required data is loading
  const isLoadingAnyData =
    userLoading || profile.isLoading || leagues.compactLoading;
  const hasRequiredData = profile.hasProfileData() && user && telegramUser;

  if (isLoadingAnyData && !hasRequiredData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white">{t("profile.loadingProfile")}</p>
        </div>
      </div>
    );
  }

  // Show error if profile loading failed
  if (profile.error && !profile.hasProfileData()) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white/60 text-2xl">⚠</span>
          </div>
          <p className="text-white">{t("common.error")}</p>
          <button
            className="px-4 py-2 bg-white/10 border border-white/30 text-white rounded hover:bg-white/20 transition-colors"
            onClick={() => profile.fetchProfile()}
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  // Show not found if no user data
  if (!hasRequiredData) {
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
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
          {t("profile.title")}
        </h1>
      </div>

      <MinimalistDivider />

      <div className="max-w-md mx-auto">
        {/* Enhanced Profile Header with Level and League - uses server data */}
        <EnhancedProfileHeader user={profile.profile!} />

        {/* Action Buttons */}
        <MinimalistActionButtons
          onOpenAchievements={handleOpenAchievements}
          onOpenLeagues={handleOpenLeagues}
          onOpenReferrals={handleOpenReferrals}
        />

        {/* Divider */}
        <MinimalistDivider />

        {/* Game Statistics with Level Progress - uses server data */}
        <MinimalistGameStats user={profile.profile!} />

        {/* Bottom spacing for safe area */}
        <div className="h-20" />
      </div>

      {/* Modals - all using server architecture data */}
      {referralInfo && (
        <ReferralModal
          isOpen={isReferralModalOpen}
          referralInfo={referralInfo}
          onClose={() => setIsReferralModalOpen(false)}
        />
      )}

      <AchievementsModal
        isOpen={isAchievementsModalOpen}
        rankings={rankings}
        user={profile.profile!}
        onClose={() => setIsAchievementsModalOpen(false)}
      />

      {/* Leagues modal uses centralized leagues module */}
      <LeaguesModal
        isOpen={isLeaguesModalOpen}
        onClose={() => setIsLeaguesModalOpen(false)}
      />
    </div>
  );
}
