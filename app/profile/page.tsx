// src/app/profile/page.tsx - Refactored: fetch profile, leagues, achievements via API

"use client";

import React, { useState, useEffect } from "react";

import { useUser } from "@/hooks/useUser";
// import { userService, type ReferralInfo } from "@/lib/supabase";
// import leagueService from "@/lib/league_service";
import { useT } from "@/contexts/LocalizationContext";

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
  const { user, telegramUser, isLoading: userLoading } = useUser();
  const t = useT();

  const [rankings, setRankings] = useState<UserRankings>({
    overall: null,
    reaction: null,
    survival: null,
    physics: null,
    rotation: null,
  });
  const [referralInfo, setReferralInfo] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
  const [isLeaguesModalOpen, setIsLeaguesModalOpen] = useState(false);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!telegramUser?.id || !user?.id) return;
      try {
        setIsLoadingData(true);
        // Получаем профиль
        const profileRes = await fetch("/api/profile", { headers: { "Authorization": "Bearer " + (localStorage.getItem('jwt') || '') } });
        const profileData = await profileRes.json();
        // Получаем лиги
        const leaguesRes = await fetch("/api/profile/leagues", { headers: { "Authorization": "Bearer " + (localStorage.getItem('jwt') || '') } });
        const leaguesData = await leaguesRes.json();
        setLeagues(leaguesData.leagues || []);
        // Получаем достижения
        const achRes = await fetch("/api/profile/achievements", { headers: { "Authorization": "Bearer " + (localStorage.getItem('jwt') || '') } });
        const achData = await achRes.json();
        setAchievements(achData.achievements || []);
        // Можно добавить загрузку referralInfo и rankings через отдельные API-роуты
      } catch (err) {
        // обработка ошибок
      } finally {
        setIsLoadingData(false);
      }
    };
    loadProfileData();
  }, [telegramUser?.id, user?.id]);

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
          onOpenAchievements={handleOpenAchievements}
          onOpenLeagues={handleOpenLeagues}
          onOpenReferrals={handleOpenReferrals}
        />

        {/* Divider */}
        <MinimalistDivider />

        {/* Game Statistics with Level Progress */}
        <MinimalistGameStats user={user} />

        {/* Bottom spacing for safe area */}
        <div className="h-20" />
      </div>

      {/* Modals */}
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
        user={user}
        onClose={() => setIsAchievementsModalOpen(false)}
      />

      {/* Fixed: Use proper tabbed leagues modal with preloaded data */}
      <LeaguesModal
        isOpen={isLeaguesModalOpen}
        onClose={() => setIsLeaguesModalOpen(false)}
      />
    </div>
  );
}
