// src/components/LeagueProgress/LeaguesModal.tsx - Updated to use authService API only

"use client";

import type { LeagueData, LeagueProgressInfo } from "@/lib/authService";

import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Card,
  CardBody,
  Tabs,
  Tab,
  Accordion,
  AccordionItem,
} from "@nextui-org/react";
import {
  Trophy,
  Star,
  Gift,
  Medal,
  Crown,
  Award,
  ChevronRight,
  X,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import { authService } from "@/lib/authService";

interface LeaguesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeaguesModal: React.FC<LeaguesModalProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useUser();
  const t = useT();

  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
  const [progressInfo, setProgressInfo] = useState<LeagueProgressInfo | null>(
    null,
  );
  const [selectedTab, setSelectedTab] = useState("progress");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLeagueData = async () => {
      if (!isAuthenticated || !isOpen) return;

      try {
        setIsLoading(true);

        console.log(
          "LeaguesModal: Fetching league data via authService API...",
        );

        // Get league data and progress info in parallel
        const [leagues, progress] = await Promise.all([
          authService.getLeagueData(),
          authService.getLeagueProgress(),
        ]);

        setLeagueData(leagues);
        setProgressInfo(progress);

        console.log("LeaguesModal: League data fetched successfully:", {
          leaguesCount: leagues.allLeagues.length,
          userRewards: leagues.userRewards.length,
          currentLeague: progress.currentLeague.name,
        });
      } catch (error) {
        console.error("LeaguesModal: Error loading league data:", error);

        // Handle authentication errors
        if (
          error instanceof Error &&
          error.message.includes("Authentication expired")
        ) {
          console.log("LeaguesModal: Authentication expired, closing modal");
          onClose();
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadLeagueData();
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

  const getLeagueColorClasses = (leagueName: string) => {
    switch (leagueName) {
      case "bronze":
        return {
          text: "text-orange-400",
          bg: "bg-orange-500/10",
          border: "border-orange-400/30",
          accent: "text-orange-300",
          progressBg: "bg-orange-400",
        };
      case "silver":
        return {
          text: "text-gray-300",
          bg: "bg-gray-500/10",
          border: "border-gray-400/30",
          accent: "text-gray-200",
          progressBg: "bg-gray-300",
        };
      case "gold":
        return {
          text: "text-yellow-400",
          bg: "bg-yellow-500/10",
          border: "border-yellow-400/30",
          accent: "text-yellow-300",
          progressBg: "bg-yellow-400",
        };
      case "platinum":
        return {
          text: "text-purple-300",
          bg: "bg-purple-500/10",
          border: "border-purple-400/30",
          accent: "text-purple-200",
          progressBg: "bg-purple-300",
        };
      case "diamond":
        return {
          text: "text-cyan-300",
          bg: "bg-cyan-500/10",
          border: "border-cyan-400/30",
          accent: "text-cyan-200",
          progressBg: "bg-cyan-300",
        };
      default:
        return {
          text: "text-white",
          bg: "bg-white/10",
          border: "border-white/30",
          accent: "text-white/80",
          progressBg: "bg-white",
        };
    }
  };

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

  // Progress Tab Component
  const ProgressTab = () => {
    if (!progressInfo) return null;

    const colors = getLeagueColorClasses(progressInfo.currentLeague.name);
    const Icon = getLeagueIcon(progressInfo.currentLeague.name);
    const isMaxLeague = !progressInfo.nextLeague;

    // Calculate level progress
    const GAMES_PER_LEVEL = 10;
    const MAX_LEVEL = 100;
    const currentLevel = progressInfo.currentLevel;
    const gamesInCurrentLevel = progressInfo.totalGames % GAMES_PER_LEVEL;
    const gamesToNextLevel = GAMES_PER_LEVEL - gamesInCurrentLevel;
    const levelProgressPercent = (gamesInCurrentLevel / GAMES_PER_LEVEL) * 100;
    const isMaxLevel = currentLevel >= MAX_LEVEL;

    return (
      <div className="space-y-6 p-4">
        {/* Current Status Card */}
        <Card className={`${colors.bg} border ${colors.border}`}>
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-12 h-12 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}
                >
                  <Icon className={colors.text} size={24} />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${colors.text}`}>
                    {t(
                      `leagues.names.${progressInfo.currentLeague.name}` as any,
                    )}
                  </h3>
                  <p className={`text-sm ${colors.accent}`}>
                    {t("profile.levelDisplay", {
                      level: progressInfo.currentLevel,
                    })}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-2xl font-bold ${colors.text}`}>
                  {progressInfo.totalGames}
                </div>
                <div className={`text-xs ${colors.accent}`}>
                  {t("leagues.progressDisplay.gamesPlayed")}
                </div>
              </div>
            </div>

            {/* Level Progress */}
            {!isMaxLevel && (
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">
                    {t("profile.levelProgress.gamesToNext")}
                  </span>
                  <span className="text-white font-bold">
                    {gamesToNextLevel}
                  </span>
                </div>

                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-white/60 transition-all duration-500"
                    style={{ width: `${levelProgressPercent}%` }}
                  />
                </div>

                <div className="text-center">
                  <span className="text-white/60 text-sm">
                    {t("profile.levelProgress.nextLevel", {
                      level: currentLevel + 1,
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* League Progress */}
            {!isMaxLeague && progressInfo.nextLeague && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">
                    {t("leagues.progressDisplay.gamesToNext")}
                  </span>
                  <span className="text-white font-bold">
                    {progressInfo.gamesToNextLeague}
                  </span>
                </div>

                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${colors.progressBg}`}
                    style={{ width: `${progressInfo.progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-center space-x-2 pt-2">
                  <span className="text-white/60 text-sm">
                    {t("profile.levelProgress.nextLeague")}:
                  </span>
                  <span
                    className={`font-bold ${getLeagueColorClasses(progressInfo.nextLeague.name).text}`}
                  >
                    {t(`leagues.names.${progressInfo.nextLeague.name}` as any)}
                  </span>
                  <ChevronRight className="text-white/60" size={16} />
                </div>
              </div>
            )}

            {/* Max League/Level Indicators */}
            {isMaxLeague && isMaxLevel && (
              <div className="text-center py-3">
                <Crown className={colors.text} size={32} />
                <p className={`text-sm font-bold ${colors.text} mt-2`}>
                  {t("leagues.progressDisplay.maxAchieved")}
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  };

  // Rewards Tab Component
  const RewardsTab = () => {
    if (!leagueData) return null;

    return (
      <div className="space-y-6 p-4">
        {/* User's Rewards */}
        {leagueData.userRewards.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-lg font-bold text-white">
              {t("leagues.rewardsSection.yourRewards")}
            </h4>
            {leagueData.userRewards.map((reward: any) => (
              <Card
                key={reward.id}
                className="bg-green-500/10 border border-green-400/30"
              >
                <CardBody className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Gift className="text-green-400" size={20} />
                      <div>
                        <div className="font-bold text-green-400">
                          {reward.reward?.name ||
                            t("leagues.rewardsSection.specialReward")}
                        </div>
                        <div className="text-xs text-green-300">
                          {t("leagues.rewardsSection.position", {
                            position: reward.position,
                          })}{" "}
                          {t("profile.inLeague")}{" "}
                          {reward.league &&
                            t(`leagues.names.${reward.league.name}` as any)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-400">
                        {new Date(reward.received_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-green-300">
                        {t("leagues.rewardsSection.rewardReceived")}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Available Rewards by League */}
        <div className="space-y-4">
          <h4 className="text-lg font-bold text-white">
            {t("leagues.rewardsSection.availableRewards")}
          </h4>

          <Accordion className="px-0" variant="splitted">
            {leagueData.allLeagues
              .filter((league: any) => league.name !== "bronze")
              .map((league: any) => {
                const colors = getLeagueColorClasses(league.name);
                const Icon = getLeagueIcon(league.name);
                const leaderboard = leagueData.leaderboards[league.id];
                const rewards = leagueData.allLeagueRewards[league.id] || [];

                return (
                  <AccordionItem
                    key={league.id}
                    aria-label={t(`leagues.names.${league.name}` as any)}
                    className={`${colors.bg} border ${colors.border}`}
                    title={
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <Icon className={colors.text} size={20} />
                          <div>
                            <div className={`font-bold ${colors.text}`}>
                              {t(`leagues.names.${league.name}` as any)}
                            </div>
                            <div className={`text-xs ${colors.accent}`}>
                              {league.min_games}+ {t("profile.gamesRequired")}
                            </div>
                          </div>
                        </div>

                        {leaderboard && (
                          <div className="text-right mr-4">
                            <div className={`text-sm font-bold ${colors.text}`}>
                              {leaderboard.rewardsRemaining}/
                              {league.rewards_count}
                            </div>
                            <div className={`text-xs ${colors.accent}`}>
                              {leaderboard.rewardsRemaining > 0
                                ? t("leagues.rewardsSection.rewardsLeft", {
                                  count: leaderboard.rewardsRemaining,
                                })
                                : t("leagues.rewardsSection.allClaimed")}
                            </div>
                          </div>
                        )}
                      </div>
                    }
                  >
                    <div className="space-y-2 pt-2">
                      {rewards.length > 0 ? (
                        rewards.map((reward: any) => (
                          <div
                            key={reward.id}
                            className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10"
                          >
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-6 h-6 rounded-full ${colors.bg} ${colors.text} border ${colors.border} flex items-center justify-center text-xs font-bold`}
                              >
                                {reward.position}
                              </div>
                              <span className="text-white text-sm">
                                {reward.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Gift className={colors.text} size={14} />
                              {leaderboard &&
                                leaderboard.rewardsGiven >= reward.position ? (
                                <span className="text-red-400 text-xs">
                                  {t("leagues.rewardsSection.claimed")}
                                </span>
                              ) : (
                                <span className="text-green-400 text-xs">
                                  {t("leagues.rewardsSection.available")}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-white/60 text-sm">
                          {t("leagues.rewardsSection.noRewardsConfigured")}
                        </div>
                      )}
                    </div>
                  </AccordionItem>
                );
              })}
          </Accordion>
        </div>
      </div>
    );
  };

  // В LeaderboardTab компоненте нужно изменить key с player.user_id на player.position

  const LeaderboardTab = () => {
    if (!leagueData) return null;

    return (
      <div className="space-y-6 p-4">
        {Object.values(leagueData.leaderboards).map((leaderboard: any) => {
          const colors = getLeagueColorClasses(leaderboard.league.name);
          const Icon = getLeagueIcon(leaderboard.league.name);

          return (
            <Card
              key={leaderboard.league.id}
              className={`${colors.bg} border ${colors.border}`}
            >
              <CardBody className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Icon className={colors.text} size={20} />
                    <div>
                      <h4 className={`font-bold ${colors.text}`}>
                        {t(`leagues.names.${leaderboard.league.name}` as any)}
                      </h4>
                      <p className={`text-sm ${colors.accent}`}>
                        {t("leagues.leaderboardSection.playersInLeague", {
                          count: leaderboard.totalInLeague,
                        })}
                      </p>
                    </div>
                  </div>

                  {leaderboard.userPosition && (
                    <div className="text-right">
                      <div className={`text-sm font-bold ${colors.text}`}>
                        {t("leagues.leaderboardSection.yourPosition", {
                          position: leaderboard.userPosition,
                        })}
                      </div>
                      {leaderboard.userGamesToNextReward && (
                        <div className={`text-xs ${colors.accent}`}>
                          {t("leagues.leaderboardSection.gamesToNextReward", {
                            games: leaderboard.userGamesToNextReward,
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Top 5 Players List */}
                <div className="space-y-2">
                  <h5 className="text-sm font-bold text-white/80">
                    {t("leagues.leaderboardSection.topPlayers")}
                  </h5>
                  {leaderboard.topPlayers.length > 0 ? (
                    leaderboard.topPlayers.map((player: any) => (
                      <div
                        // ИСПРАВЛЕНИЕ: Используем position вместо user_id для безопасности
                        key={`${leaderboard.league.id}-${player.position}`}
                        className="flex items-center justify-between p-2 rounded bg-white/5"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${player.position <= 3 ? colors.bg : "bg-white/10"
                              } ${player.position <= 3 ? colors.text : "text-white/60"}`}
                          >
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
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-white/80">
                            {player.games_count}
                          </span>
                          {player.got_reward && (
                            <Gift className="text-green-400" size={14} />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-white/60 text-sm">
                      {t("leagues.leaderboardSection.noPlayers")}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <Modal
      classNames={{
        backdrop: "bg-black/80",
        base: "bg-black border border-white/20 mx-4 my-4 max-h-[85vh]",
        body: "p-0",
      }}
      hideCloseButton={true}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="3xl"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <Trophy className="text-yellow-400" size={24} />
            <h2 className="text-xl font-bold text-white">
              {t("leagues.title")}
            </h2>
          </div>
          <button
            className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all duration-300"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </ModalHeader>

        <ModalBody>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                <p className="text-white/60">{t("leagues.status.loading")}</p>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <Tabs
                className="w-full"
                classNames={{
                  base: "w-full",
                  tabList:
                    "w-full bg-white/5 rounded-none border-b border-white/10",
                  cursor: "bg-white/20",
                  tab: "text-white/60 data-[selected=true]:text-white px-6 py-3",
                  tabContent: "text-sm font-medium",
                  panel: "w-full p-0",
                }}
                selectedKey={selectedTab}
                onSelectionChange={(key) => setSelectedTab(key as string)}
              >
                <Tab key="progress" title={t("leagues.progress")}>
                  <ProgressTab />
                </Tab>
                <Tab key="rewards" title={t("leagues.rewards")}>
                  <RewardsTab />
                </Tab>
                <Tab key="leaderboard" title={t("leagues.leaderboard")}>
                  <LeaderboardTab />
                </Tab>
              </Tabs>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default LeaguesModal;
