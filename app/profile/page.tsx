// src/app/profile/page.tsx - Updated to use authService API exclusively

"use client";

import React, { useState, useEffect } from "react";

import { useUser } from "@/hooks/useUser";
import { authService } from "@/lib/authService";
import type { ProfileData, AchievementData, LeagueData } from "@/lib/authService";
import { useT } from "@/contexts/LocalizationContext";

// Import components
import EnhancedProfileHeader from "@/components/Profile/EnhancedProfileHeader";
import MinimalistActionButtons from "@/components/Profile/MinimalistActionButtons";
import MinimalistDivider from "@/components/Profile/MinimalistDivider";
import MinimalistGameStats from "@/components/Profile/MinimalistGameStats";
import ReferralModal from "@/components/Profile/ReferralModal";
import AchievementsModal from "@/components/Profile/AchievementsModal";
import LeaguesModal from "@/components/LeagueProgress/LeaguesModal";

interface UserRankings {
  overall: number | null;
  reaction: number | null;
  survival: number | null;
  physics?: number | null;
  rotation?: number | null;
}

export default function ProfilePage() {
  const { user: contextUser, isAuthenticated, isLoading: userLoading } = useUser();
  const t = useT();

  // Profile data states
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [achievementData, setAchievementData] = useState<AchievementData | null>(null);
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
  const [isLeaguesModalOpen, setIsLeaguesModalOpen] = useState(false);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!isAuthenticated || userLoading) {
        return;
      }

      try {
        setIsLoadingData(true);
        setError(null);

        console.log("ProfilePage: Loading all profile data via authService API...");

        // Use authService to get all profile data in parallel
        const {
          profile,
          achievements,
          leagueData: leagues,
        } = await authService.getAllProfileData();

        setProfileData(profile);
        setAchievementData(achievements);
        setLeagueData(leagues);

        console.log("ProfilePage: All profile data loaded successfully:", {
          userGames: profile.user.total_games,
          achievementsCount: achievements.stats.total,
          leaguesCount: leagues.allLeagues.length,
        });
      } catch (error) {
        console.error("ProfilePage: Error loading profile data:", error);
        setError(error instanceof Error ? error.message : "Failed to load profile data");
        
        // Handle authentication errors
        if (error instanceof Error && error.message.includes("Authentication expired")) {
          console.log("ProfilePage: Authentication expired, user will be redirected to login");
        }
      } finally {
        setIsLoadingData(false);
      }
    };

    loadProfileData();
  }, [isAuthenticated, userLoading]);

  const handleOpenReferrals = () => {
    setIsReferralModalOpen(true);
  };

  const handleOpenAchievements = () => {
    setIsAchievementsModalOpen(true);
  };

  const handleOpenLeagues = () => {
    setIsLeaguesModalOpen(true);
  };

  // Show loading state
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

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-red-400 text-2xl">⚠️</span>
          </div>
          <h2 className="text-white text-xl font-bold">
            {t("profile.error")}
          </h2>
          <p className="text-white/80 text-sm">{error}</p>
          <button
            className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            onClick={() => window.location.reload()}
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  // Show not authenticated state
  if (!isAuthenticated || !contextUser || !profileData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white/60 text-2xl">🔐</span>
          </div>
          <h2 className="text-white text-xl font-bold">
            {t("profile.notAuthenticated")}
          </h2>
          <p className="text-white/80">{t("profile.pleaseLogin")}</p>
        </div>
      </div>
    );
  }

  // Convert API profile data to component format
  const componentUser = {
    ...contextUser,
    ...profileData.user,
  };

  const rankings: UserRankings = {
    overall: profileData.rankings.overall,
    reaction: profileData.rankings.reaction,
    survival: profileData.rankings.survival,
    physics: profileData.rankings.physics,
    rotation: profileData.rankings.rotation,
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
        <EnhancedProfileHeader user={componentUser} />

        {/* Action Buttons */}
        <MinimalistActionButtons
          onOpenAchievements={handleOpenAchievements}
          onOpenLeagues={handleOpenLeagues}
          onOpenReferrals={handleOpenReferrals}
        />

        {/* Divider */}
        <MinimalistDivider />

        {/* Game Statistics with Level Progress */}
        <MinimalistGameStats user={componentUser} />

        {/* Bottom spacing for safe area */}
        <div className="h-20" />
      </div>

      {/* Modals */}
      {profileData.referralInfo && (
        <ReferralModal
          isOpen={isReferralModalOpen}
          referralInfo={profileData.referralInfo}
          onClose={() => setIsReferralModalOpen(false)}
        />
      )}

      {achievementData && (
        <AchievementsModal
          isOpen={isAchievementsModalOpen}
          rankings={rankings}
          user={componentUser}
          onClose={() => setIsAchievementsModalOpen(false)}
        />
      )}

      {leagueData && (
        <LeaguesModal
          isOpen={isLeaguesModalOpen}
          onClose={() => setIsLeaguesModalOpen(false)}
        />
      )}
    </div>
  );
}