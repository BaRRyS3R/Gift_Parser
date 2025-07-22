// src/app/seasons/page.tsx - Redesigned seasons page with light rays and seamless design

"use client";

import type {
  CompleteSeasonData,
  SeasonLeaderboardEntry,
} from "@/hooks/modules/useSeasons";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Star,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useSeasons } from "@/hooks/modules/useSeasons";
import { useT } from "@/contexts/LocalizationContext";
import AuthGuard from "@/components/Auth/AuthGuard";
import LightRays from "@/components/backgrounds/LightRays";
import PlayerModal from "@/components/PlayerModal";

function SeasonsPageContent() {
  const { user, makeAuthenticatedRequest } = useUser();
  const {
    seasonData,
    isLoading,
    error,
    fetchCurrentSeason,
    clearError,
    isUserInTopLeaderboard,
    getUserPosition,
    isSeasonActive,
    getTimeRemaining,
  } = useSeasons(makeAuthenticatedRequest);

  const t = useT();
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<{
    player: SeasonLeaderboardEntry;
    prize: string;
  } | null>(null);

  // Load season data on mount
  useEffect(() => {
    fetchCurrentSeason();
  }, [fetchCurrentSeason]);

  // Set up countdown timer for active season
  useEffect(() => {
    if (!seasonData?.isActive || !seasonData.timeRemaining) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [seasonData, getTimeRemaining]);

  const handlePlayerClick = (player: SeasonLeaderboardEntry) => {
    // Get prize for this position (prizes are 0-indexed in array)
    const prize = seasonData?.season.prizes[player.position - 1] || `Prize ${player.position}`;
    
    setSelectedPlayer({
      player,
      prize,
    });
  };

  const handleCloseModal = () => {
    setSelectedPlayer(null);
  };

  const handleRefresh = async () => {
    clearError();
    await fetchCurrentSeason();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white">Loading season data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Calendar className="text-white/60 mx-auto" size={32} />
          <p className="text-white/80">{error}</p>
          <button
            className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!seasonData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4 px-6">
          <Calendar className="text-white/60 mx-auto" size={48} />
          <h2 className="text-2xl font-bold text-white">No Active Season</h2>
          <p className="text-white/70 max-w-md">
            There is currently no active season running. Check back later for upcoming seasonal competitions.
          </p>
          <button
            className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            onClick={handleRefresh}
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  const { season, leaderboard } = seasonData;
  const userPosition = getUserPosition();
  const isUserInTop = isUserInTopLeaderboard();
  const isActive = isSeasonActive();

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom relative overflow-hidden">
      {/* Light Rays Background */}
      <LightRays className="z-0"/>
      
      <div className="relative z-10 px-4 safe-area-inset">
        {/* Header with Season Name */}
        <div className="text-center space-y-4 mb-8 pt-8">
          <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
            {season.name}
          </h1>
          
          {/* Season Status */}
          <div className="flex items-center justify-center space-x-4 text-sm text-white/70">
            <div className="flex items-center space-x-1">
              <Calendar size={14} />
              <span>
                {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
              </span>
            </div>
            {isActive && timeRemaining && (
              <div className="flex items-center space-x-1 text-green-400">
                <Clock size={14} />
                <span>{timeRemaining} remaining</span>
              </div>
            )}
            {!isActive && new Date() < new Date(season.start_date) && (
              <div className="flex items-center space-x-1 text-yellow-400">
                <Clock size={14} />
                <span>Starts {new Date(season.start_date).toLocaleDateString()}</span>
              </div>
            )}
            {!isActive && new Date() > new Date(season.end_date) && (
              <div className="flex items-center space-x-1 text-red-400">
                <Clock size={14} />
                <span>Ended</span>
              </div>
            )}
          </div>
        </div>

        {/* User Position (if not in top 10) */}
        {userPosition && !isUserInTop && user && (
          <div className="mb-8 text-center">
            <div className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500/20 border border-blue-400/30 rounded-full">
              <Star className="text-blue-400" size={16} />
              <span className="text-blue-300 font-bold">Your Position: #{userPosition}</span>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="space-y-0 max-w-2xl mx-auto">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-bold text-white/80 text-xl mb-2">No Players Yet</p>
              <p className="text-white/60">
                Be the first to compete in this season!
              </p>
            </div>
          ) : (
            <div className="animate-fade-in">
              {leaderboard.map((entry, index) => (
                <div key={`season-${entry.position}`}>
                  <button
                    onClick={() => handlePlayerClick(entry)}
                    className={`
                      w-full px-6 py-4 text-left hover:bg-white/5 transition-colors duration-200
                      ${entry.isCurrentUser ? "bg-blue-500/10" : ""}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      {/* Position and Name */}
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className={`
                          w-8 text-center font-bold text-lg
                          ${entry.position === 1 ? "text-yellow-400" :
                            entry.position === 2 ? "text-gray-300" :
                            entry.position === 3 ? "text-amber-600" : "text-white/80"}
                        `}>
                          #{entry.position}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium truncate ${
                              entry.isCurrentUser ? "text-white" : "text-white/90"
                            }`}>
                              {entry.first_name} {entry.last_name || ""}
                            </span>
                            {entry.isCurrentUser && (
                              <Star className="text-blue-400 flex-shrink-0" size={14} />
                            )}
                          </div>
                          {entry.username && (
                            <div className="text-xs text-white/50 truncate">
                              @{entry.username}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-white text-lg">
                          {entry.survival_best_score}
                        </div>
                        <div className="text-xs text-white/50">
                          points
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  {/* Divider */}
                  {index < leaderboard.length - 1 && (
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-6" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom spacing for safe area */}
        <div className="h-24" />
      </div>

      {/* Player Details Modal */}
      <PlayerModal
        isOpen={!!selectedPlayer}
        onClose={handleCloseModal}
        player={selectedPlayer?.player || null}
        prize={selectedPlayer?.prize}
      />
    </div>
  );
}

export default function SeasonsPage() {
  return (
    <AuthGuard requireCompleteAuth={true} showError={true}>
      <SeasonsPageContent />
    </AuthGuard>
  );
}