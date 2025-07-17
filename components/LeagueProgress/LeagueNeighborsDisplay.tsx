// src/components/LeagueProgress/LeagueNeighborsDisplay.tsx - Updated to use authService API only

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody } from "@nextui-org/react";
import {
  Trophy,
  Star,
  Users,
  ArrowUp,
  ArrowDown,
  Medal,
  Award,
  Crown,
  Target,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import { authService } from "@/lib/authService";

interface LeagueNeighborsDisplayProps {
  className?: string;
}

const LeagueNeighborsDisplay: React.FC<LeagueNeighborsDisplayProps> = ({
  className = "",
}) => {
  const { isAuthenticated } = useUser();
  const t = useT();

  const [neighbors, setNeighbors] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNeighbors = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);

        return;
      }

      try {
        console.log(
          "LeagueNeighborsDisplay: Fetching league data via authService API...",
        );

        const leagueData = await authService.getLeagueData();

        setNeighbors(leagueData.leagueNeighbors);
        console.log(
          "LeagueNeighborsDisplay: League neighbors data fetched successfully",
        );
      } catch (error) {
        console.error(
          "LeagueNeighborsDisplay: Error loading league neighbors:",
          error,
        );

        // Handle authentication errors gracefully
        if (
          error instanceof Error &&
          error.message.includes("Authentication expired")
        ) {
          console.log(
            "LeagueNeighborsDisplay: Authentication expired, component will not render",
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadNeighbors();
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <Card className={`bg-black/40 border border-white/20 ${className}`}>
        <CardBody className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-5 h-5 bg-white/20 rounded" />
              <div className="w-32 h-4 bg-white/20 rounded" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-white/5 rounded"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-white/20 rounded-full" />
                  <div className="w-24 h-4 bg-white/20 rounded" />
                </div>
                <div className="w-12 h-4 bg-white/20 rounded" />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!neighbors) {
    return null;
  }

  // Helper functions
  const getLeagueIcon = (leagueName: string) => {
    switch (leagueName) {
      case "bronze":
        return Trophy;
      case "silver":
        return Medal;
      case "gold":
        return Award;
      case "platinum":
        return Crown;
      case "diamond":
        return Star;
      default:
        return Trophy;
    }
  };

  const getLeagueColors = (leagueName: string) => {
    switch (leagueName) {
      case "bronze":
        return {
          text: "text-orange-400",
          bg: "bg-orange-500/10",
          border: "border-orange-400/30",
        };
      case "silver":
        return {
          text: "text-gray-300",
          bg: "bg-gray-500/10",
          border: "border-gray-400/30",
        };
      case "gold":
        return {
          text: "text-yellow-400",
          bg: "bg-yellow-500/10",
          border: "border-yellow-400/30",
        };
      case "platinum":
        return {
          text: "text-purple-300",
          bg: "bg-purple-500/10",
          border: "border-purple-400/30",
        };
      case "diamond":
        return {
          text: "text-cyan-300",
          bg: "bg-cyan-500/10",
          border: "border-cyan-400/30",
        };
      default:
        return {
          text: "text-white",
          bg: "bg-white/10",
          border: "border-white/30",
        };
    }
  };

  const colors = getLeagueColors(neighbors.league.name);
  const LeagueIcon = getLeagueIcon(neighbors.league.name);

  const formatDisplayName = (
    firstName: string,
    lastName?: string,
    username?: string,
  ) => {
    if (username) {
      return `${firstName} (@${username})`;
    }

    return lastName ? `${firstName} ${lastName}` : firstName;
  };

  return (
    <Card className={`${colors.bg} border ${colors.border} ${className}`}>
      <CardBody className="p-4">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div
            className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}
          >
            <LeagueIcon className={colors.text} size={18} />
          </div>
          <div>
            <h3 className={`font-bold ${colors.text}`}>
              {t(`leagues.names.${neighbors.league.name}` as any)}
            </h3>
            <p className="text-white/60 text-sm">
              {t("leagues.leaderboardSection.yourPosition", {
                position: neighbors.userPosition,
              })}
            </p>
          </div>
        </div>

        {/* Players List */}
        <div className="space-y-2">
          {/* Players Ahead */}
          {neighbors.playersAhead.map((player: any) => (
            <div
              key={player.position}
              className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-400/20"
            >
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">
                  {player.position}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {formatDisplayName(
                      player.first_name,
                      player.last_name,
                      player.username,
                    )}
                  </div>
                  <div className="text-xs text-red-300">
                    +{player.games_ahead} games ahead
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <ArrowUp className="text-red-400" size={14} />
                <span className="text-sm text-white/80">
                  {player.games_count}
                </span>
              </div>
            </div>
          ))}

          {/* Current User */}
          <div className="flex items-center justify-between p-3 rounded bg-white/10 border border-white/30">
            <div className="flex items-center space-x-3">
              <div
                className={`w-6 h-6 rounded-full ${colors.bg} ${colors.text} border ${colors.border} flex items-center justify-center text-xs font-bold`}
              >
                {neighbors.userPosition}
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  {t("profile.you")}
                </div>
                <div className="text-xs text-white/60">Your position</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Target className={colors.text} size={14} />
              <span className={`text-sm font-bold ${colors.text}`}>
                {neighbors.userGames}
              </span>
            </div>
          </div>

          {/* Players Behind */}
          {neighbors.playersBehind.map((player: any) => (
            <div
              key={player.position}
              className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-400/20"
            >
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold">
                  {player.position}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {formatDisplayName(
                      player.first_name,
                      player.last_name,
                      player.username,
                    )}
                  </div>
                  <div className="text-xs text-green-300">
                    -{player.games_behind} games behind
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <ArrowDown className="text-green-400" size={14} />
                <span className="text-sm text-white/80">
                  {player.games_count}
                </span>
              </div>
            </div>
          ))}

          {/* Empty State Messages */}
          {neighbors.playersAhead.length === 0 &&
            neighbors.playersBehind.length === 0 && (
              <div className="text-center py-4">
                <Users className="text-white/40 mx-auto mb-2" size={24} />
                <p className="text-white/60 text-sm">
                  {t("leagues.leaderboardSection.aloneInLeague")}
                </p>
              </div>
            )}

          {neighbors.playersAhead.length === 0 &&
            neighbors.playersBehind.length > 0 && (
              <div className="text-center py-2 border-b border-white/10 mb-2">
                <Crown className={colors.text} size={16} />
                <p className={`text-xs ${colors.text} font-bold`}>
                  {t("leagues.leaderboardSection.leagueLeader")}
                </p>
              </div>
            )}
        </div>

        {/* League Info */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>{t("leagues.leaderboardSection.leagueRange")}</span>
            <span>
              {neighbors.league.min_games}
              {neighbors.league.max_games
                ? ` - ${neighbors.league.max_games}`
                : "+"}{" "}
              {t("profile.games")}
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default LeagueNeighborsDisplay;
