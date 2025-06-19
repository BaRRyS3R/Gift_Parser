// src/app/shop/page.tsx - Updated shop page without instant reset product

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
        const icon = <CheckCircle className="text-green-400" size={32} />;
        const title = t('shop.notifications.purchaseSuccess');
        const attemptsText = productInfo.attempts_bonus;
        const plural = attemptsText > 1 ? 's' : '';
        const message = t('shop.notifications.purchaseSuccessMessage', {
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
            default: return <Star className="text-white" size={24} />;
        }
    };

    const getProductBadge = (productType: ProductType) => {
        switch (productType) {
            case 'attempts_5': return { text: 'Popular', color: 'bg-orange-500/20 text-orange-300 border-orange-400/30' };
            case 'attempts_10': return { text: 'Best Value', color: 'bg-purple-500/20 text-purple-300 border-purple-400/30' };
            case 'attempts_100': return { text: 'Ultimate', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' };
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

    if (!user) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                    <p className="text-white">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white px-4 py-6 safe-area-inset">
            {isExploding && (
                <div className="fixed inset-0 z-50 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <ConfettiExplosion
                            force={0.8}
                            duration={3000}
                            particleCount={250}
                            width={1600}
                        />
                    </div>
                </div>
            )}

            <div className="max-w-md mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <CreditCard className="text-white" size={20} />
                        </div>
                        <h1 className="text-2xl font-bold text-white">{t('shop.title')}</h1>
                    </div>
                    <p className="text-white/70 text-sm">{t('shop.subtitle')}</p>
                </div>

                <div className="space-y-4">
                    <Card className="bg-white/5 border border-white/20">
                        <CardBody className="p-4">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                                    <Star className="text-white" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white mb-2">{t('shop.moreAttempts')}</h2>
                                    <p className="text-white/60 text-sm">{t('shop.description')}</p>
                                </div>
                                <div className="text-xs text-white/50 space-y-1">
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="text-green-400" size={12} />
                                        <span>Дополнительные игры</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="text-green-400" size={12} />
                                        <span>Мгновенная активация</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="text-green-400" size={12} />
                                        <span>Без срока годности</span>
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                        <CardFooter className="px-4 py-3 bg-gradient-to-r from-white/10 to-transparent backdrop-blur-sm">
                            <div className="w-full text-center">
                                <div className="flex items-center justify-center space-x-2 text-xs text-white/50">
                                    <ExternalLink size={12} />
                                    <span>Powered by Telegram Stars</span>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>

                    {Object.entries(PRODUCTS).map(([key, product]) => {
                        const productType = key as ProductType;
                        const badge = getProductBadge(productType);
                        const loading = isLoading(productType);

                        return (
                            <Card
                                key={productType}
                                className="bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/30 transition-all duration-200"
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
                                                        {t(`shop.products.${productType.replace('_', '')}.title`)}
                                                    </h3>
                                                    <p className="text-white/60 text-sm">
                                                        {t(`shop.products.${productType.replace('_', '')}.description`)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {badge && (
                                            <div className={`px-2 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                                                {t(`shop.badges.${badge.text.replace(/\s+/g, '').toLowerCase()}`)}
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
                                            onPress={() => handlePurchase(productType)}
                                        >
                                            {loading ? getLoadingText(productType) : t('shop.buy')}
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>

                {purchaseState.error && (
                    <Card className="bg-red-500/10 border border-red-400/30">
                        <CardBody className="p-4">
                            <div className="flex items-center space-x-3">
                                <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                                <div>
                                    <p className="text-red-300 text-sm font-medium">{t('shop.purchaseFailed')}</p>
                                    <p className="text-red-400/80 text-xs mt-1">{purchaseState.error}</p>
                                </div>
                                <button
                                    className="text-red-300 hover:text-red-200 ml-auto"
                                    onClick={() => setPurchaseState(prev => ({ ...prev, error: null }))}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </CardBody>
                    </Card>
                )}

                {successNotification.show && (
                    <Card className="bg-green-500/10 border border-green-400/30">
                        <CardBody className="p-4">
                            <div className="flex items-center space-x-3">
                                {successNotification.icon}
                                <div>
                                    <p className="text-green-300 text-sm font-medium">{successNotification.title}</p>
                                    <p className="text-green-400/80 text-xs mt-1">{successNotification.message}</p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                )}

                <div className="text-center pt-4">
                    <Button
                        variant="ghost"
                        className="text-white/60 hover:text-white"
                        onPress={() => router.push("/main")}
                    >
                        {t('common.back')}
                    </Button>
                </div>
            </div>
        </div>
    );
}