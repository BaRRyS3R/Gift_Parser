// src/components/Profile/GamingProfileHeader.tsx - Gaming-style profile header

"use client";

import React from "react";
import { Star, Crown, Medal, Award, Zap } from "lucide-react";
import type { User as UserType } from "@/lib/supabase";

interface GamingProfileHeaderProps {
    user: UserType;
}

const GamingProfileHeader: React.FC<GamingProfileHeaderProps> = ({ user }) => {
    const getProfileLevel = () => {
        const totalGames = user.total_games || 0;
        const survivalGames = user.survival_games || 0;
        const reactionGames = user.reaction_games || 0;

        const adjustedTotal = totalGames + survivalGames * 2 + reactionGames * 1.5;

        if (adjustedTotal >= 100) return { level: "LEGEND", color: "text-yellow-400", icon: Crown };
        if (adjustedTotal >= 50) return { level: "EXPERT", color: "text-purple-400", icon: Award };
        if (adjustedTotal >= 20) return { level: "SKILLED", color: "text-blue-400", icon: Medal };
        if (adjustedTotal >= 10) return { level: "ACTIVE", color: "text-green-400", icon: Star };
        return { level: "ROOKIE", color: "text-gray-400", icon: Zap };
    };

    const profileLevel = getProfileLevel();
    const LevelIcon = profileLevel.icon;

    return (
        <div className="text-center space-y-4 p-6">
            {/* User Name */}
            <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white">
                    {user.first_name} {user.last_name || ""}
                </h1>

                {user.username && (
                    <p className="text-gray-400 text-sm">@{user.username}</p>
                )}
            </div>

            {/* Level Badge */}
            <div className="flex items-center justify-center space-x-2">
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-800 border border-gray-700 rounded-full">
                    <LevelIcon className={profileLevel.color} size={16} />
                    <span className={`text-sm font-bold ${profileLevel.color}`}>
                        {profileLevel.level}
                    </span>
                </div>

                {user.is_premium && (
                    <div className="flex items-center space-x-1 px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full">
                        <Star className="text-yellow-400" size={14} />
                        <span className="text-yellow-400 text-sm font-bold">PREMIUM</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamingProfileHeader;