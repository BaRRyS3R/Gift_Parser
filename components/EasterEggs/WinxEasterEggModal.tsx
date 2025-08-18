// src/components/EasterEggs/WinxEasterEggModal.tsx - Updated with reward system
"use client";

import React, { useState, useEffect } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Image,
} from "@nextui-org/react";
import { Sparkles, Star, Gift, Trophy } from "lucide-react";
import { useT } from "@/contexts/LocalizationContext";

interface WinxEasterEggModalProps {
    isOpen: boolean;
    onClose: () => void;
    chance: number; // Chance in percentage
    makeAuthenticatedRequest?: (
        url: string,
        options?: RequestInit,
    ) => Promise<Response>;
}

export default function WinxEasterEggModal({
    isOpen,
    onClose,
    chance,
    makeAuthenticatedRequest,
}: WinxEasterEggModalProps) {
    const t = useT();
    const [rewardInfo, setRewardInfo] = useState<{
        attemptsAwarded: number;
        alreadyUnlocked: boolean;
    } | null>(null);
    const [isAwarding, setIsAwarding] = useState(false);

    // Award Easter Egg achievement
    const awardEasterEggAchievement = async () => {
        if (!makeAuthenticatedRequest) {
            console.warn("No authenticated request function provided to WinxEasterEggModal");
            return null;
        }

        setIsAwarding(true);

        try {
            const response = await makeAuthenticatedRequest("/api/easter-egg/reward", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ easterEggType: "winx" }),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                setRewardInfo({
                    attemptsAwarded: data.achievement?.attemptsAwarded || 0,
                    alreadyUnlocked: data.alreadyUnlocked || false,
                });

                return data;
            } else {
                console.error("Failed to award Winx Easter Egg achievement:", data.error);
                return null;
            }
        } catch (error) {
            console.error("Error awarding Winx Easter Egg achievement:", error);
            return null;
        } finally {
            setIsAwarding(false);
        }
    };

    // Award achievement when modal opens
    useEffect(() => {
        if (isOpen && makeAuthenticatedRequest && !rewardInfo && !isAwarding) {
            awardEasterEggAchievement();
        }
    }, [isOpen, makeAuthenticatedRequest]);

    const handleClose = () => {
        setRewardInfo(null);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            size="lg"
            backdrop="blur"
            placement="center"
            classNames={{
                base: "bg-gradient-to-br from-pink-900/95 to-purple-900/95 backdrop-blur-xl border-2 border-pink-400/30",
                header: "border-b border-pink-400/20",
                body: "py-6",
                footer: "border-t border-pink-400/20",
            }}
            motionProps={{
                variants: {
                    enter: {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        transition: {
                            duration: 0.3,
                            ease: "easeOut",
                        },
                    },
                    exit: {
                        y: -20,
                        opacity: 0,
                        scale: 0.95,
                        transition: {
                            duration: 0.2,
                            ease: "easeIn",
                        },
                    },
                },
            }}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-2 text-center">
                    <div className="flex items-center justify-center space-x-2">
                        <Sparkles className="text-pink-400 animate-pulse" size={24} />
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                            {t("game.easterEgg.title" as any)}
                        </h2>
                        <Sparkles className="text-purple-400 animate-pulse" size={24} />
                    </div>
                    <p className="text-pink-300/80 text-sm uppercase tracking-widest">
                        {t("game.easterEgg.subtitle" as any)}
                    </p>
                </ModalHeader>

                <ModalBody className="text-center space-y-6">
                    {/* Congratulations text */}
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-pink-300">
                            {t("game.easterEgg.congratulations" as any)}
                        </h3>
                        <p className="text-lg text-purple-300 font-semibold">
                            {t("game.easterEgg.message" as any)}
                        </p>
                    </div>

                    {/* Winx Image */}
                    <div className="flex justify-center items-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse" />
                            <Image
                                src="https://notfren.com/circusle/winx.png"
                                alt="Winx Fairy"
                                className="relative z-10 rounded-xl border-2 border-pink-400/30 shadow-2xl"
                                width={200}
                                height={200}
                                fallbackSrc="/winx-placeholder.png"
                            />
                        </div>
                    </div>

                    {/* Chance information */}
                    <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-pink-400/20">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                            <Star className="text-yellow-400" size={16} />
                            <span className="text-pink-300 text-sm font-mono tracking-wider">
                                {t("game.easterEgg.chanceText" as any)}
                            </span>
                            <Star className="text-yellow-400" size={16} />
                        </div>
                        <div className="text-center">
                            <span className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                                {chance}%
                            </span>
                        </div>
                    </div>

                    {/* Reward notification */}
                    {rewardInfo && (
                        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 rounded-lg p-4">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                                {rewardInfo.alreadyUnlocked ? (
                                    <Trophy className="text-yellow-400" size={20} />
                                ) : (
                                    <Gift className="text-yellow-400" size={20} />
                                )}
                                <span className="text-yellow-400 font-bold text-sm">
                                    {rewardInfo.alreadyUnlocked ? "Achievement Already Unlocked" : "Achievement Unlocked!"}
                                </span>
                            </div>

                            {!rewardInfo.alreadyUnlocked && (
                                <div className="space-y-1">
                                    <div className="text-yellow-300 text-sm font-bold">
                                        🧚‍♀️ FAIRY GODPARENT
                                    </div>
                                    <div className="text-yellow-300/80 text-sm">
                                        +{rewardInfo.attemptsAwarded} attempts awarded!
                                    </div>
                                    <div className="text-yellow-300/60 text-xs italic">
                                        &quot;Became a Winx fairy! Your transformation was... magical? Or just lucky.&quot;
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading state for reward */}
                    {isAwarding && !rewardInfo && (
                        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-pink-400/20">
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-4 h-4 border-2 border-pink-400/30 border-t-pink-400 rounded-full animate-spin" />
                                <span className="text-pink-300 text-sm">
                                    Awarding achievement...
                                </span>
                            </div>
                        </div>
                    )}
                </ModalBody>

                <ModalFooter className="justify-center">
                    <Button
                        onClick={handleClose}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold px-8 py-2 rounded-full hover:from-pink-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105"
                        startContent={<Sparkles size={16} />}
                    >
                        {t("game.easterEgg.closeButton" as any)}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}