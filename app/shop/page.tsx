// src/app/shop/page.tsx - Minimalist shop with Canvas particle system

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
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

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    type: 'star' | 'circle' | 'spark';
    opacity: number;
    rotation: number;
    rotationSpeed: number;
}

// Custom hook for particle system
const useParticleSystem = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
    const particlesRef = useRef<Particle[]>([]);
    const animationRef = useRef<number>();
    const isActiveRef = useRef(false);

    const createParticle = useCallback((x: number, y: number, type: Particle['type'] = 'star'): Particle => {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 4;
        
        return {
            id: Math.random(),
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: Math.random() * 60 + 40,
            size: Math.random() * 4 + 2,
            type,
            opacity: 1,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10
        };
    }, []);

    const updateParticles = useCallback(() => {
        particlesRef.current = particlesRef.current.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.2; // gravity
            particle.vx *= 0.99; // air resistance
            particle.vy *= 0.99;
            particle.life -= 1;
            particle.opacity = particle.life / particle.maxLife;
            particle.rotation += particle.rotationSpeed;
            
            return particle.life > 0;
        });
    }, []);

    const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation * Math.PI / 180);

        switch (particle.type) {
            case 'star':
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i * Math.PI * 2) / 5;
                    const x = Math.cos(angle) * particle.size;
                    const y = Math.sin(angle) * particle.size;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                    
                    const innerAngle = ((i + 0.5) * Math.PI * 2) / 5;
                    const innerX = Math.cos(innerAngle) * particle.size * 0.5;
                    const innerY = Math.sin(innerAngle) * particle.size * 0.5;
                    ctx.lineTo(innerX, innerY);
                }
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'circle':
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'spark':
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = particle.size * 0.5;
                ctx.beginPath();
                ctx.moveTo(-particle.size, 0);
                ctx.lineTo(particle.size, 0);
                ctx.stroke();
                break;
        }
        
        ctx.restore();
    }, []);

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        updateParticles();
        
        particlesRef.current.forEach(particle => {
            drawParticle(ctx, particle);
        });

        if (isActiveRef.current || particlesRef.current.length > 0) {
            animationRef.current = requestAnimationFrame(animate);
        }
    }, [canvasRef, updateParticles, drawParticle]);

    const explode = useCallback((x: number, y: number, count: number = 30) => {
        const types: Particle['type'][] = ['star', 'circle', 'spark'];
        
        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            particlesRef.current.push(createParticle(x, y, type));
        }
        
        isActiveRef.current = true;
        if (!animationRef.current) {
            animate();
        }
    }, [createParticle, animate]);

    const stop = useCallback(() => {
        isActiveRef.current = false;
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = undefined;
        }
        particlesRef.current = [];
    }, []);

    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return { explode, stop };
};

export default function ShopPage() {
    const router = useRouter();
    const { user, refreshUser } = useUser();
    const t = useT();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { explode, stop } = useParticleSystem(canvasRef);

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

    // Setup canvas size
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

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

                // Trigger particle explosion on success
                const canvas = canvasRef.current;
                if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    explode(rect.width / 2, rect.height / 2, 50);
                }

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

    const handleBack = () => {
        stop();
        router.push("/main");
    };

    const product = PRODUCTS.additional_attempts;
    const isDisabled = purchaseState.isLoading || purchaseState.isProcessing;

    return (
        <div className="min-h-screen bg-black text-white relative">
            {/* Particle Canvas */}
            <canvas
                ref={canvasRef}
                className="fixed inset-0 pointer-events-none z-10"
                style={{ mixBlendMode: 'screen' }}
            />

            <div className="relative z-20 px-6 pt-20 pb-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <button 
                        onClick={handleBack} 
                        className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={16} />
                        <span>{t('common.back')}</span>
                    </button>
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

                    {/* Purchase Section */}
                    <div className="bg-white/5 border border-white/20 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <Zap className="text-white" size={20} />
                                <span className="text-white">{t('shop.moreAttempts')}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Star className="text-yellow-400" size={16} fill="currentColor" />
                                <span className="text-yellow-400 font-bold">{product.price}</span>
                            </div>
                        </div>

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
                                    <CreditCard size={16} />
                                    <span>{t('shop.purchase', { price: `${product.price}` })}</span>
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
                            {t('shop.paymentDetails.0')}
                        </p>
                        <p className="text-white/30 text-xs">
                            {t('shop.paymentDetails.1')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}