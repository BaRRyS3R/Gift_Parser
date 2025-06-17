// src/app/shop/page.tsx - Enhanced shop with beautiful animations

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    ShoppingCart,
    Zap,
    CheckCircle,
    AlertCircle,
    Star,
    Sparkles,
    Plus,
    CreditCard,
    Clock,
    Gift
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
    success: boolean;
}

interface SuccessAnimationState {
    showAnimation: boolean;
    animationPhase: 'initial' | 'explosion' | 'collection' | 'complete';
    particles: Array<{
        id: number;
        x: number;
        y: number;
        vx: number;
        vy: number;
        scale: number;
        opacity: number;
        rotation: number;
    }>;
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
    const [successAnimation, setSuccessAnimation] = useState<SuccessAnimationState>({
        showAnimation: false,
        animationPhase: 'initial',
        particles: []
    });

    const pageRef = useRef<HTMLDivElement>(null);
    const successSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setAttemptsRemaining(user?.attempts_remaining || 0);
    }, [user]);

    // Success animation effect
    useEffect(() => {
        if (purchaseState.success && !successAnimation.showAnimation) {
            triggerSuccessAnimation();
        }
    }, [purchaseState.success]);

    // Clean up animation states
    useEffect(() => {
        if (purchaseState.success || purchaseState.error) {
            const timer = setTimeout(() => {
                setPurchaseState(prev => ({ ...prev, error: null, success: false }));
                setSuccessAnimation({
                    showAnimation: false,
                    animationPhase: 'initial',
                    particles: []
                });
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [purchaseState.success, purchaseState.error]);

    const triggerSuccessAnimation = () => {
        // Generate particles for explosion effect
        const particles = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            x: 50,
            y: 50,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            scale: Math.random() * 0.5 + 0.5,
            opacity: 1,
            rotation: Math.random() * 360
        }));

        setSuccessAnimation({
            showAnimation: true,
            animationPhase: 'initial',
            particles
        });

        // Animation sequence
        setTimeout(() => {
            setSuccessAnimation(prev => ({ ...prev, animationPhase: 'explosion' }));
        }, 200);

        setTimeout(() => {
            setSuccessAnimation(prev => ({ ...prev, animationPhase: 'collection' }));
        }, 1000);

        setTimeout(() => {
            setSuccessAnimation(prev => ({ ...prev, animationPhase: 'complete' }));
        }, 2000);

        // Scroll to success section
        setTimeout(() => {
            if (successSectionRef.current) {
                successSectionRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 300);
    };

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
        <div ref={pageRef} className="min-h-screen bg-black text-white">
            {/* Success Animation Overlay */}
            {successAnimation.showAnimation && (
                <div className="fixed inset-0 z-50 pointer-events-none">
                    <div className="relative w-full h-full overflow-hidden">
                        {/* Particles */}
                        {successAnimation.particles.map(particle => (
                            <div
                                key={particle.id}
                                className={`absolute w-3 h-3 transition-all duration-1000 ${successAnimation.animationPhase === 'explosion'
                                        ? 'animate-bounce'
                                        : successAnimation.animationPhase === 'collection'
                                            ? 'animate-pulse'
                                            : ''
                                    }`}
                                style={{
                                    left: `${particle.x + (successAnimation.animationPhase === 'explosion' ? particle.vx * 2 : 0)}%`,
                                    top: `${particle.y + (successAnimation.animationPhase === 'explosion' ? particle.vy * 2 : 0)}%`,
                                    transform: `scale(${particle.scale}) rotate(${particle.rotation}deg)`,
                                    opacity: successAnimation.animationPhase === 'complete' ? 0 : particle.opacity,
                                }}
                            >
                                <Star className="text-white" fill="white" />
                            </div>
                        ))}

                        {/* Central burst effect */}
                        <div
                            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${successAnimation.animationPhase === 'explosion'
                                    ? 'scale-150 opacity-100'
                                    : 'scale-0 opacity-0'
                                }`}
                        >
                            <div className="relative">
                                <Sparkles className="text-white w-12 h-12 animate-spin" />
                                <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-6 pt-20 pb-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={handleBack}
                        className="group flex items-center space-x-3 text-white/70 hover:text-white transition-all duration-300 hover:scale-105"
                    >
                        <ArrowLeft size={20} className="transition-transform duration-300 group-hover:-translate-x-1" />
                        <span className="font-medium">{t('common.back')}</span>
                    </button>

                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                            <ShoppingCart size={20} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-wide">{t('shop.title')}</h1>
                    </div>
                </div>

                {/* Current Attempts Display */}
                <div className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Zap className="text-white" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{t('shop.currentAttempts')}</h2>
                                    <p className="text-white/60 text-sm">{t('shop.subtitle')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-bold text-white mb-1">{attemptsRemaining}</div>
                                <div className="text-white/60 text-sm uppercase tracking-wider">{t('attempts.remaining')}</div>
                            </div>
                        </div>

                        {/* Progress bar visualization */}
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-white/40 to-white/60 h-full transition-all duration-1000 ease-out rounded-full"
                                style={{ width: `${Math.min(100, (attemptsRemaining / 10) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Product Card */}
                <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8 relative overflow-hidden group hover:border-white/40 transition-all duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-white/20 to-white/30 rounded-2xl flex items-center justify-center shadow-lg">
                                    <Zap className="text-white" size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{t('shop.moreAttempts')}</h3>
                                    <p className="text-white/70">{t('shop.description')}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="flex items-center space-x-2 mb-2">
                                    <Star className="text-yellow-400" size={20} fill="currentColor" />
                                    <span className="text-2xl font-bold text-yellow-400">{product.price}</span>
                                </div>
                                <div className="text-white/60 text-sm">Telegram Stars</div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
                                <Gift size={16} />
                                <span>{t('shop.features')}</span>
                            </h4>
                            <div className="space-y-2">
                                {product.benefits.map((benefit, index) => (
                                    <div key={index} className="flex items-center space-x-3">
                                        <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                                        <span className="text-white/80">{benefit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            <button
                                onClick={handlePurchaseAttempts}
                                disabled={isDisabled}
                                className={`
                                    flex-1 relative overflow-hidden group/btn py-4 px-6 rounded-xl font-bold text-lg 
                                    transition-all duration-300 border-2
                                    ${isDisabled
                                        ? 'bg-white/10 border-white/20 text-white/50 cursor-not-allowed'
                                        : 'bg-white/5 border-white/30 text-white hover:bg-white/15 hover:border-white/50 hover:scale-105 active:scale-95'
                                    }
                                `}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>

                                <div className="relative z-10 flex items-center justify-center space-x-3">
                                    {purchaseState.isLoading || purchaseState.isProcessing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>
                                                {purchaseState.isLoading
                                                    ? t('shop.creatingInvoice')
                                                    : t('shop.processingPayment')
                                                }
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard size={20} />
                                            <span>{t('shop.purchase', { price: `${product.price}` })}</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Success/Error Feedback */}
                {(purchaseState.success || purchaseState.error) && (
                    <div
                        ref={successSectionRef}
                        className={`
                            mb-8 p-6 rounded-2xl border backdrop-blur-sm transition-all duration-500 transform
                            ${purchaseState.success
                                ? 'bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/30 translate-y-0 opacity-100'
                                : 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/30'
                            }
                            ${successAnimation.showAnimation ? 'animate-pulse' : ''}
                        `}
                    >
                        {purchaseState.success ? (
                            <div className="text-center space-y-4">
                                <div className="relative">
                                    <CheckCircle
                                        size={48}
                                        className={`text-green-400 mx-auto transition-all duration-1000 ${successAnimation.animationPhase === 'explosion' ? 'scale-125 animate-bounce' : 'scale-100'
                                            }`}
                                    />
                                    {successAnimation.animationPhase === 'explosion' && (
                                        <div className="absolute inset-0 bg-green-400/20 rounded-full animate-ping"></div>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-2xl font-bold text-green-400 mb-2">
                                        {t('shop.purchaseSuccessful')}
                                    </h3>
                                    <p className="text-green-300/80">
                                        {t('shop.attemptAdded')}
                                    </p>
                                </div>

                                <div className="flex items-center justify-center space-x-4 pt-4">
                                    <div className="flex items-center space-x-2">
                                        <Plus className="text-green-400" size={20} />
                                        <span className="text-2xl font-bold text-green-400">1</span>
                                    </div>
                                    <div className="w-px h-8 bg-green-400/30"></div>
                                    <div className="flex items-center space-x-2">
                                        <Zap className="text-white" size={20} />
                                        <span className="text-xl font-bold text-white">{attemptsRemaining}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-4">
                                <AlertCircle size={24} className="text-red-400 flex-shrink-0" />
                                <div>
                                    <h3 className="text-lg font-bold text-red-400 mb-1">
                                        {t('shop.purchaseFailed')}
                                    </h3>
                                    <p className="text-red-300/80 text-sm">
                                        {purchaseState.error}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Payment Information */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                        <CreditCard size={18} />
                        <span>{t('shop.paymentInfo')}</span>
                    </h3>
                    <div className="space-y-3">
                        {[
                            "• Payments processed via Telegram Stars",
                            "• Attempts added instantly after payment",
                            "• Secure payment through Telegram",
                            "• No limit on attempts you can have",
                            "• No recurring charges"
                        ].map((detail, index) => (
                            <div key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-white/60 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-white/70 text-sm">{detail}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}