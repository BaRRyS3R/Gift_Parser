// src/app/tournaments/page.tsx - ИСПРАВЛЕНО: работа с реальной структурой данных призов

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, Button, Spinner } from "@nextui-org/react";
import {
  Trophy,
  AlertTriangle,
  ArrowLeft,
  Play,
  Target,
  Users,
  Zap,
  Gift,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import type {
  Tournament,
  OptimizedTournamentLeaderboardEntry,
  TournamentUserPosition,
  Prize,
} from "@/types/tournaments";

// Упрощенные интерфейсы (только активный турнир)
interface TournamentPageState {
  activeTournament: Tournament | null;
  leaderboard: OptimizedTournamentLeaderboardEntry[];
  userPosition: TournamentUserPosition | null;
  isLoading: boolean;
  isLeaderboardLoading: boolean;
  error: string | null;
  leaderboardError: string | null;
}

// НОВЫЙ интерфейс для работы с реальными данными призов из API
interface RawPrizeData {
  place?: number;
  prize?: string;
  position?: number;
  description?: string;
  attempts?: number;
  reward_type?: string;
  special_title?: string;
}

// Future Tech цвета для режимов
function getFutureTechModeColors(mode?: string) {
  const normalizedMode = mode?.toLowerCase();
  
  switch (normalizedMode) {
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
function getModeIcon(mode?: string) {
  const normalizedMode = mode?.toLowerCase();
  
  switch (normalizedMode) {
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

// Получение названия режима
function getModeName(mode?: string) {
  const normalizedMode = mode?.toLowerCase();
  
  switch (normalizedMode) {
    case "survival":
      return "SURVIVAL";
    case "physics":
      return "PHYSICS";
    case "rotation":
      return "ROTATION";
    default:
      return "GAME";
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

// ПОЛНОСТЬЮ ПЕРЕПИСАННЫЙ компонент отображения призов для работы с реальными данными
function PrizesSection({ prizes, colors }: { prizes: RawPrizeData[]; colors: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  console.log("[PrizesSection] Raw prizes data:", prizes);
  
  if (!prizes || prizes.length === 0) {
    console.log("[PrizesSection] No prizes to display");
    return null;
  }

  // Функция нормализации данных приза
  const normalizePrize = (prize: RawPrizeData, index: number) => {
    // Определяем позицию из разных возможных полей
    const position = prize.position ?? prize.place ?? (index + 1);
    
    // Определяем описание из разных возможных полей
    const description = prize.description ?? prize.prize ?? "Unknown prize";
    
    // Извлекаем количество попыток из описания
    const attemptsMatch = description.match(/(\d+)\s+(?:bonus\s+)?attempts/i);
    const attempts = prize.attempts ?? (attemptsMatch ? parseInt(attemptsMatch[1]) : undefined);
    
    // Определяем тип награды
    const reward_type = prize.reward_type ?? 
      (description.toLowerCase().includes('attempts') ? 'attempts' : 'custom');

    const normalized = {
      position,
      description,
      attempts,
      reward_type,
      special_title: prize.special_title
    };

    console.log(`[PrizesSection] Normalized prize ${index}:`, {
      original: prize,
      normalized: normalized
    });

    return normalized;
  };

  const getPrizeIcon = (position: number, rewardType?: string) => {
    if (position === 1) return "👑";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";
    if (rewardType === "attempts") return "⚡";
    return "🎁";
  };

  const getPrizeColor = (position: number) => {
    if (position === 1) return "text-yellow-400";
    if (position === 2) return "text-gray-300";
    if (position === 3) return "text-orange-400";
    return "text-blue-400";
  };

  const getPositionText = (position: number) => {
    if (position === 1) return "1st PLACE";
    if (position === 2) return "2nd PLACE";
    if (position === 3) return "3rd PLACE";
    return `${position}th PLACE`;
  };

  return (
    <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Gift className="text-yellow-400" size={16} />
            <h3 className="text-lg font-bold text-white font-mono">PRIZES</h3>
            <span className="text-xs text-white/60 font-mono">({prizes.length})</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="text-yellow-400" size={16} />
          ) : (
            <ChevronDown className="text-yellow-400" size={16} />
          )}
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardBody className="pt-0">
          <div className="grid gap-3">
            {prizes.map((rawPrize, index) => {
              const prize = normalizePrize(rawPrize, index);
              
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8">
                      <span className="text-lg">
                        {getPrizeIcon(prize.position, prize.reward_type)}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-bold ${getPrizeColor(prize.position)}`}>
                          {getPositionText(prize.position)}
                        </span>
                      </div>
                      
                      <div className="text-white/80 text-xs font-mono mt-1">
                        {prize.description}
                      </div>
                      
                      {prize.special_title && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="text-yellow-400" size={10} />
                          <span className="text-yellow-400 text-xs font-mono">
                            {prize.special_title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {prize.attempts && (
                    <div className="text-right">
                      <div className="text-blue-400 font-mono text-sm font-bold">
                        +{prize.attempts}
                      </div>
                      <div className="text-white/50 text-xs font-mono">ATTEMPTS</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      )}
    </Card>
  );
}

// Упрощенный компонент записи лидерборда
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
    <>
      <div
        className={`flex items-center justify-between py-3 px-1 transition-all duration-300 ${
          entry.isCurrentUser
            ? `border-l-2 pl-3 bg-gradient-to-r ${colors.bg}`
            : "hover:bg-white/5"
        }`}
        style={{
          borderLeftColor: entry.isCurrentUser ? colors.primary : "transparent",
          backgroundColor: entry.isCurrentUser ? colors.glow + "10" : "transparent",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8">
            {position <= 3 ? (
              <span className="text-lg">{positionIcons[position - 1]}</span>
            ) : (
              <span
                className="text-sm font-mono font-bold"
                style={{ color: positionColor }}
              >
                {position}
              </span>
            )}
          </div>

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
      <div className="h-px bg-white/10 mx-4" />
    </>
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
  });

  const [timeLeft, setTimeLeft] = useState<string>("");

  const fetchActiveTournament = useCallback(async (force: boolean = false) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const endpoint = "/api/tournaments";
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

      let tournament = result.tournament;
      if (tournament) {
        tournament = {
          ...tournament,
          mode: tournament.mode || tournament.game_mode || 'unknown'
        };
        
        console.log("[TournamentsPage] Tournament loaded with prizes:", {
          id: tournament.id,
          name: tournament.name,
          mode: tournament.mode,
          status: tournament.status,
          prizes_count: tournament.prizes?.length || 0,
          first_prize_structure: tournament.prizes?.[0]
        });
      }

      setState(prev => ({
        ...prev,
        activeTournament: tournament,
        isLoading: false,
        error: null,
      }));

      if (tournament) {
        await fetchTournamentLeaderboard(tournament.id, force);
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

  const fetchTournamentLeaderboard = useCallback(async (
    tournamentId: string,
    force: boolean = false
  ) => {
    try {
      setState(prev => ({ ...prev, isLeaderboardLoading: true, leaderboardError: null }));

      const endpoint = `/api/tournaments/leaderboard?tournamentId=${encodeURIComponent(tournamentId)}&limit=100${
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

  useEffect(() => {
    if (!state.activeTournament) return;

    const updateTimer = () => {
      if (state.activeTournament?.status === "active" && state.activeTournament?.end_time) {
        setTimeLeft(formatTimeRemaining(state.activeTournament.end_time));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [state.activeTournament]);

  useEffect(() => {
    fetchActiveTournament();
  }, [fetchActiveTournament]);

  const handlePlayTournament = useCallback(() => {
    router.push("/game");
  }, [router]);

  const handleRetry = useCallback(() => {
    setState(prev => ({ ...prev, error: null, leaderboardError: null }));
    fetchActiveTournament();
  }, [fetchActiveTournament]);

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

  const colors = getFutureTechModeColors(state.activeTournament?.mode);
  const tournamentMode = state.activeTournament?.mode;

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
          </div>
        </div>

        {state.activeTournament ? (
          <div className="space-y-6">
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
                      <span className="text-xl">{getModeIcon(tournamentMode)}</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white font-mono">
                        {state.activeTournament.name}
                      </h2>
                      <p
                        className="text-sm font-mono"
                        style={{ color: colors.primary }}
                      >
                        {getModeName(tournamentMode)} MODE
                      </p>
                    </div>
                  </div>

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
                <Button
                  className="w-full bg-transparent border font-mono"
                  startContent={<Play size={16} />}
                  style={{
                    borderColor: colors.primary + "60",
                    color: colors.primary,
                  }}
                  onClick={handlePlayTournament}
                >
                  PLAY NOW
                </Button>
              </CardBody>
            </Card>

            <PrizesSection prizes={state.activeTournament.prizes || []} colors={colors} />

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
                      #{state.userPosition.position.toLocaleString()}
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="text-yellow-400" size={16} />
                  <h3 className="text-lg font-bold text-white font-mono">
                    TOP 100 LEADERBOARD
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/60 font-mono">
                  <Users size={12} />
                  <span>{state.leaderboard.length}</span>
                </div>
              </div>

              <div className="bg-black/40 border border-white/20 rounded-lg p-4">
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
                  <div className="max-h-96 overflow-y-auto">
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
              </div>
            </div>
          </div>
        ) : (
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
          </div>
        )}
      </div>
    </div>
  );
}

export default function TournamentsPage() {
  return <TournamentsPageContent />;
}