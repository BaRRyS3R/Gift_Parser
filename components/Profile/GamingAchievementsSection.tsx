// src/components/Profile/GamingAchievementsSection.tsx - Fixed accessibility issues

"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import type { User as UserType } from "@/lib/supabase";

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    unlocked: boolean;
}

interface GamingAchievementsSectionProps {
    user: UserType;
    onViewAll: () => void;
}

const GamingAchievementsSection: React.FC<GamingAchievementsSectionProps> = ({
    user,
    onViewAll
}) => {
    const getAchievements = (): Achievement[] => {
        const achievements: Achievement[] = [];

        // Gaming-style achievements with pixel art feel
        if (user.total_games >= 10) {
            achievements.push({
                id: 'first_steps',
                name: 'First Steps',
                description: '10+ games played',
                icon: '🎮',
                rarity: 'common',
                unlocked: true
            });
        }

        if (user.reaction_games >= 5) {
            achievements.push({
                id: 'speed_demon',
                name: 'Speed Demon',
                description: 'Reaction master',
                icon: '⚡',
                rarity: 'rare',
                unlocked: true
            });
        }

        if (user.survival_games >= 5) {
            achievements.push({
                id: 'survivor',
                name: 'Survivor',
                description: 'Survival expert',
                icon: '🛡️',
                rarity: 'epic',
                unlocked: true
            });
        }

        if (user.total_games >= 50) {
            achievements.push({
                id: 'veteran',
                name: 'Veteran',
                description: '50+ games completed',
                icon: '👑',
                rarity: 'legendary',
                unlocked: true
            });
        }

        if ((user.reaction_best_time || 0) <= 150) {
            achievements.push({
                id: 'lightning',
                name: 'Lightning',
                description: 'Sub-150ms reaction',
                icon: '🌟',
                rarity: 'legendary',
                unlocked: true
            });
        }

        if (user.referral_count >= 3) {
            achievements.push({
                id: 'recruiter',
                name: 'Recruiter',
                description: '3+ friends invited',
                icon: '🤝',
                rarity: 'epic',
                unlocked: true
            });
        }

        // Add locked achievements for visual appeal
        if (achievements.length < 6) {
            const lockedCount = 6 - achievements.length;
            for (let i = 0; i < lockedCount; i++) {
                achievements.push({
                    id: `locked_${i}`,
                    name: '???',
                    description: 'Locked',
                    icon: '🔒',
                    rarity: 'common',
                    unlocked: false
                });
            }
        }

        return achievements.slice(0, 6); // Show max 6 achievements
    };

    const getRarityStyle = (rarity: Achievement['rarity'], unlocked: boolean) => {
        if (!unlocked) return 'bg-gray-800 border-gray-700';

        switch (rarity) {
            case 'common':
                return 'bg-gray-700 border-gray-600';
            case 'rare':
                return 'bg-blue-900/50 border-blue-600/50';
            case 'epic':
                return 'bg-purple-900/50 border-purple-600/50';
            case 'legendary':
                return 'bg-yellow-900/50 border-yellow-600/50';
            default:
                return 'bg-gray-700 border-gray-600';
        }
    };

    const achievements = getAchievements();
    const unlockedCount = achievements.filter(a => a.unlocked).length;

    return (
        <div className="space-y-4">
            {/* Section Header */}
            <button
                className="flex items-center justify-between w-full group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg p-2"
                onClick={onViewAll}
                type="button"
                aria-label="View all achievements"
            >
                <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold text-white">Achievements</h2>
                    <span className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400 text-sm font-bold">
                        {unlockedCount}
                    </span>
                </div>
                <ChevronRight className="text-gray-400 group-hover:text-white transition-colors" size={20} />
            </button>

            {/* Achievements Grid */}
            <div className="grid grid-cols-3 gap-3">
                {achievements.map((achievement) => (
                    <button
                        key={achievement.id}
                        className={`
              relative aspect-square rounded-lg border-2 p-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
              ${getRarityStyle(achievement.rarity, achievement.unlocked)}
              ${achievement.unlocked ? 'hover:scale-105 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
            `}
                        disabled={!achievement.unlocked}
                        type="button"
                        aria-label={`${achievement.name} achievement: ${achievement.description}`}
                    >
                        {/* Achievement Icon */}
                        <div className="flex items-center justify-center h-full">
                            <span className="text-2xl" role="img" aria-hidden="true">{achievement.icon}</span>
                        </div>

                        {/* Rarity Indicator */}
                        {achievement.unlocked && achievement.rarity !== 'common' && (
                            <div className="absolute top-1 right-1">
                                <div className={`
                  w-2 h-2 rounded-full
                  ${achievement.rarity === 'rare' ? 'bg-blue-400' :
                                        achievement.rarity === 'epic' ? 'bg-purple-400' :
                                            'bg-yellow-400'}
                `} />
                            </div>
                        )}

                        {/* Achievement Name (visible on hover) */}
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 text-white text-xs p-1 rounded-b-lg opacity-0 hover:opacity-100 transition-opacity">
                            <p className="font-semibold truncate">{achievement.name}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default GamingAchievementsSection;