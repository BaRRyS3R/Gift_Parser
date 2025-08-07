// src/app/tournaments/page.tsx - Fixed main tournaments page with correct import

"use client";

import type { TournamentStatus } from "@/types/tournaments";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Filter, RefreshCw } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useTournaments } from "@/hooks/modules/useTournaments";
import TournamentList from "@/components/Tournament/TournamentList";
import { useT } from "@/contexts/LocalizationContext";

export default function TournamentsPage() {
  const router = useRouter();
  const { makeAuthenticatedRequest } = useUser();
  const {
    tournaments,
    isLoading,
    error,
    fetchTournaments,
    clearError,
    refreshData,
  } = useTournaments(makeAuthenticatedRequest);

  const t = useT();
  const [filterStatus, setFilterStatus] = useState<
    TournamentStatus | undefined
  >();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Setup Telegram WebApp back button
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      if (tg.BackButton) {
        tg.BackButton.show();

        const handleBackClick = () => {
          router.push("/main");
        };

        tg.BackButton.onClick(handleBackClick);

        return () => {
          tg.BackButton.offClick(handleBackClick);
          tg.BackButton.hide();
        };
      }
    }
  }, [router]);

  // Load tournaments on mount
  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    clearError();
    await refreshData();
    setIsRefreshing(false);
  };

  const filterOptions = [
    { value: undefined, label: t("tournaments.filters.all") },
    {
      value: "active" as TournamentStatus,
      label: t("tournaments.filters.active"),
    },
    {
      value: "upcoming" as TournamentStatus,
      label: t("tournaments.filters.upcoming"),
    },
    {
      value: "ended" as TournamentStatus,
      label: t("tournaments.filters.ended"),
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom">
      <div className="px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Trophy className="text-yellow-400" size={32} />
            <h1 className="text-3xl font-bold text-white">
              {t("tournaments.title")}
            </h1>
          </div>
          <p className="text-white/70">{t("tournaments.subtitle")}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Filter className="text-white/60" size={20} />
            <select
              className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterStatus || ""}
              onChange={(e) =>
                setFilterStatus(
                  (e.target.value as TournamentStatus) || undefined,
                )
              }
            >
              {filterOptions.map((option) => (
                <option key={option.value || "all"} value={option.value || ""}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-colors disabled:opacity-50"
            disabled={isRefreshing}
            onClick={handleRefresh}
          >
            <RefreshCw
              className={`${isRefreshing ? "animate-spin" : ""}`}
              size={16}
            />
            <span className="text-sm">{t("common.retry")}</span>
          </button>
        </div>

        {/* Tournament List */}
        <TournamentList
          error={error}
          filterStatus={filterStatus}
          isLoading={isLoading}
          tournaments={tournaments}
          onRetry={handleRefresh}
        />
      </div>
    </div>
  );
}
