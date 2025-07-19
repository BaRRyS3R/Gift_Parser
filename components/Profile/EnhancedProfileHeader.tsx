// src/components/Profile/EnhancedProfileHeader.tsx - Обновленный для использования leagues API

"use client";

import React, { useEffect } from "react";
import { Trophy, Star, Medal, Award, Crown } from "lucide-react";
import type { UserProfileGameStats } from "@/hooks/modules/useProfile";
import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

interface EnhancedProfileHeaderProps {
    user: UserProfileGameStats;
}

const EnhancedProfileHeader: React.FC<EnhancedProfileHeaderProps> = ({ user }) => {
    const t = useT();
    const { leagues } = useUser();

    // Load league data when component mounts
    useEffect(() => {
        if (user && !leagues.leagueData && !leagues.isLoading) {
            console.log("Loading league data for enhanced profile header...");
            leagues.fetchLeagueData();
        }
    }, [user, leagues.leagueData, leagues.isLoading, leagues.fetchLeagueData]);

    // Get league icon and colors
    const getLeagueIcon = (leagueName: string) => {
        switch (leagueName) {
            case 'bronze': return Trophy;
            case 'silver': return Medal;
            case 'gold': return Award;
            case 'platinum': return Crown;
            case 'diamond': return Star;
            default: return Trophy;
        }
    };

    const getLeagueColor = (leagueName: string) => {
        switch (leagueName) {
            case 'bronze': return 'text-orange-400';
            case 'silver': return 'text-gray-300';
            case 'gold': return 'text-yellow-400';
            case 'platinum': return 'text-purple-300';
            case 'diamond': return 'text-cyan-300';
            default: return 'text-white';
        }
    };

    const LeagueIcon = leagues.progressInfo ? getLeagueIcon(leagues.progressInfo.currentLeague.name) : Trophy;
    const leagueColor = leagues.progressInfo ? getLeagueColor(leagues.progressInfo.currentLeague.name) : 'text-white';

    return (
        <div className="text-center space-y-3 px-4 py-6">
            {/* User Name */}
            <h1 className="text-2xl font-bold text-white">
                {user.first_name} {user.last_name || ""}
            </h1>

            {/* Username */}
            {user.username && (
                <p className="text-white/60 text-sm">
                    @{user.username}
                </p>
            )}

            {/* Level and League */}
            <div className="flex items-center justify-center space-x-4 mt-3">
                {leagues.isLoading ? (
                    <div className="animate-pulse flex items-center space-x-2">
                        <div className="w-16 h-5 bg-white/20 rounded" />
                        <div className="w-px h-4 bg-white/30" />
                        <div className="w-20 h-5 bg-white/20 rounded" />
                    </div>
                ) : leagues.progressInfo ? (
                    <>
                        {/* Level */}
                        <div className="flex items-center space-x-1">
                            <Star className="text-white/80" size={16} />
                            <span className="text-white text-sm font-semibold">
                                {t("profile.levelDisplay", { level: leagues.progressInfo.currentLevel })}
                            </span>
                        </div>

                        {/* Separator */}
                        <div className="w-px h-5 bg-white/30" />

                        {/* League */}
                        <div className="flex items-center space-x-1">
                            <LeagueIcon className={`${leagueColor} animate-pulse-gentle`} size={16} />
                            <span className={`text-sm font-semibold ${leagueColor}`}>
                                {t(`leagues.names.${leagues.progressInfo.currentLeague.name}` as any)}
                            </span>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default EnhancedProfileHeader;