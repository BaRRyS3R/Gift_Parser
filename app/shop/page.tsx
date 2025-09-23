// src/app/shop/page.tsx - Complete refactored version to match screenshot design

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button } from "@nextui-org/react";
import ConfettiExplosion from "react-confetti-explosion";
import {
  AlertCircle,
  Star,
  CheckCircle,
  Clock,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { usePurchase } from "@/hooks/modules/usePurchase";
import { PRODUCTS, ProductType } from "@/types/purchases";
import { useT } from "@/contexts/LocalizationContext";
import BinaryEasterEgg from "@/components/EasterEggs/BinaryEasterEgg";
import TONPurchaseButton from "@/components/TON/TONPurchaseButton";

interface SuccessNotification {
  show: boolean;
  title: string;
  message: string;
  icon: React.ReactNode;
}

interface EasterEggState {
  clickCount: number;
  lastClickTime: number;
  isActive: boolean;
}

export default function ShopPage() {
  const router = useRouter();
  const { user, refreshUser, makeAuthenticatedRequest } = useUser();
  const t = useT();

  const purchaseModule = usePurchase(makeAuthenticatedRequest);

  const [isExploding, setIsExploding] = useState(false);
  const [successNotification, setSuccessNotification] =
    useState<SuccessNotification>({
      show: false,
      title: "",
      message: "",
      icon: null,
    });

  const [easterEggState, setEasterEggState] = useState<EasterEggState>({
    clickCount: 0,
    lastClickTime: 0,
    isActive: false,
  });

  const easterEggTimeoutRef = useRef<NodeJS.Timeout>();

  // Clear errors after 4 seconds
  useEffect(() => {
    if (purchaseModule.error) {
      const timer = setTimeout(() => {
        purchaseModule.clearError();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [purchaseModule.error, purchaseModule.clearError]);

  // Cleanup easter egg timeout on unmount
  useEffect(() => {
    return () => {
      if (easterEggTimeoutRef.current) {
        clearTimeout(easterEggTimeoutRef.current);
      }
    };
  }, []);

  // Handle title click for Binary Easter Egg (5 clicks)
  const handleTitleClick = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentTime = Date.now();
    const timeDifference = currentTime - easterEggState.lastClickTime;

    if (timeDifference > 5000) {
      setEasterEggState({
        clickCount: 1,
        lastClickTime: currentTime,
        isActive: false,
      });
      return;
    }

    const newClickCount = easterEggState.clickCount + 1;

    if (newClickCount >= 5) {
      setEasterEggState({
        clickCount: 0,
        lastClickTime: 0,
        isActive: true,
      });

      if (typeof window !== "undefined" && window.navigator?.vibrate) {
        window.navigator.vibrate([100, 50, 100]);
      }
    } else {
      setEasterEggState({
        clickCount: newClickCount,
        lastClickTime: currentTime,
        isActive: false,
      });
    }
  };

  const handleEasterEggComplete = () => {
    setEasterEggState({
      clickCount: 0,
      lastClickTime: 0,
      isActive: false,
    });
  };

  const showSuccessNotification = (product: ProductType) => {
    const productInfo = PRODUCTS[product];
    const isInstantReset = productInfo.is_instant_reset;

    const icon = isInstantReset ? (
      <Clock className="text-green-400" size={32} />
    ) : (
      <CheckCircle className="text-green-400" size={32} />
    );

    const title = isInstantReset
      ? t("shop.notifications.instantResetSuccess")
      : t("shop.notifications.purchaseSuccess");

    const attemptsText = productInfo.attempts_bonus || 0;
    const plural = attemptsText > 1 ? "s" : "";

    const message = isInstantReset
      ? t("shop.notifications.instantResetMessage")
      : t("shop.notifications.purchaseSuccessMessage", {
        attempts: attemptsText,
        plural: plural,
      });

    setSuccessNotification({
      show: true,
      title,
      message,
      icon,
    });

    setIsExploding(true);
    setTimeout(() => {
      setIsExploding(false);
    }, 2000);

    setTimeout(() => {
      setSuccessNotification((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  const handlePurchase = async (productType: ProductType) => {
    if (purchaseModule.isLoading || purchaseModule.isProcessing) return;

    try {
      const success = await purchaseModule.processPurchase(productType);

      if (success) {
        await refreshUser();
        showSuccessNotification(productType);
      }
    } catch (error) {
      console.error("Error in purchase process:", error);
    }
  };

  const getButtonText = (productType: ProductType) => {
    const isLoadingThisProduct = purchaseModule.isLoadingProduct(productType);

    if (isLoadingThisProduct) {
      if (purchaseModule.isLoading) {
        return t("shop.creatingInvoice");
      } else if (purchaseModule.isProcessing) {
        return t("shop.processingPayment");
      }
    }

    return t("shop.buy");
  };

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
      {isExploding && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <ConfettiExplosion
            colors={["#FFD700", "#FF69B4", "#00BFFF", "#7B68EE", "#FF4500"]}
            duration={2000}
            force={0.8}
            particleCount={100}
            width={400}
          />
        </div>
      )}

      {/* Header with clickable title for Binary Easter Egg */}
      <div className="text-center mb-8 pt-6">
        {/* Page title - same size as modals */}
        <h1 className="text-xl font-medium text-white mb-4">
          {t("shop.title")}
        </h1>
        
        {/* Buy for stars - large heading */}
        <h2 
          className="text-3xl font-bold text-white select-none cursor-default"
          style={{
            WebkitTapHighlightColor: "transparent",
            WebkitTouchCallout: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
            touchAction: "manipulation",
          }}
          onTouchEnd={handleTitleClick}
        >
          {t("shop.buyForStars")}
        </h2>
      </div>

      {/* Binary Easter Egg */}
      <div className="max-w-2xl mx-auto">
        <BinaryEasterEgg
          isVisible={easterEggState.isActive}
          makeAuthenticatedRequest={makeAuthenticatedRequest}
          onClose={handleEasterEggComplete}
        />
      </div>

      {/* Error message */}
      {purchaseModule.error && (
        <div className="max-w-2xl mx-auto mb-6">
          <Card className="bg-white/10 border border-white/20">
            <CardBody className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="text-white" size={20} />
                <span className="text-white">{purchaseModule.error}</span>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* TON Shop Button */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex justify-center">
          <TONPurchaseButton
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            size="md"
          >
            {t("shop.goToTONShop")}
          </TONPurchaseButton>
        </div>
      </div>

      {/* Products List */}
      <div className="max-w-2xl mx-auto space-y-3">
        {Object.entries(PRODUCTS).map(([key, product]) => {
          const productType = key as ProductType;
          const isLoadingThisProduct = purchaseModule.isLoadingProduct(productType);

          return (
            <ProductRow
              key={productType}
              attempts={product.attempts_bonus || 0}
              loading={isLoadingThisProduct}
              price={product.price}
              productType={productType}
              t={t}
              onPurchase={handlePurchase}
            />
          );
        })}
      </div>

      {/* Success Notification */}
      {successNotification.show && (
        <div
          className={`
            fixed top-4 left-4 right-4 z-40
            transform transition-all duration-500 ease-out
            ${successNotification.show ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}
          `}
        >
          <Card className="bg-gradient-to-r from-white/15 to-white/10 border border-white/30 backdrop-blur-md shadow-2xl">
            <CardBody className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  {successNotification.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-green-400 text-lg">
                    {successNotification.title}
                  </h4>
                  <p className="text-green-300 text-sm mt-1">
                    {successNotification.message}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Bottom spacing for safe area */}
      <div className="h-24" />
    </div>
  );
}

interface ProductRowProps {
  productType: ProductType;
  attempts: number;
  price: number;
  loading: boolean;
  t: any;
  onPurchase: (productType: ProductType) => void;
}

function ProductRow({
  productType,
  attempts,
  price,
  loading,
  t,
  onPurchase,
}: ProductRowProps) {
  return (
    <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between hover:bg-white/10 transition-colors">
      {/* Left side - attempts with lightning icon next to number */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <span className="text-white font-medium">+{attempts}⚡</span>
        </div>
      </div>

      {/* Right side - price button */}
      <Button
        className="bg-white/20 text-white hover:bg-white/30 min-w-[80px] rounded-lg"
        isDisabled={loading}
        isLoading={loading}
        size="sm"
        startContent={!loading ? <Star size={16} /> : undefined}
        onPress={() => onPurchase(productType)}
      >
        {loading ? "" : price}
      </Button>
    </div>
  );
}