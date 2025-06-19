// src/app/main/page.tsx - Main page with simple attempts counter

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Zap,
  Target,
  Clock,
  Users,
  Star,
  TrendingUp,
  Play,
  ChevronRight
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { tournamentService } from "@/lib/supabase_tournament_extension";
import type { Tournament, TournamentStatus } from "@/types/tournaments";
import { formatTimeRemaining } from "@/types/tournaments";
import { useT } from "@/contexts/LocalizationContext";

export default function MainPage() {
  const router = useRouter();
  const { user } = useUser();
  const t = useT();

  const [tournamentStatus, setTournamentStatus] = useState<TournamentStatus>({
    isActive: false,
    activeTournament: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [tournamentTimeRemaining, setTournamentTimeRemaining] = useState<string>("");
  const [attemptsResetTime, setAttemptsResetTime] = useState<string>("");

  // Setup Telegram WebApp
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.BackButton.hide();
    }
  }, []);

  // Update attempts reset timer
  useEffect(() => {
    if (!user?.attempts_reset_at || (user?.attempts_remaining && user.attempts_remaining > 0)) {
      setAttemptsResetTime("");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const resetTime = new Date(user.attempts_reset_at!);
      const diff = resetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setAttemptsResetTime("");
        clearInterval(interval);
      } else {
        setAttemptsResetTime(formatTimeRemaining(diff));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.attempts_reset_at, user?.attempts_remaining]);

  // Load tournament status
  const loadTournamentData = useCallback(async () => {
    try {
      setIsLoading(true);
      const status = await tournamentService.getTournamentStatus();
      setTournamentStatus(status);
    } catch (error) {
      console.error("Error loading tournament data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTournamentData();
  }, [loadTournamentData]);

  // Update tournament countdown
  useEffect(() => {
    if (!tournamentStatus.activeTournament || !tournamentStatus.timeRemaining) {
      setTournamentTimeRemaining("");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const endDate = new Date(tournamentStatus.activeTournament!.end_date);
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTournamentTimeRemaining("");
        clearInterval(interval);
        loadTournamentData();
      } else {
        setTournamentTimeRemaining(formatTimeRemaining(diff));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tournamentStatus.activeTournament, tournamentStatus.timeRemaining, loadTournamentData]);

  const hasAttempts = user?.attempts_remaining && user.attempts_remaining > 0;

  const handleGameModeSelect = (mode: "reaction" | "survival") => {
    if (!hasAttempts) {
      router.push("/shop");
      return;
    }
    router.push(`/game/${mode}`);
  };

  const handleTournamentClick = () => {
    router.push("/tournament");
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  const handleLeaderboardClick = () => {
    router.push("/leaderboard");
  };

  const handleShopClick = () => {
    router.push("/shop");
  };

  // Simple attempts counter component
  const renderAttemptsCounter = () => {
    if (!user) return null;

    const attemptsText = hasAttempts
      ? `${user.attempts_remaining} ${t("attempts.remaining").toLowerCase()}`
      : attemptsResetTime
        ? `${t("attempts.resetTime")}: ${attemptsResetTime}`
        : t("game.general.noAttempts");

    return (
      <div className="text-center py-4">
        <p className="text-white/70 text-sm">
          {attemptsText}
        </p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Simple attempts counter */}
      {renderAttemptsCounter()}

      {/* Main content */}
      <div className="px-4 pb-20 space-y-6">
        {/* Welcome header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">
            {t("main.greeting", { name: user?.first_name || "Player" })}
          </h1>
        </div>

        {/* Tournament card */}
        {tournamentStatus.activeTournament && (
          <div
            onClick={handleTournamentClick}
            className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 rounded-xl p-6 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-yellow-400/20 border border-yellow-400/40 rounded-lg flex items-center justify-center">
                  <Trophy className="text-yellow-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {tournamentStatus.activeTournament.name}
                  </h3>
                  <p className="text-yellow-400/80">
                    {t("tournament.tournamentActive")}
                  </p>
                </div>
              </div>
              <ChevronRight className="text-yellow-400/60" size={24} />
            </div>

            {tournamentTimeRemaining && (
              <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <Clock className="text-yellow-400/80" size={16} />
                  <span className="text-yellow-400 font-medium">
                    {tournamentTimeRemaining} {t("tournament.timeRemaining")}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Game modes */}
        <div className="space-y-4">
          {/* Reaction Speed */}
          <div
            onClick={() => handleGameModeSelect("reaction")}
            className={`
                            bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30 
                            rounded-xl p-6 cursor-pointer transition-all duration-300
                            ${hasAttempts
                ? "hover:scale-[1.02] active:scale-[0.98]"
                : "opacity-60"
              }
                        `}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-400/20 border border-blue-400/40 rounded-lg flex items-center justify-center">
                  <Zap className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {t("game.modes.reaction.name")}
                  </h3>
                  <p className="text-blue-400/80">
                    {t("game.modes.reaction.description")}
                  </p>
                </div>
              </div>
              <ChevronRight className="text-blue-400/60" size={24} />
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <Play className="text-blue-400" size={16} />
                <span className="text-white font-medium">
                  {hasAttempts ? t("game.general.startPlaying") : t("shop.moreAttempts")}
                </span>
              </div>
            </div>
          </div>

          {/* Survival Mode */}
          <div
            onClick={() => handleGameModeSelect("survival")}
            className={`
                            bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-400/30 
                            rounded-xl p-6 cursor-pointer transition-all duration-300
                            ${hasAttempts
                ? "hover:scale-[1.02] active:scale-[0.98]"
                : "opacity-60"
              }
                        `}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-400/20 border border-red-400/40 rounded-lg flex items-center justify-center">
                  <Target className="text-red-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {t("game.modes.survival.name")}
                  </h3>
                  <p className="text-red-400/80">
                    {t("game.modes.survival.description")}
                  </p>
                </div>
              </div>
              <ChevronRight className="text-red-400/60" size={24} />
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <Play className="text-red-400" size={16} />
                <span className="text-white font-medium">
                  {hasAttempts ? t("game.general.startPlaying") : t("shop.moreAttempts")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick navigation */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={handleProfileClick}
            className="bg-white/10 border border-white/30 rounded-xl p-4 hover:bg-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex flex-col items-center space-y-2">
              <Users className="text-white" size={24} />
              <span className="text-white font-medium">{t("nav.profile")}</span>
            </div>
          </button>

          <button
            onClick={handleLeaderboardClick}
            className="bg-white/10 border border-white/30 rounded-xl p-4 hover:bg-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex flex-col items-center space-y-2">
              <TrendingUp className="text-white" size={24} />
              <span className="text-white font-medium">{t("nav.leaderboard")}</span>
            </div>
          </button>

          <button
            onClick={handleShopClick}
            className="bg-white/10 border border-white/30 rounded-xl p-4 hover:bg-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex flex-col items-center space-y-2">
              <Star className="text-white" size={24} />
              <span className="text-white font-medium">{t("nav.shop")}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}