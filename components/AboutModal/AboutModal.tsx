// src/components/AboutModal/AboutModal.tsx - Optimized version with memoization and conditional rendering
"use client";

import React, { useState, useMemo, memo } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    Accordion,
    AccordionItem,
    Chip,
    Divider,
} from "@nextui-org/react";
import {
    Info,
    Target,
    Crosshair,
    Atom,
    Trophy,
    ShoppingCart,
    Users,
    Gift,
    Clock,
    Star,
    Gamepad2,
    Heart,
    Zap,
    Medal,
    DollarSign,
} from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Мемоизированные компоненты для секций
const MemoizedGameModesContent = memo(({ t }: { t: any }) => {
    const gameModes = useMemo(() => [
        {
            icon: Target,
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
            color: "bg-blue-500/5 border-blue-400/20",
            iconColor: "text-blue-400",
        },
        {
            icon: Crosshair,
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
            color: "bg-red-500/5 border-red-400/20",
            iconColor: "text-red-400",
        },
        {
            icon: Atom,
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
            color: "bg-purple-500/5 border-purple-400/20",
            iconColor: "text-purple-400",
        },
    ], [t]);

    return (
        <div className="space-y-4">
            <p className="text-white/70 text-sm mb-4">
                {t("about.sections.gameModes.description")}
            </p>

            {gameModes.map((mode, index) => {
                const Icon = mode.icon;
                return (
                    <div
                        key={index}
                        className={`p-4 rounded-lg border ${mode.color}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                <Icon className={`w-4 h-4 ${mode.iconColor}`} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-white mb-2">
                                    {mode.name}
                                </h4>
                                <p className="text-sm text-white/70 mb-3">
                                    {mode.description}
                                </p>

                                <div className="flex gap-2 mb-3">
                                    <Chip size="sm" variant="flat" color="default">
                                        {mode.difficulty}
                                    </Chip>
                                    <Chip size="sm" variant="flat" color="secondary">
                                        {mode.duration}
                                    </Chip>
                                </div>

                                <div className="space-y-2">
                                    <h5 className="text-xs font-medium text-white/60 uppercase tracking-wide">
                                        {t("about.gameModes.features")}
                                    </h5>
                                    <ul className="text-xs text-white/60 space-y-1">
                                        {mode.features.map((feature, featureIndex) => (
                                            <li key={featureIndex} className="flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-white/40" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

MemoizedGameModesContent.displayName = 'MemoizedGameModesContent';

const MemoizedSystemsContent = memo(({ t }: { t: any }) => {
    const systemFeatures = useMemo(() => [
        {
            icon: Clock,
            name: t("about.systems.attempts.name"),
            description: t("about.systems.attempts.description"),
            details: t("about.systems.attempts.details"),
            color: "bg-orange-500/5 border-orange-400/20",
            iconColor: "text-orange-400",
        },
        {
            icon: Gift,
            name: t("about.systems.referral.name"),
            description: t("about.systems.referral.description"),
            details: t("about.systems.referral.details"),
            color: "bg-green-500/5 border-green-400/20",
            iconColor: "text-green-400",
        },
        {
            icon: Trophy,
            name: t("about.systems.tournaments.name"),
            description: t("about.systems.tournaments.description"),
            details: t("about.systems.tournaments.details"),
            color: "bg-yellow-500/5 border-yellow-400/20",
            iconColor: "text-yellow-400",
        },
        {
            icon: Users,
            name: t("about.systems.tasks.name"),
            description: t("about.systems.tasks.description"),
            details: t("about.systems.tasks.details"),
            color: "bg-cyan-500/5 border-cyan-400/20",
            iconColor: "text-cyan-400",
        },
        {
            icon: ShoppingCart,
            name: t("about.systems.shop.name"),
            description: t("about.systems.shop.description"),
            details: t("about.systems.shop.details"),
            color: "bg-pink-500/5 border-pink-400/20",
            iconColor: "text-pink-400",
        },
        {
            icon: Medal,
            name: t("about.systems.leaderboard.name"),
            description: t("about.systems.leaderboard.description"),
            details: t("about.systems.leaderboard.details"),
            color: "bg-indigo-500/5 border-indigo-400/20",
            iconColor: "text-indigo-400",
        },
    ], [t]);

    return (
        <div className="space-y-4">
            <p className="text-white/70 text-sm mb-4">
                {t("about.sections.systems.description")}
            </p>

            <div className="grid gap-3">
                {systemFeatures.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                        <div
                            key={index}
                            className={`p-3 rounded-lg border ${feature.color}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                    <Icon className={`w-3.5 h-3.5 ${feature.iconColor}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-white text-sm mb-1">
                                        {feature.name}
                                    </h4>
                                    <p className="text-xs text-white/60 mb-2">
                                        {feature.description}
                                    </p>
                                    <div className="text-xs text-white/50">
                                        {feature.details}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

MemoizedSystemsContent.displayName = 'MemoizedSystemsContent';

const MemoizedMonetizationContent = memo(({ t }: { t: any }) => (
    <div className="space-y-4">
        <p className="text-white/70 text-sm mb-4">
            {t("about.sections.monetization.description")}
        </p>

        <div className="space-y-3">
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-400/20">
                <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="font-medium text-white text-sm">
                        {t("about.monetization.telegramStars.title")}
                    </span>
                </div>
                <p className="text-xs text-white/60 mb-2">
                    {t("about.monetization.telegramStars.description")}
                </p>
                <ul className="text-xs text-white/50 space-y-1">
                    <li className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-green-400/60" />
                        {t("about.monetization.telegramStars.features.first")}
                    </li>
                    <li className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-green-400/60" />
                        {t("about.monetization.telegramStars.features.second")}
                    </li>
                    <li className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-green-400/60" />
                        {t("about.monetization.telegramStars.features.third")}
                    </li>
                </ul>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-400/20">
                <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span className="font-medium text-white text-sm">
                        {t("about.monetization.freeToPlay.title")}
                    </span>
                </div>
                <p className="text-xs text-white/60">
                    {t("about.monetization.freeToPlay.description")}
                </p>
            </div>
        </div>
    </div>
));

MemoizedMonetizationContent.displayName = 'MemoizedMonetizationContent';

const MemoizedTipsContent = memo(({ t }: { t: any }) => {
    const tips = useMemo(() => [
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
    ], [t]);

    return (
        <div className="space-y-3">
            <p className="text-white/70 text-sm mb-4">
                {t("about.sections.tips.description")}
            </p>

            {tips.map((tip, index) => (
                <div key={index} className="p-3 rounded-lg bg-orange-500/5 border border-orange-400/10">
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
        </div>
    );
});

MemoizedTipsContent.displayName = 'MemoizedTipsContent';

// Основной компонент с оптимизацией через мемоизацию и условный рендеринг
export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
    const t = useT();

    // Отслеживаем какие секции открыты для условного рендеринга
    const [openSections, setOpenSections] = useState<Set<string>>(new Set());

    // Мемоизируем заголовки секций
    const sectionHeaders = useMemo(() => ({
        gameModes: {
            title: t("about.sections.gameModes.title"),
            icon: Gamepad2,
            color: "text-blue-400",
            count: "3"
        },
        systems: {
            title: t("about.sections.systems.title"),
            icon: Zap,
            color: "text-purple-400",
            count: "6"
        },
        monetization: {
            title: t("about.sections.monetization.title"),
            icon: DollarSign,
            color: "text-green-400",
            count: "⭐"
        },
        tips: {
            title: t("about.sections.tips.title"),
            icon: Target,
            color: "text-orange-400",
            count: "Pro"
        }
    }), [t]);

    // Обработчик изменения открытых секций
    const handleSelectionChange = (keys: "all" | Set<React.Key>) => {
        if (keys === "all") {
            // Если выбраны все секции, добавляем все возможные ключи
            setOpenSections(new Set(["game-modes", "systems", "monetization", "tips"]));
        } else {
            // Преобразуем React.Key в string для совместимости
            const keySet = new Set(Array.from(keys).map(key => String(key)));
            setOpenSections(keySet);
        }
    };

    // Условный рендер содержимого секции - рендерим только открытые секции
    const renderSectionContent = (sectionKey: string) => {
        if (!openSections.has(sectionKey)) {
            return null; // Не рендерим содержимое если секция закрыта
        }

        switch (sectionKey) {
            case "game-modes":
                return <MemoizedGameModesContent t={t} />;
            case "systems":
                return <MemoizedSystemsContent t={t} />;
            case "monetization":
                return <MemoizedMonetizationContent t={t} />;
            case "tips":
                return <MemoizedTipsContent t={t} />;
            default:
                return null;
        }
    };

    // Если модальное окно закрыто, не рендерим ничего
    if (!isOpen) {
        return null;
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            scrollBehavior="inside"
            classNames={{
                base: "bg-black/95 backdrop-blur-xl border border-white/10",
                header: "border-b border-white/10",
                body: "py-6",
                footer: "border-t border-white/10",
            }}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                            <Info className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {t("about.title")}
                            </h2>
                            <p className="text-sm text-white/60">
                                {t("about.subtitle")}
                            </p>
                        </div>
                    </div>
                </ModalHeader>

                <ModalBody className="text-white">
                    <Accordion
                        variant="splitted"
                        className="px-0"
                        onSelectionChange={handleSelectionChange}
                    >
                        {/* Game Modes Section */}
                        <AccordionItem
                            key="game-modes"
                            aria-label={sectionHeaders.gameModes.title}
                            title={
                                <div className="flex items-center gap-3">
                                    <sectionHeaders.gameModes.icon className={`w-5 h-5 ${sectionHeaders.gameModes.color}`} />
                                    <span className="font-semibold">
                                        {sectionHeaders.gameModes.title}
                                    </span>
                                    <Chip size="sm" color="primary" variant="flat">
                                        {sectionHeaders.gameModes.count}
                                    </Chip>
                                </div>
                            }
                            classNames={{
                                base: "!bg-white/5 border border-white/10",
                                title: "text-white",
                                content: "text-white/80",
                            }}
                        >
                            {renderSectionContent("game-modes")}
                        </AccordionItem>

                        {/* Systems Section */}
                        <AccordionItem
                            key="systems"
                            aria-label={sectionHeaders.systems.title}
                            title={
                                <div className="flex items-center gap-3">
                                    <sectionHeaders.systems.icon className={`w-5 h-5 ${sectionHeaders.systems.color}`} />
                                    <span className="font-semibold">
                                        {sectionHeaders.systems.title}
                                    </span>
                                    <Chip size="sm" color="secondary" variant="flat">
                                        {sectionHeaders.systems.count}
                                    </Chip>
                                </div>
                            }
                            classNames={{
                                base: "!bg-white/5 border border-white/10",
                                title: "text-white",
                                content: "text-white/80",
                            }}
                        >
                            {renderSectionContent("systems")}
                        </AccordionItem>

                        {/* Monetization Section */}
                        <AccordionItem
                            key="monetization"
                            aria-label={sectionHeaders.monetization.title}
                            title={
                                <div className="flex items-center gap-3">
                                    <sectionHeaders.monetization.icon className={`w-5 h-5 ${sectionHeaders.monetization.color}`} />
                                    <span className="font-semibold">
                                        {sectionHeaders.monetization.title}
                                    </span>
                                    <Chip size="sm" color="success" variant="flat">
                                        {sectionHeaders.monetization.count}
                                    </Chip>
                                </div>
                            }
                            classNames={{
                                base: "!bg-white/5 border border-white/10",
                                title: "text-white",
                                content: "text-white/80",
                            }}
                        >
                            {renderSectionContent("monetization")}
                        </AccordionItem>

                        {/* Tips Section */}
                        <AccordionItem
                            key="tips"
                            aria-label={sectionHeaders.tips.title}
                            title={
                                <div className="flex items-center gap-3">
                                    <sectionHeaders.tips.icon className={`w-5 h-5 ${sectionHeaders.tips.color}`} />
                                    <span className="font-semibold">
                                        {sectionHeaders.tips.title}
                                    </span>
                                    <Chip size="sm" color="warning" variant="flat">
                                        {sectionHeaders.tips.count}
                                    </Chip>
                                </div>
                            }
                            classNames={{
                                base: "!bg-white/5 border border-white/10",
                                title: "text-white",
                                content: "text-white/80",
                            }}
                        >
                            {renderSectionContent("tips")}
                        </AccordionItem>
                    </Accordion>

                    <Divider className="my-4 bg-white/10" />

                    {/* Meta Information */}
                    <div className="text-center space-y-2">
                        <p className="text-xs text-white/40">
                            {t("about.meta.version")}
                        </p>
                        <p className="text-xs text-white/30">
                            {t("about.meta.disclaimer")}
                        </p>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}