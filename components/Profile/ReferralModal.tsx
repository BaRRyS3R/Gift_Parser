// src/components/Profile/ReferralModal.tsx - Referral information modal

"use client";

import React, { useState } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Card,
    CardBody
} from "@nextui-org/react";
import {
    Share2,
    Copy,
    Users,
    Gift,
    Check,
    ExternalLink,
    Star
} from "lucide-react";
import type { ReferralInfo } from "@/lib/supabase";
import { useT } from "@/contexts/LocalizationContext";

interface ReferralModalProps {
    isOpen: boolean;
    onClose: () => void;
    referralInfo: ReferralInfo;
}

const ReferralModal: React.FC<ReferralModalProps> = ({
    isOpen,
    onClose,
    referralInfo
}) => {
    const t = useT();
    const [copySuccess, setCopySuccess] = useState(false);

    const handleCopyReferralLink = async () => {
        try {
            await navigator.clipboard.writeText(referralInfo.referralLink);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error("Failed to copy: ", err);
        }
    };

    const handleShareReferralLink = () => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            const shareText = `🎮 Join me on this awesome game: ${referralInfo.referralLink}`;

            if (window.Telegram.WebApp.openTelegramLink) {
                window.Telegram.WebApp.openTelegramLink(
                    `https://t.me/share/url?url=${encodeURIComponent(referralInfo.referralLink)}&text=${encodeURIComponent(shareText)}`
                );
            } else {
                handleCopyReferralLink();
            }
        } else {
            handleCopyReferralLink();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            backdrop="blur"
            classNames={{
                backdrop: "bg-black/80",
                base: "bg-black border border-white/20",
                header: "border-b border-white/10",
                body: "py-6",
                footer: "border-t border-white/10"
            }}
        >
            <ModalContent>
                <ModalHeader className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                        <Share2 className="text-white" size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {t("profile.referrals.title")}
                        </h2>
                        <p className="text-white/60 text-sm">
                            👉👌
                        </p>
                    </div>
                </ModalHeader>

                <ModalBody className="space-y-6">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-white/5 border border-white/20">
                            <CardBody className="text-center p-4">
                                <Users className="text-white mx-auto mb-2" size={24} />
                                <div className="text-2xl font-bold text-white">
                                    {referralInfo.referralCount}
                                </div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">
                                    {t("profile.referrals.friendsInvited")}
                                </div>
                            </CardBody>
                        </Card>

                        <Card className="bg-white/5 border border-white/20">
                            <CardBody className="text-center p-4">
                                <Gift className="text-white mx-auto mb-2" size={24} />
                                <div className="text-2xl font-bold text-white">
                                    +{referralInfo.referralBonus}
                                </div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">
                                    {t("profile.referrals.attemptsBonus")}
                                </div>
                            </CardBody>
                        </Card>
                    </div>

                    {/* Referral Code Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-white">
                            {t("profile.referrals.yourReferralCode")}
                        </h3>
                        <Card className="bg-black/40 border border-white/30">
                            <CardBody className="p-4">
                                <div className="text-center font-mono text-2xl font-bold text-white tracking-wider">
                                    {referralInfo.referralCode}
                                </div>
                            </CardBody>
                        </Card>
                    </div>

                    {/* Referral Link Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-white">
                            {t("profile.referrals.referralLink")}
                        </h3>
                        <Card className="bg-black/40 border border-white/30">
                            <CardBody className="p-3">
                                <div className="text-xs font-mono text-white/80 break-all">
                                    {referralInfo.referralLink}
                                </div>
                            </CardBody>
                        </Card>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <Button
                            className="flex-1 bg-white/10 border border-white/30 text-white hover:bg-white/20"
                            variant="bordered"
                            startContent={
                                copySuccess ? (
                                    <Check className="text-white" size={16} />
                                ) : (
                                    <Copy className="text-white" size={16} />
                                )
                            }
                            onPress={handleCopyReferralLink}
                        >
                            {copySuccess ? t("common.copied") : t("profile.referrals.copyLink")}
                        </Button>

                        <Button
                            className="flex-1 bg-white/10 border border-white/30 text-white hover:bg-white/20"
                            variant="bordered"
                            startContent={<Share2 className="text-white" size={16} />}
                            onPress={handleShareReferralLink}
                        >
                            {t("profile.referrals.share")}
                        </Button>
                    </div>

                    {/* How it Works Section */}
                    <Card className="bg-white/5 border border-white/20">
                        <CardBody className="p-4 space-y-3">
                            <h4 className="text-sm font-bold text-white">
                                {t("profile.referrals.howItWorks")}
                            </h4>
                            <div className="space-y-2 text-xs text-white/70">
                                <div className="flex items-start space-x-2">
                                    <div className="w-1 h-1 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                    <span>{t("profile.referrals.shareWithFriends")}</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <div className="w-1 h-1 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                    <span>
                                        {t("profile.referrals.theyGetExtra", {
                                            bonus: referralInfo.referralBonus,
                                            plural: referralInfo.referralBonus > 1 ? "s" : "",
                                        })}
                                    </span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <div className="w-1 h-1 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                    <span>{t("profile.referrals.youGetRecognition")}</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <div className="w-1 h-1 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                    <span>{t("profile.referrals.helpGrow")}</span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Referred By Section */}
                    {referralInfo.referredBy && (
                        <Card className="bg-white/5 border border-white/20">
                            <CardBody className="p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                    <Star className="text-white" size={16} />
                                    <h4 className="text-sm font-bold text-white">
                                        {t("profile.referrals.referredBy")}
                                    </h4>
                                </div>
                                <div className="text-white font-mono font-bold">
                                    {referralInfo.referredByName || referralInfo.referredBy}
                                </div>
                            </CardBody>
                        </Card>
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

export default ReferralModal;