// src/app/shop/page.tsx - Новый дизайн магазина с карточками и уведомлениями

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardFooter, Button } from "@nextui-org/react";
import ConfettiExplosion from "react-confetti-explosion";
import {
    Zap,
    AlertCircle,
    Star,
    CreditCard,
    CheckCircle,
    X,
    ExternalLink,
    Clock,
    Crown,
    Gem,
    Flame
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { purchaseService } from "@/lib/purchaseService";
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

export default function ShopPage() {
    const router = useRouter();
    const { user, refreshUser } = useUser();
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

    useEffect(() => {
        if (purchaseState.error) {
            const timer = setTimeout(() => {
                setPurchaseState(prev => ({ ...prev, error: null }));
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [purchaseState.error]);

    useEffect(() => {
        // Setup Telegram WebApp back button
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
            t('shop.instantResetSuccess') :
            t('shop.purchaseSuccess');

        const attemptsText = productInfo.attempts_bonus || 0;
        const plural = attemptsText > 1 ? 's' : '';

        const message = isInstantReset ?
            t('shop.instantResetMessage') :
            t('shop.purchaseSuccessMessage', {
                attempts: attemptsText,
                plural: plural
            });

        setSuccessNotification({
            show: true,
            title,
            message,
            icon
        });

        // Показываем конфетти
        setIsExploding(true);
        setTimeout(() => {
            setIsExploding(false);
        }, 2000);

        // Скрываем уведомление через 3 секунды
        setTimeout(() => {
            setSuccessNotification(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    const handlePurchase = async (productType: ProductType) => {
        if (purchaseState.isLoading || purchaseState.isProcessing) return;

        setPurchaseState({
            isLoading: true,
            isProcessing: false,
            error: null,
            loadingProduct: productType
        });

        try {
            const invoiceResult: CreateInvoiceResponse = await purchaseService.createInvoice(productType);

            if (!invoiceResult.success || !invoiceResult.invoice_url) {
                throw new Error(invoiceResult.error || t('errors.createInvoice'));
            }

            setPurchaseState(prev => ({
                ...prev,
                isLoading: false,
                isProcessing: true
            }));

            const paymentResult = await purchaseService.openInvoice(invoiceResult.invoice_url);

            if (paymentResult) {
                await purchaseService.checkPurchaseStatus();
                await refreshUser();

                showSuccessNotification(productType);

                setPurchaseState({
                    isLoading: false,
                    isProcessing: false,
                    error: null,
                    loadingProduct: null
                });
            } else {
                setPurchaseState({
                    isLoading: false,
                    isProcessing: false,
                    error: t('errors.paymentCancelled'),
                    loadingProduct: null
                });
            }
        } catch (error) {
            setPurchaseState({
                isLoading: false,
                isProcessing: false,
                error: error instanceof Error ? error.message : t('errors.unknownError'),
                loadingProduct: null
            });
        }
    };

    const getProductIcon = (productType: ProductType) => {
        switch (productType) {
            case 'attempts_1': return <Zap className="text-blue-400" size={24} />;
            case 'attempts_5': return <Flame className="text-orange-400" size={24} />;
            case 'attempts_10': return <Gem className="text-purple-400" size={24} />;
            case 'attempts_100': return <Crown className="text-yellow-400" size={24} />;
            case 'instant_reset': return <Clock className="text-green-400" size={24} />;
            default: return <Star className="text-white" size={24} />;
        }
    };

    const getProductBadge = (productType: ProductType) => {
        switch (productType) {
            case 'attempts_5': return { text: 'Popular', color: 'bg-orange-500/20 text-orange-300 border-orange-400/30' };
            case 'attempts_10': return { text: 'Best Value', color: 'bg-purple-500/20 text-purple-300 border-purple-400/30' };
            case 'attempts_100': return { text: 'Ultimate', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' };
            case 'instant_reset': return { text: 'Instant', color: 'bg-green-500/20 text-green-300 border-green-400/30' };
            default: return null;
        }
    };

    const isLoading = (productType: ProductType) => {
        return purchaseState.loadingProduct === productType &&
            (purchaseState.isLoading || purchaseState.isProcessing);
    };

    const getLoadingText = (productType: ProductType) => {
        if (purchaseState.loadingProduct !== productType) return null;
        return purchaseState.isLoading ? 'Creating...' : 'Processing...';
    };

    return (
        <div className="min-h-screen bg-black text-white">
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
            
            <div className="px-4 pt-20 pb-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold mb-2">{t('shop.title')}</h1>
                    <p className="text-white/60 text-sm">{t('shop.subtitle')}</p>
                </div>

                {/* Products Grid */}
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 gap-4 mb-8">
                        {Object.entries(PRODUCTS).map(([key, product]) => {
                            const productType = key as ProductType;
                            const badge = getProductBadge(productType);
                            const loading = isLoading(productType);

                            return (
                                <Card 
                                    key={productType}
                                    className="bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/30 transition-all duration-200"
                                    isPressable
                                    onPress={() => handlePurchase(productType)}
                                >
                                    <CardBody className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <div className="flex-shrink-0">
                                                        {getProductIcon(productType)}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white">
                                                            {product.title}
                                                        </h3>
                                                        <p className="text-white/60 text-sm">
                                                            {product.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            {badge && (
                                                <div className={`px-2 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                                                    {badge.text}
                                                </div>
                                            )}
                                        </div>
                                    </CardBody>
                                    <CardFooter className="px-4 py-3 bg-gradient-to-r from-white/10 to-transparent backdrop-blur-sm">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center space-x-1">
                                                <Star className="text-yellow-400" size={16} />
                                                <span className="text-white font-medium">{product.price}</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                color="primary"
                                                isLoading={loading}
                                                className="bg-gradient-to-r from-blue-500 to-purple-500"
                                            >
                                                {loading ? getLoadingText(productType) : t('shop.buy')}
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* Success Notification */}
                {successNotification.show && (
                    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 max-w-sm w-full mx-4">
                        <div className="flex items-center space-x-3">
                            {successNotification.icon}
                            <div>
                                <h4 className="font-bold text-white">{successNotification.title}</h4>
                                <p className="text-white/60 text-sm">{successNotification.message}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Notification */}
                {purchaseState.error && (
                    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-lg p-4 max-w-sm w-full mx-4">
                        <div className="flex items-center space-x-3">
                            <AlertCircle className="text-red-400" size={24} />
                            <p className="text-white">{purchaseState.error}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}