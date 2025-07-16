// src/components/LeagueProgress/LeagueProgressModal.tsx - Updated to use authService API only

"use client";

import type { LeagueProgressInfo } from "@/lib/authService";

import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Card,
  CardBody,
} from "@nextui-org/react";
import {
  Trophy,
  Star,
  Medal,
  Award,
  Crown,
  ArrowUp,
  Target,
  X,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import { authService } from "@/lib/authService";

interface LeagueProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeagueProgressModal: React.FC<LeagueProgressModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isAuthenticated } = useUser();
  const t = useT();

  const [progressInfo, setProgressInfo] = useState<LeagueProgressInfo | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProgressInfo = async () => {
      if (!isAuthenticated || !isOpen) {
        return;
      }

      try {
        setIsLoading(true);
        console.log(
          "LeagueProgressModal: Fetching league progress via authService API...",
        );

        const progress = await authService.getLeagueProgress();

        setProgressInfo(progress);
        console.log(
          "LeagueProgressModal: League progress fetched successfully",
        );
      } catch (error) {
        console.error(
          "LeagueProgressModal: Error loading league progress:",
          error,
        );

        // Handle authentication errors gracefully
        if (
          error instanceof Error &&
          error.message.includes("Authentication expired")
        ) {
          console.log(
            "LeagueProgressModal: Authentication expired, closing modal",
          );
          onClose();
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProgressInfo();
  }, [isAuthenticated, isOpen, onClose]);

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
          progressBg: "bg-orange-400",
        };
      case "silver":
        return {
          text: "text-gray-300",
          bg: "bg-gray-500/10",
          border: "border-gray-400/30",
          progressBg: "bg-gray-300",
        };
      case "gold":
        return {
          text: "text-yellow-400",
          bg: "bg-yellow-500/10",
          border: "border-yellow-400/30",
          progressBg: "bg-yellow-400",
        };
      case "platinum":
        return {
          text: "text-purple-300",
          bg: "bg-purple-500/10",
          border: "border-purple-400/30",
          progressBg: "bg-purple-300",
        };
      case "diamond":
        return {
          text: "text-cyan-300",
          bg: "bg-cyan-500/10",
          border: "border-cyan-400/30",
          progressBg: "bg-cyan-300",
        };
      default:
        return {
          text: "text-white",
          bg: "bg-white/10",
          border: "border-white/30",
          progressBg: "bg-white",
        };
    }
  };

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (!progressInfo && !isLoading) {
    return null;
  }

  // Calculate level progress
  const GAMES_PER_LEVEL = 10;
  const MAX_LEVEL = 100;

  const currentLevel = progressInfo?.currentLevel || 1;
  const totalGames = progressInfo?.totalGames || 0;
  const gamesInCurrentLevel = totalGames % GAMES_PER_LEVEL;
  const gamesToNextLevel = GAMES_PER_LEVEL - gamesInCurrentLevel;
  const levelProgressPercent = (gamesInCurrentLevel / GAMES_PER_LEVEL) * 100;
  const isMaxLevel = currentLevel >= MAX_LEVEL;

  const currentColors = progressInfo
    ? getLeagueColors(progressInfo.currentLeague.name)
    : getLeagueColors("bronze");
  const CurrentIcon = progressInfo
    ? getLeagueIcon(progressInfo.currentLeague.name)
    : Trophy;
  const isMaxLeague = !progressInfo?.nextLeague;

  // Calculate league progress correctly
  const leagueProgressPercent = progressInfo
    ? Math.min(100, progressInfo.progressPercent)
    : 0;

  return (
    <Modal
      backdrop="blur"
      classNames={{
        backdrop: "bg-black/80",
        base: "bg-black border border-white/20 max-w-sm mx-4",
        header: "border-b border-white/10 px-4 py-3",
        body: "px-4 py-4",
      }}
      hideCloseButton={true}
      isOpen={isOpen}
      size="sm"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-8 h-8 rounded-lg ${currentColors.bg} border ${currentColors.border} flex items-center justify-center`}
            >
              <CurrentIcon className={currentColors.text} size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {t("leagues.progress")}
              </h3>
            </div>
          </div>
          <button
            className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all duration-300"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </ModalHeader>

        <ModalBody>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-4">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                <p className="text-white/60 text-sm">
                  {t("leagues.status.loading")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Status */}
              <Card
                className={`${currentColors.bg} border ${currentColors.border}`}
              >
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className={`text-base font-bold ${currentColors.text}`}
                      >
                        {t("profile.levelDisplay", { level: currentLevel })}
                      </div>
                      <div
                        className={`text-sm ${currentColors.text} opacity-80`}
                      >
                        {progressInfo &&
                          t(
                            `leagues.names.${progressInfo.currentLeague.name}` as any,
                          )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">
                        {totalGames}
                      </div>
                      <div className="text-xs text-white/60">
                        {t("leagues.progressDisplay.gamesPlayed")}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Level Progress */}
              {!isMaxLevel && (
                <Card className="bg-white/5 border border-white/20">
                  <CardBody className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Star className="text-white/70" size={16} />
                          <span className="text-sm font-medium text-white">
                            {t("profile.levelProgress.gamesToNext")}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ArrowUp className="text-white/60" size={14} />
                          <span className="text-sm font-bold text-white">
                            {gamesToNextLevel}
                          </span>
                        </div>
                      </div>

                      {/* Level Progress Bar */}
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-white/70 transition-all duration-500"
                          style={{ width: `${levelProgressPercent}%` }}
                        />
                      </div>

                      <div className="text-center">
                        <span className="text-white/60 text-xs">
                          {t("profile.levelProgress.nextLevel", {
                            level: currentLevel + 1,
                          })}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* League Progress */}
              {!isMaxLeague && progressInfo?.nextLeague && (
                <Card className="bg-white/5 border border-white/20">
                  <CardBody className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Target className="text-white/70" size={16} />
                          <span className="text-sm font-medium text-white">
                            {t("leagues.progressDisplay.gamesToNext")}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ArrowUp className="text-white/60" size={14} />
                          <span className="text-sm font-bold text-white">
                            {progressInfo.gamesToNextLeague}
                          </span>
                        </div>
                      </div>

                      {/* League Progress Bar */}
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${currentColors.progressBg}`}
                          style={{ width: `${leagueProgressPercent}%` }}
                        />
                      </div>

                      <div className="text-center">
                        <span className="text-white/60 text-xs">
                          {t("profile.levelProgress.nextLeague")}:{" "}
                          <span
                            className={
                              getLeagueColors(progressInfo.nextLeague.name).text
                            }
                          >
                            {t(
                              `leagues.names.${progressInfo.nextLeague.name}` as any,
                            )}
                          </span>
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Max Level/League Indicators */}
              {(isMaxLevel || isMaxLeague) && (
                <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-400/30">
                  <CardBody className="p-4 text-center">
                    <Star className="text-yellow-400 mx-auto mb-2" size={24} />
                    <p className="text-sm font-bold text-yellow-400">
                      {isMaxLevel && isMaxLeague
                        ? t("leagues.progressDisplay.maxAchieved")
                        : isMaxLevel
                          ? t("leagues.progressDisplay.maxLevel")
                          : t("leagues.progressDisplay.inTopLeague")}
                    </p>
                  </CardBody>
                </Card>
              )}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default LeagueProgressModal;
