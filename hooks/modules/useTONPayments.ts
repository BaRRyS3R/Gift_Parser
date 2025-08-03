// src/hooks/modules/useTONPayments.ts - Хук для управления TON платежами

import React, { useState, useCallback, useRef } from "react";
import {
  useTonWallet,
  useTonConnectModal,
  useTonConnectUI,
} from "@tonconnect/ui-react";

import {
  CreateTONOrderResponse,
  TONOrderStatusResponse,
  TONProductsResponse,
} from "@/types/ton-payments";
import { ProductType } from "@/types/purchases";

// Состояние хука TON платежей
interface TONPaymentsState {
  isLoading: boolean;
  isCreatingOrder: boolean;
  isMonitoringPayment: boolean;
  error: string | null;
  currentOrderId: string | null;
  lastOrderStatus: "created" | "pending" | "completed" | "expired" | null;
}

// Интерфейс пользователя TON Shop
interface TONShopUser {
  telegramId: number;
  firstName: string;
  attemptsRemaining: number;
}

// Интерфейс продукта TON
interface TONShopProduct {
  productType: ProductType;
  attempts: number;
  title: string;
  description: string;
  priceNanotons: bigint;
  priceTON: string;
}

/**
 * Хук для управления TON платежами
 * Предоставляет функциональность для создания заказов, отправки транзакций и мониторинга статуса
 */
export function useTONPayments() {
  const wallet = useTonWallet();
  const { open: openWalletModal } = useTonConnectModal();
  const [tonConnectUI] = useTonConnectUI();

  const [state, setState] = useState<TONPaymentsState>({
    isLoading: false,
    isCreatingOrder: false,
    isMonitoringPayment: false,
    error: null,
    currentOrderId: null,
    lastOrderStatus: null,
  });

  const monitoringRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Получение каталога TON товаров с информацией о пользователе
   */
  const fetchTONProducts = useCallback(
    async (
      initData: string,
    ): Promise<{
      user: TONShopUser | null;
      products: TONShopProduct[];
    }> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(
          `/api/ton/products?initData=${encodeURIComponent(initData)}`,
        );

        if (!response.ok) {
          const errorData = await response.json();

          throw new Error(errorData.error || "Failed to fetch TON products");
        }

        const data: TONProductsResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to fetch TON products");
        }

        setState((prev) => ({ ...prev, isLoading: false }));

        return {
          user: data.user || null,
          products: data.products || [],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch TON products";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        return {
          user: null,
          products: [],
        };
      }
    },
    [],
  );

  /**
   * Создание TON заказа
   */
  const createTONOrder = useCallback(
    async (
      initData: string,
      productType: ProductType,
    ): Promise<CreateTONOrderResponse["order"] | null> => {
      setState((prev) => ({
        ...prev,
        isCreatingOrder: true,
        error: null,
        currentOrderId: null,
        lastOrderStatus: null,
      }));

      try {
        const response = await fetch("/api/ton/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            initData,
            productType,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();

          throw new Error(errorData.error || "Failed to create TON order");
        }

        const data: CreateTONOrderResponse = await response.json();

        if (!data.success || !data.order) {
          throw new Error(data.error || "Failed to create TON order");
        }

        setState((prev) => ({
          ...prev,
          isCreatingOrder: false,
          currentOrderId: data.order!.id,
          lastOrderStatus: "created",
        }));

        console.log(
          "[TON_PAYMENTS] Order created successfully:",
          data.order.id,
        );

        return data.order;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create TON order";

        setState((prev) => ({
          ...prev,
          isCreatingOrder: false,
          error: errorMessage,
        }));

        return null;
      }
    },
    [],
  );

  /**
   * Отправка TON транзакции через подключенный кошелек
   */
  const sendTONTransaction = useCallback(
    async (order: CreateTONOrderResponse["order"]): Promise<boolean> => {
      if (!wallet) {
        setState((prev) => ({ ...prev, error: "Wallet not connected" }));

        return false;
      }

      if (!order) {
        setState((prev) => ({ ...prev, error: "Invalid order data" }));

        return false;
      }

      try {
        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 300, // 5 минут
          messages: [
            {
              address: order.payment.destinationWallet,
              amount: order.payment.amountNanotons,
              payload: order.payment.payload,
            },
          ],
        };

        console.log("[TON_PAYMENTS] Sending transaction:", {
          orderId: order.id,
          amount: order.payment.amount,
          destination: order.payment.destinationWallet,
          payload: order.payment.payload,
        });

        const result = await tonConnectUI.sendTransaction(transaction);

        console.log("[TON_PAYMENTS] Transaction sent successfully:", result);

        setState((prev) => ({
          ...prev,
          lastOrderStatus: "pending",
          isMonitoringPayment: true,
        }));

        return true;
      } catch (error) {
        console.error("[TON_PAYMENTS] Error sending transaction:", error);

        const errorMessage =
          error instanceof Error ? error.message : "Failed to send transaction";

        setState((prev) => ({ ...prev, error: errorMessage }));

        return false;
      }
    },
    [wallet, tonConnectUI],
  );

  /**
   * Проверка статуса заказа
   */
  const checkOrderStatus = useCallback(
    async (
      orderId: string,
    ): Promise<TONOrderStatusResponse["order"] | null> => {
      try {
        const response = await fetch(`/api/ton/order-status/${orderId}`);

        if (!response.ok) {
          throw new Error("Failed to check order status");
        }

        const data: TONOrderStatusResponse = await response.json();

        if (!data.success || !data.order) {
          throw new Error(data.error || "Failed to check order status");
        }

        setState((prev) => ({
          ...prev,
          lastOrderStatus: data.order!.status,
        }));

        return data.order;
      } catch (error) {
        console.error("[TON_PAYMENTS] Error checking order status:", error);

        return null;
      }
    },
    [],
  );

  /**
   * Запуск мониторинга статуса заказа
   */
  const startOrderMonitoring = useCallback(
    (orderId: string) => {
      // Очищаем предыдущий мониторинг
      if (monitoringRef.current) {
        clearInterval(monitoringRef.current);
      }

      setState((prev) => ({ ...prev, isMonitoringPayment: true }));

      // Проверяем статус каждые 10 секунд
      monitoringRef.current = setInterval(async () => {
        const orderStatus = await checkOrderStatus(orderId);

        if (orderStatus?.status === "completed") {
          // Заказ выполнен - останавливаем мониторинг
          stopOrderMonitoring();
          setState((prev) => ({
            ...prev,
            isMonitoringPayment: false,
            lastOrderStatus: "completed",
          }));
        } else if (orderStatus?.status === "expired") {
          // Заказ истек - останавливаем мониторинг
          stopOrderMonitoring();
          setState((prev) => ({
            ...prev,
            isMonitoringPayment: false,
            lastOrderStatus: "expired",
            error: "Order expired. Please create a new order.",
          }));
        }
      }, 10000);

      // Автоматическая остановка через 5 минут
      setTimeout(
        () => {
          if (monitoringRef.current) {
            stopOrderMonitoring();
            setState((prev) => ({
              ...prev,
              isMonitoringPayment: false,
              error:
                "Payment monitoring timeout. Please check your transaction manually.",
            }));
          }
        },
        5 * 60 * 1000,
      );
    },
    [checkOrderStatus],
  );

  /**
   * Остановка мониторинга статуса заказа
   */
  const stopOrderMonitoring = useCallback(() => {
    if (monitoringRef.current) {
      clearInterval(monitoringRef.current);
      monitoringRef.current = null;
    }
    setState((prev) => ({ ...prev, isMonitoringPayment: false }));
  }, []);

  /**
   * Полный процесс покупки через TON
   */
  const processTONPurchase = useCallback(
    async (initData: string, productType: ProductType): Promise<boolean> => {
      try {
        // Проверяем подключение кошелька
        if (!wallet) {
          openWalletModal();

          return false;
        }

        // Создаем заказ
        const order = await createTONOrder(initData, productType);

        if (!order) {
          return false;
        }

        // Отправляем транзакцию
        const transactionSent = await sendTONTransaction(order);

        if (!transactionSent) {
          return false;
        }

        // Запускаем мониторинг
        startOrderMonitoring(order.id);

        return true;
      } catch (error) {
        console.error("[TON_PAYMENTS] Error in TON purchase process:", error);

        const errorMessage =
          error instanceof Error ? error.message : "TON purchase failed";

        setState((prev) => ({ ...prev, error: errorMessage }));

        return false;
      }
    },
    [
      wallet,
      openWalletModal,
      createTONOrder,
      sendTONTransaction,
      startOrderMonitoring,
    ],
  );

  /**
   * Сброс состояния ошибки
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Сброс всего состояния TON платежей
   */
  const resetTONPayments = useCallback(() => {
    stopOrderMonitoring();
    setState({
      isLoading: false,
      isCreatingOrder: false,
      isMonitoringPayment: false,
      error: null,
      currentOrderId: null,
      lastOrderStatus: null,
    });
  }, [stopOrderMonitoring]);

  /**
   * Получение URL для TON Shop с initData
   */
  const getTONShopURL = useCallback((initData: string): string => {
    const baseURL = typeof window !== "undefined" ? window.location.origin : "";

    return `${baseURL}/ton-shop?initdata=${encodeURIComponent(initData)}`;
  }, []);

  // Очистка мониторинга при размонтировании
  React.useEffect(() => {
    return () => {
      if (monitoringRef.current) {
        clearInterval(monitoringRef.current);
      }
    };
  }, []);

  return {
    // Состояние
    isWalletConnected: !!wallet,
    isLoading: state.isLoading,
    isCreatingOrder: state.isCreatingOrder,
    isMonitoringPayment: state.isMonitoringPayment,
    error: state.error,
    currentOrderId: state.currentOrderId,
    lastOrderStatus: state.lastOrderStatus,

    // Основные функции
    fetchTONProducts,
    createTONOrder,
    sendTONTransaction,
    checkOrderStatus,
    processTONPurchase,
    getTONShopURL,

    // Управление мониторингом
    startOrderMonitoring,
    stopOrderMonitoring,

    // Управление состоянием
    clearError,
    resetTONPayments,

    // Кошелек
    openWalletModal,
  };
}
