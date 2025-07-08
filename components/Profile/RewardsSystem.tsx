// src/components/Profile/RewardsSystem.tsx - Rewards System Component

"use client";

import React, { useState } from "react";
import { Card, CardBody, Button, Modal, ModalContent, ModalHeader, ModalBody } from "@nextui-org/react";
import {
    Gift,
    Star,
    Check,
    Lock,
    Trophy,
    Sparkles,
    X
} from "lucide-react";

import type { User, PlayerReward } from "@/lib/supabase";
import {
    getAvailableRewards,
    getUnclaimedRewards,
    LEVEL_CONSTANTS
} from "@/utils/leagueSystem";
import { userService } from "@/lib/supabase";
import { useT } from "@/contexts/LocalizationContext";

interface RewardsSystemProps {
    user: User;
    onRewardClaimed?: () => void; // Callback to refresh user data
}

const RewardsSystem: React.FC<RewardsSystemProps> = ({ user, onRewardClaimed }) => {
    const t = useT();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [claimingRewardId, setClaimingRewardId] = useState<string | null>(null);
    const [claimedRewards, setClaimedRewards] = useState<string[]>(user.rewards_claimed || []);

    const availableRewards = getAvailableRewards(user.player_level);
    const unclaimedRewards = getUnclaimedRewards(user);

    const handleClaimReward = async (rewardId: string) => {
        try {
            setClaimingRewardId(rewardId);

            const success = await userService.claimReward(user.telegram_id, rewardId);

            if (success) {
                setClaimedRewards(prev => [...prev, rewardId]);

                // Call the callback to refresh user data
                if (onRewardClaimed) {
                    onRewardClaimed();
                }
            }
        } catch (error) {
            console.error("Error claiming reward:", error);
        } finally {
            setClaimingRewardId(null);
        }
    };

    const isRewardClaimed = (rewardId: string) => {
        return claimedRewards.includes(rewardId);
    };

    const isRewardAvailable = (rewardLevel: number) => {
        return user.player_level >= rewardLevel;
    };

    const getRewardIcon = (reward: PlayerReward, isClaimed: boolean, isAvailable: boolean) => {
        if (isClaimed) {
            return <Check className="text-green-400" size={20} />;
        }
        if (isAvailable) {
            return <Gift className="text-yellow-400" size={20} />;
        }
        return <Lock className="text-white/40" size={20} />;
    };

    const getRewardCardStyles = (reward: PlayerReward, isClaimed: boolean, isAvailable: boolean) => {
        if (isClaimed) {
            return "bg-green-500/10 border-green-400/30";
        }
        if (isAvailable) {
            return "bg-yellow-500/10 border-yellow-400/30 hover:bg-yellow-500/20";
        }
        return "bg-white/5 border-white/10";
    };

    const getAllPossibleRewards = () => {
        const rewards: PlayerReward[] = [];

        for (let level = LEVEL_CONSTANTS.REWARD_INTERVAL; level <= 100; level += LEVEL_CONSTANTS.REWARD_INTERVAL) {
            const rewardNumber = level / LEVEL_CONSTANTS.REWARD_INTERVAL;
            rewards.push({
                id: `test_gift_${rewardNumber}`,
                level: level,
                name: `Test Gift ${rewardNumber}`,
                description: `Reward for reaching level ${level}`,
            });
        }

        return rewards;
    };

    const allRewards = getAllPossibleRewards();

    return (
        <>
            {/* Rewards Summary Card */}
            <Card className="bg-black/40 border border-white/20">
                <CardBody className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                            <Gift className="text-white/80" size={14} />
                            <span>Level Rewards</span>
                        </h4>

                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-white/80 hover:text-white"
                            onPress={() => setIsModalOpen(true)}
                        >
                            View All
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {/* Unclaimed Rewards Count */}
                        {unclaimedRewards.length > 0 && (
                            <div className="flex items-center space-x-2 p-2 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                                <Sparkles className="text-yellow-400" size={16} />
                                <span className="text-yellow-300 text-sm font-bold">
                                    {unclaimedRewards.length} reward{unclaimedRewards.length > 1 ? 's' : ''} ready to claim!
                                </span>
                            </div>
                        )}

                        {/* Next Reward Preview */}
                        {(() => {
                            const nextRewardLevel = Math.ceil((user.player_level + 1) / LEVEL_CONSTANTS.REWARD_INTERVAL) * LEVEL_CONSTANTS.REWARD_INTERVAL;
                            if (nextRewardLevel <= 100) {
                                const levelsToNext = nextRewardLevel - user.player_level;
                                const rewardNumber = nextRewardLevel / LEVEL_CONSTANTS.REWARD_INTERVAL;

                                return (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-white/60">Next reward:</span>
                                        <span className="text-white">
                                            Test Gift {rewardNumber} (Level {nextRewardLevel} - {levelsToNext} levels away)
                                        </span>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Progress */}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-white/60">Claimed rewards:</span>
                            <span className="text-white">
                                {claimedRewards.length} / {allRewards.length}
                            </span>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Rewards Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                size="lg"
                scrollBehavior="inside"
                backdrop="blur"
                hideCloseButton={true}
                classNames={{
                    backdrop: "bg-black/80",
                    base: "bg-black border border-white/20",
                    header: "border-b border-white/10",
                    body: "py-4"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                                <Trophy className="text-white" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Level Rewards</h2>
                                <p className="text-white/60 text-sm">Claim rewards as you level up</p>
                            </div>
                        </div>
                        <button
                            className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
                            onClick={() => setIsModalOpen(false)}
                        >
                            <X size={20} />
                        </button>
                    </ModalHeader>

                    <ModalBody className="px-4 pb-4">
                        <div className="space-y-3">
                            {allRewards.map((reward) => {
                                const isClaimed = isRewardClaimed(reward.id);
                                const isAvailable = isRewardAvailable(reward.level);
                                const canClaim = isAvailable && !isClaimed;

                                return (
                                    <Card
                                        key={reward.id}
                                        className={`transition-all duration-200 ${getRewardCardStyles(reward, isClaimed, isAvailable)}`}
                                    >
                                        <CardBody className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                                        {getRewardIcon(reward, isClaimed, isAvailable)}
                                                    </div>

                                                    <div>
                                                        <h3 className={`font-bold text-sm ${isAvailable ? 'text-white' : 'text-white/50'}`}>
                                                            {reward.name}
                                                        </h3>
                                                        <p className={`text-xs ${isAvailable ? 'text-white/70' : 'text-white/40'}`}>
                                                            {reward.description}
                                                        </p>
                                                        <div className={`text-xs mt-1 ${isAvailable ? 'text-white/60' : 'text-white/40'}`}>
                                                            Level {reward.level} requirement
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end space-y-2">
                                                    {isClaimed && (
                                                        <div className="flex items-center space-x-1 text-green-400 text-xs">
                                                            <Check size={12} />
                                                            <span>Claimed</span>
                                                        </div>
                                                    )}

                                                    {canClaim && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-400/30"
                                                            isLoading={claimingRewardId === reward.id}
                                                            onPress={() => handleClaimReward(reward.id)}
                                                        >
                                                            Claim
                                                        </Button>
                                                    )}

                                                    {!isAvailable && (
                                                        <div className="flex items-center space-x-1 text-white/40 text-xs">
                                                            <Lock size={12} />
                                                            <span>Locked</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardBody>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Summary Footer */}
                        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="text-center space-y-2">
                                <div className="text-sm text-white/80">
                                    Earn rewards every {LEVEL_CONSTANTS.REWARD_INTERVAL} levels by playing Survival, Physics, and Rotation modes
                                </div>
                                <div className="text-xs text-white/60">
                                    Current Level: {user.player_level} |
                                    Claimed: {claimedRewards.length}/{allRewards.length} |
                                    Available: {unclaimedRewards.length}
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
};

export default RewardsSystem;