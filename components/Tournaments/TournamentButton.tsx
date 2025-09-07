// src/components/Tournaments/TournamentButton.tsx - Рефакторинг: полноразмерная кнопка в стиле главной

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Trophy } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import type { Tournament } from "@/types/tournaments";

interface TournamentButtonProps {
  isTransitioning?: boolean;
  onClick: () => void;
}

// Получение цветов для режимов турнира
function getTournamentModeColors(mode?: string) {
  const normalizedMode = mode?.toLowerCase();
  
  switch (normalizedMode) {
    case "survival":
      return {
        primary: "#ff3b3b",
        secondary: "#ff6b6b",
        glow: "rgba(255, 59, 59, 0.3)",
        gradient: "from-red-500/20 via-red-500/5 to-red-500/20",
        borderColor: "border-red-500/60",
        hoverBorder: "hover:border-red-500",
        bgHover: "group-hover:bg-red-500/5",
        textColor: "text-red-400",
      };
    case "physics":
      return {
        primary: "#9333ea",
        secondary: "#a855f7",
        glow: "rgba(147, 51, 234, 0.3)",
        gradient: "from-purple-500/20 via-purple-500/5 to-purple-500/20",
        borderColor: "border-purple-500/60",
        hoverBorder: "hover:border-purple-500",
        bgHover: "group-hover:bg-purple-500/5",
        textColor: "text-purple-400",
      };
    case "rotation":
      return {
        primary: "#f97316",
        secondary: "#fb923c",
        glow: "rgba(249, 115, 22, 0.3)",
        gradient: "from-orange-500/20 via-orange-500/5 to-orange-500/20",
        borderColor: "border-orange-500/60",
        hoverBorder: "hover:border-orange-500",
        bgHover: "group-hover:bg-orange-500/5",
        textColor: "text-orange-400",
      };
    default:
      return {
        primary: "#64748b",
        secondary: "#94a3b8",
        glow: "rgba(100, 116, 139, 0.3)",
        gradient: "from-slate-500/20 via-slate-500/5 to-slate-500/20",
        borderColor: "border-slate-500/60",
        hoverBorder: "hover:border-slate-500",
        bgHover: "group-hover:bg-slate-500/5",
        textColor: "text-slate-400",
      };
  }
}

// Получение названия режима для отображения
function getModeName(mode?: string): string {
  const normalizedMode = mode?.toLowerCase();
  
  switch (normalizedMode) {
    case "survival":
      return "Survival";
    case "physics":
      return "Physics";
    case "rotation":
      return "Rotation";
    default:
      return "";
  }
}

export default function TournamentButton({
  isTransitioning = false,
  onClick,
}: TournamentButtonProps) {
  const { makeAuthenticatedRequest } = useUser();
  const t = useT();

  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Получение данных турнира
  const fetchTournamentData = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);

      const response = await makeAuthenticatedRequest("/api/tournaments");

      if (!response.ok) {
        console.error("[TournamentButton] Failed response:", response.status);
        setActiveTournament(null);
        setHasError(true);
        return;
      }

      const result = await response.json();

      if (result.success && result.tournament) {
        const tournament = result.tournament;
        const mode = tournament.mode || tournament.game_mode;
        
        const normalizedTournament = {
          ...tournament,
          mode: mode
        };

        setActiveTournament(normalizedTournament);
        setHasError(false);
      } else {
        setActiveTournament(null);
        setHasError(false);
      }
    } catch (error) {
      console.error("[TournamentButton] Error fetching tournament data:", error);
      setActiveTournament(null);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Инициализация при монтировании
  useEffect(() => {
    fetchTournamentData();
  }, [fetchTournamentData]);

  // Автообновление каждые 2 минуты
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchTournamentData();
    }, 2 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [fetchTournamentData]);

  // Определение состояния кнопки
  const isActive = activeTournament?.status === "active";
  const hasTournament = !!activeTournament && isActive;
  const tournamentMode = activeTournament?.mode;
  const modeName = getModeName(tournamentMode);
  const isDisabled = isTransitioning || isLoading || !hasTournament || hasError;

  // Получение цветовой схемы
  const colors = hasTournament ? getTournamentModeColors(tournamentMode) : getTournamentModeColors();

  // Определение текста кнопки
  let buttonText = "Tournament Soon";
  if (hasTournament && modeName) {
    buttonText = `${modeName} Tournament`;
  } else if (hasError) {
    buttonText = "Tournament Soon";
  } else if (isLoading && !activeTournament) {
    buttonText = "Loading...";
  }

  return (
    <div className="relative group">
      {/* Градиентная подсветка при наведении (только для активной кнопки) */}
      {hasTournament && !isDisabled && (
        <div 
          className={`absolute -inset-1 bg-gradient-to-r ${colors.gradient} rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200`}
        />
      )}

      <button
        className={`
          relative w-full max-w-sm mx-auto block px-12 py-6 
          bg-transparent border-2 rounded-xl text-xl font-bold 
          transition-all duration-500 
          ${hasTournament ? 
            `${colors.borderColor} text-white ${colors.hoverBorder} hover:scale-105 active:scale-95 ${colors.bgHover}` : 
            'border-white/30 text-white/50 cursor-not-allowed opacity-50'
          }
          ${isDisabled && !isLoading ? 'cursor-not-allowed' : ''}
        `}
        disabled={isDisabled}
        onClick={hasTournament ? onClick : undefined}
      >
        <div className="flex items-center justify-center space-x-4">
          <Trophy
            className={`
              ${hasTournament ? 
                `${colors.textColor} group-hover:text-white transition-colors duration-300` : 
                'text-white/40'
              }
              ${hasTournament && !isDisabled ? 'group-hover:translate-x-1 transition-transform duration-300' : ''}
            `}
            size={24}
          />
          <span className="tracking-wider">
            {isTransitioning ? t("main.loading") : buttonText}
          </span>
        </div>

        {/* Индикатор активности для активного турнира */}
        {hasTournament && !isDisabled && (
          <div 
            className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: colors.primary }}
          />
        )}
      </button>

      {/* Дополнительный эффект свечения при наведении для активной кнопки */}
      {hasTournament && !isDisabled && (
        <div 
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: `0 0 40px ${colors.glow}`,
          }}
        />
      )}
    </div>
  );
}