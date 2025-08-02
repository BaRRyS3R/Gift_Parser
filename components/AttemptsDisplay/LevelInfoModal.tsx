// src/components/AttemptsDisplay/LevelInfoModal.tsx - Полностью исправленная версия с порталом

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";
import type { UserLevelInfo } from "@/hooks/modules/useAttempts";

interface LevelInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    userLevel: UserLevelInfo;
}

const LevelInfoModal: React.FC<LevelInfoModalProps> = ({
    isOpen,
    onClose,
    userLevel,
}) => {
    const t = useT();

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Level system constants
    const MAX_LEVEL = 10000;
    const ATTEMPTS_PER_LEVEL = 10;
    const progressPercent = (userLevel.gamesInCurrentLevel / 20) * 100;
    const isMaxLevel = userLevel.currentLevel >= MAX_LEVEL;

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            {/* Backdrop */}
            <div
                role="button"
                tabIndex={0}
                aria-label="Close modal"
                className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
                onClick={onClose}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClose();
                    }
                }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            {/* Modal Container */}
            <div className="relative z-10 w-full max-w-md mx-4">
                <div
                    className="bg-black/90 backdrop-blur-xl border-2 border-white/30 text-white w-full h-[70vh] relative overflow-hidden flex flex-col"
                    style={{
                        clipPath: "polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)",
                    }}
                >
                    {/* Semi-transparent background overlay */}
                    <div className="absolute inset-0 bg-black/20 pointer-events-none" />

                    {/* Header - Fixed */}
                    <div className="relative z-10 p-6 pb-4 border-b border-white/20 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                <h2 className="text-xl font-mono tracking-[0.15em] uppercase">
                                    {t("levels.modal.title")}
                                </h2>
                            </div>
                            <button
                                className="w-8 h-8 border border-white/40 bg-white/5 hover:bg-white/10 transition-all duration-300 flex items-center justify-center"
                                style={{
                                    clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
                                }}
                                onClick={onClose}
                            >
                                <X className="text-white" size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="relative z-10 flex-1 overflow-y-auto">
                        <div className="p-6 pt-4">
                            <div className="space-y-6">
                                {/* Current Level Display */}
                                <div className="text-center">
                                    <h3 className="text-3xl font-mono tracking-widest text-white mb-2">
                                        {t("levels.modal.currentLevel")} {userLevel.currentLevel}
                                    </h3>
                                    <div className="text-sm text-white/70">
                                        {t("levels.modal.totalGames", { games: userLevel.totalGames })}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                                {/* Level Progress */}
                                {!isMaxLevel && (
                                    <>
                                        <div>
                                            <div className="mb-3">
                                                <span className="font-mono text-sm tracking-wider text-white/90 uppercase">
                                                    {t("levels.modal.progress")}
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-white/70">{t("levels.modal.currentProgress")}</span>
                                                    <span className="text-white font-mono">
                                                        {userLevel.gamesInCurrentLevel} / 20
                                                    </span>
                                                </div>
                                                <div className="w-full bg-white/20 rounded-full h-2">
                                                    <div
                                                        className="bg-white h-2 rounded-full transition-all duration-500"
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-white/80 text-sm">
                                                        {t("levels.modal.gamesToNext", { games: userLevel.gamesToNextLevel })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                    </>
                                )}

                                {/* Max Level Reached */}
                                {isMaxLevel && (
                                    <>
                                        <div className="text-center py-4">
                                            <div className="text-yellow-400 text-lg font-mono mb-2">
                                                🏆 {t("levels.modal.maxLevelReached")} 🏆
                                            </div>
                                            <div className="text-white/70 text-sm">
                                                {t("levels.modal.maxLevelDescription")}
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                    </>
                                )}

                                {/* How Levels Work */}
                                <div>
                                    <div className="mb-4">
                                        <span className="font-mono text-sm tracking-wider text-white/90 uppercase">
                                            {t("levels.modal.howItWorks")}
                                        </span>
                                    </div>
                                    <div className="space-y-3 text-sm text-white/80">
                                        <div className="flex items-start space-x-3">
                                            <div className="w-1 h-1 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                            <span>{t("levels.modal.rule1", { games: 20 })}</span>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-1 h-1 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                            <span>{t("levels.modal.rule2", { attempts: ATTEMPTS_PER_LEVEL })}</span>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-1 h-1 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                            <span>{t("levels.modal.rule3")}</span>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-1 h-1 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                            <span>{t("levels.modal.rule4", { maxLevel: MAX_LEVEL })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                                {/* Game Mode Contributions */}
                                <div>
                                    <div className="mb-4">
                                        <span className="font-mono text-sm tracking-wider text-white/90 uppercase">
                                            {t("levels.modal.gameModes")}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm font-mono">
                                        <div className="flex justify-between items-center">
                                            <span className="text-white/70">{t("levels.modal.reactionMode")}</span>
                                            <span className="text-blue-400">✓ {t("levels.modal.counts")}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-white/70">{t("levels.modal.survivalMode")}</span>
                                            <span className="text-green-400">✓ {t("levels.modal.counts")}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-white/70">{t("levels.modal.physicsMode")}</span>
                                            <span className="text-purple-400">✓ {t("levels.modal.counts")}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-white/70">{t("levels.modal.rotationMode")}</span>
                                            <span className="text-orange-400">✓ {t("levels.modal.counts")}</span>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs text-white/60 italic">
                                        {t("levels.modal.allModesNote")}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                                {/* Important Information */}
                                <div className="space-y-3 text-xs font-mono tracking-wide">
                                    <div className="text-yellow-300/90">
                                        {t("levels.modal.automaticNote")}
                                    </div>
                                    <div className="text-white/70">
                                        {t("levels.modal.rewardNote")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render modal using portal to document.body
    return createPortal(modalContent, document.body);
};

export default LevelInfoModal;