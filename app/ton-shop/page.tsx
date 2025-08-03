// src/app/ton-shop/page.tsx - Полностью исправленная версия с правильным форматом транзакций

"use client";

import "./ton-shop.css";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardBody, Button, Chip, Spinner } from "@nextui-org/react";
import {
    useTonWallet,
    useTonConnectModal,
    useTonConnectUI,
    TonConnectButton,
} from "@tonconnect/ui-react";
import { Wallet, CheckCircle, Clock, AlertCircle, Star } from "lucide-react";
// ВАЖНО: Импортируем необходимые функции для работы с Cell
import { beginCell } from "@ton/core";

import {
    CreateTONOrderResponse,
    TON_CONFIG,
    getTONProductInfo,
} from "@/types/ton-payments";
import { ProductType } from "@/types/purchases";
import { parseTelegramInitData } from "@/lib/telegram-auth";

// Интерфейсы для состояния компонента
interface UserInfo {
    telegramId: number;
    firstName: string;
    attemptsRemaining?: number;
}

interface TONProduct {
    productType: ProductType;
    attempts: number;
    title: string;
    description: string;
    priceNanotons: string;
    priceTON: string;
}

interface OrderState {
    orderId: string | null;
    isCreating: boolean;
    isPending: boolean;
    isCompleted: boolean;
    error: string | null;
}

// Встроенный каталог продуктов
const EMBEDDED_PRODUCTS: ProductType[] = [
    "attempts_1",
    "attempts_5",
    "attempts_10",
    "attempts_100",
];

// Основной компонент TON Shop
function TONShopContent() {
    const searchParams = useSearchParams();
    const wallet = useTonWallet();
    const { open: openModal } = useTonConnectModal();
    const [tonConnectUI] = useTonConnectUI();

    // Состояние компонента
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [products, setProducts] = useState<TONProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(
        null,
    );
    const [orderState, setOrderState] = useState<OrderState>({
        orderId: null,
        isCreating: false,
        isPending: false,
        isCompleted: false,
        error: null,
    });

    // Получение initData из URL параметров
    const initData = searchParams.get("initdata");

    // Инициализация при монтировании компонента
    useEffect(() => {
        if (!initData) {
            setError(
                "Отсутствуют данные аутентификации. Пожалуйста, откройте эту страницу через основное приложение.",
            );
            setIsLoading(false);
            return;
        }

        // Парсим данные пользователя из initData
        try {
            const parseResult = parseTelegramInitData(decodeURIComponent(initData));

            if (!parseResult.success || !parseResult.user) {
                setError("Неверные данные аутентификации");
                setIsLoading(false);
                return;
            }

            // Устанавливаем информацию о пользователе
            setUserInfo({
                telegramId: parseResult.user.id,
                firstName: parseResult.user.first_name,
            });

            // Загружаем встроенный каталог продуктов
            const embeddedProducts = EMBEDDED_PRODUCTS.map(productType => {
                const productInfo = getTONProductInfo(productType);
                return {
                    ...productInfo,
                    priceNanotons: productInfo.priceNanotons
                };
            });
            setProducts(embeddedProducts);

            console.log("[TON_SHOP] Инициализирован с встроенным каталогом:", {
                user: parseResult.user.first_name,
                productsCount: embeddedProducts.length,
            });

            setIsLoading(false);
        } catch (error) {
            console.error("[TON_SHOP] Ошибка инициализации:", error);
            setError("Не удалось инициализировать магазин");
            setIsLoading(false);
        }
    }, [initData]);

    // Мониторинг статуса заказа
    useEffect(() => {
        if (orderState.orderId && orderState.isPending) {
            const interval = setInterval(() => {
                checkOrderStatus(orderState.orderId!);
            }, 10000); // Проверяем каждые 10 секунд

            // Очистка через 5 минут
            const timeout = setTimeout(
                () => {
                    clearInterval(interval);
                    setOrderState((prev) => ({
                        ...prev,
                        isPending: false,
                        error:
                            "Время ожидания истекло. Пожалуйста, проверьте статус транзакции вручную.",
                    }));
                },
                5 * 60 * 1000,
            );

            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }
    }, [orderState.orderId, orderState.isPending]);

    /**
     * Создание TON заказа
     */
    const createTONOrder = async (productType: ProductType) => {
        try {
            setOrderState((prev) => ({ ...prev, isCreating: true, error: null }));

            const response = await fetch("/api/ton/create-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    initData: initData!,
                    productType,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Не удалось создать заказ");
            }

            const data: CreateTONOrderResponse = await response.json();

            if (!data.success || !data.order) {
                throw new Error(data.error || "Не удалось создать заказ");
            }

            console.log("[TON_SHOP] Заказ создан:", data.order.id);

            // Отправляем транзакцию в TON кошелек
            await sendTONTransaction(data.order);

            setOrderState((prev) => ({
                ...prev,
                orderId: data.order!.id,
                isCreating: false,
                isPending: true,
            }));
        } catch (error) {
            console.error("[TON_SHOP] Ошибка создания заказа:", error);
            setOrderState((prev) => ({
                ...prev,
                isCreating: false,
                error:
                    error instanceof Error ? error.message : "Не удалось создать заказ",
            }));
        }
    };

    /**
     * ИСПРАВЛЕННАЯ функция отправки TON транзакции
     */
    const sendTONTransaction = async (order: CreateTONOrderResponse["order"]) => {
        if (!wallet) {
            throw new Error("Кошелек не подключен");
        }

        if (!order) {
            throw new Error("Неверные данные заказа");
        }

        try {
            console.log("[TON_SHOP] Подготовка транзакции для заказа:", order.id);

            // ВАЖНО: Создаем правильный payload с комментарием
            let payloadBase64: string | undefined;

            if (order.payment.payload) {
                // Создаем Cell с комментарием по стандарту TON
                const commentCell = beginCell()
                    .storeUint(0, 32) // Записываем 32 нулевых бита для обозначения текстового комментария
                    .storeStringTail(order.payment.payload) // Записываем сам комментарий (ID заказа)
                    .endCell();

                // Конвертируем в base64
                payloadBase64 = commentCell.toBoc().toString('base64');

                console.log("[TON_SHOP] Payload создан:", {
                    orderId: order.payment.payload,
                    base64: payloadBase64
                });
            }

            // Формируем транзакцию в правильном формате
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 300, // 5 минут
                messages: [
                    {
                        address: order.payment.destinationWallet,
                        amount: order.payment.amountNanotons, // Уже строка из API
                        payload: payloadBase64 // Base64 закодированный Cell с комментарием
                    }
                ]
            };

            console.log("[TON_SHOP] Отправка транзакции:", {
                orderId: order.id,
                amountTON: order.payment.amount,
                amountNanotons: order.payment.amountNanotons,
                destination: order.payment.destinationWallet,
                hasPayload: !!payloadBase64,
                validUntil: transaction.validUntil
            });

            // Отправляем транзакцию через TON Connect UI
            const result = await tonConnectUI.sendTransaction(transaction);

            console.log("[TON_SHOP] Транзакция отправлена успешно:", result);

            return result;
        } catch (error) {
            console.error("[TON_SHOP] Ошибка отправки транзакции:", error);

            // Обработка специфических ошибок
            if (error instanceof Error) {
                if (error.message.includes("User rejects")) {
                    throw new Error("Транзакция отменена пользователем");
                }
                if (error.message.includes("Insufficient balance")) {
                    throw new Error("Недостаточно TON на балансе кошелька");
                }
            }

            throw new Error("Не удалось отправить транзакцию. Пожалуйста, попробуйте снова.");
        }
    };

    /**
     * Проверка статуса заказа
     */
    const checkOrderStatus = async (orderId: string) => {
        try {
            const response = await fetch(`/api/ton/order-status/${orderId}`);

            if (!response.ok) {
                throw new Error("Не удалось проверить статус заказа");
            }

            const data = await response.json();

            if (data.success && data.order) {
                if (data.order.status === "completed") {
                    setOrderState((prev) => ({
                        ...prev,
                        isPending: false,
                        isCompleted: true,
                    }));

                    console.log("[TON_SHOP] Заказ выполнен:", orderId);
                }
            }
        } catch (error) {
            console.error("[TON_SHOP] Ошибка проверки статуса заказа:", error);
        }
    };

    /**
     * Обработка выбора товара
     */
    const handleProductSelect = async (productType: ProductType) => {
        if (!wallet) {
            openModal();
            return;
        }

        setSelectedProduct(productType);
        await createTONOrder(productType);
    };

    /**
     * Сброс состояния заказа
     */
    const resetOrderState = () => {
        setOrderState({
            orderId: null,
            isCreating: false,
            isPending: false,
            isCompleted: false,
            error: null,
        });
        setSelectedProduct(null);
    };

    // Обработка состояний загрузки и ошибок
    if (isLoading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Spinner color="white" size="lg" />
                    <p className="text-white/70">Загрузка TON Shop...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
                <Card className="bg-white/10 border border-white/20 max-w-md">
                    <CardBody className="text-center space-y-4">
                        <AlertCircle className="mx-auto text-red-400" size={48} />
                        <h2 className="text-xl font-bold text-white">Ошибка загрузки магазина</h2>
                        <p className="text-white/70">{error}</p>
                        <Button
                            className="bg-white/20 text-white border border-white/40"
                            onPress={() => window.location.reload()}
                        >
                            Повторить
                        </Button>
                    </CardBody>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-4">
            {/* Заголовок */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="text-center space-y-4 mb-8">
                    <h1 className="text-4xl font-bold text-white">TON Shop</h1>
                    <p className="text-white/60 text-sm uppercase tracking-[0.3em]">
                        Покупка игровых попыток за TON
                    </p>
                </div>

                {/* Информация о пользователе */}
                {userInfo && (
                    <Card className="bg-white/10 border border-white/20 mb-6">
                        <CardBody className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-white">
                                        Добро пожаловать, {userInfo.firstName}!
                                    </h3>
                                    <p className="text-white/70 text-sm">
                                        Выберите пакет для покупки попыток
                                    </p>
                                </div>
                                <Chip
                                    className="bg-white/20 text-white border border-white/30"
                                    size="sm"
                                >
                                    Telegram ID: {userInfo.telegramId}
                                </Chip>
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* Подключение кошелька */}
                <Card className="bg-white/10 border border-white/20 mb-6">
                    <CardBody className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Wallet className="text-white" size={24} />
                                <div>
                                    <h3 className="font-bold text-white">TON Кошелек</h3>
                                    <p className="text-white/70 text-sm">
                                        {wallet
                                            ? "Подключен"
                                            : "Подключите кошелек для совершения покупок"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <TonConnectButton
                                    className="ton-connect-button"
                                    style={{ float: 'none' }}
                                />
                                {wallet && (
                                    <Chip className="bg-green-600/20 text-green-300 border border-green-600/30">
                                        Подключен
                                    </Chip>
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Статус заказа */}
            {(orderState.isCreating ||
                orderState.isPending ||
                orderState.isCompleted ||
                orderState.error) && (
                    <div className="max-w-4xl mx-auto mb-6">
                        <Card className="bg-white/10 border border-white/20">
                            <CardBody className="p-4">
                                {orderState.isCreating && (
                                    <div className="flex items-center space-x-3">
                                        <Spinner color="white" size="sm" />
                                        <div>
                                            <h4 className="font-bold text-white">Создание заказа...</h4>
                                            <p className="text-white/70 text-sm">
                                                Подготовка вашей покупки
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {orderState.isPending && (
                                    <div className="flex items-center space-x-3">
                                        <Clock className="text-yellow-400 animate-pulse" size={24} />
                                        <div>
                                            <h4 className="font-bold text-white">
                                                Обработка платежа...
                                            </h4>
                                            <p className="text-white/70 text-sm">
                                                Ваша транзакция обрабатывается. Это может занять до 5 минут.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {orderState.isCompleted && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <CheckCircle className="text-green-400" size={24} />
                                            <div>
                                                <h4 className="font-bold text-white">
                                                    Платеж успешно завершен!
                                                </h4>
                                                <p className="text-white/70 text-sm">
                                                    Ваши попытки добавлены на аккаунт.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            className="bg-white/20 text-white border border-white/40"
                                            onPress={resetOrderState}
                                        >
                                            Новая покупка
                                        </Button>
                                    </div>
                                )}

                                {orderState.error && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <AlertCircle className="text-red-400" size={24} />
                                            <div>
                                                <h4 className="font-bold text-white">Ошибка платежа</h4>
                                                <p className="text-white/70 text-sm">
                                                    {orderState.error}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            className="bg-white/20 text-white border border-white/40"
                                            onPress={resetOrderState}
                                        >
                                            Попробовать снова
                                        </Button>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                )}

            {/* Сетка продуктов */}
            <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((product) => (
                        <ProductCard
                            key={product.productType}
                            disabled={
                                !wallet || orderState.isCreating || orderState.isPending
                            }
                            isSelected={selectedProduct === product.productType}
                            product={product}
                            onSelect={() => handleProductSelect(product.productType)}
                        />
                    ))}
                </div>
            </div>

            {/* Информационный раздел */}
            <div className="max-w-4xl mx-auto mt-8">
                <Card className="bg-white/5 border border-white/10">
                    <CardBody className="p-6 text-center">
                        <h3 className="font-bold text-white mb-2">Важная информация</h3>
                        <p className="text-white/70 text-sm mb-4">
                            • Платежи обрабатываются автоматически в течение 5 минут
                            <br />
                            • Вы можете безопасно закрыть эту страницу после оплаты
                            <br />
                            • Попытки будут видны в основном приложении после обработки
                            <br />• Вы получите уведомление, когда платеж будет завершен
                        </p>
                        <p className="text-white/50 text-xs">
                            Корпоративный кошелек: {TON_CONFIG.CORPORATE_WALLET}
                        </p>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}

// Компонент карточки товара
interface ProductCardProps {
    product: TONProduct;
    onSelect: () => void;
    disabled: boolean;
    isSelected: boolean;
}

function ProductCard({
    product,
    onSelect,
    disabled,
    isSelected,
}: ProductCardProps) {
    const getBadge = () => {
        switch (product.productType) {
            case "attempts_5":
                return {
                    text: "Популярный",
                    color: "bg-blue-600/20 text-blue-300 border-blue-600/30",
                };
            case "attempts_10":
                return {
                    text: "Лучшая цена",
                    color: "bg-green-600/20 text-green-300 border-green-600/30",
                };
            case "attempts_100":
                return {
                    text: "Максимум",
                    color: "bg-purple-600/20 text-purple-300 border-purple-600/30",
                };
            default:
                return null;
        }
    };

    const badge = getBadge();

    return (
        <Card
            className={`
      relative overflow-hidden transition-all duration-200
      bg-white/10 border border-white/20
      ${isSelected
                    ? "border-blue-500 bg-blue-500/10"
                    : "hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10"
                }
      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
    `}
        >
            <CardBody className="p-6">
                <div className="space-y-4">
                    {/* Заголовок с badge */}
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="font-bold text-white text-lg mb-1">
                                {product.title}
                            </h3>
                            <p className="text-white/70 text-sm">{product.description}</p>
                        </div>
                        {badge && (
                            <Chip className={`${badge.color} border`} size="sm">
                                {badge.text}
                            </Chip>
                        )}
                    </div>

                    {/* Цена и покупка */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Star className="text-yellow-400" size={20} />
                            <span className="text-white font-bold text-xl">
                                {product.priceTON} TON
                            </span>
                        </div>

                        <Button
                            className={`
                ${isSelected
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white/20 text-white border border-white/40 hover:bg-white/30"
                                }
              `}
                            isDisabled={disabled}
                            onPress={onSelect}
                        >
                            {isSelected ? "Обработка..." : "Купить за TON"}
                        </Button>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

// Главный компонент с Suspense
export default function TONShopPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-black text-white flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Spinner color="white" size="lg" />
                        <p className="text-white/70">Загрузка TON Shop...</p>
                    </div>
                </div>
            }
        >
            <TONShopContent />
        </Suspense>
    );
}