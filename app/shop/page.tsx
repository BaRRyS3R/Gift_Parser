// src/app/shop/page.tsx - Новый дизайн магазина с карточками и уведомлениями

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

        // Hide notification after 3 seconds
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
            <div className="px-6 pt-20 pb-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold mb-2">{t('shop.title')}</h1>
                    <p className="text-white/60 text-sm">{t('shop.subtitle')}</p>
                </div>

                {/* Products Grid */}
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {Object.entries(PRODUCTS).map(([key, product]) => {
                            const productType = key as ProductType;
                            const badge = getProductBadge(productType);
                            const loading = isLoading(productType);

                            return (
                                <div
                                    key={productType}
                                    className="relative bg-white/5 border border-white/20 rounded-xl p-4 hover:bg-white/10 hover:border-white/30 transition-all duration-200 group"
                                >
                                    {/* Badge */}
                                    {badge && (
                                        <div className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                                            {badge.text}
                                        </div>
                                    )}

                                    {/* Product Header */}
                                    <div className="flex items-center space-x-3 mb-3">
                                        <div className="flex-shrink-0">
                                            {getProductIcon(productType)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white truncate">
                                                {product.title}
                                            </h3>
                                            <p className="text-white/60 text-xs truncate">
                                                {product.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="flex items-center justify-center mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                                        <Star className="text-yellow-400 mr-2" size={16} fill="currentColor" />
                                        <span className="text-lg font-bold text-white">
                                            {product.price}
                                        </span>
                                    </div>

                                    {/* Purchase Button */}
                                    <button
                                        onClick={() => handlePurchase(productType)}
                                        disabled={loading}
                                        className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {loading ? (
                                            <div className="flex items-center justify-center space-x-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span className="text-sm">{getLoadingText(productType)}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center space-x-2">
                                                <CreditCard size={16} />
                                                <span>Purchase</span>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Error Display */}
                    {purchaseState.error && (
                        <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4 mb-8">
                            <div className="flex items-start space-x-3">
                                <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-red-400 text-sm">{purchaseState.error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Support Section */}
                    <div className="text-center text-white/40 text-xs space-y-2">
                        <p>{t('shop.supportContact')}</p>
                        <a
                            href="https://t.me/mrmrcrowley"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <span>@mrmrcrowley</span>
                            <ExternalLink size={12} />
                        </a>
                        <p className="text-white/30">({t('shop.support')})</p>
                    </div>
                </div>
            </div>

            {/* Success Notification Modal */}
            {successNotification.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-black/90 border border-white/20 rounded-2xl p-8 max-w-sm mx-4 text-center animate-fade-in">
                        <div className="mb-4">
                            {successNotification.icon}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            {successNotification.title}
                        </h3>
                        <p className="text-white/80 text-sm">
                            {successNotification.message}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}