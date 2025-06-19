// src/app/main/page.tsx - Complete main page with attempts display

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
  ChevronRight,
  Activity,
  Gift,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { tournamentService } from "@/lib/supabase_tournament_extension";
import { userService } from "@/lib/supabase";
import type { Tournament, TournamentStatus } from "@/types/tournaments";
import { formatTimeRemaining } from "@/types/tournaments";
import { useT } from "@/contexts/LocalizationContext";
import AttemptsDisplay from "@/components/AttemptsDisplay";

interface QuickStats {
  totalGames: number;
  bestReactionTime: number | null;
  bestSurvivalTime: number;
  currentRank: number | null;
}

export default function MainPage() {
  const router = useRouter();
  const { user } = useUser();
  const t = useT();

  const [tournamentStatus, setTournamentStatus] = useState<TournamentStatus>({
    isActive: false,
    activeTournament: null,
  });
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalGames: 0,
    bestReactionTime: null,
    bestSurvivalTime: 0,
    currentRank: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [tournamentTimeRemaining, setTournamentTimeRemaining] = useState<string>("");

  // Setup Telegram WebApp
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      // Hide back button on main page
      tg.BackButton.hide();
    }
  }, []);

  // Load tournament status and user stats
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load tournament status
      const status = await tournamentService.getTournamentStatus();
      setTournamentStatus(status);

      // Load user stats if user exists
      if (user?.telegram_id) {
        const [overallRank, reactionRank, survivalRank] = await Promise.all([
          userService.getUserRanking(user.telegram_id),
          userService.getUserReactionRanking(user.telegram_id),
          userService.getUserSurvivalRanking(user.telegram_id),
        ]);

        setQuickStats({
          totalGames: user.total_games || 0,
          bestReactionTime: user.reaction_best_time || null,
          bestSurvivalTime: user.survival_best_time || 0,
          currentRank: overallRank,
        });
      }
    } catch (error) {
      console.error("Error loading main page data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        loadData(); // Refresh data when tournament ends
      } else {
        setTournamentTimeRemaining(formatTimeRemaining(diff));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tournamentStatus.activeTournament, tournamentStatus.timeRemaining, loadData]);

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

  const formatSurvivalTime = (milliseconds: number): string => {
    if (milliseconds < 1000) return "0s";

    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${seconds}s`;
  };

  const renderTournamentCard = () => {
    if (!tournamentStatus.activeTournament) return null;

    return (
      <div
        onClick={handleTournamentClick}
        className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 rounded-xl p-4 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-400/20 border border-yellow-400/40 rounded-lg flex items-center justify-center">
              <Trophy className="text-yellow-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                {tournamentStatus.activeTournament.name}
              </h3>
              <p className="text-yellow-400/80 text-sm">
                {t("tournament.tournamentActive")}
              </p>
            </div>
          </div>
          <ChevronRight className="text-yellow-400/60" size={20} />
        </div>

        {tournamentTimeRemaining && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-2">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="text-yellow-400/80" size={14} />
              <span className="text-yellow-400 text-sm font-medium">
                {tournamentTimeRemaining} {t("tournament.timeRemaining")}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGameModeCard = (
    mode: "reaction" | "survival",
    title: string,
    description: string,
    icon: React.ComponentType<any>,
    gradient: string,
    borderColor: string,
    iconColor: string
  ) => {
    const Icon = icon;
    const isDisabled = !hasAttempts;

    return (
      <div
        onClick={() => handleGameModeSelect(mode)}
        className={`
                    ${gradient} ${borderColor} rounded-xl p-4 cursor-pointer transition-all duration-300
                    ${isDisabled
            ? "opacity-60 cursor-not-allowed"
            : "hover:scale-[1.02] active:scale-[0.98]"
          }
                `}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center`}>
              <Icon className={iconColor} size={20} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">{title}</h3>
              <p className="text-white/70 text-sm">{description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!hasAttempts && (
              <div className="bg-white/10 px-2 py-1 rounded text-xs text-white/60">
                {t("game.general.noAttempts")}
              </div>
            )}
            <ChevronRight className="text-white/60" size={20} />
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Play className={`${iconColor} transition-all duration-300`} size={16} />
          <span className="text-white/80 text-sm ml-2 font-medium">
            {isDisabled ? t("shop.moreAttempts") : t("game.general.startPlaying")}
          </span>
        </div>
      </div>
    );
  };

  const renderQuickStats = () => {
    if (!user || quickStats.totalGames === 0) {
      return (
        <div className="bg-white/5 border border-white/20 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">🎮</div>
          <h3 className="text-lg font-medium text-white mb-2">
            {t("main.welcome")}
          </h3>
          <p className="text-white/60 text-sm">
            {t("leaderboard.beFirst")}
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white/5 border border-white/20 rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Star className="text-white/80" size={16} />
          <h3 className="text-sm font-medium text-white">{t("profile.overallStats")}</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{quickStats.totalGames}</div>
            <div className="text-xs text-white/60">{t("profile.totalGames")}</div>
          </div>

          {quickStats.currentRank && (
            <div className="text-center">
              <div className="text-lg font-bold text-white">#{quickStats.currentRank}</div>
              <div className="text-xs text-white/60">{t("profile.stats.ranking")}</div>
            </div>
          )}

          {quickStats.bestReactionTime && (
            <div className="text-center">
              <div className="text-lg font-bold text-white">{quickStats.bestReactionTime}ms</div>
              <div className="text-xs text-white/60">{t("profile.stats.bestTime")}</div>
            </div>
          )}

          {quickStats.bestSurvivalTime > 0 && (
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {formatSurvivalTime(quickStats.bestSurvivalTime)}
              </div>
              <div className="text-xs text-white/60">{t("leaderboard.longest")}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuickActions = () => {
    return (
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={handleProfileClick}
          className="bg-white/5 border border-white/20 rounded-xl p-3 hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
              <Users className="text-white/80" size={16} />
            </div>
            <span className="text-xs text-white/80 font-medium">{t("nav.profile")}</span>
          </div>
        </button>

        <button
          onClick={handleLeaderboardClick}
          className="bg-white/5 border border-white/20 rounded-xl p-3 hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-white/80" size={16} />
            </div>
            <span className="text-xs text-white/80 font-medium">{t("nav.leaderboard")}</span>
          </div>
        </button>

        <button
          onClick={handleShopClick}
          className="bg-white/5 border border-white/20 rounded-xl p-3 hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
              <Gift className="text-white/80" size={16} />
            </div>
            <span className="text-xs text-white/80 font-medium">{t("nav.shop")}</span>
          </div>
        </button>
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
      {/* Attempts Display at the top */}
      <AttemptsDisplay />

      {/* Main content */}
      <div className="px-4 pb-20 space-y-6">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">
            {t("main.greeting", { name: user?.first_name || "Player" })}
          </h1>
          <p className="text-white/60 text-sm">
            {hasAttempts
              ? t("game.general.useWisely")
              : t("game.general.waitForReset")
            }
          </p>
        </div>

        {/* Tournament Card */}
        {tournamentStatus.activeTournament && renderTournamentCard()}

        {/* Game Modes */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">{t("game.modes.title")}</h2>

          <div className="space-y-3">
            {renderGameModeCard(
              "reaction",
              t("game.modes.reaction.name"),
              t("game.modes.reaction.description"),
              Zap,
              "bg-gradient-to-br from-blue-500/20 to-purple-500/20",
              "border border-blue-400/30",
              "text-blue-400"
            )}

            {renderGameModeCard(
              "survival",
              t("game.modes.survival.name"),
              t("game.modes.survival.description"),
              Target,
              "bg-gradient-to-br from-red-500/20 to-pink-500/20",
              "border border-red-400/30",
              "text-red-400"
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">{t("profile.stats.currentAttempts")}</h2>
          {renderQuickStats()}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">{t("common.menu")}</h2>
          {renderQuickActions()}
        </div>

        {/* Additional info for new users */}
        {(!user || user.total_games === 0) && (
          <div className="bg-white/5 border border-white/20 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">✨</div>
            <h3 className="text-lg font-medium text-white mb-2">
              {t("main.welcome")}
            </h3>
            <p className="text-white/60 text-sm leading-relaxed">
              {t("game.general.automaticReset")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}