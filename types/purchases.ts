// src/types/purchases.ts - Updated types for enhanced purchase system

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

export type ProductType = 'additional_attempts' | 'restore_attempts';

export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface ProductInfo {
    type: ProductType;
    title: string;
    description: string;
    price: number; // в Telegram Stars
    icon: string;
    benefits: string[];
    category: 'single' | 'bundle';
    popular?: boolean;
    bonus?: string;
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

export interface PurchaseAnimation {
    type: 'success' | 'error' | 'loading';
    message: string;
    submessage?: string;
}

// Enhanced product configuration with new items
export const PRODUCTS: Record<ProductType, ProductInfo> = {
    additional_attempts: {
        type: 'additional_attempts',
        title: 'Extra Attempt',
        description: 'Get 1 additional game attempt to keep playing',
        price: 1,
        icon: '⚡',
        category: 'single',
        benefits: [
            'Instant activation',
            'No expiration date',
            'Works for any game mode'
        ]
    },
    restore_attempts: {
        type: 'restore_attempts',
        title: 'Full Restore',
        description: 'Instantly restore all 5 attempts and get back in the game',
        price: 5,
        icon: '🔋',
        category: 'bundle',
        popular: true,
        bonus: 'Best Value!',
        benefits: [
            'Restore all 5 attempts',
            'Instant activation',
            'Perfect for long gaming sessions',
            'Skip waiting time'
        ]
    }
};

// Animation configurations for purchase states
export const PURCHASE_ANIMATIONS = {
    loading: {
        type: 'loading' as const,
        message: 'Processing your order...',
        submessage: 'Please wait while we prepare your purchase'
    },
    success: {
        type: 'success' as const,
        message: 'Purchase successful! 🎉',
        submessage: 'Your attempts have been added to your account'
    },
    cancelled: {
        type: 'error' as const,
        message: 'Purchase cancelled',
        submessage: 'No charges were made to your account'
    },
    failed: {
        type: 'error' as const,
        message: 'Purchase failed',
        submessage: 'Please try again or contact support'
    },
    network_error: {
        type: 'error' as const,
        message: 'Connection error',
        submessage: 'Please check your internet connection and try again'
    }
} as const;