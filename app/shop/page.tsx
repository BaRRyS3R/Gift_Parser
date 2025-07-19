// src/app/shop/page.tsx - Исправленная версия с улучшенной обработкой ошибок
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardFooter, Button, Chip } from "@nextui-org/react";
import ConfettiExplosion from "react-confetti-explosion";
import {
    AlertCircle,
    Star,
    CheckCircle,
    Clock,
    ShoppingCart,
    Loader2,
    Wifi,
    WifiOff
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { PRODUCTS, ProductType } from "@/types/purchases";
import type { CreateInvoiceResponse } from "@/types/purchases";
import { useT } from "@/contexts/LocalizationContext";

interface PurchaseState {
    isLoading: boolean;
    isProcessing: boolean;
    error: string | null;
    loadingProduct: ProductType | null;
    retryCount: number;
}

interface SuccessNotification {
    show: boolean;
    title: string;
    message: string;
    icon: React.ReactNode;
}

// Enum для типов ошибок
enum ErrorType {
    NETWORK = 'network',
    PAYMENT = 'payment',
    TIMEOUT = 'timeout',
    INVALID_INVOICE = 'invalid_invoice',
    AUTHENTICATION = 'authentication',
    UNKNOWN = 'unknown'
}

const getAuthToken = (): string => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('auth_access_token') || '';
    }
    return '';
};

export default function ShopPage() {
    const router = useRouter();
    const { user, refreshUser, authState } = useUser();
    const t = useT();
    const [isExploding, setIsExploding] = useState(false);

    const [purchaseState, setPurchaseState] = useState<PurchaseState>({
        isLoading: false,
        isProcessing: false,
        error: null,
        loadingProduct: null,
        retryCount: 0
    });

    const [successNotification, setSuccessNotification] = useState<SuccessNotification>({
        show: false,
        title: "",
        message: "",
        icon: null
    });

    // Проверка аутентификации
    useEffect(() => {
        if (!authState.isAuthenticated) {
            console.log('Пользователь не аутентифицирован, перенаправление на главную страницу');
            router.push('/');
            return;
        }
    }, [authState.isAuthenticated, router]);

    useEffect(() => {
        if (purchaseState.error) {
            const timer = setTimeout(() => {
                setPurchaseState(prev => ({ ...prev, error: null }));
            }, 6000);
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

    // Функция для определения типа ошибки
    const categorizeError = (error: any): { type: ErrorType; message: string } => {
        const errorMessage = error?.message || error?.toString() || '';

        if (errorMessage.includes('timeout') || errorMessage.includes('таймаут')) {
            return {
                type: ErrorType.TIMEOUT,
                message: 'Время ожидания платежа истекло. Попробуйте еще раз.'
            };
        }

        if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('NetworkError')) {
            return {
                type: ErrorType.NETWORK,
                message: 'Проблема с сетевым соединением. Проверьте интернет-подключение и попробуйте снова.'
            };
        }

        if (errorMessage.includes('401') || errorMessage.includes('authentication') || errorMessage.includes('аутентификация')) {
            return {
                type: ErrorType.AUTHENTICATION,
                message: 'Сессия истекла. Пожалуйста, перезапустите приложение.'
            };
        }

        if (errorMessage.includes('Invalid invoice') || errorMessage.includes('платёжный счёт') || errorMessage.includes('invoice')) {
            return {
                type: ErrorType.INVALID_INVOICE,
                message: 'Ошибка создания платежа. Платежная система временно недоступна.'
            };
        }

        if (errorMessage.includes('Payment') || errorMessage.includes('платеж') || errorMessage.includes('payment')) {
            return {
                type: ErrorType.PAYMENT,
                message: 'Ошибка обработки платежа. Проверьте баланс Telegram Stars и попробуйте снова.'
            };
        }

        return {
            type: ErrorType.UNKNOWN,
            message: 'Произошла неизвестная ошибка. Попробуйте еще раз через несколько минут.'
        };
    };

    const showSuccessNotification = (product: ProductType) => {
        const productInfo = PRODUCTS[product];
        const isInstantReset = productInfo.is_instant_reset;

        const icon = isInstantReset ?
            <Clock className="text-green-400" size={32} /> :
            <CheckCircle className="text-green-400" size={32} />;

        const title = isInstantReset ?
            'Попытки восстановлены!' :
            'Покупка успешна!';

        const attemptsText = productInfo.attempts_bonus || 0;
        const plural = attemptsText === 1 ? 'попытка' : attemptsText < 5 ? 'попытки' : 'попыток';

        const message = isInstantReset ?
            'Ваши попытки восстановлены и кулдаун сброшен!' :
            `Добавлено ${attemptsText} ${plural}!`;

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
        }, 4000);
    };

    // Улучшенная функция создания инвойса с валидацией
    const createInvoiceWithValidation = async (productType: ProductType): Promise<string> => {
        const authToken = getAuthToken();
        if (!authToken) {
            throw new Error('Токен аутентификации не найден');
        }

        const response = await fetch('/api/shop/create-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                productType,
                initData: window.Telegram?.WebApp?.initData || ''
            }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('authentication');
            }
            if (response.status === 503) {
                throw new Error('Платежная система временно недоступна');
            }
            throw new Error(`HTTP ошибка: ${response.status}`);
        }

        const result: CreateInvoiceResponse = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Не удалось создать инвойс');
        }

        if (!result.invoice_url) {
            throw new Error('Отсутствует URL инвойса');
        }

        // Валидация URL инвойса
        if (!result.invoice_url.startsWith('https://t.me/')) {
            throw new Error('Invalid invoice URL format');
        }

        return result.invoice_url;
    };

    // Улучшенная функция открытия инвойса с таймаутом
    const openInvoiceWithTimeout = async (invoiceUrl: string): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('timeout'));
            }, 120000); // 2 минуты таймаут

            try {
                if (typeof window === "undefined") {
                    clearTimeout(timeout);
                    reject(new Error("Window object not available"));
                    return;
                }

                if (!window.Telegram?.WebApp) {
                    console.warn("Telegram WebApp недоступен, открываем в новой вкладке");
                    window.open(invoiceUrl, "_blank");
                    clearTimeout(timeout);
                    resolve(true);
                    return;
                }

                const tg = window.Telegram.WebApp;

                if (tg.openInvoice) {
                    console.log("Открываем инвойс через Telegram WebApp API");

                    tg.openInvoice(invoiceUrl, (status: string) => {
                        clearTimeout(timeout);
                        console.log("Статус инвойса:", status);

                        switch (status) {
                            case "paid":
                                console.log("Платеж успешен");
                                resolve(true);
                                break;
                            case "cancelled":
                                console.log("Платеж отменен пользователем");
                                resolve(false);
                                break;
                            case "failed":
                                console.log("Платеж не удался");
                                resolve(false);
                                break;
                            default:
                                console.log("Неизвестный статус платежа:", status);
                                resolve(false);
                                break;
                        }
                    });
                } else {
                    console.log("openInvoice API недоступен, используем fallback");
                    window.open(invoiceUrl, "_blank");
                    clearTimeout(timeout);
                    resolve(true);
                }
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    };

    // Функция обработки платежа с улучшенной валидацией
    const processPaymentWithValidation = async (productType: ProductType, paymentResult: boolean): Promise<void> => {
        const authToken = getAuthToken();
        if (!authToken) {
            throw new Error('authentication');
        }

        const response = await fetch('/api/shop/process-purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                productType,
                paymentResult
            }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('authentication');
            }
            throw new Error(`HTTP ошибка при обработке платежа: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Ошибка обработки платежа');
        }
    };

    const handlePurchase = async (productType: ProductType) => {
        if (purchaseState.isLoading || purchaseState.isProcessing || !authState.isAuthenticated) return;

        setPurchaseState({
            isLoading: true,
            isProcessing: false,
            error: null,
            loadingProduct: productType,
            retryCount: 0
        });

        try {
            console.log('Создание инвойса через API для продукта:', productType);

            // Шаг 1: Создание инвойса с валидацией
            const invoiceUrl = await createInvoiceWithValidation(productType);

            setPurchaseState(prev => ({
                ...prev,
                isLoading: false,
                isProcessing: true
            }));

            // Шаг 2: Открытие инвойса с таймаутом
            const paymentResult = await openInvoiceWithTimeout(invoiceUrl);

            // Шаг 3: Обработка результата
            if (paymentResult) {
                await processPaymentWithValidation(productType, true);
                await refreshUser();
                showSuccessNotification(productType);

                setPurchaseState({
                    isLoading: false,
                    isProcessing: false,
                    error: null,
                    loadingProduct: null,
                    retryCount: 0
                });
            } else {
                setPurchaseState({
                    isLoading: false,
                    isProcessing: false,
                    error: 'Платеж был отменен или не удался.',
                    loadingProduct: null,
                    retryCount: 0
                });
            }
        } catch (error) {
            console.error('Ошибка покупки:', error);

            const { type, message } = categorizeError(error);

            // Автоматический retry для сетевых ошибок
            if (type === ErrorType.NETWORK && purchaseState.retryCount < 2) {
                console.log(`Повтор попытки ${purchaseState.retryCount + 1}/3`);
                setPurchaseState(prev => ({
                    ...prev,
                    retryCount: prev.retryCount + 1
                }));

                setTimeout(() => {
                    handlePurchase(productType);
                }, 2000);
                return;
            }

            // Для критических ошибок - перенаправление
            if (type === ErrorType.AUTHENTICATION) {
                router.push('/');
                return;
            }

            setPurchaseState({
                isLoading: false,
                isProcessing: false,
                error: message,
                loadingProduct: null,
                retryCount: 0
            });
        }
    };

    const getProductBadge = (productType: ProductType) => {
        switch (productType) {
            case 'attempts_5': return { text: 'Популярно', textKey: 'shop.badges.popular' };
            case 'attempts_10': return { text: 'Выгодно', textKey: 'shop.badges.bestvalue' };
            case 'attempts_100': return { text: 'Топ', textKey: 'shop.badges.ultimate' };
            default: return null;
        }
    };

    const isLoading = (productType: ProductType) => {
        return purchaseState.loadingProduct === productType &&
            (purchaseState.isLoading || purchaseState.isProcessing);
    };

    const getLoadingText = (productType: ProductType) => {
        if (purchaseState.loadingProduct !== productType) return null;

        if (purchaseState.retryCount > 0) {
            return `Повтор ${purchaseState.retryCount}/3...`;
        }

        return purchaseState.isLoading ? 'Создание платежа...' : 'Обработка платежа...';
    };

    const getButtonText = (productType: ProductType) => {
        const loading = isLoading(productType);
        if (loading) {
            return getLoadingText(productType);
        }
        return 'Купить';
    };

    const getErrorIcon = () => {
        if (!purchaseState.error) return <AlertCircle size={20} className="text-white" />;

        if (purchaseState.error.includes('интернет') || purchaseState.error.includes('сеть')) {
            return <WifiOff size={20} className="text-red-400" />;
        }

        return <AlertCircle size={20} className="text-red-400" />;
    };

    if (!authState.isAuthenticated) {
        return null;
    }

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
                    МАГАЗИН
                </h1>
                <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
                    Получите дополнительные попытки
                </p>
            </div>

            {/* Error message с улучшенным дизайном */}
            {purchaseState.error && (
                <div className="max-w-2xl mx-auto mb-6">
                    <Card className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-400/30 backdrop-blur-md">
                        <CardBody className="p-4">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    {getErrorIcon()}
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-medium">{purchaseState.error}</p>
                                    {purchaseState.retryCount > 0 && (
                                        <p className="text-white/70 text-sm mt-1">
                                            Попытка {purchaseState.retryCount}/3
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}

            <div className="max-w-2xl mx-auto space-y-4">
                {Object.entries(PRODUCTS).map(([key, product]) => {
                    const productType = key as ProductType;
                    const badge = getProductBadge(productType);
                    const loading = isLoading(productType);

                    return (
                        <ProductCard
                            key={productType}
                            productType={productType}
                            product={product}
                            badge={badge}
                            loading={loading}
                            onPurchase={handlePurchase}
                            getButtonText={getButtonText}
                            disabled={purchaseState.isLoading || purchaseState.isProcessing}
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
                    <Card className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-400/30 backdrop-blur-md shadow-2xl">
                        <CardBody className="p-4">
                            <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
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
    getButtonText: (productType: ProductType) => string | null;
    disabled: boolean;
}

function ProductCard({
    productType,
    product,
    badge,
    loading,
    onPurchase,
    getButtonText,
    disabled
}: ProductCardProps) {

    return (
        <Card
            className={`
                relative overflow-hidden
                bg-gradient-to-r from-white/10 to-white/5 border border-white/20
                hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
                transition-all duration-200
                ${disabled ? 'opacity-60' : ''}
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
                                        {product.title}
                                    </h3>
                                    {badge && (
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            className="bg-white/20 text-white border border-white/30"
                                        >
                                            {badge.text}
                                        </Chip>
                                    )}
                                </div>
                                <p className="text-white/70 text-sm">
                                    {product.description}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Star className="text-yellow-400" size={16} />
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
                                isDisabled={loading || disabled}
                                startContent={
                                    loading ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        <ShoppingCart size={16} />
                                    )
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