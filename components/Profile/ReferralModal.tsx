// src/components/Profile/ReferralModal.tsx - Enhanced with advanced Telegram sharing methods

"use client";

import type { ReferralInfo } from "@/hooks/modules/useProfile";

import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Card,
  CardBody,
} from "@nextui-org/react";
import { Share2, Copy, Users, Gift, Check, Star, X, Image, MessageCircle } from "lucide-react";

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
      window.open(shareUrl, '_blank');
    }
  },

  // Method 2: Share with embedded image using zero-width characters
  shareWithEmbeddedImage: (referralLink: string, message: string, imageUrl: string) => {
    // Using zero-width characters to embed image in message
    const embeddedMessage = `${message}\n\n[​​​​​​​​​​​](${imageUrl})\n\n${referralLink}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(embeddedMessage)}`;

    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  },

  // Method 3: Native share using new Telegram Mini Apps API (if available)
  shareMessage: async (referralLink: string, message: string, imageUrl: string) => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.shareMessage) {
      try {
        // The shareMessage method expects a prepared message ID
        // For now, we'll use the simple share method as the prepared message API
        // requires backend integration with Telegram Bot API
        console.log('Native shareMessage available but requires message preparation');
        TelegramSharing.shareWithPreview(referralLink, message);
      } catch (error) {
        console.warn('Native shareMessage failed, falling back to simple share:', error);
        TelegramSharing.shareWithPreview(referralLink, message);
      }
    } else {
      // Fallback to simple share
      TelegramSharing.shareWithPreview(referralLink, message);
    }
  },

  // Method 4: Share to Stories (if supported)
  shareToStory: (referralLink: string, message: string, imageUrl: string) => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.shareToStory) {
      try {
        // shareToStory method signature: shareToStory(media_url, params?)
        window.Telegram.WebApp.shareToStory(imageUrl, {
          text: message,
          widget_link: {
            url: referralLink,
            name: "Join Circusle"
          }
        });
      } catch (error) {
        console.warn('Story sharing failed, falling back to regular share:', error);
        TelegramSharing.shareWithPreview(referralLink, message);
      }
    } else {
      console.log('shareToStory not available, using regular share');
      TelegramSharing.shareWithPreview(referralLink, message);
    }
  }
};

const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  referralInfo,
}) => {
  const t = useT();
  const [copySuccess, setCopySuccess] = useState(false);
  const [sharingMethod, setSharingMethod] = useState<'simple' | 'embedded' | 'story'>('simple');

  // Enhanced sharing configuration
  const SHARING_CONFIG = {
    message: "Psh, maybe.. Play? 🎮",
    imageUrl: "https://notfren.com/circusle/circusle.png",
    fallbackMessage: "Join me in Circusle - an awesome game where every tap counts! 🎯"
  };

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
      case 'embedded':
        TelegramSharing.shareWithEmbeddedImage(referralInfo.referralLink, message, imageUrl);
        break;
      case 'story':
        TelegramSharing.shareToStory(referralInfo.referralLink, message, imageUrl);
        break;
      default:
        TelegramSharing.shareWithPreview(referralInfo.referralLink, message);
    }
  };

  // Advanced native sharing (using new Telegram APIs)
  const handleAdvancedShare = () => {
    const { message, imageUrl } = SHARING_CONFIG;
    TelegramSharing.shareMessage(referralInfo.referralLink, message, imageUrl);
  };

  // Quick share with just the link and short message
  const handleQuickShare = () => {
    const quickMessage = "🎮 Psh, maybe.. Play?";
    TelegramSharing.shareWithPreview(referralInfo.referralLink, quickMessage);
  };

  return (
    <Modal
      backdrop="blur"
      classNames={{
        backdrop: "bg-black/80",
        base: "bg-black border border-white/20",
        header: "border-b border-white/10",
        body: "py-4",
      }}
      hideCloseButton={true}
      isOpen={isOpen}
      size="lg"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between p-4">
          <div className="flex-1 flex flex-col items-center space-y-2">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
              <Share2 className="text-white" size={24} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">
                {t("profile.referrals.title")}
              </h2>
              <p className="text-white/60 text-sm">🤞❤️ Enhanced Sharing</p>
            </div>
          </div>
          <button
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all duration-300"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </ModalHeader>

        <ModalBody className="px-4 pb-4 space-y-4">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-white/5 border border-white/20">
              <CardBody className="text-center p-3">
                <Users className="text-white mx-auto mb-1" size={20} />
                <div className="text-xl font-bold text-white">
                  {referralInfo.count}
                </div>
                <div className="text-xs text-white/60 uppercase tracking-wider">
                  {t("profile.referrals.friendsInvited")}
                </div>
              </CardBody>
            </Card>

            <Card className="bg-white/5 border border-white/20">
              <CardBody className="text-center p-3">
                <Gift className="text-white mx-auto mb-1" size={20} />
                <div className="text-xl font-bold text-white">
                  +{referralInfo.bonus}
                </div>
                <div className="text-xs text-white/60 uppercase tracking-wider">
                  {t("profile.referrals.attemptsBonus")}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Sharing Method Selector */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white">Choose Sharing Style</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                className={`p-2 rounded-lg border text-xs transition-all ${sharingMethod === 'simple'
                    ? 'bg-white/20 border-white/40 text-white'
                    : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                  }`}
                onClick={() => setSharingMethod('simple')}
              >
                <MessageCircle size={16} className="mx-auto mb-1" />
                Simple
              </button>
              <button
                className={`p-2 rounded-lg border text-xs transition-all ${sharingMethod === 'embedded'
                    ? 'bg-white/20 border-white/40 text-white'
                    : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                  }`}
                onClick={() => setSharingMethod('embedded')}
              >
                <Image size={16} className="mx-auto mb-1" />
                With Image
              </button>
              <button
                className={`p-2 rounded-lg border text-xs transition-all ${sharingMethod === 'story'
                    ? 'bg-white/20 border-white/40 text-white'
                    : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                  }`}
                onClick={() => setSharingMethod('story')}
              >
                <Star size={16} className="mx-auto mb-1" />
                Story
              </button>
            </div>
          </div>

          {/* Referral Code Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white">
              {t("profile.referrals.yourReferralCode")}
            </h3>
            <Card className="bg-black/40 border border-white/30">
              <CardBody className="p-3">
                <div className="text-center font-mono text-xl font-bold text-white tracking-wider">
                  {referralInfo.code}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Referral Link Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white">
              {t("profile.referrals.referralLink")}
            </h3>
            <Card className="bg-black/40 border border-white/30">
              <CardBody className="p-2">
                <div className="text-xs font-mono text-white/80 break-all">
                  {referralInfo.referralLink}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="space-y-2">
            {/* Main sharing buttons */}
            <div className="flex space-x-2">
              <Button
                className="flex-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/40 text-white hover:from-blue-500/30 hover:to-purple-500/30 text-sm"
                size="sm"
                startContent={<Share2 className="text-white" size={14} />}
                variant="bordered"
                onPress={handleShareReferralLink}
              >
                Share {sharingMethod === 'story' ? 'to Story' : sharingMethod === 'embedded' ? 'with Image' : 'Link'}
              </Button>

              <Button
                className="flex-1 bg-white/10 border border-white/30 text-white hover:bg-white/20 text-sm"
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

            {/* Quick action buttons */}
            <div className="flex space-x-2">
              <Button
                className="flex-1 bg-green-500/20 border border-green-400/40 text-green-300 hover:bg-green-500/30 text-xs"
                size="sm"
                onPress={handleQuickShare}
              >
                Quick Share
              </Button>

              <Button
                className="flex-1 bg-orange-500/20 border border-orange-400/40 text-orange-300 hover:bg-orange-500/30 text-xs"
                size="sm"
                onPress={handleAdvancedShare}
              >
                Advanced Share
              </Button>
            </div>
          </div>

          {/* Preview Message */}
          <Card className="bg-white/5 border border-white/20">
            <CardBody className="p-3">
              <h4 className="text-sm font-bold text-white mb-2">Preview Message:</h4>
              <div className="text-xs text-white/70 font-mono">
                "{SHARING_CONFIG.message}"
                {sharingMethod === 'embedded' && (
                  <div className="mt-1 text-blue-300">+ Image: circusle.png</div>
                )}
                {sharingMethod === 'story' && (
                  <div className="mt-1 text-purple-300">+ Story format with image</div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* How it Works Section */}
          <Card className="bg-white/5 border border-white/20">
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
                  <span>
                    {t("profile.referrals.theyGetExtra", {
                      bonus: referralInfo.bonus,
                    })}
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 rounded-full bg-white/40 mt-1.5 flex-shrink-0" />
                  <span>{t("profile.referrals.youGetRecognition")}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <span>Enhanced sharing with images and Stories support</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Referred By Section */}
          {referralInfo.referredBy && (
            <Card className="bg-white/5 border border-white/20">
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
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ReferralModal;