// src/hooks/modules/usePurchase.ts - Хук для работы с покупками через API

import type { ProductType, CreateInvoiceResponse } from "@/types/purchases";

import { useState, useCallback, useRef } from "react";

// Hook state interface
interface PurchaseState {
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  loadingProduct: ProductType | null;
}

// Purchase status interface
interface PurchaseStatus {
  user_id: string;
  attempts_remaining: number;
  last_updated: string;
  status: "synced";
}

/**
 * Специализированный хук для управления покупками
 */
export function usePurchase(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<PurchaseState>({
    isLoading: false,
    isProcessing: false,
    error: null,
    loadingProduct: null,
  });

  const processingRef = useRef<boolean>(false);

  /**
   * Получение initData от Telegram WebApp
   */
  const getTelegramInitData = useCallback((): string => {
    if (typeof window === "undefined") {
      return "";
    }

    // В продакшене используем реальные данные от Telegram
    if (window.Telegram?.WebApp?.initData) {
      return window.Telegram.WebApp.initData;
    }

    // Для разработки и тестирования
    if (process.env.NODE_ENV === "development") {
      console.warn("Using mock initData for development");

      return "mock_init_data_for_development";
    }

    return "";
  }, []);

  /**
   * Создание инвойса для покупки
   */
  const createInvoice = useCallback(
    async (productType: ProductType): Promise<CreateInvoiceResponse> => {
      if (processingRef.current) {

        return { success: false, error: "Purchase already in progress" };
      }

      processingRef.current = true;
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        loadingProduct: productType,
      }));

      try {
        const initData = getTelegramInitData();

        if (!initData) {
          throw new Error("Telegram WebApp data not available");
        }

        const response = await makeAuthenticatedRequest(
          "/api/purchase/create",
          {
            method: "POST",
            body: JSON.stringify({
              initData,
              productType,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result: CreateInvoiceResponse = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to create invoice");
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          loadingProduct: null,
        }));

        return result;
      } catch (error) {
        console.error("Error creating invoice:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          loadingProduct: null,
        }));

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        processingRef.current = false;
      }
    },
    [makeAuthenticatedRequest, getTelegramInitData],
  );

  /**
   * Открытие инвойса через Telegram WebApp
   */
  const openInvoice = useCallback(
    async (invoiceUrl: string): Promise<boolean> => {
      setState((prev) => ({
        ...prev,
        isProcessing: true,
        error: null,
      }));

      try {
        if (typeof window === "undefined") {
          throw new Error("Window object not available");
        }

        // Проверяем доступность Telegram WebApp API
        if (!window.Telegram?.WebApp) {
          console.warn("Telegram WebApp not available, opening in new tab");
          window.open(invoiceUrl, "_blank");

          return true;
        }

        const tg = window.Telegram.WebApp;

        // Используем Telegram WebApp API для открытия инвойса
        if (tg.openInvoice) {

          return new Promise((resolve) => {
            tg.openInvoice(invoiceUrl, (status: string) => {

              setState((prev) => ({
                ...prev,
                isProcessing: false,
              }));

              switch (status) {
                case "paid":
                  resolve(true);
                  break;
                case "cancelled":
                  setState((prev) => ({
                    ...prev,
                    error: "Payment was cancelled",
                  }));
                  resolve(false);
                  break;
                case "failed":
                  setState((prev) => ({
                    ...prev,
                    error: "Payment failed",
                  }));
                  resolve(false);
                  break;
                default:
                  setState((prev) => ({
                    ...prev,
                    error: "Unknown payment status",
                  }));
                  resolve(false);
                  break;
              }
            });
          });
        } else {
          // Fallback: открываем ссылку в новом окне
          window.open(invoiceUrl, "_blank");

          setState((prev) => ({
            ...prev,
            isProcessing: false,
          }));

          return true;
        }
      } catch (error) {
        console.error("Error opening invoice:", error);

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error:
            error instanceof Error ? error.message : "Failed to open invoice",
        }));

        return false;
      }
    },
    [],
  );

  /**
   * Проверка статуса покупки
   */
  const checkPurchaseStatus =
    useCallback(async (): Promise<PurchaseStatus | null> => {
      try {

        const response = await makeAuthenticatedRequest("/api/purchase/status");

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to check purchase status");
        }

        return result.data;
      } catch (error) {
        console.error("Error checking purchase status:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to check purchase status",
        }));

        return null;
      }
    }, [makeAuthenticatedRequest]);

  /**
   * Полный процесс покупки
   */
  const processPurchase = useCallback(
    async (productType: ProductType): Promise<boolean> => {
      try {
        // Создаем инвойс
        const invoiceResult = await createInvoice(productType);

        if (!invoiceResult.success || !invoiceResult.invoice_url) {
          throw new Error(invoiceResult.error || "Failed to create invoice");
        }

        // Открываем инвойс для оплаты
        const paymentResult = await openInvoice(invoiceResult.invoice_url);

        if (paymentResult) {
          // Проверяем статус после успешной оплаты
          await checkPurchaseStatus();

          return true;
        }

        return false;
      } catch (error) {
        console.error("Error processing purchase:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Purchase failed";

        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));

        return false;
      }
    },
    [createInvoice, openInvoice, checkPurchaseStatus],
  );

  /**
   * Очистка состояния ошибки
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Сброс состояния покупок
   */
  const resetPurchase = useCallback(() => {
    setState({
      isLoading: false,
      isProcessing: false,
      error: null,
      loadingProduct: null,
    });
    processingRef.current = false;
  }, []);

  /**
   * Проверка, идет ли загрузка для конкретного продукта
   */
  const isLoadingProduct = useCallback(
    (productType: ProductType): boolean => {
      return (
        state.loadingProduct === productType &&
        (state.isLoading || state.isProcessing)
      );
    },
    [state.loadingProduct, state.isLoading, state.isProcessing],
  );

  return {
    // State
    isLoading: state.isLoading,
    isProcessing: state.isProcessing,
    error: state.error,
    loadingProduct: state.loadingProduct,

    // Actions
    createInvoice,
    openInvoice,
    checkPurchaseStatus,
    processPurchase,
    clearError,
    resetPurchase,

    // Utility functions
    isLoadingProduct,
    getTelegramInitData,
  };
}
