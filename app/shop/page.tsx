// src/app/shop/page.tsx - Simplified shop page without animations

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Zap,
    AlertCircle,
    Star,
    CreditCard
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { purchaseService } from "@/lib/purchaseService";
import { PRODUCTS } from "@/types/purchases";
import type { CreateInvoiceResponse } from "@/types/purchases";
import { useT } from "@/contexts/LocalizationContext";

interface PurchaseState {
    isLoading: boolean;
    isProcessing: boolean;
    error: string | null;
}

export default function ShopPage() {
    const router = useRouter();
    const { user, refreshUser } = useUser();
    const t = useT();

    const [purchaseState, setPurchaseState] = useState<PurchaseState>({
        isLoading: false,
        isProcessing: false,
        error: null
    });

    const [attemptsRemaining, setAttemptsRemaining] = useState<number>(user?.attempts_remaining || 0);

    useEffect(() => {
        setAttemptsRemaining(user?.attempts_remaining || 0);
    }, [user]);

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

    const handlePurchaseAttempts = async () => {
        if (purchaseState.isLoading || purchaseState.isProcessing) return;

        setPurchaseState({ isLoading: true, isProcessing: false, error: null });

        try {
            const invoiceResult: CreateInvoiceResponse = await purchaseService.createInvoice('additional_attempts');
            if (!invoiceResult.success || !invoiceResult.invoice_url) {
                throw new Error(invoiceResult.error || t('errors.createInvoice'));
            }

            setPurchaseState(prev => ({ ...prev, isLoading: false, isProcessing: true }));

            const paymentResult = await purchaseService.openInvoice(invoiceResult.invoice_url);

            if (paymentResult) {
                await purchaseService.checkPurchaseStatus();
                await refreshUser();
                setAttemptsRemaining(user?.attempts_remaining || 0);
                setPurchaseState({ isLoading: false, isProcessing: false, error: null });
            } else {
                setPurchaseState({
                    isLoading: false,
                    isProcessing: false,
                    error: t('errors.paymentCancelled')
                });
            }

        } catch (error) {
            setPurchaseState({
                isLoading: false,
                isProcessing: false,
                error: error instanceof Error ? error.message : t('errors.unknownError')
            });
        }
    };

    const product = PRODUCTS.additional_attempts;
    const isDisabled = purchaseState.isLoading || purchaseState.isProcessing;

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="px-6 pt-20 pb-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-lg font-semibold">{t('shop.title')}</h1>
                </div>

                {/* Main Content */}
                <div className="max-w-md mx-auto space-y-8">
                    {/* Current Attempts */}
                    <div className="text-center">
                        <div className="text-sm text-white/60 mb-2">{t('shop.currentAttempts')}</div>
                        <div className="text-6xl font-bold text-white mb-4">{attemptsRemaining}</div>
                        <div className="text-white/40 text-xs">{t('attempts.remaining')}</div>
                    </div>

                    {/* Product Card */}
                    <div className="bg-white/5 border border-white/20 rounded-xl p-6">
                        <div className="flex items-center space-x-2 mb-4">
                            <Zap className="text-white" size={16} />
                            <span className="text-white font-medium">{t('shop.moreAttempts')}</span>
                        </div>

                        <div className="w-full h-px bg-white/20 mb-4"></div>

                        <p className="text-white/70 text-sm mb-6">{t('shop.description')}</p>

                        <button
                            onClick={handlePurchaseAttempts}
                            disabled={isDisabled}
                            className={`
                                w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
                                ${isDisabled
                                    ? 'bg-white/10 text-white/50 cursor-not-allowed'
                                    : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                                }
                            `}
                        >
                            {purchaseState.isLoading || purchaseState.isProcessing ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span className="text-sm">
                                        {purchaseState.isLoading
                                            ? t('shop.creatingInvoice')
                                            : t('shop.processingPayment')
                                        }
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center space-x-2">
                                    <Star className="text-yellow-400" size={16} fill="currentColor" />
                                    <span>{product.price}</span>
                                    <CreditCard size={16} />
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Error Display */}
                    {purchaseState.error && (
                        <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4">
                            <div className="flex items-center space-x-2">
                                <AlertCircle size={16} className="text-red-400" />
                                <span className="text-red-400 text-sm">{purchaseState.error}</span>
                            </div>
                        </div>
                    )}

                    {/* Payment Info */}
                    <div className="text-center space-y-2">
                        <p className="text-white/40 text-xs">
                            Payments processed via Telegram Stars
                        </p>
                        <p className="text-white/30 text-xs">
                            Attempts added instantly after payment
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}