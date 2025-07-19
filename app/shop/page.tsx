// src/app/shop/page.tsx - Полная версия с интеграцией API
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardFooter, Button, Chip } from "@nextui-org/react";
import ConfettiExplosion from "react-confetti-explosion";
import {
    AlertCircle,
    Star,
    CheckCircle,
    Clock,
    ShoppingCart,
    Loader2
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { PRODUCTS, ProductType } from "@/types/purchases";
import type { CreateInvoiceResponse } from "@/types/purchases";
import { useT } from "@/contexts/LocalizationContext";

interface PurchaseState {
    isLoading: boolean;
    isProcessing: boolean;
    error: string | null;
    loadingProduct: ProductType | null;
}

interface SuccessNotification {
    show: boolean;
    title: string;
    message: string;
    icon: React.ReactNode;
}

const getAuthToken = (): string => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('auth_access_token') || '';
    }
    return '';
};

export default function ShopPage() {
    const router = useRouter();
    const { user, refreshUser, authState } = useUser();
    const t = useT();
    const [isExploding, setIsExploding] = useState(false);

    const [purchaseState, setPurchaseState] = useState<PurchaseState>({
        isLoading: false,
        isProcessing: false,
        error: null,
        loadingProduct: null
    });

    const [successNotification, setSuccessNotification] = useState<SuccessNotification>({
        show: false,
        title: "",
        message: "",
        icon: null
    });

    // Проверка аутентификации
    useEffect(() => {
        if (!authState.isAuthenticated) {
            console.log('User not authenticated, redirecting to main page');
            router.push('/');
            return;
        }
    }, [authState.isAuthenticated, router]);

    useEffect(() => {
        if (purchaseState.error) {
            const timer = setTimeout(() => {
                setPurchaseState(prev => ({ ...prev, error: null }));
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [purchaseState.error]);

    useEffect(() => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.BackButton.show();
            tg.BackButton.onClick(() => {
                router.push("/main");
            });

            return () => {
                tg.BackButton.hide();
                tg.BackButton.offClick(() => { });
            };
        }
    }, [router]);

    const showSuccessNotification = (product: ProductType) => {
        const productInfo = PRODUCTS[product];
        const isInstantReset = productInfo.is_instant_reset;

        const icon = isInstantReset ?
            <Clock className="text-green-400" size={32} /> :
            <CheckCircle className="text-green-400" size={32} />;

        const title = isInstantReset ?
            t('shop.notifications.instantResetSuccess') :
            t('shop.notifications.purchaseSuccess');

        const attemptsText = productInfo.attempts_bonus || 0;
        const plural = attemptsText > 1 ? 's' : '';

        const message = isInstantReset ?
            t('shop.notifications.instantResetMessage') :
            t('shop.notifications.purchaseSuccessMessage', {
                attempts: attemptsText,
                plural: plural
            });

        setSuccessNotification({
            show: true,
            title,
            message,
            icon
        });

        setIsExploding(true);
        setTimeout(() => {
            setIsExploding(false);
        }, 2000);

        setTimeout(() => {
            setSuccessNotification(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    const handlePurchase = async (productType: ProductType) => {
        if (purchaseState.isLoading || purchaseState.isProcessing || !authState.isAuthenticated) return;

        const authToken = getAuthToken();
        if (!authToken) {
            console.log('Auth token not found, redirecting to main page');
            router.push('/');
            return;
        }

        setPurchaseState({
            isLoading: true,
            isProcessing: false,
            error: null,
            loadingProduct: productType
        });

        try {
            console.log('Creating invoice via API for product:', productType);

            // Step 1: Create invoice
            const invoiceResponse = await fetch('/api/shop/create-invoice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    productType,
                    initData: window.Telegram?.WebApp?.initData || ''
                }),
            });

            if (!invoiceResponse.ok) {
                if (invoiceResponse.status === 401) {
                    router.push('/');
                    return;
                }
                throw new Error(`HTTP error! status: ${invoiceResponse.status}`);
            }

            const invoiceResult: CreateInvoiceResponse = await invoiceResponse.json();

            if (!invoiceResult.success || !invoiceResult.invoice_url) {
                throw new Error(invoiceResult.error || t('errors.createInvoice'));
            }

            setPurchaseState(prev => ({
                ...prev,
                isLoading: false,
                isProcessing: true
            }));

            // Step 2: Open invoice
            const paymentResult = await openInvoice(invoiceResult.invoice_url);

            // Step 3: Process result
            if (paymentResult) {
                const processResponse = await fetch('/api/shop/process-purchase', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        productType,
                        paymentResult: true
                    }),
                });

                if (!processResponse.ok) {
                    if (processResponse.status === 401) {
                        router.push('/');
                        return;
                    }
                    throw new Error(`HTTP error! status: ${processResponse.status}`);
                }

                const processResult = await processResponse.json();

                if (processResult.success) {
                    await refreshUser();
                    showSuccessNotification(productType);

                    setPurchaseState({
                        isLoading: false,
                        isProcessing: false,
                        error: null,
                        loadingProduct: null
                    });
                } else {
                    throw new Error(processResult.error || 'Purchase processing failed');
                }
            } else {
                setPurchaseState({
                    isLoading: false,
                    isProcessing: false,
                    error: t('errors.paymentCancelled'),
                    loadingProduct: null
                });
            }
        } catch (error) {
            console.error('Purchase error:', error);
            setPurchaseState({
                isLoading: false,
                isProcessing: false,
                error: error instanceof Error ? error.message : t('errors.unknownError'),
                loadingProduct: null
            });
        }
    };

    const openInvoice = async (invoiceUrl: string): Promise<boolean> => {
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
    };

    const getProductBadge = (productType: ProductType) => {
        switch (productType) {
            case 'attempts_5': return { text: 'Popular', textKey: 'shop.badges.popular' };
            case 'attempts_10': return { text: 'Best Value', textKey: 'shop.badges.bestvalue' };
            case 'attempts_100': return { text: 'Ultimate', textKey: 'shop.badges.ultimate' };
            default: return null;
        }
    };

    const isLoading = (productType: ProductType) => {
        return purchaseState.loadingProduct === productType &&
            (purchaseState.isLoading || purchaseState.isProcessing);
    };

    const getLoadingText = (productType: ProductType) => {
        if (purchaseState.loadingProduct !== productType) return null;
        return purchaseState.isLoading ? t('shop.creatingInvoice') : t('shop.processingPayment');
    };

    const getButtonText = (productType: ProductType) => {
        const loading = isLoading(productType);
        if (loading) {
            return getLoadingText(productType);
        }
        return t('shop.buy');
    };

    if (!authState.isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
            {isExploding && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                    <ConfettiExplosion
                        force={0.8}
                        duration={2000}
                        particleCount={100}
                        width={400}
                        colors={['#FFD700', '#FF69B4', '#00BFFF', '#7B68EE', '#FF4500']}
                    />
                </div>
            )}

            {/* Header */}
            <div className="text-center space-y-4 mb-8 pt-6">
                <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
                    {t("shop.title")}
                </h1>
                <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
                    {t("shop.subtitle")}
                </p>
            </div>

            {/* Error message */}
            {purchaseState.error && (
                <div className="max-w-2xl mx-auto mb-6">
                    <Card className="bg-white/10 border border-white/20">
                        <CardBody className="p-4">
                            <div className="flex items-center space-x-2">
                                <AlertCircle size={20} className="text-white" />
                                <span className="text-white">{purchaseState.error}</span>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}

            <div className="max-w-2xl mx-auto space-y-4">
                {Object.entries(PRODUCTS).map(([key, product]) => {
                    const productType = key as ProductType;
                    const badge = getProductBadge(productType);
                    const loading = isLoading(productType);

                    return (
                        <ProductCard
                            key={productType}
                            productType={productType}
                            product={product}
                            badge={badge}
                            loading={loading}
                            onPurchase={handlePurchase}
                            getButtonText={getButtonText}
                            t={t}
                        />
                    );
                })}
            </div>

            {/* Success Notification */}
            {successNotification.show && (
                <div className={`
                        fixed top-4 left-4 right-4 z-50
                        transform transition-all duration-500 ease-out
                        ${successNotification.show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
                    `}>
                    <Card className="bg-gradient-to-r from-white/15 to-white/10 border border-white/30 backdrop-blur-md shadow-2xl">
                        <CardBody className="p-4">
                            <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    {successNotification.icon}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-green-400 text-lg">{successNotification.title}</h4>
                                    <p className="text-green-300 text-sm mt-1">{successNotification.message}</p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Bottom spacing for safe area */}
            <div className="h-24" />
        </div>
    );
}

interface ProductCardProps {
    productType: ProductType;
    product: any;
    badge: { text: string; textKey: string } | null;
    loading: boolean;
    onPurchase: (productType: ProductType) => void;
    getButtonText: (productType: ProductType) => string | null;
    t: any;
}

function ProductCard({
    productType,
    product,
    badge,
    loading,
    onPurchase,
    getButtonText,
    t
}: ProductCardProps) {

    return (
        <Card
            className={`
                relative overflow-hidden
                bg-gradient-to-r from-white/10 to-white/5 border border-white/20
                hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
                transition-all duration-200
            `}
        >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -right-12 top-1/2 transform -translate-y-1/2 opacity-10">
                    <div className="text-white text-[140px] leading-none">⚡</div>
                </div>
            </div>

            <CardBody className="p-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-start space-x-3 mb-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                    <h3 className="font-bold text-white truncate">
                                        {t(`shop.products.${productType.replace('_', '') === 'instantreset' ? 'instantReset' : productType.replace('_', '')}.title`)}
                                    </h3>
                                    {badge && (
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            className="bg-white/20 text-white border border-white/30"
                                        >
                                            {t(badge.textKey)}
                                        </Chip>
                                    )}
                                </div>
                                <p className="text-white/70 text-sm">
                                    {t(`shop.products.${productType.replace('_', '') === 'instantreset' ? 'instantReset' : productType.replace('_', '')}.description`)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Star className="text-white" size={16} />
                                <span className="text-white font-bold">
                                    {product.price}
                                </span>
                            </div>

                            <Button
                                size="sm"
                                className="
                                    relative z-20 
                                    bg-white/20 text-white border border-white/40 
                                    hover:bg-white/30 hover:border-white/60
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                "
                                isLoading={loading}
                                isDisabled={loading}
                                startContent={
                                    loading ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        <ShoppingCart size={16} />
                                    )
                                }
                                onPress={() => onPurchase(productType)}
                            >
                                {getButtonText(productType)}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}