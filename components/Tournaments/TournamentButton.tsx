// src/components/Tournaments/TournamentButton.tsx - Badge расположен в правом верхнем углу

"use client";

import React, { useState, useEffect, useCallback } from "react";

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
        badgeBg: "bg-red-500",
        badgeText: "text-white",
        badgeBorder: "border-red-600",
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
        badgeBg: "bg-purple-500",
        badgeText: "text-white",
        badgeBorder: "border-purple-600",
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
        badgeBg: "bg-orange-500",
        badgeText: "text-white",
        badgeBorder: "border-orange-600",
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
        badgeBg: "bg-slate-700",
        badgeText: "text-slate-300",
        badgeBorder: "border-slate-800",
      };
  }
}

// Получение названия режима для отображения в Badge
function getModeName(mode?: string): string {
  const normalizedMode = mode?.toLowerCase();
  
  switch (normalizedMode) {
    case "survival":
      return "SURVIVAL";
    case "physics":
      return "PHYSICS";
    case "rotation":
      return "ROTATION";
    default:
      return "SOON";
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

  // Определение состояния кнопки
  const isActive = activeTournament?.status === "active";
  const hasTournament = !!activeTournament && isActive;
  const tournamentMode = activeTournament?.mode;
  const badgeText = hasTournament ? getModeName(tournamentMode) : t("tournaments.soon");
  const isDisabled = isTransitioning || isLoading || !hasTournament || hasError;

  // Получение цветовой схемы
  const colors = hasTournament ? getTournamentModeColors(tournamentMode) : getTournamentModeColors();

  // Определение текста кнопки
  const buttonText = isTransitioning ? t("main.loading") : t("tournaments.tournamentButton");

  return (
    <div className="relative group">
      {/* Градиентная подсветка при наведении (только для активной кнопки) */}
      {hasTournament && !isDisabled && (
        <div 
          className={`absolute -inset-1 bg-gradient-to-r ${colors.gradient} rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200`}
        />
      )}

      {/* Badge индикатор в правом верхнем углу */}
      {(!isLoading || activeTournament) && (
        <div 
          className={`
            absolute -top-2 -right-2 z-10
            px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
            border transition-all duration-300
            ${hasTournament ? 
              `${colors.badgeBg} ${colors.badgeText} ${colors.badgeBorder}` : 
              'bg-slate-700 text-slate-300 border-slate-800'
            }
            ${hasTournament && !isDisabled ? 'group-hover:scale-110 group-hover:-translate-y-0.5 group-hover:translate-x-0.5' : ''}
          `}
        >
          {badgeText}
        </div>
      )}
      
      {/* Badge загрузки */}
      {isLoading && !activeTournament && (
        <div className="absolute -top-2 -right-2 z-10 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300 border border-slate-800">
          ...
        </div>
      )}

      <button
        className={`
          relative w-full max-w-sm mx-auto flex items-center justify-center px-12 py-6 
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
        {/* Основной текст кнопки */}
        <span className="tracking-wider">
          {buttonText}
        </span>
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