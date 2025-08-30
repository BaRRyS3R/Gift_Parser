// src/app/tournaments/page.tsx - Упрощенная страница турниров с активным турниром

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, Button, Spinner, Avatar } from "@nextui-org/react";
import {
  Trophy,
  Target,
  Crown,
  Medal,
  Award,
  AlertTriangle,
  Star,
  TrendingUp,
  Zap,
  Users,
  ArrowLeft,
  Play,
  Clock,
  Calendar,
  Info,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";

// Tournament interfaces
interface Tournament {
  id: string;
  name: string;
  description?: string;
  mode: "survival" | "physics" | "rotation";
  start_time: string;
  end_time: string;
  status: "upcoming" | "active" | "completed" | "cancelled";
  prizes: Prize[];
  created_at: string;
  updated_at: string;
}

interface Prize {
  position: number;
  description: string;
  attempts?: number;
  special_title?: string;
  reward_type?: "attempts" | "title" | "custom";
}

interface PublicTournamentLeaderboardEntry {
  tournament_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  best_score: number;
}

interface TournamentUserPosition {
  position: number;
  entry: PublicTournamentLeaderboardEntry;
}

interface TournamentStats {
  totalParticipants: number;
  totalGames: number;
  averageScore: number;
  highestScore: number;
}

interface PublicTournamentData {
  tournament: Tournament;
  leaderboard: PublicTournamentLeaderboardEntry[];
  userPosition?: TournamentUserPosition;
  stats: TournamentStats;
}

interface TournamentResponse {
  success: boolean;
  tournament?: PublicTournamentData;
  cache_info?: {
    is_from_cache: boolean;
    cached_at?: number;
    cache_age_seconds?: number;
    next_update_in_seconds?: number;
  };
  error?: string;
}

// Future Tech colors for game modes
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

// Get mode icon
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

// Format time remaining
function formatTimeRemaining(endTime: string): string {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const remaining = Math.max(0, end - now);

  if (remaining === 0) return "ENDED";

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

// Get position icon
function getPositionIcon(position: number): React.ComponentType<any> | null {
  switch (position) {
    case 1:
      return Crown;
    case 2:
    case 3:
      return Medal;
    default:
      return position <= 10 ? Award : null;
  }
}

// Get position color
function getPositionColor(position: number): string {
  switch (position) {
    case 1:
      return "#ffd700";
    case 2:
      return "#c0c0c0";
    case 3:
      return "#cd7f32";
    default:
      return position <= 10 ? "#3b82f6" : "#64748b";
  }
}

// Check if entry belongs to current user
function isCurrentUserEntry(
  entry: PublicTournamentLeaderboardEntry,
  user: any,
): boolean {
  if (!user) return false;

  const entryFullName = `${entry.first_name} ${entry.last_name || ""}`.trim();
  const userFullName = `${user.first_name} ${user.last_name || ""}`.trim();

  if (entry.username && user.username) {
    return entry.username === user.username;
  }

  return entryFullName === userFullName;
}

// Tournament Status Component
function TournamentStatus({ status, colors }: { status: string; colors: any }) {
  const statusConfig = {
    active: { icon: "🟢", text: "ACTIVE", pulse: true },
    upcoming: { icon: "🔵", text: "UPCOMING", pulse: false },
    completed: { icon: "⚫", text: "COMPLETED", pulse: false },
    cancelled: { icon: "🔴", text: "CANCELLED", pulse: false },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.upcoming;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded border ${colors.border} ${colors.bg}`}
    >
      <span className={config.pulse ? "animate-pulse" : ""}>{config.icon}</span>
      <span className={`text-xs font-mono ${colors.text}`}>{config.text}</span>
    </div>
  );
}

// Tournament Stats Component
function TournamentStatsDisplay({
  tournament,
  stats,
  colors,
}: {
  tournament: Tournament;
  stats: TournamentStats;
  colors: any;
}) {
  const statsData = [
    {
      label: "PARTICIPANTS",
      value: stats.totalParticipants.toString(),
      icon: Users,
    },
    {
      label: "TOTAL GAMES",
      value: stats.totalGames.toString(),
      icon: Target,
    },
    {
      label: "HIGH SCORE",
      value: formatNumber(stats.highestScore),
      icon: Trophy,
    },
    {
      label: "AVG SCORE",
      value: formatNumber(stats.averageScore),
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {statsData.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div
            key={index}
            className="p-3 rounded border bg-black/40 text-center"
            style={{
              borderColor: colors.primary + "30",
              backgroundColor: colors.primary + "05",
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <IconComponent size={12} style={{ color: colors.primary }} />
              <span className="text-xs font-mono text-white/60">{stat.label}</span>
            </div>
            <div className="text-lg font-mono font-bold text-white">{stat.value}</div>
          </div>
        );
      })}
    </div>
  );
}

// Prizes Display Component
function PrizesDisplay({ prizes, colors }: { prizes: Prize[]; colors: any }) {
  if (!prizes || prizes.length === 0) return null;

  const prizeIcons = ["🥇", "🥈", "🥉", "🏆", "💎"];

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2 text-xs font-mono text-white/60">
        <Trophy size={12} />
        <span>PRIZE POOL ({prizes.length} POSITIONS)</span>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {prizes.map((prize, index) => {
          const prizeColor = getPositionColor(index + 1);
          const prizeIcon = prizeIcons[index] || "🎁";

          return (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded border bg-black/40"
              style={{
                borderColor: prizeColor + "40",
                boxShadow: `0 0 8px ${prizeColor}20`,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{prizeIcon}</span>
                <div>
                  <div
                    className="text-sm font-mono font-bold"
                    style={{ color: prizeColor }}
                  >
                    #{prize.position}
                  </div>
                  <div className="text-xs text-white/60 font-mono">PLACE</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white font-mono">{prize.description}</div>
                {prize.attempts && (
                  <div
                    className="text-xs font-mono"
                    style={{ color: colors.primary }}
                  >
                    +{prize.attempts} ATTEMPTS
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Leaderboard Entry Component
function LeaderboardEntry({
  entry,
  position,
  colors,
  isCurrentUser = false,
}: {
  entry: PublicTournamentLeaderboardEntry;
  position: number;
  colors: any;
  isCurrentUser?: boolean;
}) {
  const PositionIcon = getPositionIcon(position);
  const positionColor = getPositionColor(position);

  return (
    <Card
      className={`bg-black/60 backdrop-blur-sm border transition-all duration-300 hover:scale-[1.01] ${
        isCurrentUser
          ? `border-2 ${colors.border}`
          : "border-white/10 hover:border-white/20"
      }`}
      style={{
        boxShadow: isCurrentUser ? `0 0 15px ${colors.glow}` : "none",
      }}
    >
      <CardBody className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Position */}
            <div
              className="flex items-center justify-center w-10 h-10 rounded border"
              style={{
                borderColor: positionColor + "60",
                backgroundColor: positionColor + "20",
              }}
            >
              {PositionIcon ? (
                <PositionIcon
                  className="text-sm"
                  size={16}
                  style={{ color: positionColor }}
                />
              ) : (
                <span
                  className="text-sm font-mono font-bold"
                  style={{ color: positionColor }}
                >
                  {position}
                </span>
              )}
            </div>

            {/* User info */}
            <div className="flex items-center gap-3">
              <Avatar
                className="bg-white/20 text-white border"
                name={entry.first_name.charAt(0)}
                size="sm"
                style={{
                  borderColor: isCurrentUser ? colors.primary : "transparent",
                }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-base truncate">
                    {entry.first_name}
                    {entry.last_name && ` ${entry.last_name.charAt(0)}.`}
                  </span>
                  {isCurrentUser && (
                    <Star className="text-yellow-400 fill-current" size={12} />
                  )}
                </div>
                {entry.username && (
                  <span className="text-white/50 text-sm font-mono">
                    @{entry.username.length > 15 ? entry.username.substring(0, 15) + "..." : entry.username}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="text-right">
            <div
              className="text-lg font-mono font-bold"
              style={{ color: isCurrentUser ? colors.primary : "#ffffff" }}
            >
              {formatNumber(entry.best_score)}
            </div>
            <div className="text-xs text-white/50 font-mono">POINTS</div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// Empty State Component
function EmptyTournamentState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center safe-area-inset">
      <div className="text-center space-y-6 p-6">
        <div className="relative mb-6">
          <Trophy className="text-white/20 mx-auto" size={80} />
          <div className="absolute inset-0 bg-white/5 blur-xl rounded-full" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white font-mono">NO ACTIVE TOURNAMENT</h1>
          <p className="text-white/60 font-mono text-sm max-w-md">
            There are currently no active tournaments. Check back soon for upcoming competitions and challenges!
          </p>
        </div>
        <div className="pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded border border-blue-500/30 bg-blue-500/10">
            <Clock className="text-blue-400" size={16} />
            <span className="text-blue-400 font-mono text-sm">COMING SOON</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TournamentsPageContent() {
  const router = useRouter();
  const { user, makeAuthenticatedRequest } = useUser();

  const [tournamentData, setTournamentData] = useState<PublicTournamentData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [cacheInfo, setCacheInfo] = useState<any>(null);

  const fetchTournamentData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await makeAuthenticatedRequest("/api/tournaments");

      if (!response.ok) {
        throw new Error("Failed to fetch tournament data");
      }

      const result: TournamentResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch tournament data");
      }

      setTournamentData(result.tournament || null);
      setCacheInfo(result.cache_info || null);

    } catch (error) {
      console.error("Error fetching tournament data:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch tournament data");
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const handlePlayNow = useCallback(() => {
    router.push("/game");
  }, [router]);

  const handleRetry = useCallback(() => {
    setError(null);
    fetchTournamentData();
  }, [fetchTournamentData]);

  // Fetch data on mount
  useEffect(() => {
    fetchTournamentData();
  }, [fetchTournamentData]);

  // Update countdown timer
  useEffect(() => {
    if (!tournamentData?.tournament || tournamentData.tournament.status !== "active") return;

    const updateTimer = () => {
      setTimeLeft(formatTimeRemaining(tournamentData.tournament.end_time));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [tournamentData]);

  // Setup Telegram Back Button
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

  // Auto-refresh every 30 seconds for active tournaments
  useEffect(() => {
    if (tournamentData?.tournament?.status === "active") {
      const interval = setInterval(() => {
        fetchTournamentData();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [tournamentData?.tournament?.status, fetchTournamentData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center safe-area-inset">
        <div className="text-center space-y-4">
          <div className="relative">
            <Spinner color="primary" size="lg" />
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
          </div>
          <p className="text-white/80 font-mono text-sm">LOADING TOURNAMENT DATA...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center safe-area-inset">
        <div className="text-center space-y-6 p-6">
          <div className="relative">
            <AlertTriangle className="text-red-400 mx-auto" size={48} />
            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-mono">SYSTEM ERROR</h2>
            <p className="text-red-400 font-mono text-sm">{error}</p>
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

  if (!tournamentData) {
    return <EmptyTournamentState />;
  }

  const { tournament, leaderboard, userPosition, stats } = tournamentData;
  const colors = getFutureTechModeColors(tournament.mode);
  const modeIcon = getModeIcon(tournament.mode);

  return (
    <div className="min-h-screen bg-black safe-area-inset-bottom safe-area-inset">
      <div className="px-4 pb-8">
        {/* Tournament Header */}
        <div className="mb-6 pt-4">
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
                    className="w-16 h-16 rounded border flex items-center justify-center"
                    style={{
                      backgroundColor: colors.primary + "20",
                      borderColor: colors.primary + "60",
                      boxShadow: `0 0 15px ${colors.glow}`,
                    }}
                  >
                    <span className="text-2xl">{modeIcon}</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white font-mono">
                      {tournament.name}
                    </h1>
                    <p
                      className="text-sm font-mono capitalize"
                      style={{ color: colors.primary }}
                    >
                      {tournament.mode} TOURNAMENT
                    </p>
                    <div className="mt-2">
                      <TournamentStatus colors={colors} status={tournament.status} />
                    </div>
                  </div>
                </div>

                {/* Time Display */}
                {tournament.status === "active" && timeLeft && (
                  <div className="text-right">
                    <div className="text-xs text-white/60 font-mono">ENDS IN</div>
                    <div
                      className="text-xl font-mono font-bold"
                      style={{ color: colors.primary }}
                    >
                      {timeLeft}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardBody className="pt-0">
              {tournament.description && (
                <p className="text-sm text-white/80 font-mono mb-4">
                  {tournament.description}
                </p>
              )}
              
              {/* Play Button */}
              {tournament.status === "active" && (
                <div className="mb-4">
                  <Button
                    className="w-full bg-transparent border-2 font-mono"
                    size="lg"
                    startContent={<Play size={20} />}
                    style={{
                      borderColor: colors.primary + "80",
                      color: colors.primary,
                    }}
                    onClick={handlePlayNow}
                  >
                    PLAY NOW
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Tournament Stats */}
        <TournamentStatsDisplay colors={colors} stats={stats} tournament={tournament} />

        {/* User Position (if participating) */}
        {userPosition && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={12} style={{ color: colors.primary }} />
                <h2
                  className="text-xs font-mono tracking-wider"
                  style={{ color: colors.primary }}
                >
                  YOUR POSITION
                </h2>
              </div>
              <div
                className="flex-1 h-px bg-gradient-to-r to-transparent"
                style={{
                  backgroundImage: `linear-gradient(to right, ${colors.primary}60, transparent)`,
                }}
              />
            </div>
            <LeaderboardEntry
              colors={colors}
              entry={userPosition.entry}
              isCurrentUser={true}
              position={userPosition.position}
            />
          </div>
        )}

        {/* Prizes */}
        {tournament.prizes && tournament.prizes.length > 0 && (
          <PrizesDisplay colors={colors} prizes={tournament.prizes} />
        )}

        {/* Leaderboard */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-400" size={12} />
              <h2 className="text-xs font-mono text-yellow-400 tracking-wider">
                LEADERBOARD
              </h2>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-yellow-500/50 to-transparent" />
            <div className="flex items-center gap-1 text-xs font-mono text-white/50">
              <Users size={10} />
              <span>{leaderboard.length}</span>
            </div>
          </div>

          {leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => {
                const position = index + 1;
                const isCurrentUser = isCurrentUserEntry(entry, user);

                return (
                  <LeaderboardEntry
                    key={`${entry.tournament_id}-${entry.first_name}-${position}`}
                    colors={colors}
                    entry={entry}
                    isCurrentUser={isCurrentUser}
                    position={position}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="relative mb-6">
                <Trophy className="text-white/20 mx-auto" size={48} />
                <div className="absolute inset-0 bg-white/5 blur-xl rounded-full" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white font-mono">NO PARTICIPANTS YET</h3>
                <p className="text-white/60 font-mono text-sm">
                  Be the first to join this tournament!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TournamentsPage() {
  return <TournamentsPageContent />;
}