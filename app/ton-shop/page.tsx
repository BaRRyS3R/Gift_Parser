// src/app/ton-shop/page.tsx - Основная страница TON Shop

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardBody, Button, Chip, Spinner } from "@nextui-org/react";
import {
  useTonWallet,
  useTonConnectModal,
  useTonConnectUI,
} from "@tonconnect/ui-react";
import { Wallet, CheckCircle, Clock, AlertCircle, Star } from "lucide-react";

import {
  TONProductsResponse,
  CreateTONOrderResponse,
  TON_CONFIG,
} from "@/types/ton-payments";
import { ProductType } from "@/types/purchases";

// Интерфейсы для состояния компонента
interface UserInfo {
  telegramId: number;
  firstName: string;
  attemptsRemaining: number;
}

interface TONProduct {
  productType: ProductType;
  attempts: number;
  title: string;
  description: string;
  priceNanotons: bigint;
  priceTON: string;
}

interface OrderState {
  orderId: string | null;
  isCreating: boolean;
  isPending: boolean;
  isCompleted: boolean;
  error: string | null;
}

// Основной компонент TON Shop
function TONShopContent() {
  const searchParams = useSearchParams();
  const wallet = useTonWallet();
  const { open: openModal } = useTonConnectModal();
  const [tonConnectUI] = useTonConnectUI(); // Move hook call to top level

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

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    if (!initData) {
      setError(
        "Missing authentication data. Please access this page through the main app.",
      );
      setIsLoading(false);

      return;
    }

    loadTONShopData();
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
              "Order monitoring timeout. Please check your transaction status manually.",
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
   * Загрузка данных TON Shop
   */
  const loadTONShopData = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(
        `/api/ton/products?initData=${encodeURIComponent(initData!)}`,
      );

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.error || "Failed to load TON shop data");
      }

      const data: TONProductsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load TON shop data");
      }

      setUserInfo(data.user!);
      setProducts(data.products!);

      console.log("[TON_SHOP] Data loaded successfully:", {
        user: data.user!.firstName,
        productsCount: data.products!.length,
      });
    } catch (error) {
      console.error("[TON_SHOP] Error loading data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load shop data",
      );
    } finally {
      setIsLoading(false);
    }
  };

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

        throw new Error(errorData.error || "Failed to create order");
      }

      const data: CreateTONOrderResponse = await response.json();

      if (!data.success || !data.order) {
        throw new Error(data.error || "Failed to create order");
      }

      console.log("[TON_SHOP] Order created:", data.order.id);

      // Подготавливаем транзакцию для TON кошелька
      await sendTONTransaction(data.order);

      setOrderState((prev) => ({
        ...prev,
        orderId: data.order!.id,
        isCreating: false,
        isPending: true,
      }));
    } catch (error) {
      console.error("[TON_SHOP] Error creating order:", error);
      setOrderState((prev) => ({
        ...prev,
        isCreating: false,
        error:
          error instanceof Error ? error.message : "Failed to create order",
      }));
    }
  };

  /**
   * Отправка TON транзакции
   */
  const sendTONTransaction = async (order: CreateTONOrderResponse["order"]) => {
    if (!wallet) {
      throw new Error("Wallet not connected");
    }

    if (!order) {
      throw new Error("Invalid order data");
    }

    try {
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300, // 5 минут
        messages: [
          {
            address: order.payment.destinationWallet,
            amount: order.payment.amountNanotons,
            payload: order.payment.payload,
          },
        ],
      };

      console.log("[TON_SHOP] Sending transaction:", {
        orderId: order.id,
        amount: order.payment.amount,
        destination: order.payment.destinationWallet,
        payload: order.payment.payload,
      });

      // Отправляем транзакцию через TON Connect UI
      const result = await tonConnectUI.sendTransaction(transaction);

      console.log("[TON_SHOP] Transaction sent:", result);
    } catch (error) {
      console.error("[TON_SHOP] Error sending transaction:", error);
      throw new Error("Failed to send transaction");
    }
  };

  /**
   * Проверка статуса заказа
   */
  const checkOrderStatus = async (orderId: string) => {
    try {
      const response = await fetch(`/api/ton/order-status/${orderId}`);

      if (!response.ok) {
        throw new Error("Failed to check order status");
      }

      const data = await response.json();

      if (data.success && data.order) {
        if (data.order.status === "completed") {
          setOrderState((prev) => ({
            ...prev,
            isPending: false,
            isCompleted: true,
          }));

          // Обновляем информацию о пользователе
          await loadTONShopData();

          console.log("[TON_SHOP] Order completed:", orderId);
        }
      }
    } catch (error) {
      console.error("[TON_SHOP] Error checking order status:", error);
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
          <p className="text-white/70">Loading TON Shop...</p>
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
            <h2 className="text-xl font-bold text-white">Error Loading Shop</h2>
            <p className="text-white/70">{error}</p>
            <Button
              className="bg-white/20 text-white border border-white/40"
              onPress={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold text-white">TON Shop</h1>
          <p className="text-white/60 text-sm uppercase tracking-[0.3em]">
            Purchase game attempts with TON
          </p>
        </div>

        {/* User Info */}
        {userInfo && (
          <Card className="bg-white/10 border border-white/20 mb-6">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">
                    Welcome, {userInfo.firstName}!
                  </h3>
                  <p className="text-white/70 text-sm">
                    Current attempts: {userInfo.attemptsRemaining}
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

        {/* Wallet Connection */}
        <Card className="bg-white/10 border border-white/20 mb-6">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Wallet className="text-white" size={24} />
                <div>
                  <h3 className="font-bold text-white">TON Wallet</h3>
                  <p className="text-white/70 text-sm">
                    {wallet
                      ? "Connected"
                      : "Connect your TON wallet to make purchases"}
                  </p>
                </div>
              </div>
              {!wallet && (
                <Button
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onPress={openModal}
                >
                  Connect Wallet
                </Button>
              )}
              {wallet && (
                <Chip className="bg-green-600/20 text-green-300 border border-green-600/30">
                  Connected
                </Chip>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Order Status */}
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
                    <h4 className="font-bold text-white">Creating Order...</h4>
                    <p className="text-white/70 text-sm">
                      Preparing your purchase
                    </p>
                  </div>
                </div>
              )}

              {orderState.isPending && (
                <div className="flex items-center space-x-3">
                  <Clock className="text-yellow-400 animate-pulse" size={24} />
                  <div>
                    <h4 className="font-bold text-white">
                      Payment Processing...
                    </h4>
                    <p className="text-white/70 text-sm">
                      Your transaction is being processed. This may take up to 5
                      minutes.
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
                        Payment Successful!
                      </h4>
                      <p className="text-white/70 text-sm">
                        Your attempts have been added to your account.
                      </p>
                    </div>
                  </div>
                  <Button
                    className="bg-white/20 text-white border border-white/40"
                    onPress={resetOrderState}
                  >
                    New Purchase
                  </Button>
                </div>
              )}

              {orderState.error && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="text-red-400" size={24} />
                    <div>
                      <h4 className="font-bold text-white">Payment Error</h4>
                      <p className="text-white/70 text-sm">
                        {orderState.error}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="bg-white/20 text-white border border-white/40"
                    onPress={resetOrderState}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Products Grid */}
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

      {/* Info Section */}
      <div className="max-w-4xl mx-auto mt-8">
        <Card className="bg-white/5 border border-white/10">
          <CardBody className="p-6 text-center">
            <h3 className="font-bold text-white mb-2">Important Information</h3>
            <p className="text-white/70 text-sm mb-4">
              • Payments are processed automatically within 5 minutes
              <br />
              • You can safely close this page after payment
              <br />
              • Attempts will be visible in the main app after processing
              <br />• You will receive a notification when the payment is
              complete
            </p>
            <p className="text-white/50 text-xs">
              Corporate wallet: {TON_CONFIG.CORPORATE_WALLET}
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
          text: "Popular",
          color: "bg-blue-600/20 text-blue-300 border-blue-600/30",
        };
      case "attempts_10":
        return {
          text: "Best Value",
          color: "bg-green-600/20 text-green-300 border-green-600/30",
        };
      case "attempts_100":
        return {
          text: "Ultimate",
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
      ${
        isSelected
          ? "border-blue-500 bg-blue-500/10"
          : "hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10"
      }
      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
    `}
    >
      <CardBody className="p-6">
        <div className="space-y-4">
          {/* Header with badge */}
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

          {/* Price and purchase */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Star className="text-yellow-400" size={20} />
              <span className="text-white font-bold text-xl">
                {product.priceTON} TON
              </span>
            </div>

            <Button
              className={`
                ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white/20 text-white border border-white/40 hover:bg-white/30"
                }
              `}
              isDisabled={disabled}
              onPress={onSelect}
            >
              {isSelected ? "Processing..." : "Buy with TON"}
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
            <p className="text-white/70">Loading TON Shop...</p>
          </div>
        </div>
      }
    >
      <TONShopContent />
    </Suspense>
  );
}
