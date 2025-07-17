// src/components/TournamentCard/TournamentCard.tsx - Updated to use secure API endpoints
"use client";

import type { TournamentStatus } from "@/types/tournaments";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Clock, ChevronRight } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { authService } from "@/lib/authService";
import { formatTimeRemaining } from "@/types/tournaments";
import { useT } from "@/contexts/LocalizationContext";

interface TournamentCardProps {
  priority?: "high" | "low"; // high = активный турнир (показать в начале), low = нет турнира (показать в конце)
}

export default function TournamentCard({
  priority = "low",
}: TournamentCardProps) {
  const router = useRouter();
  const t = useT();
  const { isAuthenticated, isLoading: userLoading } = useUser();

  const [tournamentStatus, setTournamentStatus] = useState<TournamentStatus>({
    isActive: false,
    activeTournament: null,
  });
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tournament status only when user is authenticated
  useEffect(() => {
    const loadTournamentStatus = async () => {
      // Skip loading if user is not authenticated or still loading
      if (!isAuthenticated || userLoading) {
        setIsLoading(false);

        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log("Loading tournament status via secure API...");
        const status = await authService.getTournamentStatus();

        setTournamentStatus(status);

        if (
          status.isActive &&
          status.activeTournament &&
          status.timeRemaining
        ) {
          setTimeRemaining(formatTimeRemaining(status.timeRemaining));
        }
      } catch (error) {
        console.error("Error loading tournament status via API:", error);
        setError("Failed to load tournament");

        // Handle authentication errors
        if (
          error instanceof Error &&
          error.message.includes("Authentication expired")
        ) {
          console.log("Authentication expired, user needs to log in again");
          // The useUser hook will handle the redirect to login
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTournamentStatus();
  }, [isAuthenticated, userLoading]);

  // Update countdown timer
  useEffect(() => {
    if (!tournamentStatus.activeTournament || !tournamentStatus.isActive) {
      setTimeRemaining("");

      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const endDate = new Date(tournamentStatus.activeTournament!.end_date);
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("");
        clearInterval(interval);

        // Reload tournament status when tournament ends
        if (isAuthenticated) {
          const reloadStatus = async () => {
            try {
              const status = await authService.getTournamentStatus();

              setTournamentStatus(status);
            } catch (error) {
              console.error("Error reloading tournament status:", error);
            }
          };

          reloadStatus();
        }
      } else {
        setTimeRemaining(formatTimeRemaining(diff));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    tournamentStatus.activeTournament,
    tournamentStatus.isActive,
    isAuthenticated,
  ]);

  const handleClick = () => {
    // Only navigate if user is authenticated
    if (!isAuthenticated) {
      console.warn("User not authenticated, cannot access tournament");

      return;
    }

    router.push("/tournament");
  };

  // Show loading state while checking authentication or loading tournament
  if (userLoading || (isLoading && isAuthenticated)) {
    return (
      <div className="backdrop-blur-sm border border-white/20 rounded-xl p-4 bg-white/5">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <span className="text-white/60 text-sm">
            {t("tournament.loadingTournament")}
          </span>
        </div>
      </div>
    );
  }

  // Don't show tournament card if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Show error state if there was an error loading tournament data
  if (error) {
    return (
      <div className="backdrop-blur-sm border border-red-400/30 rounded-xl p-4 bg-red-500/10">
        <div className="flex items-center justify-center space-x-2">
          <Trophy className="text-red-400/60" size={16} />
          <span className="text-red-400/80 text-sm">{error}</span>
        </div>
      </div>
    );
  }

  // Активный турнир - показываем в начале
  if (tournamentStatus.isActive && tournamentStatus.activeTournament) {
    return (
      <button
        className="w-full backdrop-blur-sm border border-yellow-400/30 rounded-xl p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20 hover:border-yellow-400/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-400/20 border border-yellow-400/40 rounded-lg flex items-center justify-center">
              <Trophy className="text-yellow-400" size={20} />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-yellow-300">
                {tournamentStatus.activeTournament.name}
              </h3>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-yellow-400/80">
                  {t("tournament.tournamentActive")}
                </span>
                {timeRemaining && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-yellow-400/60" />
                    <div className="flex items-center space-x-1">
                      <Clock className="text-yellow-400/80" size={12} />
                      <span className="text-yellow-400/80">
                        {timeRemaining}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <ChevronRight className="text-yellow-400/60" size={20} />
        </div>

        {/* Пульсирующий эффект для активного турнира */}
        <div className="absolute inset-0 rounded-xl bg-yellow-400/5 animate-pulse opacity-50" />
      </button>
    );
  }

  // Нет активного турнира - показываем в конце только если priority="low"
  if (priority === "low") {
    return (
      <button
        className="w-full backdrop-blur-sm border border-white/20 rounded-xl p-4 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
              <Trophy className="text-white/60" size={20} />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-medium text-white/80">
                {t("tournament.title")}
              </h3>
              <p className="text-sm text-white/50">
                {t("tournament.noActiveTournament")}
              </p>
            </div>
          </div>
          <ChevronRight className="text-white/40" size={20} />
        </div>
      </button>
    );
  }

  // Если нет активного турнира и priority="high", не показываем ничего
  return null;
}
