// src/components/AboutModal/AboutModal.tsx - Simplified lightweight version
"use client";

import React from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
} from "@nextui-org/react";

import { useT } from "@/contexts/LocalizationContext";

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
    const t = useT();

    if (!isOpen) {
        return null;
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            scrollBehavior="inside"
            classNames={{
                base: "bg-black/95 backdrop-blur-xl border border-white/10",
                header: "border-b border-white/10",
                body: "py-6",
            }}
        >
            <ModalContent>
                <ModalHeader>
                    <h2 className="text-xl font-bold text-white">
                        {t("about.title")}
                    </h2>
                </ModalHeader>

                <ModalBody className="text-white space-y-6">
                    {/* Game Overview */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">
                            {t("about.overview.title")}
                        </h3>
                        <p className="text-white/70 text-sm leading-relaxed">
                            {t("about.overview.description")}
                        </p>
                    </div>

                    {/* Game Modes */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">
                            {t("about.modes.title")}
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <h4 className="font-medium text-white text-sm mb-1">
                                    {t("about.modes.reaction.name")}
                                </h4>
                                <p className="text-white/60 text-xs">
                                    {t("about.modes.reaction.description")}
                                </p>
                            </div>
                            <div>
                                <h4 className="font-medium text-white text-sm mb-1">
                                    {t("about.modes.survival.name")}
                                </h4>
                                <p className="text-white/60 text-xs">
                                    {t("about.modes.survival.description")}
                                </p>
                            </div>
                            <div>
                                <h4 className="font-medium text-white text-sm mb-1">
                                    {t("about.modes.physics.name")}
                                </h4>
                                <p className="text-white/60 text-xs">
                                    {t("about.modes.physics.description")}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Monetization */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">
                            {t("about.monetization.title")}
                        </h3>
                        <p className="text-white/70 text-sm leading-relaxed mb-3">
                            {t("about.monetization.description")}
                        </p>
                        <p className="text-white/60 text-xs">
                            {t("about.monetization.details")}
                        </p>
                    </div>

                    {/* Tips */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">
                            {t("about.tips.title")}
                        </h3>
                        <div className="space-y-2">
                            <p className="text-white/60 text-xs">
                                • {t("about.tips.tip1")}
                            </p>
                            <p className="text-white/60 text-xs">
                                • {t("about.tips.tip2")}
                            </p>
                            <p className="text-white/60 text-xs">
                                • {t("about.tips.tip3")}
                            </p>
                            <p className="text-white/60 text-xs">
                                • {t("about.tips.tip4")}
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center pt-4 border-t border-white/10">
                        <p className="text-xs text-white/40">
                            {t("about.footer")}
                        </p>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}