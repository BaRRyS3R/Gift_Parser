// src/components/AboutModal/AboutModal.tsx
"use client";

import React, { useState } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
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

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
    const t = useT();

    const gameModes = [
        {
            icon: Target,
            key: "reaction",
            color: "bg-blue-500/5 border-blue-400/20",
            iconColor: "text-blue-400",
        },
        {
            icon: Crosshair,
            key: "survival",
            color: "bg-red-500/5 border-red-400/20",
            iconColor: "text-red-400",
        },
        {
            icon: Atom,
            key: "physics",
            color: "bg-purple-500/5 border-purple-400/20",
            iconColor: "text-purple-400",
        },
    ];

    const systemFeatures = [
        {
            icon: Clock,
            key: "attempts",
            color: "bg-orange-500/5 border-orange-400/20",
            iconColor: "text-orange-400",
        },
        {
            icon: Gift,
            key: "referral",
            color: "bg-green-500/5 border-green-400/20",
            iconColor: "text-green-400",
        },
        {
            icon: Trophy,
            key: "tournaments",
            color: "bg-yellow-500/5 border-yellow-400/20",
            iconColor: "text-yellow-400",
        },
        {
            icon: Users,
            key: "tasks",
            color: "bg-cyan-500/5 border-cyan-400/20",
            iconColor: "text-cyan-400",
        },
        {
            icon: ShoppingCart,
            key: "shop",
            color: "bg-pink-500/5 border-pink-400/20",
            iconColor: "text-pink-400",
        },
        {
            icon: Medal,
            key: "leaderboard",
            color: "bg-indigo-500/5 border-indigo-400/20",
            iconColor: "text-indigo-400",
        },
    ];

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
                    <Accordion variant="splitted" className="px-0">
                        {/* Игровые режимы */}
                        <AccordionItem
                            key="game-modes"
                            aria-label={t("about.sections.gameModes.title")}
                            title={
                                <div className="flex items-center gap-3">
                                    <Gamepad2 className="w-5 h-5 text-blue-400" />
                                    <span className="font-semibold">
                                        {t("about.sections.gameModes.title")}
                                    </span>
                                    <Chip size="sm" color="primary" variant="flat">
                                        3
                                    </Chip>
                                </div>
                            }
                            classNames={{
                                base: "!bg-white/5 border border-white/10",
                                title: "text-white",
                                content: "text-white/80",
                            }}
                        >
                            <div className="space-y-4">
                                <p className="text-white/70 text-sm mb-4">
                                    {t("about.sections.gameModes.description")}
                                </p>

                                {gameModes.map((mode) => {
                                    const Icon = mode.icon;
                                    return (
                                        <div
                                            key={mode.key}
                                            className={`p-4 rounded-lg border ${mode.color}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                    <Icon className={`w-4 h-4 ${mode.iconColor}`} />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-white mb-2">
                                                        {t(`about.gameModes.${mode.key}.name`)}
                                                    </h4>
                                                    <p className="text-sm text-white/70 mb-3">
                                                        {t(`about.gameModes.${mode.key}.description`)}
                                                    </p>

                                                    <div className="flex gap-2 mb-3">
                                                        <Chip size="sm" variant="flat" color="default">
                                                            {t(`about.gameModes.${mode.key}.difficulty`)}
                                                        </Chip>
                                                        <Chip size="sm" variant="flat" color="secondary">
                                                            {t(`about.gameModes.${mode.key}.duration`)}
                                                        </Chip>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <h5 className="text-xs font-medium text-white/60 uppercase tracking-wide">
                                                            {t("about.gameModes.features")}
                                                        </h5>
                                                        <ul className="text-xs text-white/60 space-y-1">
                                                            {Array.from({ length: 4 }, (_, i) => (
                                                                <li key={i} className="flex items-center gap-2">
                                                                    <div className="w-1 h-1 rounded-full bg-white/40" />
                                                                    {t(`about.gameModes.${mode.key}.features.${i}`)}
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
                        </AccordionItem>

                        {/* Системы и механики */}
                        <AccordionItem
                            key="systems"
                            aria-label={t("about.sections.systems.title")}
                            title={
                                <div className="flex items-center gap-3">
                                    <Zap className="w-5 h-5 text-purple-400" />
                                    <span className="font-semibold">
                                        {t("about.sections.systems.title")}
                                    </span>
                                    <Chip size="sm" color="secondary" variant="flat">
                                        6
                                    </Chip>
                                </div>
                            }
                            classNames={{
                                base: "!bg-white/5 border border-white/10",
                                title: "text-white",
                                content: "text-white/80",
                            }}
                        >
                            <div className="space-y-4">
                                <p className="text-white/70 text-sm mb-4">
                                    {t("about.sections.systems.description")}
                                </p>

                                <div className="grid gap-3">
                                    {systemFeatures.map((feature) => {
                                        const Icon = feature.icon;
                                        return (
                                            <div
                                                key={feature.key}
                                                className={`p-3 rounded-lg border ${feature.color}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                                        <Icon className={`w-3.5 h-3.5 ${feature.iconColor}`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-white text-sm mb-1">
                                                            {t(`about.systems.${feature.key}.name`)}
                                                        </h4>
                                                        <p className="text-xs text-white/60 mb-2">
                                                            {t(`about.systems.${feature.key}.description`)}
                                                        </p>
                                                        <div className="text-xs text-white/50">
                                                            {t(`about.systems.${feature.key}.details`)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </AccordionItem>

                        {/* Монетизация */}
                        <AccordionItem
                            key="monetization"
                            aria-label={t("about.sections.monetization.title")}
                            title={
                                <div className="flex items-center gap-3">
                                    <DollarSign className="w-5 h-5 text-green-400" />
                                    <span className="font-semibold">
                                        {t("about.sections.monetization.title")}
                                    </span>
                                    <Chip size="sm" color="success" variant="flat">
                                        ⭐
                                    </Chip>
                                </div>
                            }
                            classNames={{
                                base: "!bg-white/5 border border-white/10",
                                title: "text-white",
                                content: "text-white/80",
                            }}
                        >
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
                                            {Array.from({ length: 3 }, (_, i) => (
                                                <li key={i} className="flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-green-400/60" />
                                                    {t(`about.monetization.telegramStars.features.${i}`)}
                                                </li>
                                            ))}
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
                        </AccordionItem>

                        {/* Советы и стратегии */}
                        <AccordionItem
                            key="tips"
                            aria-label={t("about.sections.tips.title")}
                            title={
                                <div className="flex items-center gap-3">
                                    <Target className="w-5 h-5 text-orange-400" />
                                    <span className="font-semibold">
                                        {t("about.sections.tips.title")}
                                    </span>
                                    <Chip size="sm" color="warning" variant="flat">
                                        Pro
                                    </Chip>
                                </div>
                            }
                            classNames={{
                                base: "!bg-white/5 border border-white/10",
                                title: "text-white",
                                content: "text-white/80",
                            }}
                        >
                            <div className="space-y-3">
                                <p className="text-white/70 text-sm mb-4">
                                    {t("about.sections.tips.description")}
                                </p>

                                {Array.from({ length: 6 }, (_, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-orange-500/5 border border-orange-400/10">
                                        <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-orange-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-xs font-bold text-orange-400">
                                                    {i + 1}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-white text-sm mb-1">
                                                    {t(`about.tips.${i}.title`)}
                                                </h4>
                                                <p className="text-xs text-white/60">
                                                    {t(`about.tips.${i}.description`)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </AccordionItem>
                    </Accordion>

                    <Divider className="my-4 bg-white/10" />

                    {/* Мета информация */}
                    <div className="text-center space-y-2">
                        <p className="text-xs text-white/40">
                            {t("about.meta.version")}
                        </p>
                        <p className="text-xs text-white/30">
                            {t("about.meta.disclaimer")}
                        </p>
                    </div>
                </ModalBody>

                <ModalFooter>
                    <Button
                        color="primary"
                        variant="flat"
                        onPress={onClose}
                        className="w-full"
                    >
                        {t("about.close")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}