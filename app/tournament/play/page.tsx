// src/app/tournament/play/page.tsx - Refactored: fetch active tournament via API

"use client";

import type { Tournament } from "@/types/tournaments";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";

// import { tournamentService } from "@/lib/supabase_tournament_extension";
import TournamentGameManager from "@/game-modes/tournament/TournamentGameManager";
import { useT } from "@/contexts/LocalizationContext";

export default function TournamentPlayPage() {
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = useT();

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
        // Получаем активный турнир через API
        const res = await fetch("/api/tournament/active", { headers: { "Authorization": "Bearer " + (localStorage.getItem('jwt') || '') } });
        const data = await res.json();
        const activeTournament = data.activeTournament;
        if (!activeTournament) {
          setError("No active tournament found");
          setTimeout(() => {
            router.push("/tournament");
          }, 2000);
          return;
        }
        setTournament(activeTournament);
      } catch (err) {
        console.error("Error loading tournament:", err);
        setError("Failed to load tournament");
        setTimeout(() => {
          router.push("/tournament");
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    };
    loadTournament();
  }, [router]);

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
