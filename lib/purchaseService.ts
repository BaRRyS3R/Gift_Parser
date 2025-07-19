// src/lib/purchaseService.ts - Обновленная версия с использованием API
import {
  ProductType,
  CreateInvoiceResponse,
  PurchaseService,
} from "@/types/purchases";

const getTelegramInitData = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }

  if (process.env.NODE_ENV === "development") {
    console.warn("Using mock initData for development");
    return "mock_init_data_for_development";
  }

  return "";
};

// Получение токена авторизации
const getAuthToken = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_access_token') || '';
  }
  return '';
};

// Создание инвойса через защищенный API
const createInvoice = async (
  productType: ProductType,
): Promise<CreateInvoiceResponse> => {
  try {
    const initData = getTelegramInitData();

    console.log("Creating invoice via API for product:", productType);

    const response = await fetch('/api/shop/create-invoice', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        productType,
        initData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: CreateInvoiceResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to create invoice");
    }

    console.log("Invoice created successfully via API:", result);
    return result;

  } catch (error) {
    console.error("Error creating invoice via API:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Обработка результата покупки через защищенный API
const processPurchase = async (
  productType: ProductType,
  paymentResult: boolean,
  transactionId?: string,
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    console.log("Processing purchase via API:", productType, paymentResult);

    const response = await fetch('/api/shop/process-purchase', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        productType,
        paymentResult,
        transactionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to process purchase");
    }

    console.log("Purchase processed successfully via API:", result);
    return result;

  } catch (error) {
    console.error("Error processing purchase via API:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Проверка статуса покупок через API
const checkPurchaseStatus = async (): Promise<void> => {
  console.log("Checking purchase status via API...");

  try {
    const response = await fetch('/api/shop/status', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log("Purchase status checked via API:", result);
    }
  } catch (error) {
    console.error("Error checking purchase status via API:", error);
  }

  await new Promise(resolve => setTimeout(resolve, 1000));
};

// Обновленный объект сервиса покупок
export const purchaseService: PurchaseService = {
  createInvoice,
  openInvoice: async (invoiceUrl: string): Promise<boolean> => {
    // Эта функция остается без изменений
    try {
      if (typeof window === "undefined") {
        throw new Error("Window object not available");
      }

      if (!window.Telegram?.WebApp) {
        console.warn("Telegram WebApp not available, opening in new tab");
        window.open(invoiceUrl, "_blank");
        return true;
      }

      const tg = window.Telegram.WebApp;

      if (tg.openInvoice) {
        console.log("Opening invoice via Telegram WebApp API");

        return new Promise((resolve) => {
          tg.openInvoice(invoiceUrl, (status: string) => {
            console.log("Invoice status:", status);

            switch (status) {
              case "paid":
                console.log("Payment successful");
                resolve(true);
                break;
              case "cancelled":
                console.log("Payment cancelled by user");
                resolve(false);
                break;
              case "failed":
                console.log("Payment failed");
                resolve(false);
                break;
              default:
                console.log("Unknown payment status:", status);
                resolve(false);
                break;
            }
          });
        });
      } else {
        console.log("openInvoice API not available, using fallback");
        window.open(invoiceUrl, "_blank");
        return true;
      }
    } catch (error) {
      console.error("Error opening invoice:", error);
      return false;
    }
  },
  checkPurchaseStatus,
};

// Экспорт дополнительных функций
export {
  createInvoice,
  processPurchase,
  checkPurchaseStatus,
  getTelegramInitData,
};