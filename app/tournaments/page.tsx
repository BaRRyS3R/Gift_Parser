// src/app/tournaments/page.tsx - ИСПРАВЛЕНО: упрощенная страница БЕЗ автообновления

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, Button, Spinner } from "@nextui-org/react";
import {
  Trophy,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Play,
  Target,
  Users,
  Zap,
  RefreshCw,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import type {
  Tournament,
  OptimizedTournamentLeaderboardEntry,
  TournamentUserPosition,
} from "@/types/tournaments";

// ✅ УПРОЩЕННЫЕ интерфейсы (только активный турнир)
interface TournamentPageState {
  activeTournament: Tournament | null;
  leaderboard: OptimizedTournamentLeaderboardEntry[];
  userPosition: TournamentUserPosition | null;
  isLoading: boolean;
  isLeaderboardLoading: boolean;
  error: string | null;
  leaderboardError: string | null;
  cacheInfo: {
    tournament_from_cache?: boolean;
    leaderboard_from_cache?: boolean;
    cache_age_seconds?: number;
  };
}

// Future Tech цвета для режимов
function getFutureTechModeColors(mode: string) {
  switch (mode) {
    case "survival":
      return {
        primary: "#ff0040",
        secondary: "#ff4d7a",
        accent: "#ff8fa3",
        glow: "rgba(255, 0, 64, 0.3)",
        gradient: "from-red-500 via-pink-500 to-red-600",
        border: "border-red-500/30",
        bg: "bg-red-500/5",
        text: "text-red-400",
      };
    case "physics":
      return {
        primary: "#7c3aed",
        secondary: "#a855f7",
        accent: "#c084fc",
        glow: "rgba(124, 58, 237, 0.3)",
        gradient: "from-purple-600 via-violet-500 to-purple-700",
        border: "border-purple-500/30",
        bg: "bg-purple-500/5",
        text: "text-purple-400",
      };
    case "rotation":
      return {
        primary: "#f59e0b",
        secondary: "#fbbf24",
        accent: "#fcd34d",
        glow: "rgba(245, 158, 11, 0.3)",
        gradient: "from-orange-500 via-amber-500 to-yellow-500",
        border: "border-orange-500/30",
        bg: "bg-orange-500/5",
        text: "text-orange-400",
      };
    default:
      return {
        primary: "#64748b",
        secondary: "#94a3b8",
        accent: "#cbd5e1",
        glow: "rgba(100, 116, 139, 0.3)",
        gradient: "from-slate-500 via-slate-400 to-slate-600",
        border: "border-slate-500/30",
        bg: "bg-slate-500/5",
        text: "text-slate-400",
      };
  }
}

// Получение иконки режима
function getModeIcon(mode: string) {
  switch (mode) {
    case "survival":
      return "⚡";
    case "physics":
      return "⚛️";
    case "rotation":
      return "🔄";
    default:
      return "🎯";
  }
}

// Форматирование времени
function formatTimeRemaining(endTime: string): string {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const remaining = Math.max(0, end - now);

  if (remaining === 0) return "ENDED";

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Форматирование больших чисел
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

// Получение цвета позиции
function getPositionColor(position: number): string {
  switch (position) {
    case 1: return "#ffd700";
    case 2: return "#c0c0c0";
    case 3: return "#cd7f32";
    default: return position <= 10 ? "#3b82f6" : "#64748b";
  }
}

// Компонент записи лидерборда
function LeaderboardEntry({
  entry,
  position,
  colors,
}: {
  entry: OptimizedTournamentLeaderboardEntry;
  position: number;
  colors: any;
}) {
  const positionColor = getPositionColor(position);
  const positionIcons = ["👑", "🥈", "🥉"];

  return (
    <div
      className={`flex items-center justify-between p-3 rounded border transition-all duration-300 ${
        entry.isCurrentUser
          ? `border-2 ${colors.border} bg-gradient-to-r ${colors.bg}`
          : "border-white/10 hover:border-white/20 bg-black/40"
      }`}
      style={{
        boxShadow: entry.isCurrentUser ? `0 0 15px ${colors.glow}` : "none",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Position */}
        <div
          className="flex items-center justify-center w-8 h-8 rounded border"
          style={{
            borderColor: positionColor + "60",
            backgroundColor: positionColor + "20",
          }}
        >
          {position <= 3 ? (
            <span className="text-sm">{positionIcons[position - 1]}</span>
          ) : (
            <span
              className="text-xs font-mono font-bold"
              style={{ color: positionColor }}
            >
              {position}
            </span>
          )}
        </div>

        {/* User info */}
        <div>
          <div className="flex items-center gap-1">
            <span className="text-white font-mono text-sm">
              {entry.first_name}
              {entry.last_name && ` ${entry.last_name.charAt(0)}.`}
            </span>
            {entry.isCurrentUser && (
              <span className="text-yellow-400">⭐</span>
            )}
          </div>
          {entry.username && (
            <span className="text-white/50 text-xs font-mono">
              @{entry.username.length > 12
                ? entry.username.substring(0, 12) + "..."
                : entry.username}
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="text-right">
        <div
          className="text-sm font-mono font-bold"
          style={{ color: entry.isCurrentUser ? colors.primary : "#ffffff" }}
        >
          {formatNumber(entry.best_score)}
        </div>
        <div className="text-xs text-white/50 font-mono">PTS</div>
      </div>
    </div>
  );
}

// Главный компонент страницы
function TournamentsPageContent() {
  const router = useRouter();
  const { makeAuthenticatedRequest } = useUser();
  const t = useT();

  const [state, setState] = useState<TournamentPageState>({
    activeTournament: null,
    leaderboard: [],
    userPosition: null,
    isLoading: true,
    isLeaderboardLoading: false,
    error: null,
    leaderboardError: null,
    cacheInfo: {},
  });

  const [timeLeft, setTimeLeft] = useState<string>("");

  // ✅ ИСПРАВЛЕНО: получение активного турнира БЕЗ автообновления
  const fetchActiveTournament = useCallback(async (force: boolean = false) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const endpoint = force ? "/api/tournaments" : "/api/tournaments";
      const response = await makeAuthenticatedRequest(endpoint, {
        method: force ? "POST" : "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch active tournament");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch tournament");
      }

      setState(prev => ({
        ...prev,
        activeTournament: result.tournament,
        isLoading: false,
        error: null,
        cacheInfo: {
          ...prev.cacheInfo,
          tournament_from_cache: result.cache_info?.is_from_cache,
          cache_age_seconds: result.cache_info?.cache_age_seconds,
        },
      }));

      // Если есть активный турнир, загружаем его лидерборд
      if (result.tournament) {
        await fetchTournamentLeaderboard(result.tournament.id, force);
      }

    } catch (error) {
      console.error("Error fetching active tournament:", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch tournament",
      }));
    }
  }, [makeAuthenticatedRequest]);

  // ✅ ИСПРАВЛЕНО: получение лидерборда БЕЗ автообновления
  const fetchTournamentLeaderboard = useCallback(async (
    tournamentId: string,
    force: boolean = false
  ) => {
    try {
      setState(prev => ({ ...prev, isLeaderboardLoading: true, leaderboardError: null }));

      const endpoint = `/api/tournaments/leaderboard?tournamentId=${encodeURIComponent(tournamentId)}${
        force ? "&force_refresh=true" : ""
      }`;

      const response = await makeAuthenticatedRequest(endpoint);

      if (!response.ok) {
        throw new Error("Failed to fetch tournament leaderboard");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch leaderboard");
      }

      setState(prev => ({
        ...prev,
        leaderboard: result.leaderboard || [],
        userPosition: result.userPosition || null,
        isLeaderboardLoading: false,
        leaderboardError: null,
        cacheInfo: {
          ...prev.cacheInfo,
          leaderboard_from_cache: result.cache_info?.is_from_cache,
        },
      }));

    } catch (error) {
      console.error("Error fetching tournament leaderboard:", error);
      setState(prev => ({
        ...prev,
        isLeaderboardLoading: false,
        leaderboardError: error instanceof Error ? error.message : "Failed to fetch leaderboard",
      }));
    }
  }, [makeAuthenticatedRequest]);

  // Обновление таймера
  useEffect(() => {
    if (!state.activeTournament) return;

    const updateTimer = () => {
      if (state.activeTournament?.status === "active") {
        setTimeLeft(formatTimeRemaining(state.activeTournament.end_time));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Обновление каждую минуту

    return () => clearInterval(interval);
  }, [state.activeTournament]);

  // Начальная загрузка
  useEffect(() => {
    fetchActiveTournament();
  }, [fetchActiveTournament]);

  // ✅ УБРАНО: автообновление каждые 30 секунд

  // Обработчики
  const handlePlayTournament = useCallback(() => {
    router.push("/game");
  }, [router]);

  const handleRefresh = useCallback(() => {
    fetchActiveTournament(true); // Force refresh
  }, [fetchActiveTournament]);

  const handleRetry = useCallback(() => {
    setState(prev => ({ ...prev, error: null, leaderboardError: null }));
    fetchActiveTournament();
  }, [fetchActiveTournament]);

  // Telegram WebApp back button
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        router.push("/main");
      });

      return () => {
        tg.BackButton.hide();
        tg.BackButton.offClick(() => {});
      };
    }
  }, [router]);

  // Определение цветов активного турнира
  const colors = state.activeTournament 
    ? getFutureTechModeColors(state.activeTournament.mode)
    : getFutureTechModeColors("survival");

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center safe-area-inset">
        <div className="text-center space-y-4">
          <div className="relative">
            <Spinner color="primary" size="lg" />
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
          </div>
          <p className="text-white/80 font-mono text-sm">
            LOADING TOURNAMENT DATA...
          </p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center safe-area-inset">
        <div className="text-center space-y-6 p-6">
          <div className="relative">
            <AlertTriangle className="text-red-400 mx-auto" size={48} />
            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-mono">
              SYSTEM ERROR
            </h2>
            <p className="text-red-400 font-mono text-sm">{state.error}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              className="bg-red-500/20 border border-red-500/40 text-red-400 font-mono"
              startContent={<Zap size={16} />}
              onClick={handleRetry}
            >
              TRY AGAIN
            </Button>
            <Button
              className="bg-white/10 border border-white/30 text-white font-mono"
              startContent={<ArrowLeft size={16} />}
              onClick={() => router.push("/main")}
            >
              BACK TO MAIN
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black safe-area-inset-bottom safe-area-inset">
      <div className="px-4 pb-8">
        {/* Header */}
        <div className="text-center space-y-3 mb-8 pt-6">
          <div className="relative">
            <h1 className="text-3xl font-bold font-mono tracking-[0.3em] text-white">
              TOURNAMENT
            </h1>
            <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full animate-pulse" />
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
          <div className="flex items-center justify-center gap-2">
            <p className="text-blue-400/80 text-xs font-mono tracking-widest">
              COMPETE FOR GLORY
            </p>
            {/* Cache indicator */}
            {state.cacheInfo.tournament_from_cache && (
              <div className="text-xs text-green-400/60 font-mono">
                [CACHED]
              </div>
            )}
          </div>
        </div>

        {/* Active Tournament */}
        {state.activeTournament ? (
          <div className="space-y-6">
            {/* Tournament Info */}
            <Card
              className="bg-black/80 backdrop-blur-sm border-2"
              style={{
                borderColor: colors.primary + "60",
                boxShadow: `0 0 30px ${colors.glow}`,
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded border flex items-center justify-center"
                      style={{
                        backgroundColor: colors.primary + "20",
                        borderColor: colors.primary + "60",
                        boxShadow: `0 0 15px ${colors.glow}`,
                      }}
                    >
                      <span className="text-xl">{getModeIcon(state.activeTournament.mode)}</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white font-mono">
                        {state.activeTournament.name}
                      </h2>
                      <p
                        className="text-sm font-mono"
                        style={{ color: colors.primary }}
                      >
                        {state.activeTournament.mode.toUpperCase()} MODE
                      </p>
                    </div>
                  </div>

                  {/* Time Display */}
                  {state.activeTournament.status === "active" && timeLeft && (
                    <div className="text-right">
                      <div className="text-xs text-white/60 font-mono">ENDS IN</div>
                      <div
                        className="text-lg font-mono font-bold"
                        style={{ color: colors.primary }}
                      >
                        {timeLeft}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardBody className="pt-0">
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-transparent border font-mono"
                    startContent={<Play size={16} />}
                    style={{
                      borderColor: colors.primary + "60",
                      color: colors.primary,
                    }}
                    onClick={handlePlayTournament}
                  >
                    PLAY NOW
                  </Button>
                  <Button
                    className="bg-transparent border border-white/30 text-white font-mono"
                    startContent={<RefreshCw size={16} />}
                    onClick={handleRefresh}
                  >
                    REFRESH
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* User Position */}
            {state.userPosition && (
              <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trophy className="text-yellow-400" size={20} />
                      <div>
                        <div className="text-yellow-400 font-mono text-sm font-bold">
                          YOUR POSITION
                        </div>
                        <div className="text-white font-mono text-xs">
                          {state.userPosition.entry.best_score} POINTS
                        </div>
                      </div>
                    </div>
                    <div
                      className="text-2xl font-bold font-mono"
                      style={{ color: getPositionColor(state.userPosition.position) }}
                    >
                      #{state.userPosition.position}
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Leaderboard */}
            <Card className="bg-black/60 border border-white/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Trophy className="text-yellow-400" size={16} />
                    <h3 className="text-lg font-bold text-white font-mono">
                      LEADERBOARD
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60 font-mono">
                    <Users size={12} />
                    <span>{state.leaderboard.length}</span>
                    {state.cacheInfo.leaderboard_from_cache && (
                      <div className="text-xs text-green-400/60">[CACHED]</div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardBody className="pt-0">
                {state.isLeaderboardLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner color="primary" size="sm" />
                  </div>
                ) : state.leaderboardError ? (
                  <div className="text-center py-8">
                    <p className="text-red-400 font-mono text-sm">
                      {state.leaderboardError}
                    </p>
                  </div>
                ) : state.leaderboard.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {state.leaderboard.map((entry, index) => (
                      <LeaderboardEntry
                        key={`${entry.first_name}-${index}`}
                        entry={entry}
                        position={index + 1}
                        colors={colors}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="text-white/20 mx-auto mb-2" size={32} />
                    <p className="text-white/60 font-mono text-sm">
                      NO PARTICIPANTS YET
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        ) : (
          // No Active Tournament
          <div className="text-center py-12">
            <div className="relative mb-6">
              <Trophy className="text-white/20 mx-auto" size={64} />
              <div className="absolute inset-0 bg-white/5 blur-xl rounded-full" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white font-mono">
                NO ACTIVE TOURNAMENT
              </h2>
              <p className="text-white/60 font-mono text-sm">
                CHECK BACK SOON FOR THE NEXT COMPETITION
              </p>
            </div>
            <Button
              className="mt-6 bg-white/10 border border-white/30 text-white font-mono"
              startContent={<RefreshCw size={16} />}
              onClick={handleRefresh}
            >
              CHECK FOR UPDATES
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TournamentsPage() {
  return <TournamentsPageContent />;
}