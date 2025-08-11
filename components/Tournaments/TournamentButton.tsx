// src/components/Tournaments/TournamentButton.tsx - Лаконичная кнопка турниров в Future Tech стилистике

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Trophy, Clock } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

// Tournament interface (упрощенная)
interface Tournament {
  id: string;
  name: string;
  mode: "survival" | "physics" | "rotation";
  start_time: string;
  end_time: string;
  status: "upcoming" | "active" | "completed" | "cancelled";
}

interface TournamentButtonProps {
  isTransitioning?: boolean;
  onClick: () => void;
}

// Получение цветов режима для Future Tech стилистики
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

// Форматирование времени до окончания
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

// Форматирование времени до начала
function formatTimeUntilStart(startTime: string): string {
  const now = new Date().getTime();
  const start = new Date(startTime).getTime();
  const remaining = Math.max(0, start - now);

  if (remaining === 0) return "STARTING";

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );

  if (days > 0) return `${days}d`;

  return `${hours}h`;
}

export default function TournamentButton({
  isTransitioning = false,
  onClick,
}: TournamentButtonProps) {
  const { makeAuthenticatedRequest } = useUser();
  const t = useT();

  const [activeTournament, setActiveTournament] = useState<Tournament | null>(
    null,
  );
  const [nextTournament, setNextTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timeDisplay, setTimeDisplay] = useState<string>("");

  // Получение данных турниров
  const fetchTournamentData = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await makeAuthenticatedRequest("/api/tournaments");

      if (!response.ok) {
        console.error("Failed to fetch tournaments for button");

        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        setActiveTournament(result.data.active || null);
        setNextTournament(result.data.upcoming?.[0] || null);
      }
    } catch (error) {
      console.error("Error fetching tournament data for button:", error);
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Инициализация данных
  useEffect(() => {
    fetchTournamentData();
  }, [fetchTournamentData]);

  // Обновление отображения времени
  useEffect(() => {
    const updateTimeDisplay = () => {
      if (activeTournament) {
        setTimeDisplay(formatTimeRemaining(activeTournament.end_time));
      } else if (nextTournament) {
        setTimeDisplay(formatTimeUntilStart(nextTournament.start_time));
      }
    };

    updateTimeDisplay();
    const interval = setInterval(updateTimeDisplay, 60000); // Обновление каждую минуту

    return () => clearInterval(interval);
  }, [activeTournament, nextTournament]);

  // Определение турнира для отображения
  const displayTournament = activeTournament || nextTournament;
  const isActive = !!activeTournament;

  if (!displayTournament || !displayTournament.mode) {
    // Стандартная кнопка когда турниры недоступны
    return (
      <button
        aria-label="Tournaments"
        className="group relative w-12 h-12 bg-black/80 backdrop-blur-sm border border-slate-600/50 text-white rounded-lg hover:border-slate-500 hover:bg-black/90 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        disabled={isTransitioning || isLoading}
        onClick={onClick}
      >
        {/* Основная иконка */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <Trophy
            className="text-slate-400 group-hover:text-white transition-colors duration-300"
            size={18}
          />
        </div>

        {/* Hover эффект */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Граница свечения */}
        <div className="absolute inset-0 rounded-lg border border-transparent group-hover:border-slate-400/30 transition-colors duration-300" />
      </button>
    );
  }

  const colors = getFutureTechModeColors(displayTournament.mode);
  const modeIcon = getModeIcon(displayTournament.mode);

  return (
    <button
      aria-label={`Tournament: ${displayTournament.mode}`}
      className="group relative w-12 h-12 bg-black/90 backdrop-blur-sm border text-white rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
      disabled={isTransitioning || isLoading}
      style={{
        borderColor: colors.primary + "80",
        boxShadow: isActive ? colors.shadow : "none",
      }}
      onClick={onClick}
    >
      {/* Градиентный фон */}
      <div
        className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}10)`,
        }}
      />

      {/* Пульсирующий эффект для активного турнира */}
      {isActive && (
        <div
          className="absolute inset-0 animate-pulse rounded-lg"
          style={{
            backgroundColor: colors.glow,
            opacity: 0.1,
          }}
        />
      )}

      {/* Основная иконка */}
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        <span className="text-lg group-hover:scale-110 transition-transform duration-300">
          {modeIcon}
        </span>
      </div>

      {/* Индикатор статуса */}
      <div className="absolute top-1 right-1 z-20">
        {isActive ? (
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: colors.primary }}
          />
        ) : (
          <Clock className="text-slate-400" size={8} />
        )}
      </div>

      {/* Время (если есть) */}
      {timeDisplay && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 text-[6px] font-mono leading-none py-0.5 text-center opacity-80"
          style={{ color: colors.primary }}
        >
          {timeDisplay}
        </div>
      )}

      {/* Hover эффект свечения */}
      <div
        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: `inset 0 0 20px ${colors.glow}`,
        }}
      />

      {/* Внешнее свечение при hover */}
      <div
        className="absolute -inset-1 rounded-lg blur-sm opacity-0 group-hover:opacity-50 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
          zIndex: -1,
        }}
      />

      {/* Сканирующая линия для Future Tech эффекта */}
      <div
        className="absolute top-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)`,
          animation: isActive ? "shimmer 2s ease-in-out infinite" : "none",
        }}
      />
    </button>
  );
}
