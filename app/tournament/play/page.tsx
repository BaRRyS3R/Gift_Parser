// src/app/tournament/play/page.tsx - Updated to use API instead of direct DB

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import TournamentGameManager from "@/game-modes/tournament/TournamentGameManager";
import { useT } from "@/contexts/LocalizationContext";

// Tournament interface (from new API)
interface Tournament {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  prizes: string[];
  created_at: string;
  updated_at: string;
}

interface TournamentStatus {
  isActive: boolean;
  activeTournament: Tournament | null;
  timeRemaining?: number;
  hasStarted?: boolean;
}

export default function TournamentPlayPage() {
  const router = useRouter();
  const { makeAuthenticatedRequest } = useUser();
  const t = useT();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        router.push("/tournament");
      });

      return () => {
        tg.BackButton.hide();
        tg.BackButton.offClick(() => {});
      };
    }
  }, [router]);

  useEffect(() => {
    const loadTournament = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log("Loading tournament for play...");

        const response = await makeAuthenticatedRequest(
          "/api/tournament/active",
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(errorData.error || "Failed to load tournament");
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to load tournament");
        }

        const tournamentStatus: TournamentStatus = result.data;

        if (!tournamentStatus.isActive || !tournamentStatus.activeTournament) {
          setError("No active tournament found");
          setTimeout(() => {
            router.push("/tournament");
          }, 2000);

          return;
        }

        console.log(
          "Active tournament loaded:",
          tournamentStatus.activeTournament.name,
        );
        setTournament(tournamentStatus.activeTournament);
      } catch (err) {
        console.error("Error loading tournament:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load tournament";

        setError(errorMessage);
        setTimeout(() => {
          router.push("/tournament");
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    };

    loadTournament();
  }, [router, makeAuthenticatedRequest]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto" />
          <p className="text-yellow-300">{t("tournament.loadingTournament")}</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Trophy className="text-yellow-400/60 mx-auto" size={32} />
          <p className="text-yellow-300/80">
            {error || "Tournament not found"}
          </p>
          <p className="text-yellow-400/60 text-sm">
            {t("tournament.redirectingToTournament")}.
          </p>
        </div>
      </div>
    );
  }

  return <TournamentGameManager tournament={tournament} />;
}
