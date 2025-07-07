// src/components/AboutModal/AboutModal.tsx - Исправленная оптимизированная версия
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { useT } from "@/contexts/LocalizationContext";

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SectionProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

interface GameModeCardProps {
    name: string;
    description: string;
    difficulty: string;
    duration: string;
    features: string[];
    colorClass: string;
}

interface SystemCardProps {
    name: string;
    description: string;
    details: string;
    colorClass: string;
}

// Мемоизированный компонент секции
const Section: React.FC<SectionProps> = React.memo(({ title, isOpen, onToggle, children }) => (
    <div className="border-b border-white/10 last:border-b-0">
        <button
            onClick={onToggle}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors duration-200"
        >
            <span className="font-semibold text-white">{title}</span>
            {isOpen ? (
                <ChevronDown className="w-5 h-5 text-white/60" />
            ) : (
                <ChevronRight className="w-5 h-5 text-white/60" />
            )}
        </button>
        {isOpen && (
            <div className="px-4 pb-4 animate-fade-in-fast">
                {children}
            </div>
        )}
    </div>
));

Section.displayName = "Section";

// Компонент для игрового режима
const GameModeCard: React.FC<GameModeCardProps> = React.memo(({
    name,
    description,
    difficulty,
    duration,
    features,
    colorClass
}) => (
    <div className={`p-3 rounded-lg border ${colorClass} mb-3`}>
        <h4 className="font-semibold text-white mb-2">{name}</h4>
        <p className="text-sm text-white/70 mb-3">{description}</p>

        <div className="flex gap-2 mb-3">
            <span className="px-2 py-1 text-xs bg-white/10 text-white/80 rounded">
                {difficulty}
            </span>
            <span className="px-2 py-1 text-xs bg-white/10 text-white/80 rounded">
                {duration}
            </span>
        </div>

        <div className="space-y-1">
            {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-white/60">
                    <div className="w-1 h-1 rounded-full bg-white/40 flex-shrink-0" />
                    {feature}
                </div>
            ))}
        </div>
    </div>
));

GameModeCard.displayName = "GameModeCard";

// Компонент для системной функции
const SystemCard: React.FC<SystemCardProps> = React.memo(({
    name,
    description,
    details,
    colorClass
}) => (
    <div className={`p-3 rounded-lg border ${colorClass} mb-2`}>
        <h4 className="font-medium text-white text-sm mb-1">{name}</h4>
        <p className="text-xs text-white/60 mb-2">{description}</p>
        <p className="text-xs text-white/50">{details}</p>
    </div>
));

SystemCard.displayName = "SystemCard";

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    const t = useT();
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

    // Закрытие модального окна при нажатии Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    // Обработчик переключения секций
    const toggleSection = useCallback((sectionId: string) => {
        setOpenSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    }, []);

    // Данные для игровых режимов
    const gameModes = [
        {
            name: t("about.gameModes.reaction.name"),
            description: t("about.gameModes.reaction.description"),
            difficulty: t("about.gameModes.reaction.difficulty"),
            duration: t("about.gameModes.reaction.duration"),
            features: [
                t("about.gameModes.reaction.features.first"),
                t("about.gameModes.reaction.features.second"),
                t("about.gameModes.reaction.features.third"),
                t("about.gameModes.reaction.features.fourth"),
            ],
            colorClass: "bg-blue-500/5 border-blue-400/20",
        },
        {
            name: t("about.gameModes.survival.name"),
            description: t("about.gameModes.survival.description"),
            difficulty: t("about.gameModes.survival.difficulty"),
            duration: t("about.gameModes.survival.duration"),
            features: [
                t("about.gameModes.survival.features.first"),
                t("about.gameModes.survival.features.second"),
                t("about.gameModes.survival.features.third"),
                t("about.gameModes.survival.features.fourth"),
            ],
            colorClass: "bg-red-500/5 border-red-400/20",
        },
        {
            name: t("about.gameModes.physics.name"),
            description: t("about.gameModes.physics.description"),
            difficulty: t("about.gameModes.physics.difficulty"),
            duration: t("about.gameModes.physics.duration"),
            features: [
                t("about.gameModes.physics.features.first"),
                t("about.gameModes.physics.features.second"),
                t("about.gameModes.physics.features.third"),
                t("about.gameModes.physics.features.fourth"),
            ],
            colorClass: "bg-purple-500/5 border-purple-400/20",
        },
    ];

    // Данные для системных функций
    const systemFeatures = [
        {
            name: t("about.systems.attempts.name"),
            description: t("about.systems.attempts.description"),
            details: t("about.systems.attempts.details"),
            colorClass: "bg-orange-500/5 border-orange-400/20",
        },
        {
            name: t("about.systems.referral.name"),
            description: t("about.systems.referral.description"),
            details: t("about.systems.referral.details"),
            colorClass: "bg-green-500/5 border-green-400/20",
        },
        {
            name: t("about.systems.tournaments.name"),
            description: t("about.systems.tournaments.description"),
            details: t("about.systems.tournaments.details"),
            colorClass: "bg-yellow-500/5 border-yellow-400/20",
        },
        {
            name: t("about.systems.tasks.name"),
            description: t("about.systems.tasks.description"),
            details: t("about.systems.tasks.details"),
            colorClass: "bg-cyan-500/5 border-cyan-400/20",
        },
        {
            name: t("about.systems.shop.name"),
            description: t("about.systems.shop.description"),
            details: t("about.systems.shop.details"),
            colorClass: "bg-pink-500/5 border-pink-400/20",
        },
        {
            name: t("about.systems.leaderboard.name"),
            description: t("about.systems.leaderboard.description"),
            details: t("about.systems.leaderboard.details"),
            colorClass: "bg-indigo-500/5 border-indigo-400/20",
        },
    ];

    // Советы
    const tips = [
        {
            title: t("about.tips.first.title"),
            description: t("about.tips.first.description"),
        },
        {
            title: t("about.tips.second.title"),
            description: t("about.tips.second.description"),
        },
        {
            title: t("about.tips.third.title"),
            description: t("about.tips.third.description"),
        },
        {
            title: t("about.tips.fourth.title"),
            description: t("about.tips.fourth.description"),
        },
        {
            title: t("about.tips.fifth.title"),
            description: t("about.tips.fifth.description"),
        },
        {
            title: t("about.tips.sixth.title"),
            description: t("about.tips.sixth.description"),
        },
    ];

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal Content */}
            <div
                className="relative w-full max-w-2xl mx-4 max-h-[90vh] bg-black/95 border border-white/10 rounded-xl overflow-hidden animate-slide-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-white">{t("about.title")}</h2>
                        <p className="text-sm text-white/60">{t("about.subtitle")}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-200"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-80px)]" style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
                }}>
                    {/* Game Modes Section */}
                    <Section
                        title={`${t("about.sections.gameModes.title")} (3)`}
                        isOpen={openSections.gameModes || false}
                        onToggle={() => toggleSection("gameModes")}
                    >
                        <p className="text-white/70 text-sm mb-4">
                            {t("about.sections.gameModes.description")}
                        </p>
                        {gameModes.map((mode, index) => (
                            <GameModeCard key={index} {...mode} />
                        ))}
                    </Section>

                    {/* Systems Section */}
                    <Section
                        title={`${t("about.sections.systems.title")} (6)`}
                        isOpen={openSections.systems || false}
                        onToggle={() => toggleSection("systems")}
                    >
                        <p className="text-white/70 text-sm mb-4">
                            {t("about.sections.systems.description")}
                        </p>
                        {systemFeatures.map((feature, index) => (
                            <SystemCard key={index} {...feature} />
                        ))}
                    </Section>

                    {/* Monetization Section */}
                    <Section
                        title={t("about.sections.monetization.title")}
                        isOpen={openSections.monetization || false}
                        onToggle={() => toggleSection("monetization")}
                    >
                        <p className="text-white/70 text-sm mb-4">
                            {t("about.sections.monetization.description")}
                        </p>

                        <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-green-500/5 border border-green-400/20">
                                <h4 className="font-medium text-white text-sm mb-2">
                                    {t("about.monetization.telegramStars.title")}
                                </h4>
                                <p className="text-xs text-white/60 mb-2">
                                    {t("about.monetization.telegramStars.description")}
                                </p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-white/50">
                                        <div className="w-1 h-1 rounded-full bg-green-400/60" />
                                        {t("about.monetization.telegramStars.features.first")}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/50">
                                        <div className="w-1 h-1 rounded-full bg-green-400/60" />
                                        {t("about.monetization.telegramStars.features.second")}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/50">
                                        <div className="w-1 h-1 rounded-full bg-green-400/60" />
                                        {t("about.monetization.telegramStars.features.third")}
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-400/20">
                                <h4 className="font-medium text-white text-sm mb-2">
                                    {t("about.monetization.freeToPlay.title")}
                                </h4>
                                <p className="text-xs text-white/60">
                                    {t("about.monetization.freeToPlay.description")}
                                </p>
                            </div>
                        </div>
                    </Section>

                    {/* Tips Section */}
                    <Section
                        title={`${t("about.sections.tips.title")} (6)`}
                        isOpen={openSections.tips || false}
                        onToggle={() => toggleSection("tips")}
                    >
                        <p className="text-white/70 text-sm mb-4">
                            {t("about.sections.tips.description")}
                        </p>
                        {tips.map((tip, index) => (
                            <div key={index} className="p-3 rounded-lg bg-orange-500/5 border border-orange-400/10 mb-2">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-orange-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-bold text-orange-400">
                                            {index + 1}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-white text-sm mb-1">
                                            {tip.title}
                                        </h4>
                                        <p className="text-xs text-white/60">
                                            {tip.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </Section>

                    {/* Meta Information */}
                    <div className="p-4 text-center space-y-2 border-t border-white/10">
                        <p className="text-xs text-white/40">
                            {t("about.meta.version")}
                        </p>
                        <p className="text-xs text-white/30">
                            {t("about.meta.disclaimer")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutModal;