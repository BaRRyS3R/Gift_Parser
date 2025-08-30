// src/components/Tournaments/TournamentButton.tsx - ИСПРАВЛЕН: корректное отображение активных турниров

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Trophy, Target, Zap } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import type { Tournament } from "@/types/tournaments";

interface TournamentButtonProps {
  isTransitioning?: boolean;
  onClick: () => void;
}

// Get Future Tech mode colors
function getFutureTechModeColors(mode: string) {
  switch (mode) {
    case "survival":
      return {
        primary: "#ff3b3b",
        secondary: "#ff6b6b",
        glow: "rgba(255, 59, 59, 0.5)",
        gradient: "from-red-500 to-red-600",
        shadow: "0 0 20px rgba(255, 59, 59, 0.3)",
      };
    case "physics":
      return {
        primary: "#9333ea",
        secondary: "#a855f7",
        glow: "rgba(147, 51, 234, 0.5)",
        gradient: "from-purple-500 to-purple-600",
        shadow: "0 0 20px rgba(147, 51, 234, 0.3)",
      };
    case "rotation":
      return {
        primary: "#f97316",
        secondary: "#fb923c",
        glow: "rgba(249, 115, 22, 0.5)",
        gradient: "from-orange-500 to-orange-600",
        shadow: "0 0 20px rgba(249, 115, 22, 0.3)",
      };
    default:
      return {
        primary: "#64748b",
        secondary: "#94a3b8",
        glow: "rgba(100, 116, 139, 0.5)",
        gradient: "from-slate-500 to-slate-600",
        shadow: "0 0 20px rgba(100, 116, 139, 0.3)",
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

  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export default function TournamentButton({
  isTransitioning = false,
  onClick,
}: TournamentButtonProps) {
  const { makeAuthenticatedRequest } = useUser();
  const t = useT();

  // ✅ ИСПРАВЛЕНО: правильное состояние
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timeDisplay, setTimeDisplay] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);

  // ✅ ИСПРАВЛЕНО: функция получения данных турнира с подробной отладкой
  const fetchTournamentData = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);

      console.log("[TournamentButton] Fetching tournament data...");

      const response = await makeAuthenticatedRequest("/api/tournaments");

      console.log("[TournamentButton] Response status:", response.status);

      if (!response.ok) {
        console.error("[TournamentButton] Failed response:", response.status, response.statusText);
        setActiveTournament(null);
        setHasError(true);
        return;
      }

      const result = await response.json();
      console.log("[TournamentButton] API result:", result);

      if (result.success) {
        if (result.tournament) {
          console.log("[TournamentButton] Active tournament found:", result.tournament.name, result.tournament.mode);
          setActiveTournament(result.tournament);
        } else {
          console.log("[TournamentButton] No active tournament");
          setActiveTournament(null);
        }
      } else {
        console.error("[TournamentButton] API error:", result.error);
        setActiveTournament(null);
        setHasError(true);
      }
    } catch (error) {
      console.error("[TournamentButton] Error fetching tournament data:", error);
      setActiveTournament(null);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Initialize data on mount
  useEffect(() => {
    fetchTournamentData();
  }, [fetchTournamentData]);

  // ✅ ИСПРАВЛЕНО: обновление времени с проверками
  useEffect(() => {
    if (activeTournament?.status === "active" && activeTournament.end_time) {
      const updateTimeDisplay = () => {
        const timeLeft = formatTimeRemaining(activeTournament.end_time);
        setTimeDisplay(timeLeft);
        console.log("[TournamentButton] Time updated:", timeLeft);
      };

      updateTimeDisplay();
      const interval = setInterval(updateTimeDisplay, 60000); // Update every minute

      return () => clearInterval(interval);
    } else {
      setTimeDisplay("");
    }
  }, [activeTournament]);

  // Refresh tournament data every 2 minutes (reduced from 5 minutes)
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log("[TournamentButton] Auto-refreshing tournament data...");
      fetchTournamentData();
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(refreshInterval);
  }, [fetchTournamentData]);

  // ✅ ИСПРАВЛЕНО: более надежная логика определения состояния
  const isActive = activeTournament?.status === "active";
  const hasTournament = !!activeTournament;

  console.log("[TournamentButton] Current state:", {
    hasTournament,
    isActive,
    mode: activeTournament?.mode,
    name: activeTournament?.name,
    isLoading,
    hasError
  });

  // Error state - still show button but with error indicator
  if (hasError && !hasTournament) {
    return (
      <button
        aria-label="Tournaments (Error)"
        className="group relative w-12 h-12 bg-black/80 backdrop-blur-sm border border-red-600/50 text-white rounded-lg hover:border-red-500 hover:bg-black/90 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        disabled={isTransitioning || isLoading}
        onClick={() => {
          // Try to refresh and then navigate
          fetchTournamentData();
          onClick();
        }}
      >
        {/* Main icon */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <Trophy
            className="text-red-400 group-hover:text-white transition-colors duration-300"
            size={18}
          />
        </div>

        {/* Error indicator */}
        <div className="absolute top-1 right-1 z-20">
          <Zap className="text-red-400 animate-pulse" size={6} />
        </div>

        {/* Hover effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* "Error" indicator */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="text-[6px] font-mono leading-none py-0.5 text-center text-red-500">
            ERR
          </div>
        </div>
      </button>
    );
  }

  // No active tournament - show default tournament button
  if (!hasTournament) {
    return (
      <button
        aria-label="Tournaments"
        className="group relative w-12 h-12 bg-black/80 backdrop-blur-sm border border-slate-600/50 text-white rounded-lg hover:border-slate-500 hover:bg-black/90 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        disabled={isTransitioning || isLoading}
        onClick={onClick}
      >
        {/* Main icon */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <Trophy
            className="text-slate-400 group-hover:text-white transition-colors duration-300"
            size={18}
          />
        </div>

        {/* Hover effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Border glow */}
        <div className="absolute inset-0 rounded-lg border border-transparent group-hover:border-slate-400/30 transition-colors duration-300" />

        {/* "Coming Soon" indicator */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="text-[6px] font-mono leading-none py-0.5 text-center text-slate-500">
            SOON
          </div>
        </div>

        {/* Loading state overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30 rounded-lg">
            <div className="w-3 h-3 border border-transparent border-t-slate-400 rounded-full animate-spin" />
          </div>
        )}
      </button>
    );
  }

  // ✅ АКТИВНЫЙ ТУРНИР: правильное отображение с режимными цветами и иконками
  const colors = getFutureTechModeColors(activeTournament.mode);
  const modeIcon = getModeIcon(activeTournament.mode);

  return (
    <button
      aria-label={`Active Tournament: ${activeTournament.mode} - ${activeTournament.name}`}
      className="group relative w-12 h-12 bg-black/90 backdrop-blur-sm border text-white rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
      disabled={isTransitioning || isLoading}
      style={{
        borderColor: colors.primary + "80",
        boxShadow: isActive ? colors.shadow : "none",
      }}
      onClick={onClick}
    >
      {/* Gradient background */}
      <div
        className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}10)`,
        }}
      />

      {/* Pulsing effect for active tournament */}
      {isActive && (
        <div
          className="absolute inset-0 animate-pulse rounded-lg"
          style={{
            backgroundColor: colors.glow,
            opacity: 0.1,
          }}
        />
      )}

      {/* Main mode icon - КЛЮЧЕВОЕ ИЗМЕНЕНИЕ */}
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        <span className="text-lg group-hover:scale-110 transition-transform duration-300">
          {modeIcon}
        </span>
      </div>

      {/* Status indicator */}
      <div className="absolute top-1 right-1 z-20">
        {isActive ? (
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: colors.primary }}
          />
        ) : (
          <Target className="text-slate-400" size={8} />
        )}
      </div>

      {/* Time remaining for active tournaments */}
      {isActive && timeDisplay && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 text-[6px] font-mono leading-none py-0.5 text-center opacity-80"
          style={{ color: colors.primary }}
        >
          {timeDisplay}
        </div>
      )}

      {/* Hover glow effect */}
      <div
        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: `inset 0 0 20px ${colors.glow}`,
        }}
      />

      {/* External glow on hover */}
      <div
        className="absolute -inset-1 rounded-lg blur-sm opacity-0 group-hover:opacity-50 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
          zIndex: -1,
        }}
      />

      {/* Scanning line for Future Tech effect */}
      <div
        className="absolute top-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)`,
          animation: isActive ? "shimmer 2s ease-in-out infinite" : "none",
        }}
      />

      {/* Loading state overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30 rounded-lg">
          <div
            className="w-3 h-3 border border-transparent rounded-full animate-spin"
            style={{ borderTopColor: colors.primary }}
          />
        </div>
      )}
    </button>
  );
}