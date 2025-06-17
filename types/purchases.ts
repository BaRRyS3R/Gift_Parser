// src/types/purchases.ts - Типы для системы покупок Telegram Stars

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

export type ProductType = 'additional_attempts';

export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface ProductInfo {
    type: ProductType;
    title: string;
    description: string;
    price: number; // в Telegram Stars
    icon: string;
    benefits: string[];
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

// Конфигурация доступных продуктов
export const PRODUCTS: Record<ProductType, ProductInfo> = {
    additional_attempts: {
        type: 'additional_attempts',
        title: 'More Attempts',
        description: 'Get 1 additional game attempt',
        price: 1,
        icon: '⚡',
        benefits: [
            'Play one more game',
            'Instant activation',
            'No expiration date'
        ]
    }
};