// src/components/Profile/ReferralModal.tsx - Updated with random friend quotes

"use client";

import type { ReferralInfo } from "@/hooks/modules/useProfile";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Card,
  CardBody,
} from "@nextui-org/react";
import {
  Share2,
  Copy,
  Check,
  X,
  Star,
  Quote,
} from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";
import { friendquotes as ruQuotes } from "@/locales/ru/friendquotes";
import { friendquotes as enQuotes } from "@/locales/en/friendquotes";

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralInfo: ReferralInfo;
}

// Simplified sharing for Telegram Mini Apps
const TelegramSharing = {
  // Simple share with web preview (only method now)
  shareWithPreview: (referralLink: string, message: string) => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`;

    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, "_blank");
    }
  },
};

const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  referralInfo,
}) => {
  const t = useT();
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Track if BackButton handler is registered for this modal
  const backButtonHandlerRef = useRef<(() => void) | null>(null);

  // Get random quote - use same localization system as rest of component
  const randomQuote = useMemo(() => {
    try {
      // Try to detect language from localization context by testing a known translation
      const testTranslation = t("profile.referrals.title");
      const isRussian = testTranslation === "РЕКРУТИНГ"; // Russian translation
      
      const quotes = isRussian ? ruQuotes.quotes : enQuotes.quotes;
      const randomIndex = Math.floor(Math.random() * quotes.length);
      return quotes[randomIndex];
    } catch (error) {
      console.warn("Failed to load friend quotes:", error);
      return null;
    }
  }, [isOpen, t]); // Re-calculate when modal opens or language changes

  // Simplified sharing configuration (removed story sharing)
  const SHARING_CONFIG = {
    message: "Psh, maybe.. Play? 🎮",
    fallbackMessage: "Join me in Circusle - an awesome game where every tap counts! 🎯",
  };

  // Set up BackButton handler when modal is open
  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      
      // Create handler for this modal
      const handleBackButton = () => {
        onClose();
      };
      
      // Store handler reference
      backButtonHandlerRef.current = handleBackButton;
      
      // Register BackButton handler
      webApp.BackButton.onClick(handleBackButton);
      
      // Cleanup function
      return () => {
        if (backButtonHandlerRef.current) {
          webApp.BackButton.offClick(backButtonHandlerRef.current);
          backButtonHandlerRef.current = null;
        }
      };
    }
  }, [isOpen, onClose]);

  const handleCopyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralInfo.referralLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  // Simplified sharing (removed story option)
  const handleShareReferralLink = () => {
    const { message } = SHARING_CONFIG;
    TelegramSharing.shareWithPreview(referralInfo.referralLink, message);
  };

  return (
    <Modal
      backdrop="blur"
      classNames={{
        backdrop: "bg-black/80",
        base: "bg-black h-full w-full max-w-none max-h-none m-0",
        header: "",
        body: "py-4",
      }}
      hideCloseButton={true}
      isOpen={isOpen}
      size="full"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-center p-4 pt-16">
          <div className="flex-1 flex flex-col items-center space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">
                {t("profile.referrals.title")}
              </h2>
              <p className="text-white/60 text-sm mt-2">🤞❤️</p>
            </div>
          </div>
          <button
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all duration-300 shadow-md"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </ModalHeader>

        <ModalBody className="px-4 pb-6 space-y-4 max-w-md mx-auto">
          {/* Statistics Cards with shadows instead of borders */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-white/5 shadow-lg">
              <CardBody className="text-center p-3">
                <div className="text-xl font-bold text-white">
                  {referralInfo.count}
                </div>
                <div className="text-xs text-white/60 uppercase tracking-wider">
                  {t("profile.referrals.friendsInvited")}
                </div>
              </CardBody>
            </Card>

            <Card className="bg-white/5 shadow-lg">
              <CardBody className="text-center p-3">
                <div className="text-xl font-bold text-white">
                  +{referralInfo.bonus}
                </div>
                <div className="text-xs text-white/60 uppercase tracking-wider">
                  {t("profile.referrals.attemptsBonus")}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Referral Code Section with shadow */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white">
              {t("profile.referrals.yourReferralCode")}
            </h3>
            <Card className="bg-black/40 shadow-lg">
              <CardBody className="p-3">
                <div className="text-center font-mono text-xl font-bold text-white tracking-wider">
                  {referralInfo.code}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Referral Link Section with shadow */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white">
              {t("profile.referrals.referralLink")}
            </h3>
            <Card className="bg-black/40 shadow-lg">
              <CardBody className="p-2">
                <div className="text-xs font-mono text-white/80 break-all">
                  {referralInfo.referralLink}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Action Buttons (keeping borders for buttons as requested) */}
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Button
                className="flex-1 bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:border-white/30 text-sm shadow-md hover:shadow-lg transition-all duration-300"
                size="sm"
                startContent={<Share2 className="text-white" size={14} />}
                variant="bordered"
                onPress={handleShareReferralLink}
              >
                {t("profile.referrals.share")}
              </Button>

              <Button
                className="flex-1 bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:border-white/30 text-sm shadow-md hover:shadow-lg transition-all duration-300"
                size="sm"
                startContent={
                  copySuccess ? (
                    <Check className="text-green-400" size={14} />
                  ) : (
                    <Copy className="text-white" size={14} />
                  )
                }
                variant="bordered"
                onPress={handleCopyReferralLink}
              >
                {copySuccess
                  ? t("common.copied")
                  : t("profile.referrals.copyLink")}
              </Button>
            </div>
          </div>

          {/* How it Works Section with shadow */}
          <Card className="bg-white/5 shadow-lg">
            <CardBody className="p-3 space-y-2">
              <h4 className="text-sm font-bold text-white">
                {t("profile.referrals.howItWorks")}
              </h4>
              <div className="space-y-1 text-xs text-white/70">
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 rounded-full bg-white/40 mt-1.5 flex-shrink-0" />
                  <span>{t("profile.referrals.shareWithFriends")}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 rounded-full bg-white/40 mt-1.5 flex-shrink-0" />
                  <span>{t("profile.referrals.theyGetExtra")}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 rounded-full bg-white/40 mt-1.5 flex-shrink-0" />
                  <span>{t("profile.referrals.youGetRecognition")}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 rounded-full bg-white/60 mt-1.5 flex-shrink-0" />
                  <span>{t("profile.referrals.helpGrow")}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Referred By Section with shadow */}
          {referralInfo.referredBy && (
            <Card className="bg-white/5 shadow-lg">
              <CardBody className="p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Star className="text-white" size={14} />
                  <h4 className="text-sm font-bold text-white">
                    {t("profile.referrals.referredBy")}
                  </h4>
                </div>
                <div className="text-white font-mono font-bold text-sm">
                  {referralInfo.referredByName || referralInfo.referredBy}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Random Friend Quote Section */}
          {randomQuote && (
            <Card className="bg-gradient-to-r from-white/3 to-white/5 shadow-lg border border-white/5">
              <CardBody className="p-3">
                <div className="flex items-start space-x-2">
                  <Quote className="text-white/40 mt-0.5 flex-shrink-0" size={14} />
                  <div className="flex-1">
                    <p className="text-white/70 text-xs italic leading-relaxed font-light">
                      {randomQuote}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Bottom spacing for safe area */}
          <div className="h-4" />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ReferralModal;