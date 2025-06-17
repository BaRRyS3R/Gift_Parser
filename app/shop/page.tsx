// src/app/shop/page.tsx - Minimalist Monochrome Version

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, CheckCircle, AlertCircle, Battery } from "lucide-react";

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
        success: false,
    });

    const attemptsRemaining = user?.attempts_remaining || 0;

    useEffect(() => {
        if (purchaseState.success || purchaseState.error) {
            const timer = setTimeout(() => {
                setPurchaseState((prev) => ({ ...prev, error: null, success: false }));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [purchaseState.success, purchaseState.error]);

    const handlePurchaseAttempts = async () => {
        if (purchaseState.isLoading || purchaseState.isProcessing) return;

        setPurchaseState({ isLoading: true, isProcessing: false, error: null, success: false });

        try {
            const invoiceResult: CreateInvoiceResponse = await purchaseService.createInvoice("additional_attempts");

            if (!invoiceResult.success || !invoiceResult.invoice_url) {
                throw new Error(invoiceResult.error || t("errors.createInvoice"));
            }

            setPurchaseState({ isLoading: false, isProcessing: true, error: null, success: false });

            const paymentResult = await purchaseService.openInvoice(invoiceResult.invoice_url);

            if (paymentResult) {
                setPurchaseState({ isLoading: false, isProcessing: false, error: null, success: true });
                await refreshUser();
                await purchaseService.checkPurchaseStatus();
            } else {
                setPurchaseState({ isLoading: false, isProcessing: false, error: t("errors.paymentCancelled"), success: false });
            }
        } catch (error) {
            setPurchaseState({
                isLoading: false,
                isProcessing: false,
                error: error instanceof Error ? error.message : t("errors.unknownError"),
                success: false,
            });
        }
    };

    const handleBack = () => router.push("/main");
    const product = PRODUCTS.additional_attempts;
    const isDisabled = purchaseState.isLoading || purchaseState.isProcessing;

    return (
        <div className="min-h-screen bg-black text-white px-4 py-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={handleBack}
                    className="flex items-center space-x-2 text-white/70 hover:text-white transition"
                >
                    <ArrowLeft size={16} />
                    <span>{t("common.back")}</span>
                </button>
                <h1 className="text-xl font-semibold uppercase tracking-wide">{t("shop.title")}</h1>
            </div>

            {/* Attempts Display */}
            <div className="mb-6">
                <div className="flex items-center justify-between text-sm border border-white/10 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <Battery size={16} className="text-white/60" />
                        <span className="uppercase tracking-wide text-white/60">{t("shop.currentAttempts")}:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="font-mono text-white text-lg">{attemptsRemaining}</span>
                        <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-500"
                                style={{ width: `${Math.min(attemptsRemaining, 5) / 5 * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Message */}
            {(purchaseState.error || purchaseState.success) && (
                <div
                    className={`mb-4 px-4 py-3 rounded text-sm border ${purchaseState.success
                        ? "border-green-500 text-green-400"
                        : "border-red-500 text-red-400"
                        }`}
                >
                    {purchaseState.success ? t("shop.purchaseSuccessful") : purchaseState.error}
                </div>
            )}

            {/* Purchase Row */}
            <div className="flex justify-between items-center px-4 py-3 border border-white/10 rounded-lg">
                <div className="text-white/80 text-sm">{t("shop.moreAttempts")}</div>
                <div className="flex items-center space-x-4">
                    <span className="text-yellow-400 font-bold">{product.price} ⭐</span>
                    <button
                        onClick={handlePurchaseAttempts}
                        disabled={isDisabled}
                        className={`text-sm border rounded px-3 py-1 transition-all duration-300 ${isDisabled
                                ? "border-white/20 text-white/30 cursor-not-allowed"
                                : "border-white/40 hover:bg-white/10"
                            }`}
                    >
                        {purchaseState.isLoading || purchaseState.isProcessing
                            ? t("shop.processingPayment")
                            : t("shop.purchase", { price: product.price })}
                    </button>
                </div>
            </div>
        </div>
    );
}
