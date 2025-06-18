// src/components/Profile/ProfileHeader.tsx - Profile header without avatar

"use client";

import React from "react";
import { User, Star, Crown, Medal, Award } from "lucide-react";
import type { User as UserType } from "@/lib/supabase";

interface ProfileHeaderProps {
    user: UserType;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
    const getProfileLevel = () => {
        const totalGames = user.total_games || 0;
        const survivalGames = user.survival_games || 0;
        const reactionGames = user.reaction_games || 0;

        const adjustedTotal = totalGames + survivalGames * 2 + reactionGames * 1.5;

        if (adjustedTotal >= 100) {
            return {
                level: "LEGEND",
                color: "text-white",
                bgColor: "bg-white/20",
                icon: Crown
            };
        }
        if (adjustedTotal >= 50) {
            return {
                level: "EXPERT",
                color: "text-white",
                bgColor: "bg-white/15",
                icon: Award
            };
        }
        if (adjustedTotal >= 20) {
            return {
                level: "SKILLED",
                color: "text-white",
                bgColor: "bg-white/10",
                icon: Medal
            };
        }
        if (adjustedTotal >= 10) {
            return {
                level: "ACTIVE",
                color: "text-white",
                bgColor: "bg-white/10",
                icon: Star
            };
        }

        return {
            level: "ROOKIE",
            color: "text-white/80",
            bgColor: "bg-white/5",
            icon: User
        };
    };

    const profileLevel = getProfileLevel();
    const LevelIcon = profileLevel.icon;

    return (
        <div className="flex flex-col items-center space-y-4 p-6">
            {/* User Icon Section */}
            <div className="relative">
                <div className="w-20 h-20 bg-white/10 border-2 border-white/20 rounded-full flex items-center justify-center">
                    <User className="text-white/60" size={32} />
                </div>

                {/* Level Badge */}
                <div className={`absolute -bottom-1 -right-1 ${profileLevel.bgColor} border border-white/30 rounded-full px-2 py-1 flex items-center space-x-1`}>
                    <LevelIcon className={profileLevel.color} size={12} />
                    <span className={`text-xs font-bold ${profileLevel.color}`}>
                        {profileLevel.level}
                    </span>
                </div>
            </div>

            {/* User Info */}
            <div className="text-center space-y-2">
                <h1 className="text-xl font-bold text-white">
                    {user.first_name} {user.last_name || ""}
                </h1>

                {user.username && (
                    <p className="text-white/60 text-sm">@{user.username}</p>
                )}

                {/* Status Indicators */}
                <div className="flex items-center justify-center space-x-3 mt-3">
                    {user.is_premium && (
                        <div className="flex items-center space-x-1 px-2 py-1 bg-white/10 border border-white/20 rounded-full">
                            <Star className="text-white" size={12} />
                            <span className="text-white text-xs font-bold">PREMIUM</span>
                        </div>
                    )}

                    <div className="flex items-center space-x-1 px-2 py-1 bg-white/10 border border-white/20 rounded-full">
                        <span className="text-white text-xs font-bold">
                            {user.total_games} GAMES
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;