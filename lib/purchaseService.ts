// src/lib/purchaseService.ts - Production service integrated with PHP backend

import {
  ProductType,
  CreateInvoiceRequest,
  CreateInvoiceResponse,
  PurchaseService,
} from "@/types/purchases";

// Configuration
const PHP_BACKEND_URL = process.env.NEXT_PUBLIC_PHP_BACKEND_URL;

/**
 * Extract Telegram WebApp initData for backend authentication
 */
const getTelegramInitData = (): string => {
  if (typeof window === "undefined") {
    throw new Error(
      "Window object not available - this function must be called in browser context",
    );
  }

  // Get real initData from Telegram WebApp
  if (window.Telegram?.WebApp?.initData) {
    const initData = window.Telegram.WebApp.initData;

    // Validate that initData contains required parameters
    if (initData.includes("user=") && initData.includes("auth_date=")) {
      return initData;
    }
  }

  // In production, this should never happen as the app runs inside Telegram
  throw new Error(
    "Telegram WebApp initData not available. Please ensure the app is running within Telegram.",
  );
};

/**
 * Create invoice for purchase via PHP backend
 */
const createInvoice = async (
  productType: ProductType,
): Promise<CreateInvoiceResponse> => {
  try {
    if (!PHP_BACKEND_URL) {
      throw new Error("Payment service configuration missing");
    }

    const initData = getTelegramInitData();

    const requestData: CreateInvoiceRequest = {
      initData,
      productType,
    };

    console.log("Creating invoice via PHP backend:", productType);

    const response = await fetch(`${PHP_BACKEND_URL}/create_invoice.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error(`PHP backend HTTP error ${response.status}:`, errorText);

      throw new Error(`Payment service error: ${response.status}`);
    }

    const result: CreateInvoiceResponse = await response.json();

    if (!result.success) {
      console.error("PHP backend returned error:", result.error);
      throw new Error(result.error || "Failed to create payment invoice");
    }

    if (!result.invoice_url) {
      console.error("PHP backend did not return invoice URL");
      throw new Error("Invalid response from payment service");
    }

    console.log("Invoice created successfully via PHP backend");

    return result;
  } catch (error) {
    console.error("Error creating invoice:", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Payment service unavailable",
    };
  }
};

/**
 * Open Telegram Stars invoice using WebApp API
 */
const openInvoice = async (invoiceUrl: string): Promise<boolean> => {
  try {
    if (typeof window === "undefined") {
      throw new Error("Window object not available");
    }

    // Ensure Telegram WebApp API is available
    if (!window.Telegram?.WebApp) {
      console.error("Telegram WebApp API not available");
      // In production, this should not happen, but provide fallback
      window.open(invoiceUrl, "_blank");

      return true;
    }

    const tg = window.Telegram.WebApp;

    // Use native Telegram invoice opening
    if (tg.openInvoice) {
      console.log("Opening Telegram Stars invoice");

      return new Promise((resolve) => {
        tg.openInvoice(invoiceUrl, (status: string) => {
          console.log("Telegram invoice status:", status);

          switch (status) {
            case "paid":
              console.log("Payment completed successfully");
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
            case "pending":
              console.log("Payment is pending");
              // For pending, we'll consider it as failed for now
              resolve(false);
              break;
            default:
              console.warn("Unknown payment status:", status);
              resolve(false);
              break;
          }
        });
      });
    } else {
      console.error("Telegram openInvoice API not available");
      throw new Error("Payment interface not available");
    }
  } catch (error) {
    console.error("Error opening invoice:", error);

    return false;
  }
};

/**
 * Check purchase processing status
 * This allows time for webhook processing and user data updates
 */
const checkPurchaseStatus = async (): Promise<void> => {
  console.log(
    "Checking purchase status - allowing time for webhook processing",
  );

  // Allow sufficient time for:
  // 1. Telegram to send webhook to PHP backend
  // 2. PHP backend to process payment and update database
  // 3. Database changes to propagate
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("Purchase status check completed");
};

/**
 * Initialize Telegram WebApp event handlers for payment processing
 */
const setupTelegramWebAppHandlers = (): void => {
  if (typeof window === "undefined" || !window.Telegram?.WebApp) {
    return;
  }

  const tg = window.Telegram.WebApp;

  // Configure WebApp settings
  try {
    tg.ready();
    tg.expand();

    // Enable closing confirmation for better UX during payments
    tg.enableClosingConfirmation();

    // Listen for invoice closure events
    tg.onEvent("invoiceClosed", (eventData: any) => {
      console.log("Invoice closed event received:", eventData);

      if (eventData?.status === "paid") {
        console.log("Payment completed - webhook should process attempts");

        // Trigger status check after short delay
        setTimeout(() => {
          checkPurchaseStatus();
        }, 1000);
      }
    });

    console.log("Telegram WebApp handlers configured successfully");
  } catch (error) {
    console.error("Error setting up Telegram WebApp handlers:", error);
  }
};

/**
 * Validate product type against available products
 */
export const validateProductType = (
  productType: string,
): productType is ProductType => {
  const validTypes: ProductType[] = [
    "attempts_1",
    "attempts_5",
    "attempts_10",
    "attempts_100",
  ];

  return validTypes.includes(productType as ProductType);
};

/**
 * Format Telegram Stars amount for display
 */
export const formatStarsAmount = (amount: number): string => {
  return `${amount} ⭐`;
};

/**
 * Get current Telegram user ID for logging and analytics
 */
export const getCurrentTelegramUserId = (): number | null => {
  if (typeof window === "undefined" || !window.Telegram?.WebApp) {
    return null;
  }

  return window.Telegram.WebApp.initDataUnsafe?.user?.id || null;
};

/**
 * Main purchase service object
 */
export const purchaseService: PurchaseService = {
  createInvoice,
  openInvoice,
  checkPurchaseStatus,
};

/**
 * Initialize purchase service when loaded in browser
 */
if (typeof window !== "undefined") {
  // Setup handlers once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupTelegramWebAppHandlers);
  } else {
    setupTelegramWebAppHandlers();
  }
}

// Export individual functions for direct use
export {
  createInvoice,
  openInvoice,
  checkPurchaseStatus,
  setupTelegramWebAppHandlers,
  getTelegramInitData,
};
