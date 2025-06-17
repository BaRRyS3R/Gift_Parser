// src/app/main/page.tsx - Главная страница с интеграцией покупок

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, Star, ShoppingCart, Zap, CheckCircle, AlertCircle } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { purchaseService } from "@/lib/purchaseService";
import { PRODUCTS } from "@/types/purchases";
import type { CreateInvoiceResponse } from "@/types/purchases";

interface PurchaseState {
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  success: boolean;
}

export default function MainPage() {
  const router = useRouter();
  const { user, refreshUser, isLoading: userLoading } = useUser();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [titleText, setTitleText] = useState("|");
  const [showButton, setShowButton] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingText, setGreetingText] = useState("");
  const [showPurchaseButton, setShowPurchaseButton] = useState(false);
  const [purchaseState, setPurchaseState] = useState<PurchaseState>({
    isLoading: false,
    isProcessing: false,
    error: null,
    success: false
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  const animationSteps = [
    "|",
    "s|",
    "so-",
    "som|",
    "some=/",
    "somet|",
    "someth|",
    "somethi///",
    "somethin¿",
    "something?",
    "something",
  ];

  const username = user?.first_name || "unknown";
  const fullGreeting = `Hello, ${username}`;
  const attemptsRemaining = user?.attempts_remaining || 0;

  // Инициализация видео
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      video.play().catch(console.error);
    };

    const handleCanPlay = () => {
      video.play().catch(console.error);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, []);

  // Анимация загрузки страницы
  useEffect(() => {
    const pageLoadTimer = setTimeout(() => {
      setPageLoaded(true);
    }, 300);

    return () => clearTimeout(pageLoadTimer);
  }, []);

  // Анимация заголовка
  useEffect(() => {
    if (!pageLoaded) return;

    const titleAnimationTimer = setTimeout(() => {
      let currentStep = 0;

      const titleInterval = setInterval(() => {
        if (currentStep < animationSteps.length) {
          setTitleText(animationSteps[currentStep]);
          currentStep++;
        } else {
          clearInterval(titleInterval);
          setTimeout(() => setShowButton(true), 300);
          setTimeout(() => setShowGreeting(true), 600);
          setTimeout(() => setShowPurchaseButton(true), 900);
        }
      }, 80);

      return () => clearInterval(titleInterval);
    }, 800);

    return () => clearTimeout(titleAnimationTimer);
  }, [pageLoaded]);

  // Анимация приветствия
  useEffect(() => {
    if (!showGreeting || userLoading) return;

    let currentChar = 0;
    const typingInterval = setInterval(() => {
      if (currentChar <= fullGreeting.length) {
        setGreetingText(fullGreeting.slice(0, currentChar));
        currentChar++;
      } else {
        clearInterval(typingInterval);
      }
    }, 60);

    return () => clearInterval(typingInterval);
  }, [showGreeting, fullGreeting, userLoading]);

  // Сброс состояния покупки через некоторое время
  useEffect(() => {
    if (purchaseState.success || purchaseState.error) {
      const timer = setTimeout(() => {
        setPurchaseState(prev => ({
          ...prev,
          error: null,
          success: false
        }));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [purchaseState.success, purchaseState.error]);

  const handleStartGame = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      router.push("/game");
    }, 600);
  };

  const handlePurchaseAttempts = async () => {
    if (purchaseState.isLoading || purchaseState.isProcessing) {
      return;
    }

    setPurchaseState({
      isLoading: true,
      isProcessing: false,
      error: null,
      success: false
    });

    try {
      console.log('Initiating purchase for additional attempts...');

      // Создаем инвойс
      const invoiceResult: CreateInvoiceResponse = await purchaseService.createInvoice('additional_attempts');

      if (!invoiceResult.success || !invoiceResult.invoice_url) {
        throw new Error(invoiceResult.error || 'Failed to create payment invoice');
      }

      console.log('Invoice created, opening payment interface...');

      setPurchaseState(prev => ({
        ...prev,
        isLoading: false,
        isProcessing: true
      }));

      // Открываем инвойс для оплаты
      const paymentResult = await purchaseService.openInvoice(invoiceResult.invoice_url);

      if (paymentResult) {
        console.log('Payment completed successfully');

        setPurchaseState({
          isLoading: false,
          isProcessing: false,
          error: null,
          success: true
        });

        // Обновляем данные пользователя после успешной покупки
        await refreshUser();

        // Дополнительная проверка статуса покупки
        await purchaseService.checkPurchaseStatus();

      } else {
        console.log('Payment was cancelled or failed');

        setPurchaseState({
          isLoading: false,
          isProcessing: false,
          error: 'Payment was cancelled or failed. Please try again.',
          success: false
        });
      }

    } catch (error) {
      console.error('Purchase error:', error);

      setPurchaseState({
        isLoading: false,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during purchase',
        success: false
      });
    }
  };

  const renderPurchaseButton = () => {
    const product = PRODUCTS.additional_attempts;
    const isDisabled = purchaseState.isLoading || purchaseState.isProcessing || isTransitioning;

    return (
      <div
        className={`transition-all duration-1000 transform ${showPurchaseButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
      >
        <div className="relative group max-w-sm mx-auto">
          {/* Purchase Status Messages */}
          {(purchaseState.error || purchaseState.success) && (
            <div className={`mb-4 p-3 rounded-lg backdrop-blur-sm border transition-all duration-300 ${purchaseState.success
              ? "bg-green-500/20 border-green-400/40 text-green-300"
              : "bg-red-500/20 border-red-400/40 text-red-300"
              }`}>
              <div className="flex items-center space-x-2">
                {purchaseState.success ? (
                  <CheckCircle size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                <span className="text-sm font-bpdots">
                  {purchaseState.success
                    ? "Purchase successful! +1 attempt added"
                    : purchaseState.error
                  }
                </span>
              </div>
            </div>
          )}

          {/* Attempts Counter */}
          <div className="mb-4 text-center">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
              <Zap className="text-yellow-400" size={16} />
              <span className="font-bpdots text-sm text-white/80">
                ATTEMPTS LEFT:
              </span>
              <span className="font-bpdots text-lg font-bold text-white">
                {attemptsRemaining}
              </span>
            </div>
          </div>

          {/* Purchase Button */}
          <button
            className={`
              relative w-full px-8 py-4 bg-transparent border-2 rounded-xl font-bpdots text-lg font-bold 
              transition-all duration-500 group-hover:scale-105 active:scale-95
              ${isDisabled
                ? "border-white/30 text-white/50 cursor-not-allowed"
                : "border-yellow-400/60 text-yellow-300 hover:border-yellow-400 hover:bg-yellow-400/10"
              }
            `}
            disabled={isDisabled}
            onClick={handlePurchaseAttempts}
            type="button"
            aria-label="Purchase additional game attempts"
          >
            <div className="flex items-center justify-center space-x-3">
              {purchaseState.isLoading ? (
                <div className="w-5 h-5 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
              ) : purchaseState.isProcessing ? (
                <div className="w-5 h-5 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
              ) : (
                <ShoppingCart size={20} />
              )}
              <span className="tracking-wider">
                {purchaseState.isLoading
                  ? "CREATING INVOICE..."
                  : purchaseState.isProcessing
                    ? "PROCESSING PAYMENT..."
                    : `${product.title} - ${product.price} ⭐`
                }
              </span>
            </div>

            {/* Button glow effect */}
            {!isDisabled && (
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/20 via-yellow-400/5 to-yellow-400/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-1000" />
            )}
          </button>

          {/* Product Description */}
          <div className="mt-2 text-center">
            <p className="text-xs font-bpdots text-white/60">
              {product.description}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden ${isTransitioning
        ? "opacity-0 transition-opacity duration-500 ease-in"
        : pageLoaded
          ? "opacity-100 transition-opacity duration-1000 ease-out"
          : "opacity-0"
        }`}
    >
      {/* Background Video */}
      <div
        className="fixed top-0 left-0 w-full h-full z-0"
        style={{
          filter: "brightness(0.15) contrast(1.2) grayscale(1)",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/videos/mainbg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Geometric Background Elements */}
      <div className="absolute inset-0 z-10">
        <div className="absolute top-20 left-20 w-1 h-32 bg-white/10 rotate-45" />
        <div className="absolute top-40 right-32 w-1 h-24 bg-white/5 -rotate-12" />
        <div className="absolute bottom-32 left-16 w-1 h-40 bg-white/8 rotate-12" />
        <div className="absolute bottom-20 right-20 w-1 h-28 bg-white/6 -rotate-45" />

        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rotate-45" />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/30" />
        <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-white/15 rotate-45" />
      </div>

      {/* Main Content */}
      <div className="text-center z-20 space-y-8 flex flex-col items-center justify-center">
        {/* Title Section */}
        <div className="relative">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold font-bpdots tracking-widest text-white">
            {titleText}
          </h1>

          {/* Decorative lines around title */}
          <div className="absolute left-0 top-1/2 w-16 h-px bg-gradient-to-r from-transparent to-white/40 transform -translate-y-1/2 -translate-x-20" />
          <div className="absolute right-0 top-1/2 w-16 h-px bg-gradient-to-l from-transparent to-white/40 transform -translate-y-1/2 translate-x-20" />
        </div>

        {/* Action Button */}
        <div
          className={`transition-all duration-1000 transform ${showButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
        >
          <div className="relative group">
            {/* Button Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

            {/* Main Button */}
            <button
              className="relative w-full max-w-sm mx-auto block px-12 py-6 bg-transparent border-2 border-white/60 text-white rounded-xl font-bpdots text-xl font-bold hover:border-white transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-white/5"
              disabled={isTransitioning}
              onClick={handleStartGame}
            >
              <div className="flex items-center justify-center space-x-4">
                <Play
                  className="text-white group-hover:translate-x-1 transition-transform duration-300"
                  size={24}
                />
                <span className="tracking-wider">
                  {isTransitioning ? "LOADING..." : "START GAME"}
                </span>
              </div>

              {/* Button accent lines */}
              <div className="absolute top-0 left-8 w-8 h-px bg-white/40 transform -translate-y-2" />
              <div className="absolute bottom-0 right-8 w-8 h-px bg-white/40 transform translate-y-2" />
            </button>
          </div>
        </div>

        {/* Purchase Section */}
        {renderPurchaseButton()}

        {/* User Greeting */}
        <div
          className={`transition-all duration-1000 transform ${showGreeting
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8"
            }`}
        >
          {userLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" />
              <div
                className="w-1 h-1 bg-white/60 rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="w-1 h-1 bg-white/60 rounded-full animate-pulse"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          ) : (
            <p className="text-xl font-bpdots text-white/80 tracking-wider">
              {greetingText}
              {greetingText.length < fullGreeting.length && (
                <span className="animate-pulse">|</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}