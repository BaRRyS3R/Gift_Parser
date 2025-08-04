// src/components/TON/TONPurchaseButton.tsx - Улучшенная версия с синими оттенками

"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@nextui-org/react";
import { Wallet, ExternalLink, AlertCircle } from "lucide-react";

import { getTelegramInitData } from "@/lib/telegram-auth";
import { useT } from "@/contexts/LocalizationContext";

interface TONPurchaseButtonProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost";
  isDisabled?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export function TONPurchaseButton({
  className = "",
  size = "md",
  variant = "solid",
  isDisabled = false,
  fullWidth = false,
  children,
}: TONPurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  const getTONShopURL = useCallback((): string => {
    const initData = getTelegramInitData();
    const baseURL = typeof window !== "undefined" ? window.location.origin : "";

    return `${baseURL}/ton-shop?initdata=${encodeURIComponent(initData)}`;
  }, []);

  const handleTONShopOpen = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const initData = getTelegramInitData();

      if (!initData) {
        throw new Error(t("shop.tonShop.errors.authDataUnavailable"));
      }

      const tonShopURL = getTONShopURL();

      const newWindow = window.open(
        tonShopURL,
        "ton-shop",
        "width=800,height=900,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no",
      );

      if (!newWindow) {
        window.location.href = tonShopURL;
      } else {
        newWindow.focus();
      }

      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error("[TON_BUTTON] Error opening TON Shop:", error);

      const errorMessage = error instanceof Error
        ? error.message
        : t("shop.tonShop.errors.openingFailed");

      setError(errorMessage);
      setIsLoading(false);

      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  }, [getTONShopURL, t]);

  const getButtonContent = () => {
    if (children) {
      return children;
    }

    if (error) {
      return (
        <div className="flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{t("common.error")}</span>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>{t("shop.tonShop.actions.opening")}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <Wallet size={16} />
        <span>{t("shop.tonShop.actions.buyWithTON")}</span>
        <ExternalLink className="opacity-70" size={14} />
      </div>
    );
  };

  const getButtonStyles = () => {
    if (error) {
      return "bg-red-600/80 text-white border-red-500/50 hover:bg-red-600";
    }

    // Минималистичные синие оттенки без сложных эффектов
    return `
      bg-blue-600 text-white border-blue-500
      hover:bg-blue-700 hover:border-blue-600
      active:bg-blue-800
      disabled:bg-blue-600/50 disabled:border-blue-500/50 disabled:opacity-60
      transition-colors duration-200
    `;
  };

  return (
    <Button
      className={`
        ${getButtonStyles()}
        ${className}
      `}
      fullWidth={fullWidth}
      isDisabled={isDisabled || isLoading}
      isLoading={isLoading}
      size={size}
      title={error || t("shop.tonShop.button.tooltip")}
      variant={variant}
      onPress={handleTONShopOpen}
    >
      {getButtonContent()}
    </Button>
  );
}

export default TONPurchaseButton;