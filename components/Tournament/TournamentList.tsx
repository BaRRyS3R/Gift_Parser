// src/components/Tournament/TournamentList.tsx - Fixed list component

"use client";

import type { Tournament, TournamentStatus } from "@/types/tournaments";

import React, { useMemo } from "react";
import { Trophy, Calendar, AlertCircle } from "lucide-react";

import TournamentCard from "./TournamentCard";

import { useT } from "@/contexts/LocalizationContext";

interface TournamentListProps {
  tournaments: Tournament[];
  userPositions?: { [tournamentId: string]: number };
  userParticipations?: { [tournamentId: string]: boolean };
  filterStatus?: TournamentStatus;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function TournamentList({
  tournaments,
  userPositions = {},
  userParticipations = {},
  filterStatus,
  isLoading = false,
  error = null,
  onRetry,
}: TournamentListProps) {
  const t = useT();

  const filteredTournaments = useMemo(() => {
    if (!filterStatus) return tournaments;

    return tournaments.filter(
      (tournament) => tournament.status === filterStatus,
    );
  }, [tournaments, filterStatus]);

  const groupedTournaments = useMemo(() => {
    const groups: { [key: string]: Tournament[] } = {
      active: [],
      upcoming: [],
      ended: [],
    };

    filteredTournaments.forEach((tournament) => {
      groups[tournament.status].push(tournament);
    });

    return groups;
  }, [filteredTournaments]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="h-32 bg-white/5 rounded-xl border border-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
        <h3 className="text-lg font-bold text-white mb-2">
          {t("tournaments.error.title")}
        </h3>
        <p className="text-white/60 mb-6">{error}</p>
        {onRetry && (
          <button
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            onClick={onRetry}
          >
            {t("common.retry")}
          </button>
        )}
      </div>
    );
  }

  if (filteredTournaments.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="text-white/40 mx-auto mb-4" size={48} />
        <h3 className="text-lg font-bold text-white/80 mb-2">
          {filterStatus
            ? t(`tournaments.empty.${filterStatus}`)
            : t("tournaments.empty.all")}
        </h3>
        <p className="text-white/60">{t("tournaments.empty.description")}</p>
      </div>
    );
  }

  const renderTournamentGroup = (
    status: TournamentStatus,
    tournaments: Tournament[],
  ) => {
    if (tournaments.length === 0) return null;

    const getStatusIcon = () => {
      switch (status) {
        case "active":
          return (
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          );
        case "upcoming":
          return <Calendar className="text-blue-400" size={16} />;
        case "ended":
          return <Trophy className="text-gray-400" size={16} />;
        default:
          return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
      }
    };

    return (
      <div key={status} className="space-y-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <h2 className="text-xl font-bold text-white">
            {t(`tournaments.sections.${status}`)}
          </h2>
          <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
          <span className="text-white/60 text-sm">{tournaments.length}</span>
        </div>

        <div className="grid gap-4">
          {tournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              isParticipating={userParticipations[tournament.id]}
              tournament={tournament}
              userPosition={userPositions[tournament.id]}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {!filterStatus ? (
        // Display all groups if no filter is set
        <>
          {renderTournamentGroup(
            "active" as TournamentStatus,
            groupedTournaments.active,
          )}
          {renderTournamentGroup(
            "upcoming" as TournamentStatus,
            groupedTournaments.upcoming,
          )}
          {renderTournamentGroup(
            "ended" as TournamentStatus,
            groupedTournaments.ended,
          )}
        </>
      ) : (
        // Display only filtered tournaments
        <div className="grid gap-4">
          {filteredTournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              isParticipating={userParticipations[tournament.id]}
              tournament={tournament}
              userPosition={userPositions[tournament.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
