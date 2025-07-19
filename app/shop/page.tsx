// src/app/shop/page.tsx - Обновленная страница покупок с использованием новых API роутов

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Chip } from "@nextui-org/react";
import ConfettiExplosion from "react-confetti-explosion";
import {
    AlertCircle,
    Star,
    CheckCircle,
    Clock,
    ShoppingCart
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { usePurchase } from "@/hooks/modules/usePurchase";
import { PRODUCTS, ProductType } from "@/types/purchases";
import { useT } from "@/contexts/LocalizationContext";

interface SuccessNotification {
    show: boolean;
    title: string;
    message: string;
    icon: React.ReactNode;
}

export default function ShopPage() {
    const router = useRouter();
    const { user, refreshUser, makeAuthenticatedRequest } = useUser();
    const t = useT();
    
    // Use new purchase hook
    const purchaseModule = usePurchase(makeAuthenticatedRequest);
    
    const [isExploding, setIsExploding] = useState(false);
    const [successNotification, setSuccessNotification] = useState<SuccessNotification>({
        show: false,
        title: "",
        message: "",
        icon: null
    });

    // Clear errors after 4 seconds
    useEffect(() => {
        if (purchaseModule.error) {
            const timer = setTimeout(() => {
                purchaseModule.clearError();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [purchaseModule.error, purchaseModule.clearError]);

    // Setup Telegram WebApp back button
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
        if (purchaseModule.isLoading || purchaseModule.isProcessing) return;

        try {
            console.log(`Processing purchase for product: ${productType}`);
            
            const success = await purchaseModule.processPurchase(productType);

            if (success) {
                // Refresh user data to get updated attempts
                await refreshUser();
                
                // Show success notification
                showSuccessNotification(productType);
                
                console.log(`Purchase completed successfully for product: ${productType}`);
            } else {
                console.log(`Purchase was not completed for product: ${productType}`);
                // Error handling is managed by the purchase module
            }
        } catch (error) {
            console.error('Error in purchase process:', error);
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

    const getButtonText = (productType: ProductType) => {
        const isLoadingThisProduct = purchaseModule.isLoadingProduct(productType);
        
        if (isLoadingThisProduct) {
            if (purchaseModule.isLoading) {
                return t('shop.creatingInvoice');
            } else if (purchaseModule.isProcessing) {
                return t('shop.processingPayment');
            }
        }
        
        return t('shop.buy');
    };

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
            {purchaseModule.error && (
                <div className="max-w-2xl mx-auto mb-6">
                    <Card className="bg-white/10 border border-white/20">
                        <CardBody className="p-4">
                            <div className="flex items-center space-x-2">
                                <AlertCircle size={20} className="text-white" />
                                <span className="text-white">{purchaseModule.error}</span>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}

            <div className="max-w-2xl mx-auto space-y-4">
                {Object.entries(PRODUCTS).map(([key, product]) => {
                    const productType = key as ProductType;
                    const badge = getProductBadge(productType);
                    const isLoadingThisProduct = purchaseModule.isLoadingProduct(productType);

                    return (
                        <ProductCard
                            key={productType}
                            productType={productType}
                            product={product}
                            badge={badge}
                            loading={isLoadingThisProduct}
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
    getButtonText: (productType: ProductType) => string;
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
                                    !loading ? <ShoppingCart size={16} /> : null
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