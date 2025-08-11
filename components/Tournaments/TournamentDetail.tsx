// src/components/Tournaments/TournamentDetail.tsx - Future Tech стилистика детального просмотра турнира

"use client";

import type { Tournament, Prize } from "@/hooks/modules/useTournaments";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
} from "@nextui-org/react";
import {
  Trophy,
  Target,
  ArrowLeft,
  Play,
  Clock,
  Calendar,
  Info,
} from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

// Props interface
interface TournamentDetailProps {
  tournament: Tournament;
  onBack: () => void;
  onJoinTournament?: (tournament: Tournament) => void;
  onViewLeaderboard?: (tournament: Tournament) => void;
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

// Game route mapping
const gameRoutes: Record<string, string> = {
  survival: "/game",
  physics: "/game",
  rotation: "/game",
};

// Форматирование времени
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

function formatTimeUntilStart(startTime: string): string {
  const now = new Date().getTime();
  const start = new Date(startTime).getTime();
  const remaining = Math.max(0, start - now);

  if (remaining === 0) return "STARTING";

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );

  if (days > 0) return `${days}d ${hours}h`;

  return `${hours}h`;
}

// Компонент статуса турнира
function TournamentStatus({ status, colors }: { status: string; colors: any }) {
  const t = useT();

  const statusConfig = {
    active: { icon: "🟢", text: t(`tournaments.status.active`), pulse: true },
    upcoming: {
      icon: "🔵",
      text: t(`tournaments.status.upcoming`),
      pulse: false,
    },
    completed: {
      icon: "⚫",
      text: t(`tournaments.status.completed`),
      pulse: false,
    },
    cancelled: {
      icon: "🔴",
      text: t(`tournaments.status.cancelled`),
      pulse: false,
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.upcoming;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded border ${colors.border} ${colors.bg}`}
    >
      <span className={config.pulse ? "animate-pulse" : ""}>{config.icon}</span>
      <span className={`text-xs font-mono ${colors.text}`}>{config.text}</span>
    </div>
  );
}

// Компонент отображения призов
function PrizesDisplay({ prizes, colors }: { prizes: Prize[]; colors: any }) {
  const t = useT();

  if (!prizes || prizes.length === 0) return null;

  // Базовые иконки для первых позиций
  const getIconForPosition = (index: number): string => {
    const baseIcons = ["🥇", "🥈", "🥉"];

    if (index < baseIcons.length) return baseIcons[index];

    return "🏆"; // Для всех остальных позиций
  };

  // Базовые цвета для первых позиций
  const getColorForPosition = (index: number): string => {
    const baseColors = ["#ffd700", "#c0c0c0", "#cd7f32"];

    if (index < baseColors.length) return baseColors[index];

    return colors.primary; // Для всех остальных позиций
  };

  // Функция для безопасного получения позиции приза
  const getPrizePosition = (prize: any): string => {
    if (prize.position !== undefined) {
      return typeof prize.position === "string"
        ? prize.position
        : `#${prize.position}`;
    }
    if (prize.place !== undefined) {
      return typeof prize.place === "string" ? prize.place : `#${prize.place}`;
    }

    return `#${prizes.indexOf(prize) + 1}`;
  };

  // Функция для безопасного получения описания приза
  const getPrizeDescription = (prize: any): string => {
    return prize.description || prize.prize || "Prize";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-mono text-white/60">
        <Trophy size={12} />
        <span>PRIZE MATRIX ({prizes.length} TOTAL)</span>
      </div>

      {/* Отображение всех призов в вертикальном списке */}
      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
        {prizes.map((prize, index) => {
          const prizeColor = getColorForPosition(index);
          const prizeIcon = getIconForPosition(index);

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
                    {getPrizePosition(prize)}
                  </div>
                  <div className="text-xs text-white/60 font-mono">
                    POSITION
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white font-mono">
                  {getPrizeDescription(prize)}
                </div>
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

      {/* Общая статистика призов */}
      {prizes.length > 3 && (
        <div className="text-center p-2 rounded border border-white/20 bg-black/20">
          <span className="text-xs font-mono text-white/60">
            TOTAL PRIZE POSITIONS: {prizes.length}
          </span>
        </div>
      )}
    </div>
  );
}

// Компонент статистики турнира
function TournamentStats({
  tournament,
  colors,
}: {
  tournament: Tournament;
  colors: any;
}) {
  const t = useT();

  const statsData = [
    {
      label: "DURATION",
      value: () => {
        const start = new Date(tournament.start_time);
        const end = new Date(tournament.end_time);
        const days = Math.ceil(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
        );

        return `${days}D`;
      },
      icon: Clock,
    },
    {
      label: "START",
      value: () =>
        new Date(tournament.start_time).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      icon: Calendar,
    },
    {
      label: "MODE",
      value: () =>
        t(`tournaments.modes.${tournament.mode}` as any).toUpperCase(),
      icon: Target,
    },
    {
      label: "STATUS",
      value: () =>
        t(`tournaments.status.${tournament.status}` as any).toUpperCase(),
      icon: Info,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {statsData.map((stat, index) => {
        const IconComponent = stat.icon;

        return (
          <div
            key={index}
            className="p-3 rounded border bg-black/40"
            style={{
              borderColor: colors.primary + "30",
              backgroundColor: colors.primary + "05",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <IconComponent size={10} style={{ color: colors.primary }} />
              <span className="text-xs font-mono text-white/60">
                {stat.label}
              </span>
            </div>
            <div className="text-sm font-mono font-bold text-white">
              {stat.value()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Компонент инструкций по участию
function ParticipationGuide({
  tournament,
  colors,
}: {
  tournament: Tournament;
  colors: any;
}) {
  const t = useT();

  const instructions = [
    t("tournaments.participation.playGames", {
      mode: t(`tournaments.modes.${tournament.mode}` as any),
    }),
    t("tournaments.participation.bestScore"),
    t("tournaments.participation.multipleGames"),
    t("tournaments.participation.timeLimit"),
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-mono text-white/60">
        <Target size={12} />
        <span>PARTICIPATION PROTOCOL</span>
      </div>
      <div className="space-y-2">
        {instructions.map((instruction, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-2 rounded border"
            style={{
              borderColor: colors.primary + "20",
              backgroundColor: colors.primary + "05",
            }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-bold mt-0.5"
              style={{
                backgroundColor: colors.primary + "30",
                color: colors.primary,
              }}
            >
              {index + 1}
            </div>
            <div className="text-xs text-white/80 font-mono leading-relaxed">
              {instruction}
            </div>
          </div>
        ))}
      </div>
      <div className="text-center pt-2">
        <div className="text-xs font-mono" style={{ color: colors.primary }}>
          {t("tournaments.participation.goodLuck")}
        </div>
      </div>
    </div>
  );
}

// Главный компонент
export default function TournamentDetail({
  tournament,
  onBack,
  onJoinTournament,
  onViewLeaderboard,
}: TournamentDetailProps): React.JSX.Element {
  const router = useRouter();
  const t = useT();

  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const colors = getFutureTechModeColors(tournament.mode);
  const modeIcon = getModeIcon(tournament.mode);

  // Обновление таймера
  useEffect(() => {
    if (!tournament || !tournament.mode) return;

    const updateTimer = () => {
      if (tournament.status === "active") {
        setTimeLeft(formatTimeRemaining(tournament.end_time));
      } else if (tournament.status === "upcoming") {
        setTimeLeft(formatTimeUntilStart(tournament.start_time));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [tournament.end_time, tournament.start_time, tournament.status]);

  // Обработчики действий
  const handleJoinTournament = useCallback(() => {
    if (
      tournament.status === "active" &&
      tournament.mode &&
      tournament.mode in gameRoutes
    ) {
      setIsLoading(true);
      const gameRoute = gameRoutes[tournament.mode];

      setTimeout(() => {
        router.push(gameRoute);
      }, 600);
    }
  }, [tournament, router]);

  const handleViewLeaderboard = useCallback(() => {
    if (onViewLeaderboard && tournament.mode) {
      onViewLeaderboard(tournament);
    }
  }, [tournament, onViewLeaderboard]);

  return (
    <div className="min-h-screen bg-black safe-area-inset-bottom safe-area-inset">
      <div className="px-4 pb-8">
        {/* Header */}
        <div className="mb-6 pt-4">
          <Button
            className="mb-4 bg-white/10 border border-white/30 text-white font-mono text-xs"
            size="sm"
            startContent={<ArrowLeft size={14} />}
            onClick={onBack}
          >
            BACK TO TOURNAMENTS
          </Button>

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
                    <span className="text-xl">{modeIcon}</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white font-mono">
                      {tournament.name}
                    </h1>
                    <p
                      className="text-sm font-mono"
                      style={{ color: colors.primary }}
                    >
                      {t(`tournaments.modes.${tournament.mode}` as any)}{" "}
                      TOURNAMENT
                    </p>
                    <div className="mt-2">
                      <TournamentStatus
                        colors={colors}
                        status={tournament.status}
                      />
                    </div>
                  </div>
                </div>

                {/* Time Display */}
                {(tournament.status === "active" ||
                  tournament.status === "upcoming") &&
                  timeLeft && (
                    <div className="text-right">
                      <div className="text-xs text-white/60 font-mono">
                        {tournament.status === "active"
                          ? "ENDS IN"
                          : "STARTS IN"}
                      </div>
                      <div
                        className="text-lg font-mono font-bold"
                        style={{ color: colors.primary }}
                      >
                        {timeLeft}
                      </div>
                    </div>
                  )}

                {tournament.status === "completed" && (
                  <div className="text-right">
                    <div className="text-xs text-white/60 font-mono">ENDED</div>
                    <div className="text-sm font-mono text-slate-400">
                      {new Date(tournament.end_time).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardBody className="space-y-4">
              {tournament.description && (
                <div>
                  <div className="text-xs font-mono text-white/60 mb-2">
                    DESCRIPTION
                  </div>
                  <p className="text-sm text-white/80 font-mono leading-relaxed">
                    {tournament.description}
                  </p>
                </div>
              )}

              {/* Tournament Statistics */}
              <TournamentStats colors={colors} tournament={tournament} />
            </CardBody>

            <CardFooter className="pt-4">
              <div className="flex gap-3 w-full">
                {tournament.status === "active" && (
                  <Button
                    className="flex-1 bg-transparent border font-mono"
                    isLoading={isLoading}
                    startContent={!isLoading && <Play size={16} />}
                    style={{
                      borderColor: colors.primary + "60",
                      color: colors.primary,
                    }}
                    onClick={handleJoinTournament}
                  >
                    {isLoading ? "LOADING..." : "PLAY NOW"}
                  </Button>
                )}

                <Button
                  className="flex-1 bg-transparent border font-mono"
                  startContent={<Trophy size={16} />}
                  style={{
                    borderColor: colors.primary + "40",
                    color: colors.text.replace("text-", ""),
                  }}
                  onClick={handleViewLeaderboard}
                >
                  LEADERBOARD
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Participation Guide */}
        <Card className="bg-black/60 border border-white/20 mb-6">
          <CardBody className="p-4">
            <ParticipationGuide colors={colors} tournament={tournament} />
          </CardBody>
        </Card>

        {/* Prizes */}
        {tournament.prizes && tournament.prizes.length > 0 && (
          <Card className="bg-black/60 border border-white/20">
            <CardBody className="p-4">
              <PrizesDisplay colors={colors} prizes={tournament.prizes} />
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
