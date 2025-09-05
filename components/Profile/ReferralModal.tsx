// src/components/Profile/ReferralModal.tsx - Enhanced with fullscreen mode and Telegram back button

"use client";

import type { ReferralInfo } from "@/hooks/modules/useProfile";

import React, { useState, useEffect } from "react";
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
  MessageCircle,
  Camera,
  Star,
} from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralInfo: ReferralInfo;
}

// Enhanced sharing methods for Telegram Mini Apps
const TelegramSharing = {
  // Method 1: Simple share with web preview (recommended for most cases)
  shareWithPreview: (referralLink: string, message: string) => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`;

    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, "_blank");
    }
  },

  // Method 2: Share with embedded image using zero-width characters
  shareWithEmbeddedImage: (
    referralLink: string,
    message: string,
    imageUrl: string,
  ) => {
    // Using zero-width characters to embed image in message
    const embeddedMessage = `${message}\n\n[​​​​​​​​​​​](${imageUrl})\n\n${referralLink}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(embeddedMessage)}`;

    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, "_blank");
    }
  },

  // Method 3: Native share using new Telegram Mini Apps API (if available)
  shareMessage: async (
    referralLink: string,
    message: string,
    imageUrl: string,
  ) => {
    if (
      typeof window !== "undefined" &&
      window.Telegram?.WebApp?.shareMessage
    ) {
      try {
        // The shareMessage method expects a prepared message ID
        // For now, we'll use the simple share method as the prepared message API
        // requires backend integration with Telegram Bot API
        console.log(
          "Native shareMessage available but requires message preparation",
        );
        TelegramSharing.shareWithPreview(referralLink, message);
      } catch (error) {
        console.warn(
          "Native shareMessage failed, falling back to simple share:",
          error,
        );
        TelegramSharing.shareWithPreview(referralLink, message);
      }
    } else {
      // Fallback to simple share
      TelegramSharing.shareWithPreview(referralLink, message);
    }
  },

  // Method 4: Share to Stories (if supported)
  shareToStory: (referralLink: string, message: string, imageUrl: string) => {
    if (
      typeof window !== "undefined" &&
      window.Telegram?.WebApp?.shareToStory
    ) {
      try {
        // shareToStory method signature: shareToStory(media_url, params?)
        window.Telegram.WebApp.shareToStory(imageUrl, {
          text: message,
          widget_link: {
            url: referralLink,
            name: "Join Circusle",
          },
        });
      } catch (error) {
        console.warn(
          "Story sharing failed, falling back to regular share:",
          error,
        );
        TelegramSharing.shareWithPreview(referralLink, message);
      }
    } else {
      console.log("shareToStory not available, using regular share");
      TelegramSharing.shareWithPreview(referralLink, message);
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
  const [sharingMethod, setSharingMethod] = useState<"simple" | "story">(
    "simple",
  );

  // Enhanced sharing configuration
  const SHARING_CONFIG = {
    message: "Psh, maybe.. Play? 🎮",
    imageUrl: "https://notfren.com/circusle/circusle.png",
    fallbackMessage:
      "Join me in Circusle - an awesome game where every tap counts! 🎯",
  };

  // Telegram WebApp back button management
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      
      if (isOpen) {
        // Show back button when modal opens
        webApp.BackButton.show();
        
        // Handle back button click
        const handleBackClick = () => {
          onClose();
        };
        
        webApp.BackButton.onClick(handleBackClick);
        
        // Cleanup function
        return () => {
          webApp.BackButton.offClick(handleBackClick);
          webApp.BackButton.hide();
        };
      } else {
        // Hide back button when modal closes
        webApp.BackButton.hide();
      }
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

  // Enhanced sharing with multiple methods
  const handleShareReferralLink = () => {
    const { message, imageUrl } = SHARING_CONFIG;

    switch (sharingMethod) {
      case "story":
        TelegramSharing.shareToStory(
          referralInfo.referralLink,
          message,
          imageUrl,
        );
        break;
      default:
        TelegramSharing.shareWithPreview(referralInfo.referralLink, message);
    }
  };

  return (
    <Modal
      backdrop="blur"
      classNames={{
        backdrop: "bg-black/90 backdrop-blur-md",
        base: "bg-gradient-to-b from-gray-900 via-black to-gray-900 border-0 m-0 rounded-none h-full max-h-full",
        header: "border-b border-white/10 bg-black/50 px-6 py-4",
        body: "px-6 bg-transparent overflow-y-auto max-h-[calc(100vh-80px)]",
        closeButton: "hidden",
      }}
      closeButton={false}
      hideCloseButton={true}
      isDismissable={false}
      isKeyboardDismissDisabled={true}
      isOpen={isOpen}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut",
            },
          },
          exit: {
            y: 20,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn",
            },
          },
        },
      }}
      scrollBehavior="inside"
      size="full"
      onClose={onClose}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {/* Header with glowing effect */}
              <div className="flex items-center justify-center space-x-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg blur-lg opacity-50" />
                  <div className="relative bg-black/70 p-2 rounded-lg border border-white/20">
                    <Share2 className="text-white" size={20} />
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-white font-bold tracking-wider bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    {t("profile.referrals.title")}
                  </span>
                  <p className="text-sm text-white/60 font-normal">🤞❤️</p>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="pb-4 space-y-4">
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Card className="bg-white/5 border border-white/20">
                  <CardBody className="text-center p-4">
                    <div className="text-2xl font-bold text-white mb-1">
                      {referralInfo.count}
                    </div>
                    <div className="text-sm text-white/60 uppercase tracking-wider">
                      {t("profile.referrals.friendsInvited")}
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-white/5 border border-white/20">
                  <CardBody className="text-center p-4">
                    <div className="text-2xl font-bold text-white mb-1">
                      +{referralInfo.bonus}
                    </div>
                    <div className="text-sm text-white/60 uppercase tracking-wider">
                      {t("profile.referrals.attemptsBonus")}
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Sharing Method Selector */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white">
                  {t("profile.referrals.share")}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className={`p-4 rounded-lg border text-sm transition-all ${
                      sharingMethod === "simple"
                        ? "bg-white/20 border-white/40 text-white"
                        : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
                    }`}
                    onClick={() => setSharingMethod("simple")}
                  >
                    <MessageCircle className="mx-auto mb-2" size={32} />
                    <div className="text-xs">Message</div>
                  </button>
                  <button
                    className={`p-4 rounded-lg border text-sm transition-all ${
                      sharingMethod === "story"
                        ? "bg-white/20 border-white/40 text-white"
                        : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
                    }`}
                    onClick={() => setSharingMethod("story")}
                  >
                    <Camera className="mx-auto mb-2" size={32} />
                    <div className="text-xs">Story</div>
                  </button>
                </div>
              </div>

              {/* Referral Code Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white">
                  {t("profile.referrals.yourReferralCode")}
                </h3>
                <Card className="bg-black/40 border border-white/30">
                  <CardBody className="p-4">
                    <div className="text-center font-mono text-2xl font-bold text-white tracking-wider">
                      {referralInfo.code}
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Referral Link Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white">
                  {t("profile.referrals.referralLink")}
                </h3>
                <Card className="bg-black/40 border border-white/30">
                  <CardBody className="p-4">
                    <div className="text-sm font-mono text-white/80 break-all leading-relaxed">
                      {referralInfo.referralLink}
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="space-y-3">
                {/* Main sharing buttons */}
                <div className="flex space-x-3">
                  <Button
                    className="flex-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/40 text-white hover:from-blue-500/30 hover:to-purple-500/30 h-12"
                    size="lg"
                    startContent={<Share2 className="text-white" size={18} />}
                    variant="bordered"
                    onPress={handleShareReferralLink}
                  >
                    {t("profile.referrals.share")}
                  </Button>

                  <Button
                    className="flex-1 bg-white/10 border border-white/30 text-white hover:bg-white/20 h-12"
                    size="lg"
                    startContent={
                      copySuccess ? (
                        <Check className="text-green-400" size={18} />
                      ) : (
                        <Copy className="text-white" size={18} />
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

              {/* How it Works Section */}
              <Card className="bg-white/5 border border-white/20">
                <CardBody className="p-4 space-y-3">
                  <h4 className="text-lg font-bold text-white">
                    {t("profile.referrals.howItWorks")}
                  </h4>
                  <div className="space-y-2 text-sm text-white/70">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                      <span>{t("profile.referrals.shareWithFriends")}</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                      <span>{t("profile.referrals.theyGetExtra")}</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                      <span>{t("profile.referrals.youGetRecognition")}</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
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
                      <Star className="text-white" size={18} />
                      <h4 className="text-lg font-bold text-white">
                        {t("profile.referrals.referredBy")}
                      </h4>
                    </div>
                    <div className="text-white font-mono font-bold text-lg">
                      {referralInfo.referredByName || referralInfo.referredBy}
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Bottom spacing for safe scrolling */}
              <div className="h-8" />
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ReferralModal;