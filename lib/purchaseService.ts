// src/lib/purchaseService.ts - Enhanced service for Telegram Stars purchases

import {
    ProductType,
    CreateInvoiceRequest,
    CreateInvoiceResponse,
    PurchaseService,
    PRODUCTS
} from "@/types/purchases";

// Backend URL from environment
const PHP_BACKEND_URL = process.env.NEXT_PUBLIC_PHP_BACKEND_URL || 'https://notfren.com/payments';

// Enhanced telemetry and analytics
interface PurchaseAnalytics {
    event: 'invoice_created' | 'invoice_opened' | 'payment_completed' | 'payment_failed' | 'payment_cancelled';
    productType: ProductType;
    timestamp: number;
    userAgent: string;
    attemptsBefore?: number;
    attemptsAfter?: number;
    errorMessage?: string;
}

// Extended Window interface for analytics
declare global {
    interface Window {
        gtag?: (command: string, eventName: string, parameters?: any) => void;
    }
}

// Get Telegram WebApp initData
const getTelegramInitData = (): string => {
    if (typeof window === 'undefined') {
        return '';
    }

    // Use real Telegram data in production
    if (window.Telegram?.WebApp?.initData) {
        return window.Telegram.WebApp.initData;
    }

    // Development fallback
    if (process.env.NODE_ENV === 'development') {
        console.warn('Using mock initData for development');
        return 'mock_init_data_for_development';
    }

    return '';
};

// Enhanced analytics logging
const logPurchaseAnalytics = async (analytics: PurchaseAnalytics) => {
    try {
        console.log('Purchase Analytics:', analytics);

        // In production, you might want to send this to your analytics service
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', analytics.event, {
                custom_parameter_product_type: analytics.productType,
                custom_parameter_attempts_before: analytics.attemptsBefore,
                custom_parameter_attempts_after: analytics.attemptsAfter,
            });
        }
    } catch (error) {
        console.warn('Failed to log purchase analytics:', error);
    }
};

// Enhanced error handling with retry logic
const createInvoiceWithRetry = async (
    productType: ProductType,
    maxRetries: number = 3,
    retryDelay: number = 1000
): Promise<CreateInvoiceResponse> => {
    let lastError: Error = new Error('Failed to create invoice');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const initData = getTelegramInitData();

            if (!initData) {
                throw new Error('Telegram WebApp data not available');
            }

            const requestData: CreateInvoiceRequest = {
                initData,
                productType
            };

            console.log(`Creating invoice for ${productType} (attempt ${attempt}/${maxRetries})`);

            const response = await fetch(`${PHP_BACKEND_URL}/create_invoice.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result: CreateInvoiceResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to create invoice');
            }

            // Log successful invoice creation
            await logPurchaseAnalytics({
                event: 'invoice_created',
                productType,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                attemptsBefore: result.user_info?.current_attempts
            });

            console.log('Invoice created successfully:', result);
            return result;

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`Attempt ${attempt} failed:`, lastError.message);

            // Don't retry on certain errors
            if (lastError.message.includes('not available') ||
                lastError.message.includes('not found') ||
                lastError.message.includes('401') ||
                lastError.message.includes('403')) {
                break;
            }

            // Wait before retrying (except on last attempt)
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            }
        }
    }

    // Log failed invoice creation
    await logPurchaseAnalytics({
        event: 'payment_failed',
        productType,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        errorMessage: lastError.message
    });

    return {
        success: false,
        error: lastError.message || 'Failed to create invoice after multiple attempts'
    };
};

// Create invoice for purchase
const createInvoice = async (productType: ProductType): Promise<CreateInvoiceResponse> => {
    // Validate product type
    if (!PRODUCTS[productType]) {
        return {
            success: false,
            error: `Invalid product type: ${productType}`
        };
    }

    return createInvoiceWithRetry(productType);
};

// Enhanced invoice opening with better UX
const openInvoice = async (invoiceUrl: string, productType?: ProductType): Promise<boolean> => {
    try {
        if (typeof window === 'undefined') {
            throw new Error('Window object not available');
        }

        console.log('Opening invoice via Telegram WebApp API...');

        // Check Telegram WebApp availability
        if (!window.Telegram?.WebApp) {
            console.warn('Telegram WebApp not available, opening in new tab');
            window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
            return true;
        }

        const tg = window.Telegram.WebApp;

        // Use enhanced Telegram WebApp API
        if (tg.openInvoice) {
            console.log('Using native Telegram invoice API');

            // Add haptic feedback for better UX
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }

            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.warn('Invoice timeout - assuming cancelled');
                    resolve(false);
                }, 300000); // 5 minute timeout

                tg.openInvoice(invoiceUrl, (status: string) => {
                    clearTimeout(timeout);
                    console.log('Invoice status received:', status);

                    // Log analytics
                    if (productType) {
                        logPurchaseAnalytics({
                            event: status === 'paid' ? 'payment_completed' : 'payment_cancelled',
                            productType,
                            timestamp: Date.now(),
                            userAgent: navigator.userAgent
                        });
                    }

                    switch (status) {
                        case 'paid':
                            console.log('✅ Payment successful');
                            if (tg.HapticFeedback) {
                                tg.HapticFeedback.notificationOccurred('success');
                            }
                            resolve(true);
                            break;

                        case 'cancelled':
                            console.log('❌ Payment cancelled by user');
                            if (tg.HapticFeedback) {
                                tg.HapticFeedback.notificationOccurred('warning');
                            }
                            resolve(false);
                            break;

                        case 'failed':
                            console.log('💥 Payment failed');
                            if (tg.HapticFeedback) {
                                tg.HapticFeedback.notificationOccurred('error');
                            }
                            resolve(false);
                            break;

                        case 'pending':
                            console.log('⏳ Payment pending...');
                            // Don't resolve yet, wait for final status
                            break;

                        default:
                            console.log('❓ Unknown payment status:', status);
                            resolve(false);
                            break;
                    }
                });
            });
        } else {
            // Fallback: open in new window with better UX
            console.log('Using fallback invoice opening method');

            const newWindow = window.open(invoiceUrl, '_blank', 'noopener,noreferrer');

            if (!newWindow) {
                throw new Error('Failed to open invoice - popup blocked?');
            }

            // Try to detect if window was closed (rough estimate)
            const checkClosed = setInterval(() => {
                if (newWindow.closed) {
                    clearInterval(checkClosed);
                    console.log('Invoice window closed');
                }
            }, 1000);

            // Clean up after 10 minutes
            setTimeout(() => {
                clearInterval(checkClosed);
                if (!newWindow.closed) {
                    newWindow.close();
                }
            }, 600000);

            return true;
        }

    } catch (error) {
        console.error('Error opening invoice:', error);

        // Log error analytics
        if (productType) {
            await logPurchaseAnalytics({
                event: 'payment_failed',
                productType,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
        }

        return false;
    }
};

// Enhanced purchase status checking
const checkPurchaseStatus = async (): Promise<void> => {
    try {
        console.log('Checking purchase status and refreshing user data...');

        // Here you could make an API call to verify the purchase status
        // For now, we'll just log that we're checking

        // Trigger a user data refresh (this should be handled by the calling component)
        console.log('Purchase status check completed');

    } catch (error) {
        console.error('Error checking purchase status:', error);
    }
};

// Enhanced Telegram WebApp event handlers
const setupTelegramWebAppHandlers = () => {
    if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
        console.warn('Telegram WebApp not available for event setup');
        return;
    }

    const tg = window.Telegram.WebApp;

    // Enhanced invoice event handling
    const handleInvoiceClosed = (eventData: any) => {
        console.log('Invoice closed event received:', eventData);

        if (eventData?.status === 'paid') {
            console.log('✅ Payment completed successfully via event');

            // Trigger success animations or notifications
            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }

            // Refresh user data
            checkPurchaseStatus();

            // Show success message
            if (tg.showAlert) {
                tg.showAlert('🎉 Purchase successful! Your attempts have been added.');
            }
        } else if (eventData?.status === 'cancelled') {
            console.log('❌ Payment was cancelled');

            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('warning');
            }
        } else if (eventData?.status === 'failed') {
            console.log('💥 Payment failed');

            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('error');
            }

            if (tg.showAlert) {
                tg.showAlert('❌ Payment failed. Please try again.');
            }
        }
    };

    // Set up event listeners
    tg.onEvent('invoiceClosed', handleInvoiceClosed);

    // Enhanced WebApp initialization
    tg.ready();
    tg.expand();

    // Set theme colors for better integration
    if (tg.setHeaderColor) {
        tg.setHeaderColor('#000000');
    }
    if (tg.setBackgroundColor) {
        tg.setBackgroundColor('#000000');
    }

    // Disable closing confirmation for smoother UX
    if (tg.disableClosingConfirmation) {
        tg.disableClosingConfirmation();
    }

    console.log('✅ Telegram WebApp handlers initialized');
};

// Enhanced utility functions
export const formatStarsAmount = (amount: number): string => {
    return `${amount.toLocaleString()} ⭐`;
};

export const validateProductType = (productType: string): productType is ProductType => {
    return Object.keys(PRODUCTS).includes(productType);
};

export const getProductInfo = (productType: ProductType) => {
    return PRODUCTS[productType];
};

export const calculateSavings = (productType: ProductType): string => {
    if (productType === 'restore_attempts') {
        const singlePrice = PRODUCTS.additional_attempts.price;
        const bundlePrice = PRODUCTS.restore_attempts.price;
        const savings = (singlePrice * 5) - bundlePrice;
        return `Save ${savings} ⭐`;
    }
    return '';
};

// Enhanced error messages
export const getErrorMessage = (error: string): string => {
    const errorMessages: Record<string, string> = {
        'network': 'Connection error. Please check your internet and try again.',
        'timeout': 'Request timed out. Please try again.',
        'invalid_data': 'Invalid request data. Please refresh and try again.',
        'user_not_found': 'User account not found. Please restart the app.',
        'product_not_found': 'Product not available. Please try a different option.',
        'already_max_attempts': 'You already have the maximum number of attempts.',
        'payment_cancelled': 'Payment was cancelled. No charges were made.',
        'payment_failed': 'Payment failed. Please try again or contact support.',
        'telegram_unavailable': 'Telegram payment system is temporarily unavailable.',
    };

    return errorMessages[error] || 'An unexpected error occurred. Please try again.';
};

// Main purchase service object
export const purchaseService: PurchaseService = {
    createInvoice,
    openInvoice,
    checkPurchaseStatus
};

// Initialize service when module loads
if (typeof window !== 'undefined') {
    // Delay initialization to ensure Telegram WebApp is loaded
    setTimeout(setupTelegramWebAppHandlers, 100);
}

// Export enhanced functions
export {
    createInvoice,
    openInvoice,
    checkPurchaseStatus,
    setupTelegramWebAppHandlers,
    getTelegramInitData,
    logPurchaseAnalytics
};