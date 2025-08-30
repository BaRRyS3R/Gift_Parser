// src/components/Tournaments/TournamentButton.tsx - Исправленная кнопка без лишних индикаторов

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Trophy, Target } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

// Tournament interfaces matching new API structure
interface Tournament {
  id: string;
  name: string;
  description?: string;
  mode: "survival" | "physics" | "rotation";
  start_time: string;
  end_time: string;
  status: "upcoming" | "active" | "completed" | "cancelled";
  prizes: Array<{
    place: number | string;
    prize: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface TournamentStats {
  totalParticipants: number;
  totalGames: number;
  averageScore: number;
  highestScore: number;
}

interface PublicTournamentData {
  tournament: Tournament;
  leaderboard: Array<{
    tournament_id: string;
    first_name: string;
    last_name?: string;
    username?: string;
    best_score: number;
  }>;
  userPosition?: {
    position: number;
    entry: {
      tournament_id: string;
      first_name: string;
      last_name?: string;
      username?: string;
      best_score: number;
    };
  };
  stats: TournamentStats;
}

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

  const [tournamentData, setTournamentData] = useState<PublicTournamentData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timeDisplay, setTimeDisplay] = useState<string>("");

  // Fetch tournament data using new simplified API
  const fetchTournamentData = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await makeAuthenticatedRequest("/api/tournaments");

      if (!response.ok) {
        console.error("Failed to fetch tournament data for button");
        return;
      }

      const result = await response.json();

      if (result.success && result.tournament) {
        setTournamentData(result.tournament);
      } else {
        // No active tournament
        setTournamentData(null);
      }
    } catch (error) {
      console.error("Error fetching tournament data for button:", error);
      setTournamentData(null);
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Initialize data on mount
  useEffect(() => {
    fetchTournamentData();
  }, [fetchTournamentData]);

  // Update time display for active tournaments
  useEffect(() => {
    if (tournamentData?.tournament.status === "active") {
      const updateTimeDisplay = () => {
        setTimeDisplay(formatTimeRemaining(tournamentData.tournament.end_time));
      };

      updateTimeDisplay();
      const interval = setInterval(updateTimeDisplay, 60000); // Update every minute

      return () => clearInterval(interval);
    } else {
      setTimeDisplay("");
    }
  }, [tournamentData]);

  // Auto-refresh tournament data every 5 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchTournamentData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, [fetchTournamentData]);

  const activeTournament = tournamentData?.tournament;
  const isActive = activeTournament?.status === "active";

  if (!activeTournament) {
    // No active tournament - show default tournament button
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
      </button>
    );
  }

  const colors = getFutureTechModeColors(activeTournament.mode);
  const modeIcon = getModeIcon(activeTournament.mode);

  return (
    <button
      aria-label={`Active Tournament: ${activeTournament.mode}`}
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

      {/* Main icon */}
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
            className="w-3 h-3 border border-transparent border-t-white rounded-full animate-spin"
            style={{ borderTopColor: colors.primary }}
          />
        </div>
      )}
    </button>
  );
}