// src/components/Profile/ReferralModal.tsx - Refactored to match screenshot design

"use client";

import type { ReferralInfo } from "@/hooks/modules/useProfile";

import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
} from "@nextui-org/react";
import {
  Share2,
  Copy,
  Check,
} from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralInfo: ReferralInfo;
}

// Simplified sharing for Telegram Mini Apps
const TelegramSharing = {
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
          <div className="text-center">
            <h2 className="text-xl font-medium text-white">
              {t("profile.referrals.title")}
            </h2>
          </div>
        </ModalHeader>

        <ModalBody className="px-6 pb-8 flex-1 flex flex-col justify-center max-w-md mx-auto">
          {/* Main Statistics - Centered */}
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-2 mb-8">
            <div className="text-4xl font-bold text-white mb-1">
              {referralInfo.count} {t("profile.referrals.friendsInvited").toLowerCase()}
            </div>

            <div className="text-4xl font-bold text-white mb-4">
              {referralInfo.count * referralInfo.bonus}⚡ {t("profile.referrals.attemptsBonus").toLowerCase()}
            </div>

            <div className="text-white/60 text-base">
              +{referralInfo.bonus}⚡ {t("profile.referrals.attemptsEachFriend").toLowerCase()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mt-auto">
            <Button
              className="w-full bg-white/20 text-white hover:bg-white/30 text-base py-6 rounded-xl font-medium"
              size="lg"
              startContent={
                copySuccess ? (
                  <Check className="text-white" size={18} />
                ) : (
                  <Copy className="text-white" size={18} />
                )
              }
              onPress={handleCopyReferralLink}
            >
              {copySuccess
                ? t("common.copied")
                : t("profile.referrals.copyLink")}
            </Button>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base py-6 rounded-xl font-medium"
              size="lg"
              startContent={<Share2 className="text-white" size={18} />}
              onPress={handleShareReferralLink}
            >
              {t("profile.referrals.share")}
            </Button>
          </div>

          {/* Bottom spacing for safe area */}
          <div className="h-4" />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ReferralModal;