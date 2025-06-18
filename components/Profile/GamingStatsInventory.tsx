// src/components/Profile/GamingStatsInventory.tsx - Gaming-style stats inventory

"use client";

import React from "react";
import { ChevronRight, Zap, Crosshair, Trophy } from "lucide-react";
import type { User as UserType } from "@/lib/supabase";

interface StatsCategory {
    id: string;
    name: string;
    icon: React.ComponentType<any>;
    itemCount: number;
    bgColor: string;
    iconColor: string;
}

interface GamingStatsInventoryProps {
    user: UserType;
}

const GamingStatsInventory: React.FC<GamingStatsInventoryProps> = ({ user }) => {
    const getStatsCategories = (): StatsCategory[] => {
        return [
            {
                id: 'reaction',
                name: 'Reaction',
                icon: Zap,
                itemCount: user.reaction_games || 0,
                bgColor: 'bg-blue-900/30',
                iconColor: 'text-blue-400'
            },
            {
                id: 'survival',
                name: 'Survival',
                icon: Crosshair,
                itemCount: user.survival_games || 0,
                bgColor: 'bg-red-900/30',
                iconColor: 'text-red-400'
            },
            {
                id: 'achievements',
                name: 'Trophies',
                icon: Trophy,
                itemCount: calculateAchievementCount(),
                bgColor: 'bg-yellow-900/30',
                iconColor: 'text-yellow-400'
            }
        ];
    };

    const calculateAchievementCount = (): number => {
        let count = 0;
        if (user.total_games >= 10) count++;
        if (user.reaction_games >= 5) count++;
        if (user.survival_games >= 5) count++;
        if (user.total_games >= 50) count++;
        if ((user.reaction_best_time || 0) <= 150) count++;
        if (user.referral_count >= 3) count++;
        return count;
    };

    const categories = getStatsCategories();

    return (
        <div className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold text-white">Stats</h2>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
            </div>

            {/* Stats Categories Grid */}
            <div className="grid grid-cols-3 gap-3">
                {categories.map((category) => {
                    const IconComponent = category.icon;

                    return (
                        <div
                            key={category.id}
                            className={`
                relative p-4 rounded-lg border border-gray-700 transition-all duration-200
                hover:scale-105 hover:border-gray-600 cursor-pointer
                ${category.bgColor}
              `}
                        >
                            {/* Category Icon */}
                            <div className="flex justify-center mb-3">
                                <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                                    <IconComponent className={category.iconColor} size={24} />
                                </div>
                            </div>

                            {/* Category Info */}
                            <div className="text-center space-y-1">
                                <h3 className="text-white font-semibold text-sm">
                                    {category.name}
                                </h3>
                                <p className="text-gray-400 text-xs">
                                    {category.itemCount} {category.itemCount === 1 ? 'item' : 'items'}
                                </p>
                            </div>

                            {/* Item Count Badge */}
                            {category.itemCount > 0 && (
                                <div className="absolute -top-1 -right-1 bg-gray-700 border border-gray-600 rounded-full w-6 h-6 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">
                                        {category.itemCount > 99 ? '99+' : category.itemCount}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default GamingStatsInventory;