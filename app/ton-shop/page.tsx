// src/app/ton-shop/page.tsx - Исправления для сброса состояния и кликабельного кошелька

"use client";

import "./ton-shop.css";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardBody, Button, Spinner } from "@nextui-org/react";
import {
  useTonWallet,
  useTonConnectModal,
  useTonConnectUI,
  TonConnectButton,
} from "@tonconnect/ui-react";
import {
  Wallet,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { beginCell } from "@ton/core";

import {
  CreateTONOrderResponse,
  TON_CONFIG,
  getTONProductInfo,
} from "@/types/ton-payments";
import { ProductType } from "@/types/purchases";
import { parseTelegramInitData } from "@/lib/telegram-auth";
import { useT } from "@/contexts/LocalizationContext";

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

const EMBEDDED_PRODUCTS: ProductType[] = [
  "attempts_1",
  "attempts_5",
  "attempts_10",
  "attempts_20",
  "attempts_50",
  "attempts_100",
];

function TONShopContent() {
  const searchParams = useSearchParams();
  const wallet = useTonWallet();
  const { open: openModal } = useTonConnectModal();
  const [tonConnectUI] = useTonConnectUI();
  const t = useT();

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

  const initData = searchParams.get("initdata");

  // Component initialization
  useEffect(() => {
    if (!initData) {
      setError(t("shop.tonShop.errors.missingAuthData"));
      setIsLoading(false);

      return;
    }

    try {
      const parseResult = parseTelegramInitData(decodeURIComponent(initData));

      if (!parseResult.success || !parseResult.user) {
        setError(t("shop.tonShop.errors.invalidAuthData"));
        setIsLoading(false);

        return;
      }

      setUserInfo({
        telegramId: parseResult.user.id,
        firstName: parseResult.user.first_name,
      });

      const embeddedProducts = EMBEDDED_PRODUCTS.map((productType) => {
        const productInfo = getTONProductInfo(productType);

        return {
          ...productInfo,
          priceNanotons: productInfo.priceNanotons,
        };
      });

      setProducts(embeddedProducts);

      setIsLoading(false);
    } catch (error) {
      console.error("[TON_SHOP] Initialization error:", error);
      setError(t("shop.tonShop.errors.initializationFailed"));
      setIsLoading(false);
    }
  }, [initData, t]);

  // Order status monitoring
  useEffect(() => {
    if (orderState.orderId && orderState.isPending) {
      const interval = setInterval(() => {
        checkOrderStatus(orderState.orderId!);
      }, 10000);

      const timeout = setTimeout(
        () => {
          clearInterval(interval);
          setOrderState((prev) => ({
            ...prev,
            isPending: false,
            error: t("shop.tonShop.errors.timeoutExpired"),
          }));
          // Сбрасываем выбранный продукт при таймауте
          setSelectedProduct(null);
        },
        5 * 60 * 1000,
      );

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [orderState.orderId, orderState.isPending, t]);

  const createTONOrder = async (productType: ProductType) => {
    try {
      setOrderState((prev) => ({ ...prev, isCreating: true, error: null }));

      const response = await fetch("/api/ton/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: initData!, productType }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(
          errorData.error || t("shop.tonShop.errors.orderCreationFailed"),
        );
      }

      const data: CreateTONOrderResponse = await response.json();

      if (!data.success || !data.order) {
        throw new Error(
          data.error || t("shop.tonShop.errors.orderCreationFailed"),
        );
      }

      await sendTONTransaction(data.order);

      setOrderState((prev) => ({
        ...prev,
        orderId: data.order!.id,
        isCreating: false,
        isPending: true,
      }));
    } catch (error) {
      console.error("[TON_SHOP] Order creation error:", error);
      setOrderState((prev) => ({
        ...prev,
        isCreating: false,
        error:
          error instanceof Error
            ? error.message
            : t("shop.tonShop.errors.orderCreationFailed"),
      }));
      // ИСПРАВЛЕНИЕ: Сбрасываем выбранный продукт при ошибке
      setSelectedProduct(null);
    }
  };

  const sendTONTransaction = async (order: CreateTONOrderResponse["order"]) => {
    if (!wallet) {
      throw new Error(t("shop.tonShop.errors.walletNotConnected"));
    }

    if (!order) {
      throw new Error(t("shop.tonShop.errors.invalidOrderData"));
    }

    try {
      let payloadBase64: string | undefined;

      if (order.payment.payload) {
        const commentCell = beginCell()
          .storeUint(0, 32)
          .storeStringTail(order.payment.payload)
          .endCell();

        payloadBase64 = commentCell.toBoc().toString("base64");
      }

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: order.payment.destinationWallet,
            amount: order.payment.amountNanotons,
            payload: payloadBase64,
          },
        ],
      };

      const result = await tonConnectUI.sendTransaction(transaction);

      return result;
    } catch (error) {
      console.error("[TON_SHOP] Transaction error:", error);

      // ИСПРАВЛЕНИЕ: Сбрасываем выбранный продукт при ошибке транзакции
      setSelectedProduct(null);

      if (error instanceof Error) {
        if (error.message.includes("User rejects")) {
          throw new Error(t("shop.tonShop.errors.transactionCancelled"));
        }
        if (error.message.includes("Insufficient balance")) {
          throw new Error(t("shop.tonShop.errors.insufficientBalance"));
        }
      }

      throw new Error(t("shop.tonShop.errors.transactionFailed"));
    }
  };

  const checkOrderStatus = async (orderId: string) => {
    try {
      const response = await fetch(`/api/ton/order-status/${orderId}`);

      if (!response.ok) {
        throw new Error(t("shop.tonShop.errors.statusCheckFailed"));
      }

      const data = await response.json();

      if (data.success && data.order && data.order.status === "completed") {
        setOrderState((prev) => ({
          ...prev,
          isPending: false,
          isCompleted: true,
        }));
      }
    } catch (error) {
      console.error("[TON_SHOP] Order status check error:", error);
    }
  };

  const handleProductSelect = async (productType: ProductType) => {
    if (!wallet) {
      openModal();

      return;
    }

    setSelectedProduct(productType);
    await createTONOrder(productType);
  };

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

  // НОВАЯ ФУНКЦИЯ: Открытие кошелька в tonviewer
  const openWalletViewer = () => {
    const walletViewerUrl = `https://tonviewer.com/${TON_CONFIG.CORPORATE_WALLET}`;

    window.open(walletViewerUrl, "_blank", "noopener,noreferrer");
  };

  const goBack = () => {
    if (window.opener) {
      window.close();
    } else {
      window.history.back();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner color="white" size="lg" />
          <p className="text-white/70">{t("shop.tonShop.loading")}</p>
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
            <h2 className="text-xl font-bold text-white">
              {t("shop.tonShop.errors.loadingError")}
            </h2>
            <p className="text-white/70">{error}</p>
            <Button
              className="bg-white/20 text-white border border-white/40"
              onPress={() => window.location.reload()}
            >
              {t("common.retry")}
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header Section */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
              onClick={goBack}
            >
              <ArrowLeft size={20} />
              <span className="text-sm">{t("common.back")}</span>
            </button>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">
                {t("shop.tonShop.title")}
              </h1>
              <p className="text-white/50 text-xs">
                {t("shop.tonShop.subtitle")}
              </p>
            </div>

            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Wallet Connection Section */}
        <Card className="bg-white/5 border border-white/10">
          <CardBody className="p-4 space-y-4">
            <div className="flex items-center space-x-3">
              <Wallet className="text-blue-400 flex-shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-white font-medium">
                  {wallet
                    ? t("shop.tonShop.wallet.connected")
                    : t("shop.tonShop.wallet.connectRequired")}
                </p>
                {userInfo && (
                  <p className="text-white/60 text-sm">
                    {t("shop.tonShop.user.greeting", {
                      name: userInfo.firstName,
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <TonConnectButton className="ton-connect-button-minimal" />
            </div>
          </CardBody>
        </Card>

        {/* Order Status Section */}
        {(orderState.isCreating ||
          orderState.isPending ||
          orderState.isCompleted ||
          orderState.error) && (
            <Card className="bg-white/5 border border-white/10">
              <CardBody className="p-4">
                {orderState.isCreating && (
                  <div className="flex items-center space-x-3">
                    <Spinner color="white" size="sm" />
                    <div>
                      <p className="font-medium text-white">
                        {t("shop.tonShop.status.creatingOrder")}
                      </p>
                      <p className="text-white/60 text-sm">
                        {t("shop.tonShop.status.preparingPurchase")}
                      </p>
                    </div>
                  </div>
                )}

                {orderState.isPending && (
                  <div className="flex items-center space-x-3">
                    <Clock className="text-yellow-400 animate-pulse" size={20} />
                    <div>
                      <p className="font-medium text-white">
                        {t("shop.tonShop.status.processingPayment")}
                      </p>
                      <p className="text-white/60 text-sm">
                        {t("shop.tonShop.status.processingTime")}
                      </p>
                    </div>
                  </div>
                )}

                {orderState.isCompleted && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="text-green-400" size={20} />
                      <div>
                        <p className="font-medium text-white">
                          {t("shop.tonShop.status.paymentSuccessful")}
                        </p>
                        <p className="text-white/60 text-sm">
                          {t("shop.tonShop.status.attemptsAdded")}
                        </p>
                      </div>
                    </div>
                    <Button
                      className="bg-white/10 text-white border border-white/20"
                      size="sm"
                      onPress={resetOrderState}
                    >
                      {t("shop.tonShop.actions.newPurchase")}
                    </Button>
                  </div>
                )}

                {orderState.error && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="text-red-400" size={20} />
                      <div>
                        <p className="font-medium text-white">
                          {t("shop.tonShop.status.paymentError")}
                        </p>
                        <p className="text-white/60 text-sm">
                          {orderState.error}
                        </p>
                      </div>
                    </div>
                    <Button
                      className="bg-white/10 text-white border border-white/20"
                      size="sm"
                      onPress={resetOrderState}
                    >
                      {t("shop.tonShop.actions.tryAgain")}
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

        {/* Products Section */}
        <div className="space-y-3">
          {products.map((product) => (
            <ProductCard
              key={product.productType}
              disabled={
                !wallet || orderState.isCreating || orderState.isPending
              }
              isSelected={selectedProduct === product.productType}
              product={product}
              t={t}
              onSelect={() => handleProductSelect(product.productType)}
            />
          ))}
        </div>

        {/* Information Section - ОБНОВЛЕНО */}
        <Card className="bg-white/5 border border-white/10">
          <CardBody className="p-4 text-center">
            <div className="space-y-2 text-sm text-white/60">
              <p>{t("shop.tonShop.info.processingTime")}</p>
              <p>{t("shop.tonShop.info.safeToClose")}</p>
              <p>{t("shop.tonShop.info.attemptsVisible")}</p>
            </div>

            {/* ИСПРАВЛЕНИЕ: Кликабельный адрес кошелька */}
            <div className="mt-4">
              <p className="text-white/40 text-xs mb-2">
                {t("shop.tonShop.info.corporateWallet")}:
              </p>
              <button
                className="inline-flex items-center space-x-1 text-white/60 hover:text-white/80 transition-colors text-xs font-mono bg-white/5 px-2 py-1 rounded border border-white/10 hover:border-white/20"
                title="Открыть в TON Viewer"
                onClick={openWalletViewer}
              >
                <span>{TON_CONFIG.CORPORATE_WALLET}</span>
                <ExternalLink size={12} />
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: TONProduct;
  onSelect: () => void;
  disabled: boolean;
  isSelected: boolean;
  t: any;
}

function ProductCard({
  product,
  onSelect,
  disabled,
  isSelected,
  t,
}: ProductCardProps) {
  const getBadge = () => {
    switch (product.productType) {
      case "attempts_5":
        return t("shop.tonShop.badges.popular");
      case "attempts_20":
        return t("shop.tonShop.badges.bestValue");
      case "attempts_100":
        return t("shop.tonShop.badges.ultimate");
      default:
        return null;
    }
  };

  const badge = getBadge();

  return (
    <Card
      className={`
                transition-all duration-200
                ${isSelected
          ? "bg-blue-500/10 border-blue-500/30"
          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
        }
                ${disabled ? "opacity-50" : ""}
            `}
    >
      <CardBody className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-bold text-white">
                {t(`shop.tonShop.products.${product.productType}.title`)}
              </h3>
              {badge && (
                <span className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded-full">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-white/60 text-sm mb-2">
              {t(`shop.tonShop.products.${product.productType}.description`)}
            </p>
          </div>

          <div className="ml-4">
            <Button
              className={`
                                ${isSelected
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 text-white border border-white/20"
                }
                            `}
              isDisabled={disabled}
              size="sm"
              onPress={onSelect}
            >
              {isSelected
                ? t("shop.tonShop.actions.processing")
                : `${product.priceTON} TON`}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function TONShopPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center space-y-4">
            <Spinner color="white" size="lg" />
            <p className="text-white/70">Money Бабки Cash Сучки</p>
          </div>
        </div>
      }
    >
      <TONShopContent />
    </Suspense>
  );
}
