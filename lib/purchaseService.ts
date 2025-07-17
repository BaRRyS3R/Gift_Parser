// src/lib/purchaseService.ts - Исправленный сервис для работы с покупками

import {
  ProductType,
  CreateInvoiceRequest,
  CreateInvoiceResponse,
  PurchaseService,
} from "@/types/purchases";

// URL вашего PHP backend (замените на реальный)
const PHP_BACKEND_URL = process.env.NEXT_PUBLIC_PHP_BACKEND_URL;

// Получение initData от Telegram WebApp
const getTelegramInitData = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  // В продакшене используйте реальные данные от Telegram
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }

  // Для разработки и тестирования
  if (process.env.NODE_ENV === "development") {
    console.warn("Using mock initData for development");
    return "mock_init_data_for_development";
  }

  return "";
};

// Создание инвойса для покупки - ОБНОВЛЕНО для всех типов товаров
const createInvoice = async (
  productType: ProductType,
): Promise<CreateInvoiceResponse> => {
  try {
    const initData = getTelegramInitData();

    if (!initData) {
      throw new Error("Telegram WebApp data not available");
    }

    const requestData: CreateInvoiceRequest = {
      initData,
      productType,
    };

    console.log("Creating invoice for product:", productType);

    const response = await fetch(`${PHP_BACKEND_URL}/create_invoice.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: CreateInvoiceResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to create invoice");
    }

    console.log("Invoice created successfully:", result);

    return result;
  } catch (error) {
    console.error("Error creating invoice:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Открытие инвойса через Telegram WebApp
const openInvoice = async (invoiceUrl: string): Promise<boolean> => {
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
      // Fallback: открываем ссылку в новом окне
      console.log("openInvoice API not available, using fallback");
      window.open(invoiceUrl, "_blank");
      return true;
    }
  } catch (error) {
    console.error("Error opening invoice:", error);
    return false;
  }
};

// Проверка статуса покупок - ОБНОВЛЕНО для обработки мгновенного сброса
const checkPurchaseStatus = async (): Promise<void> => {
  console.log("Checking purchase status...");

  // Дополнительная задержка для обработки мгновенного сброса
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Здесь можно добавить дополнительную логику проверки статуса
  // или просто обновить данные пользователя
};

// Обработка событий Telegram WebApp
const setupTelegramWebAppHandlers = () => {
  if (typeof window === "undefined" || !window.Telegram?.WebApp) {
    return;
  }

  const tg = window.Telegram.WebApp;

  // Слушаем события платежей
  tg.onEvent("invoiceClosed", (eventData: any) => {
    console.log("Invoice closed event:", eventData);

    if (eventData.status === "paid") {
      console.log("Payment completed successfully");
      // Здесь можно вызвать обновление состояния приложения
      checkPurchaseStatus();
    }
  });

  // Настройка основных параметров WebApp
  tg.ready();
  tg.expand();
};

// Утилиты для работы с Telegram Stars
export const formatStarsAmount = (amount: number): string => {
  return `${amount} ⭐`;
};

// ОБНОВЛЕНО: валидация для всех новых типов продуктов
export const validateProductType = (
  productType: string,
): productType is ProductType => {
  const validTypes: ProductType[] = [
    "attempts_1",
    "attempts_5",
    "attempts_10",
    "attempts_100"
  ];
  return validTypes.includes(productType as ProductType);
};

// Основной объект сервиса покупок
export const purchaseService: PurchaseService = {
  createInvoice,
  openInvoice,
  checkPurchaseStatus,
};

// Инициализация сервиса при загрузке модуля
if (typeof window !== "undefined") {
  setupTelegramWebAppHandlers();
}

// Экспорт всех функций
export {
  createInvoice,
  openInvoice,
  checkPurchaseStatus,
  setupTelegramWebAppHandlers,
  getTelegramInitData,
};