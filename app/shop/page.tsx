// src/app/shop/page.tsx - Enhanced with localization

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Zap, CheckCircle, AlertCircle, Star, Battery } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { purchaseService } from "@/lib/purchaseService";
import { PRODUCTS } from "@/types/purchases";
import type { CreateInvoiceResponse } from "@/types/purchases";
import { useT } from "@/contexts/LocalizationContext";

interface PurchaseState {
    isLoading: boolean;
    isProcessing: boolean;
    error: string | null;
    success: boolean;
}

export default function ShopPage() {
    const router = useRouter();
    const { user, refreshUser } = useUser();
    const t = useT();
    const [purchaseState, setPurchaseState] = useState<PurchaseState>({
        isLoading: false,
        isProcessing: false,
        error: null,
        success: false
    });

    const attemptsRemaining = user?.attempts_remaining || 0;

    // Сброс состояния покупки через некоторое время
    useEffect(() => {
        if (purchaseState.success || purchaseState.error) {
            const timer = setTimeout(() => {
                setPurchaseState(prev => ({
                    ...prev,
                    error: null,
                    success: false
                }));
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [purchaseState.success, purchaseState.error]);

    const handlePurchaseAttempts = async () => {
        if (purchaseState.isLoading || purchaseState.isProcessing) {
            return;
        }

        setPurchaseState({
            isLoading: true,
            isProcessing: false,
            error: null,
            success: false
        });

        try {
            console.log('Initiating purchase for additional attempts...');

            // Создаем инвойс
            const invoiceResult: CreateInvoiceResponse = await purchaseService.createInvoice('additional_attempts');

            if (!invoiceResult.success || !invoiceResult.invoice_url) {
                throw new Error(invoiceResult.error || t('errors.createInvoice'));
            }

            console.log('Invoice created, opening payment interface...');

            setPurchaseState(prev => ({
                ...prev,
                isLoading: false,
                isProcessing: true
            }));

            // Открываем инвойс для оплаты
            const paymentResult = await purchaseService.openInvoice(invoiceResult.invoice_url);

            if (paymentResult) {
                console.log('Payment completed successfully');

                setPurchaseState({
                    isLoading: false,
                    isProcessing: false,
                    error: null,
                    success: true
                });

                // Обновляем данные пользователя после успешной покупки
                await refreshUser();

                // Дополнительная проверка статуса покупки
                await purchaseService.checkPurchaseStatus();

            } else {
                console.log('Payment was cancelled or failed');

                setPurchaseState({
                    isLoading: false,
                    isProcessing: false,
                    error: t('errors.paymentCancelled'),
                    success: false
                });
            }

        } catch (error) {
            console.error('Purchase error:', error);

            setPurchaseState({
                isLoading: false,
                isProcessing: false,
                error: error instanceof Error ? error.message : t('errors.unknownError'),
                success: false
            });
        }
    };

    const handleBack = () => {
        router.push("/main");
    };

    const product = PRODUCTS.additional_attempts;
    const isDisabled = purchaseState.isLoading || purchaseState.isProcessing;
    const isEmpty = attemptsRemaining === 0;
    const isLow = attemptsRemaining <= 2 && attemptsRemaining > 0;

    // Dynamic battery display based on current attempts
    const getBatteryLevel = () => {
        if (attemptsRemaining <= 0) return 0;
        if (attemptsRemaining <= 5) return (attemptsRemaining / 5) * 100;
        return 100; // Full battery for 5+ attempts
    };

    const getBatteryColor = () => {
        if (isEmpty) return "text-red-400";
        if (isLow) return "text-orange-400";
        return "text-green-400";
    };

    const getBatteryBgColor = () => {
        if (isEmpty) return "bg-red-500/20 border-red-400/40";
        if (isLow) return "bg-orange-500/20 border-orange-400/40";
        return "bg-green-500/20 border-green-400/40";
    };

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={handleBack}
                        className="flex items-center space-x-2 px-4 py-2 bg-transparent border border-white/30 text-white/80 rounded-lg hover:bg-white/5 hover:border-white/50 hover:text-white transition-all duration-300"
                    >
                        <ArrowLeft size={16} />
                        <span>{t('common.back')}</span>
                    </button>

                    <div className="flex items-center space-x-3">
                        <ShoppingCart className="text-white" size={24} />
                        <h1 className="text-2xl font-bold text-white">{t('shop.title')}</h1>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-white/60 text-sm uppercase tracking-wider">
                        {t('shop.subtitle')}
                    </p>
                </div>
            </div>

            {/* Current Attempts Display */}
            <div className="mb-6">
                <div className={`backdrop-blur-sm border rounded-xl p-6 transition-all duration-300 ${getBatteryBgColor()}`}>
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-3">
                            <Battery className={getBatteryColor()} size={24} />
                            <span className={`text-lg font-bold ${getBatteryColor()}`}>
                                {t('shop.currentAttempts')}
                            </span>
                        </div>

                        <div className="text-4xl font-bold text-white">
                            {attemptsRemaining}
                        </div>

                        <div className="w-full max-w-xs mx-auto">
                            <div className={`w-full h-3 rounded-full overflow-hidden ${isEmpty
                                ? "bg-red-400/20"
                                : isLow
                                    ? "bg-orange-400/20"
                                    : "bg-green-400/20"
                                }`}>
                                <div
                                    className={`h-full transition-all duration-500 ${getBatteryColor().replace('text-', 'bg-')}`}
                                    style={{ width: `${getBatteryLevel()}%` }}
                                />
                            </div>

                            {/* Attempt indicators - show up to 10, then just display number */}
                            {attemptsRemaining <= 10 ? (
                                <div className="flex justify-center space-x-1 mt-2">
                                    {Array.from({ length: Math.min(10, Math.max(5, attemptsRemaining)) }, (_, i) => (
                                        <div
                                            key={i}
                                            className={`w-2 h-2 rounded-full ${i < attemptsRemaining
                                                ? getBatteryColor().replace('text-', 'bg-')
                                                : "bg-white/20"
                                                }`}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center mt-2">
                                    <span className={`text-sm ${getBatteryColor()}`}>
                                        {attemptsRemaining} {t('attempts.total')}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="text-center">
                            {isEmpty && (
                                <p className="text-red-400/80 text-sm">
                                    {t('attempts.noRemaining')}
                                </p>
                            )}
                            {isLow && !isEmpty && (
                                <p className="text-orange-400/80 text-sm">
                                    {t('attempts.lowRemaining')}
                                </p>
                            )}
                            {attemptsRemaining > 5 && (
                                <p className="text-green-400/80 text-sm">
                                    {t('attempts.plenty')}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Purchase Status Messages */}
            {(purchaseState.error || purchaseState.success) && (
                <div className={`mb-6 p-4 rounded-xl backdrop-blur-sm border transition-all duration-300 ${purchaseState.success
                    ? "bg-green-500/20 border-green-400/40 text-green-300"
                    : "bg-red-500/20 border-red-400/40 text-red-300"
                    }`}>
                    <div className="flex items-center space-x-3">
                        {purchaseState.success ? (
                            <CheckCircle size={20} />
                        ) : (
                            <AlertCircle size={20} />
                        )}
                        <div className="flex-1">
                            <div className="font-bold">
                                {purchaseState.success ? t('shop.purchaseSuccessful') : t('shop.purchaseFailed')}
                            </div>
                            <div className="text-sm">
                                {purchaseState.success
                                    ? t('shop.attemptAdded')
                                    : purchaseState.error
                                }
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Card */}
            <div className="space-y-6">
                <div className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl p-6">
                    <div className="text-center space-y-6">
                        {/* Product Icon */}
                        <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto">
                            <Zap className="text-yellow-400" size={32} />
                        </div>

                        {/* Product Info */}
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">
                                {t('shop.moreAttempts')}
                            </h2>
                            <p className="text-white/70 text-sm">
                                {t('shop.description')}
                            </p>
                        </div>

                        {/* Product Features */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">
                                {t('shop.features')}
                            </h3>
                            <div className="space-y-2">
                                {product.benefits.map((benefit, index) => (
                                    <div key={index} className="flex items-center space-x-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/80" />
                                        <span className="text-white/80 text-sm">
                                            {t(`shop.benefits.${index}` as any)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Price and Purchase */}
                        <div className="space-y-4 pt-4 border-t border-white/20">
                            <div className="flex items-center justify-center space-x-2">
                                <Star className="text-yellow-400" size={20} />
                                <span className="text-2xl font-bold text-yellow-400">
                                    {product.price}
                                </span>
                                <span className="text-white/60 text-sm">
                                    Telegram Stars
                                </span>
                            </div>

                            <button
                                className={`
                  relative w-full px-8 py-4 bg-transparent border-2 rounded-xl text-lg font-bold 
                  transition-all duration-500 hover:scale-105 active:scale-95
                  ${isDisabled
                                        ? "border-white/30 text-white/50 cursor-not-allowed"
                                        : "border-yellow-400/60 text-yellow-300 hover:border-yellow-400 hover:bg-yellow-400/10"
                                    }
                `}
                                disabled={isDisabled}
                                onClick={handlePurchaseAttempts}
                                type="button"
                                aria-label={t('shop.purchase', { price: product.price })}
                            >
                                <div className="flex items-center justify-center space-x-3">
                                    {purchaseState.isLoading ? (
                                        <div className="w-5 h-5 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                                    ) : purchaseState.isProcessing ? (
                                        <div className="w-5 h-5 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                                    ) : (
                                        <ShoppingCart size={20} />
                                    )}
                                    <span className="tracking-wider">
                                        {purchaseState.isLoading
                                            ? t('shop.creatingInvoice')
                                            : purchaseState.isProcessing
                                                ? t('shop.processingPayment')
                                                : t('shop.purchase', { price: `${product.price} ⭐` })
                                        }
                                    </span>
                                </div>

                                {/* Button glow effect */}
                                {!isDisabled && (
                                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/20 via-yellow-400/5 to-yellow-400/20 rounded-xl blur opacity-0 hover:opacity-100 transition duration-1000" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                    <div className="text-center space-y-2">
                        <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">
                            {t('shop.paymentInfo')}
                        </h3>
                        <div className="space-y-1 text-xs text-white/60">
                            {product.benefits.map((_, index) => (
                                <p key={index}>
                                    {t(`shop.paymentDetails.${index}` as any)}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}