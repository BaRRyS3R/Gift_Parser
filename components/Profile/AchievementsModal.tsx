// src/components/Profile/AchievementsModal.tsx - Achievements display modal

"use client";

import React from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Card,
    CardBody,
    ScrollShadow
} from "@nextui-org/react";
import {
    Award,
    Trophy,
    Target,
    Medal,
    Users,
    Share2,
    Gift,
    Zap,
    Crosshair,
    Clock,
    TrendingUp,
    Activity,
    Star,
    X
} from "lucide-react";
import type { User as UserType } from "@/lib/supabase";
import { useT } from "@/contexts/LocalizationContext";

interface Achievement {
    icon: React.ComponentType<any>;
    name: string;
    description: string;
    color: string;
    category: 'general' | 'referral' | 'reaction' | 'survival' | 'ranking';
}

interface AchievementsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserType;
    rankings: {
        overall: number | null;
        reaction: number | null;
        survival: number | null;
    };
}

const AchievementsModal: React.FC<AchievementsModalProps> = ({
    isOpen,
    onClose,
    user,
    rankings
}) => {
    const t = useT();

    const getAchievements = (): Achievement[] => {
        const achievements: Achievement[] = [];

        // General achievements
        if (user.total_games >= 10)
            achievements.push({
                icon: Target,
                name: t("profile.achievements.activePlayer"),
                description: t("profile.achievements.descriptions.gamesPlayed", { count: 10 }),
                color: "text-white",
                category: 'general'
            });

        if (user.total_games >= 50)
            achievements.push({
                icon: Medal,
                name: t("profile.achievements.dedicatedGamer"),
                description: t("profile.achievements.descriptions.gamesPlayed", { count: 50 }),
                color: "text-white",
                category: 'general'
            });

        if (user.total_games >= 100)
            achievements.push({
                icon: Award,
                name: t("profile.achievements.gameMaster"),
                description: t("profile.achievements.descriptions.gamesPlayed", { count: 100 }),
                color: "text-white",
                category: 'general'
            });

        // Referral achievements
        if (user.referral_count >= 1)
            achievements.push({
                icon: Users,
                name: t("profile.achievements.recruiter"),
                description: t("profile.achievements.descriptions.invitedFriend", { count: 1 }),
                color: "text-white",
                category: 'referral'
            });

        if (user.referral_count >= 5)
            achievements.push({
                icon: Share2,
                name: t("profile.achievements.influencer"),
                description: t("profile.achievements.descriptions.invitedFriends", { count: 5 }),
                color: "text-white",
                category: 'referral'
            });

        if (user.referral_count >= 10)
            achievements.push({
                icon: Gift,
                name: t("profile.achievements.ambassador"),
                description: t("profile.achievements.descriptions.invitedFriends", { count: 10 }),
                color: "text-white",
                category: 'referral'
            });

        // Reaction Mode achievements
        if (user.reaction_games >= 1)
            achievements.push({
                icon: Zap,
                name: t("profile.achievements.speedTester"),
                description: t("profile.achievements.descriptions.testedReaction"),
                color: "text-white",
                category: 'reaction'
            });

        if (user.reaction_games >= 10)
            achievements.push({
                icon: Zap,
                name: t("profile.achievements.quickReflexes"),
                description: t("profile.achievements.descriptions.reactionTests", { count: 10 }),
                color: "text-white",
                category: 'reaction'
            });

        if ((user.reaction_best_time || 0) <= 200)
            achievements.push({
                icon: Zap,
                name: t("profile.achievements.lightningFast"),
                description: t("profile.achievements.descriptions.subReaction", { time: 200 }),
                color: "text-white",
                category: 'reaction'
            });

        if ((user.reaction_best_time || 0) <= 150)
            achievements.push({
                icon: Zap,
                name: t("profile.achievements.superhumanSpeed"),
                description: t("profile.achievements.descriptions.subReaction", { time: 150 }),
                color: "text-white",
                category: 'reaction'
            });

        if (rankings.reaction && rankings.reaction <= 10)
            achievements.push({
                icon: Trophy,
                name: t("profile.achievements.speedDemon"),
                description: t("profile.achievements.descriptions.topReaction"),
                color: "text-white",
                category: 'ranking'
            });

        // Survival Mode achievements
        if (user.survival_games >= 1)
            achievements.push({
                icon: Crosshair,
                name: t("profile.achievements.survivor"),
                description: t("profile.achievements.descriptions.enteredSurvival"),
                color: "text-white",
                category: 'survival'
            });

        if (user.survival_games >= 10)
            achievements.push({
                icon: Crosshair,
                name: t("profile.achievements.persistentSurvivor"),
                description: t("profile.achievements.descriptions.survivalAttempts", { count: 10 }),
                color: "text-white",
                category: 'survival'
            });

        if ((user.survival_best_time || 0) >= 30000)
            achievements.push({
                icon: Clock,
                name: t("profile.achievements.enduranceMaster"),
                description: t("profile.achievements.descriptions.secondsSurvival", { time: 30 }),
                color: "text-white",
                category: 'survival'
            });

        if ((user.survival_best_time || 0) >= 60000)
            achievements.push({
                icon: Clock,
                name: t("profile.achievements.survivalLegend"),
                description: t("profile.achievements.descriptions.minuteSurvival", { time: 1 }),
                color: "text-white",
                category: 'survival'
            });

        if ((user.survival_max_level || 0) >= 5)
            achievements.push({
                icon: TrendingUp,
                name: t("profile.achievements.levelClimber"),
                description: t("profile.achievements.descriptions.reachedLevel", { level: 5 }),
                color: "text-white",
                category: 'survival'
            });

        if ((user.survival_max_level || 0) >= 10)
            achievements.push({
                icon: TrendingUp,
                name: t("profile.achievements.eliteSurvivor"),
                description: t("profile.achievements.descriptions.reachedLevel", { level: 10 }),
                color: "text-white",
                category: 'survival'
            });

        if ((user.survival_best_streak || 0) >= 50)
            achievements.push({
                icon: Target,
                name: t("profile.achievements.streakMaster"),
                description: t("profile.achievements.descriptions.perfectHits", { count: 50 }),
                color: "text-white",
                category: 'survival'
            });

        if (rankings.survival && rankings.survival <= 5)
            achievements.push({
                icon: Trophy,
                name: t("profile.achievements.survivalElite"),
                description: t("profile.achievements.descriptions.topSurvivor", { rank: 5 }),
                color: "text-white",
                category: 'ranking'
            });

        // Overall rankings
        if (rankings.overall && rankings.overall <= 10)
            achievements.push({
                icon: Trophy,
                name: t("profile.achievements.topPlayer"),
                description: t("profile.achievements.descriptions.topOverall", { rank: 10 }),
                color: "text-white",
                category: 'ranking'
            });

        return achievements;
    };

    const achievements = getAchievements();

    const getCategoryIcon = (category: Achievement['category']) => {
        switch (category) {
            case 'general': return Activity;
            case 'referral': return Users;
            case 'reaction': return Zap;
            case 'survival': return Crosshair;
            case 'ranking': return Trophy;
        }
    };

    const getCategoryName = (category: Achievement['category']) => {
        switch (category) {
            case 'general': return 'General';
            case 'referral': return 'Referral';
            case 'reaction': return 'Reaction';
            case 'survival': return 'Survival';
            case 'ranking': return 'Ranking';
        }
    };

    const groupedAchievements = achievements.reduce((acc, achievement) => {
        if (!acc[achievement.category]) {
            acc[achievement.category] = [];
        }
        acc[achievement.category].push(achievement);
        return acc;
    }, {} as Record<Achievement['category'], Achievement[]>);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            backdrop="blur"
            scrollBehavior="inside"
            classNames={{
                backdrop: "bg-black/80",
                base: "bg-black border border-white/20",
                header: "border-b border-white/10",
                body: "py-6",
                footer: "border-t border-white/10"
            }}
        >
            <ModalContent>
                <ModalHeader className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            <Award className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {t("profile.achievements.title")}
                            </h2>
                            <p className="text-white/60 text-sm">
                                {achievements.length} achievements unlocked
                            </p>
                        </div>
                    </div>
                </ModalHeader>

                <ModalBody>
                    {achievements.length === 0 ? (
                        <Card className="bg-white/5 border border-white/20">
                            <CardBody className="text-center py-8">
                                <Star className="text-white/40 mx-auto mb-3" size={32} />
                                <p className="text-white/60 text-sm">
                                    {t("profile.achievements.noAchievements")}
                                </p>
                                <p className="text-white/40 text-xs mt-1">
                                    {t("profile.achievements.playToUnlock")}
                                </p>
                            </CardBody>
                        </Card>
                    ) : (
                        <ScrollShadow className="space-y-4 max-h-96">
                            {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => {
                                const CategoryIcon = getCategoryIcon(category as Achievement['category']);
                                return (
                                    <div key={category} className="space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <CategoryIcon className="text-white/80" size={16} />
                                            <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">
                                                {getCategoryName(category as Achievement['category'])}
                                            </h3>
                                            <div className="flex-1 h-px bg-white/20" />
                                            <span className="text-xs text-white/40">
                                                {categoryAchievements.length}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            {categoryAchievements.map((achievement, index) => {
                                                const Icon = achievement.icon;
                                                return (
                                                    <Card
                                                        key={index}
                                                        className="bg-white/5 border border-white/20 hover:bg-white/10 transition-colors"
                                                    >
                                                        <CardBody className="p-4">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                    <Icon className={achievement.color} size={18} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-bold text-sm text-white">
                                                                        {achievement.name}
                                                                    </h4>
                                                                    <p className="text-xs text-white/60">
                                                                        {achievement.description}
                                                                    </p>
                                                                </div>
                                                                <div className="w-3 h-3 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                                                                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                                                </div>
                                                            </div>
                                                        </CardBody>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </ScrollShadow>
                    )}
                </ModalBody>

                <ModalFooter>
                    <Button
                        className="bg-white/10 border border-white/30 text-white hover:bg-white/20"
                        variant="bordered"
                        onPress={onClose}
                    >
                        {t("common.close")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default AchievementsModal;