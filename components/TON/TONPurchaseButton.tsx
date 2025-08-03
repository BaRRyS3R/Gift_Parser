// src/components/TON/TONPurchaseButton.tsx - Кнопка покупки через TON для основного приложения

"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@nextui-org/react";
import { Wallet, ExternalLink, AlertCircle } from "lucide-react";

import { getTelegramInitData } from "@/lib/telegram-auth";

interface TONPurchaseButtonProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?:
    | "solid"
    | "bordered"
    | "light"
    | "flat"
    | "faded"
    | "shadow"
    | "ghost";
  isDisabled?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

/**
 * Компонент кнопки для открытия TON Shop
 * Формирует URL с initData и открывает магазин в новом окне
 */
export function TONPurchaseButton({
  className = "",
  size = "md",
  variant = "bordered",
  isDisabled = false,
  fullWidth = false,
  children,
}: TONPurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Получение TON Shop URL с текущими initData пользователя
   */
  const getTONShopURL = useCallback((): string => {
    const initData = getTelegramInitData();
    const baseURL = typeof window !== "undefined" ? window.location.origin : "";

    return `${baseURL}/ton-shop?initdata=${encodeURIComponent(initData)}`;
  }, []);

  /**
   * Обработка нажатия на кнопку TON Shop
   */
  const handleTONShopOpen = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Получаем initData для формирования URL
      const initData = getTelegramInitData();

      if (!initData) {
        throw new Error("Unable to get Telegram authentication data");
      }

      // Формируем URL TON Shop
      const tonShopURL = getTONShopURL();

      console.log("[TON_BUTTON] Opening TON Shop:", tonShopURL);

      // Открываем TON Shop в новом окне
      const newWindow = window.open(
        tonShopURL,
        "ton-shop",
        "width=800,height=900,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no",
      );

      if (!newWindow) {
        // Fallback если всплывающие окна заблокированы
        window.location.href = tonShopURL;
      } else {
        // Фокусируемся на новом окне
        newWindow.focus();
      }

      // Добавляем небольшую задержку для анимации
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error("[TON_BUTTON] Error opening TON Shop:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Failed to open TON Shop";

      setError(errorMessage);
      setIsLoading(false);

      // Очищаем ошибку через 3 секунды
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  }, [getTONShopURL]);

  /**
   * Получение содержимого кнопки
   */
  const getButtonContent = () => {
    if (children) {
      return children;
    }

    if (error) {
      return (
        <div className="flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>Error</span>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Opening...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <Wallet size={16} />
        <span>Buy with TON</span>
        <ExternalLink className="opacity-70" size={14} />
      </div>
    );
  };

  /**
   * Получение цвета кнопки в зависимости от состояния
   */
  const getButtonColor = () => {
    if (error) {
      return "danger";
    }

    return "primary";
  };

  return (
    <Button
      className={`
        transition-all duration-200
        ${error ? "animate-pulse" : ""}
        ${className}
      `}
      color={getButtonColor()}
      fullWidth={fullWidth}
      isDisabled={isDisabled || isLoading}
      isLoading={isLoading}
      size={size}
      title={
        error ||
        "Open TON Shop to purchase game attempts with TON cryptocurrency"
      }
      variant={variant}
      onPress={handleTONShopOpen}
    >
      {getButtonContent()}
    </Button>
  );
}

export default TONPurchaseButton;
