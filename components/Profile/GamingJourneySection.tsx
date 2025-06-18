// src/components/Profile/GamingJourneySection.tsx - Gaming journey timeline

"use client";

import React from "react";
import { Calendar, Trophy, Zap, Target, Users, Star } from "lucide-react";
import type { User as UserType } from "@/lib/supabase";

interface JourneyMilestone {
    id: string;
    title: string;
    description: string;
    date: string;
    icon: React.ComponentType<any>;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface GamingJourneySectionProps {
    user: UserType;
}

const GamingJourneySection: React.FC<GamingJourneySectionProps> = ({ user }) => {
    const getMilestones = (): JourneyMilestone[] => {
        const milestones: JourneyMilestone[] = [];
        const joinDate = new Date(user.created_at);
        const currentDate = new Date();

        // Account creation milestone
        milestones.push({
            id: 'joined',
            title: 'Journey Begins',
            description: 'Joined the platform',
            date: formatDate(joinDate),
            icon: Star,
            rarity: 'common'
        });

        // First game milestone
        if (user.total_games > 0) {
            milestones.push({
                id: 'first_game',
                title: 'First Game',
                description: 'Played first game',
                date: formatDate(addDaysToDate(joinDate, 1)),
                icon: Target,
                rarity: 'common'
            });
        }

        // Reaction mode milestone
        if (user.reaction_games >= 5) {
            milestones.push({
                id: 'reaction_master',
                title: 'Speed Runner',
                description: 'Mastered reaction games',
                date: formatDate(addDaysToDate(joinDate, 7)),
                icon: Zap,
                rarity: 'rare'
            });
        }

        // Survival mode milestone
        if (user.survival_games >= 5) {
            milestones.push({
                id: 'survival_expert',
                title: 'Survivor',
                description: 'Conquered survival mode',
                date: formatDate(addDaysToDate(joinDate, 14)),
                icon: Trophy,
                rarity: 'epic'
            });
        }

        // High score milestone
        if (user.best_score >= 1000) {
            milestones.push({
                id: 'high_scorer',
                title: 'Elite Player',
                description: 'Reached elite status',
                date: formatDate(addDaysToDate(joinDate, 21)),
                icon: Trophy,
                rarity: 'legendary'
            });
        }

        // Referral milestone
        if (user.referral_count >= 3) {
            milestones.push({
                id: 'recruiter',
                title: 'Community Builder',
                description: 'Built a gaming network',
                date: formatDate(addDaysToDate(joinDate, 30)),
                icon: Users,
                rarity: 'epic'
            });
        }

        return milestones.reverse(); // Show most recent first
    };

    const formatDate = (date: Date): string => {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 30) return `${diffDays} days ago`;

        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear() === now.getFullYear() ? '' : ` '${date.getFullYear().toString().slice(-2)}`;
        return `${date.getDate()} ${month}${year}`;
    };

    const addDaysToDate = (date: Date, days: number): Date => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const getRarityColor = (rarity: JourneyMilestone['rarity']): string => {
        switch (rarity) {
            case 'common': return 'text-gray-400';
            case 'rare': return 'text-blue-400';
            case 'epic': return 'text-purple-400';
            case 'legendary': return 'text-yellow-400';
            default: return 'text-gray-400';
        }
    };

    const getRarityBg = (rarity: JourneyMilestone['rarity']): string => {
        switch (rarity) {
            case 'common': return 'bg-gray-800 border-gray-700';
            case 'rare': return 'bg-blue-900/30 border-blue-700';
            case 'epic': return 'bg-purple-900/30 border-purple-700';
            case 'legendary': return 'bg-yellow-900/30 border-yellow-700';
            default: return 'bg-gray-800 border-gray-700';
        }
    };

    const milestones = getMilestones();
    const joinDate = new Date(user.created_at);
    const joinMonth = joinDate.toLocaleDateString('en-US', { month: 'short' });
    const joinYear = joinDate.getFullYear().toString().slice(-2);

    return (
        <div className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold text-white">Your Journey</h2>
                </div>
                <span className="text-gray-400 text-sm">Since {joinMonth} '{joinYear}</span>
            </div>

            {/* Journey Timeline */}
            <div className="space-y-3">
                {milestones.map((milestone, index) => {
                    const IconComponent = milestone.icon;

                    return (
                        <div
                            key={milestone.id}
                            className={`
                flex items-center space-x-4 p-3 rounded-lg border transition-all duration-200
                hover:scale-[1.02] cursor-pointer
                ${getRarityBg(milestone.rarity)}
              `}
                        >
                            {/* Milestone Icon */}
                            <div className={`
                w-12 h-12 rounded-lg border flex items-center justify-center flex-shrink-0
                ${getRarityBg(milestone.rarity)}
              `}>
                                <IconComponent className={getRarityColor(milestone.rarity)} size={20} />
                            </div>

                            {/* Milestone Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-white text-sm">
                                    {milestone.title}
                                </h3>
                                <p className="text-gray-400 text-xs">
                                    {milestone.description}
                                </p>
                            </div>

                            {/* Date */}
                            <div className="text-right flex-shrink-0">
                                <p className="text-gray-400 text-xs">
                                    {milestone.date}
                                </p>
                            </div>
                        </div>
                    );
                })}

                {milestones.length === 0 && (
                    <div className="text-center py-8">
                        <Calendar className="text-gray-600 mx-auto mb-3" size={32} />
                        <p className="text-gray-400 text-sm">Your journey begins...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamingJourneySection;