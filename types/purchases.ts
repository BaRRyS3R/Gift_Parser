// src/types/purchases.ts - Типы для системы покупок Telegram Stars (без instant_reset)

export interface Purchase {
  id: string;
  user_id: string;
  telegram_id: number;
  transaction_id: string;
  amount_stars: number;
  product_type: ProductType;
  status: PurchaseStatus;
  created_at: string;
}

// ============================================================================
// ТИПЫ ТОВАРОВ - КОНФИГУРАЦИЯ (при добавлении новых товаров обновить здесь)
// ============================================================================
export type ProductType =
  | "attempts_1"
  | "attempts_5"
  | "attempts_10"
  | "attempts_100";
// ============================================================================

export type PurchaseStatus = "pending" | "completed" | "failed" | "refunded";

export interface ProductInfo {
  type: ProductType;
  title: string;
  description: string;
  price: number; // в Telegram Stars
  icon: string;
  benefits: string[];
  attempts_bonus: number; // количество добавляемых попыток
}

export interface CreateInvoiceRequest {
  initData: string;
  productType: ProductType;
}

export interface CreateInvoiceResponse {
  success: boolean;
  invoice_url?: string;
  product?: {
    type: ProductType;
    title: string;
    description: string;
    price: number;
    attempts_bonus: number;
  };
  payload?: string;
  error?: string;
}

export interface PurchaseService {
  createInvoice: (productType: ProductType) => Promise<CreateInvoiceResponse>;
  openInvoice: (invoiceUrl: string) => Promise<boolean>;
  checkPurchaseStatus: () => Promise<void>;
}

// ============================================================================
// КОНФИГУРАЦИЯ ТОВАРОВ - ЦЕНЫ И ХАРАКТЕРИСТИКИ
// Для изменения цен или количества попыток редактируйте значения ниже
// ============================================================================
export const PRODUCTS: Record<ProductType, ProductInfo> = {
  attempts_1: {
    type: "attempts_1",
    title: "+1 Attempt",
    description: "Get 1 additional game attempt",
    price: 10, // 10 Telegram Stars
    icon: "⚡",
    attempts_bonus: 1,
    benefits: [
      "1 additional game",
      "Instant activation",
      "No expiration date",
    ],
  },
  attempts_5: {
    type: "attempts_5",
    title: "+5 Attempts",
    description: "Get 5 additional game attempts",
    price: 50, // 50 Telegram Stars
    icon: "🔥",
    attempts_bonus: 5,
    benefits: [
      "5 additional games",
      "Better value deal",
      "Instant activation",
      "No expiration date",
    ],
  },
  attempts_10: {
    type: "attempts_10",
    title: "+10 Attempts",
    description: "Get 10 additional game attempts",
    price: 100, // 100 Telegram Stars
    icon: "💎",
    attempts_bonus: 10,
    benefits: [
      "10 additional games",
      "Great value pack",
      "Instant activation",
      "No expiration date",
    ],
  },
  attempts_100: {
    type: "attempts_100",
    title: "+100 Attempts",
    description: "Get 100 additional game attempts",
    price: 1000, // 1000 Telegram Stars
    icon: "👑",
    attempts_bonus: 100,
    benefits: [
      "100 additional games",
      "Ultimate value pack",
      "Instant activation",
      "No expiration date",
    ],
  },
};
// ============================================================================