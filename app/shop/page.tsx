// src/app/shop/page.tsx - Minimal UI with live attempt refresh + success animation + top padding fix

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Zap, CheckCircle, AlertCircle } from "lucide-react";

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

    const [attemptsRemaining, setAttemptsRemaining] = useState<number>(user?.attempts_remaining || 0);
    const [animateSuccess, setAnimateSuccess] = useState(false);

    const pageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setAttemptsRemaining(user?.attempts_remaining || 0);
    }, [user]);

    useEffect(() => {
        if (purchaseState.success || purchaseState.error) {
            const timer = setTimeout(() => {
                setPurchaseState(prev => ({ ...prev, error: null, success: false }));
                setAnimateSuccess(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [purchaseState.success, purchaseState.error]);

    const handlePurchaseAttempts = async () => {
        if (purchaseState.isLoading || purchaseState.isProcessing) return;

        setPurchaseState({ isLoading: true, isProcessing: false, error: null, success: false });

        try {
            const invoiceResult: CreateInvoiceResponse = await purchaseService.createInvoice('additional_attempts');
            if (!invoiceResult.success || !invoiceResult.invoice_url) {
                throw new Error(invoiceResult.error || t('errors.createInvoice'));
            }

            setPurchaseState(prev => ({ ...prev, isLoading: false, isProcessing: true }));

            const paymentResult = await purchaseService.openInvoice(invoiceResult.invoice_url);

            if (paymentResult) {
                await purchaseService.checkPurchaseStatus();
                const updatedUser = await refreshUser();
                setAttemptsRemaining(user?.attempts_remaining || 0);

                setPurchaseState({ isLoading: false, isProcessing: false, error: null, success: true });
                setAnimateSuccess(true);

                setTimeout(() => {
                    if (pageRef.current) {
                        window.scrollTo({ top: pageRef.current.offsetTop + 80, behavior: 'smooth' });
                    }
                }, 200);
            } else {
                setPurchaseState({ isLoading: false, isProcessing: false, error: t('errors.paymentCancelled'), success: false });
            }

        } catch (error) {
            setPurchaseState({
                isLoading: false,
                isProcessing: false,
                error: error instanceof Error ? error.message : t('errors.unknownError'),
                success: false
            });
        }
    };

    const handleBack = () => router.push("/main");

    const product = PRODUCTS.additional_attempts;
    const isDisabled = purchaseState.isLoading || purchaseState.isProcessing;

    return (
        <div ref={pageRef} className="min-h-screen bg-black text-white px-4 pt-28 pb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={handleBack} className="flex items-center space-x-2 text-white/70 hover:text-white">
                    <ArrowLeft size={16} />
                    <span>{t('common.back')}</span>
                </button>
                <div className="flex items-center space-x-2">
                    <ShoppingCart size={20} />
                    <h1 className="text-lg font-semibold">{t('shop.title')}</h1>
                </div>
            </div>

            {/* Success Animation */}
            {animateSuccess && (
                <div className="w-full h-24 mb-6 bg-gradient-to-r from-green-400/10 to-green-600/10 animate-pulse rounded-xl border border-green-500/30 flex items-center justify-center">
                    <CheckCircle size={32} className="text-green-400" />
                </div>
            )}

            {/* Purchase Feedback */}
            {(purchaseState.error || purchaseState.success) && (
                <div className={`text-sm border px-3 py-2 rounded-md mb-6 ${purchaseState.success ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'} animate-fade-in`}>
                    <div className="flex items-center space-x-2">
                        {purchaseState.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        <span>
                            {purchaseState.success ? t('shop.purchaseSuccessful') : purchaseState.error}
                        </span>
                    </div>
                </div>
            )}

            {/* Minimal Purchase Row */}
            <div className="flex items-center justify-between border border-white/10 rounded-lg px-4 py-3">
                <div className="flex items-center space-x-2">
                    <Zap size={16} className="text-white" />
                    <span className="text-white text-sm">{t('shop.moreAttempts')}</span>
                </div>
                <div className="flex items-center space-x-3">
                    <span className="text-yellow-400 font-semibold">{product.price} ⭐</span>
                    <button
                        onClick={handlePurchaseAttempts}
                        disabled={isDisabled}
                        className={`text-xs px-3 py-1 border rounded transition ${isDisabled ? 'border-white/10 text-white/30 cursor-not-allowed' : 'border-white/30 text-white hover:bg-white/10'}`}
                    >
                        {purchaseState.isLoading || purchaseState.isProcessing
                            ? t('shop.processingPayment')
                            : t('shop.purchase', { price: `${product.price}` })}
                    </button>
                </div>
            </div>
        </div>
    );
}
