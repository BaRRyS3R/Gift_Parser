// src/app/main/page.tsx - Enhanced main page with animated purchase modal

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  ShoppingCart,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  Battery,
  Crown,
  Sparkles,
  Gift
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { purchaseService } from "@/lib/purchaseService";
import { PRODUCTS, PURCHASE_ANIMATIONS } from "@/types/purchases";
import type { CreateInvoiceResponse, ProductType, PurchaseAnimation } from "@/types/purchases";

interface PurchaseState {
  isModalOpen: boolean;
  isProcessing: boolean;
  selectedProduct: ProductType | null;
  animation: PurchaseAnimation | null;
  showAnimation: boolean;
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
  const [showCartIcon, setShowCartIcon] = useState(false);
  const [purchaseState, setPurchaseState] = useState<PurchaseState>({
    isModalOpen: false,
    isProcessing: false,
    selectedProduct: null,
    animation: null,
    showAnimation: false
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

  // Animation effects
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

  useEffect(() => {
    const pageLoadTimer = setTimeout(() => {
      setPageLoaded(true);
    }, 300);

    return () => clearTimeout(pageLoadTimer);
  }, []);

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
          setTimeout(() => setShowCartIcon(true), 900);
        }
      }, 80);

      return () => clearInterval(titleInterval);
    }, 800);

    return () => clearTimeout(titleAnimationTimer);
  }, [pageLoaded]);

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

  // Auto-hide animations
  useEffect(() => {
    if (purchaseState.showAnimation) {
      const timer = setTimeout(() => {
        setPurchaseState(prev => ({
          ...prev,
          showAnimation: false,
          animation: null
        }));
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [purchaseState.showAnimation]);

  const handleStartGame = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      router.push("/game");
    }, 600);
  };

  const openPurchaseModal = () => {
    setPurchaseState(prev => ({
      ...prev,
      isModalOpen: true
    }));
  };

  const closePurchaseModal = () => {
    if (purchaseState.isProcessing) return;

    setPurchaseState(prev => ({
      ...prev,
      isModalOpen: false,
      selectedProduct: null
    }));
  };

  const handlePurchase = async (productType: ProductType) => {
    if (purchaseState.isProcessing) return;

    setPurchaseState(prev => ({
      ...prev,
      isProcessing: true,
      selectedProduct: productType,
      animation: PURCHASE_ANIMATIONS.loading,
      showAnimation: true
    }));

    try {
      console.log(`Initiating purchase for ${productType}...`);

      const invoiceResult: CreateInvoiceResponse = await purchaseService.createInvoice(productType);

      if (!invoiceResult.success || !invoiceResult.invoice_url) {
        throw new Error(invoiceResult.error || 'Failed to create payment invoice');
      }

      console.log('Invoice created, opening payment interface...');

      const paymentResult = await purchaseService.openInvoice(invoiceResult.invoice_url, productType);

      if (paymentResult) {
        console.log('Payment completed successfully');

        setPurchaseState(prev => ({
          ...prev,
          animation: PURCHASE_ANIMATIONS.success,
          isModalOpen: false
        }));

        await refreshUser();
        await purchaseService.checkPurchaseStatus();

      } else {
        console.log('Payment was cancelled or failed');

        setPurchaseState(prev => ({
          ...prev,
          animation: PURCHASE_ANIMATIONS.cancelled
        }));
      }

    } catch (error) {
      console.error('Purchase error:', error);

      setPurchaseState(prev => ({
        ...prev,
        animation: error instanceof Error && error.message.includes('network')
          ? PURCHASE_ANIMATIONS.network_error
          : PURCHASE_ANIMATIONS.failed
      }));
    } finally {
      setPurchaseState(prev => ({
        ...prev,
        isProcessing: false,
        selectedProduct: null
      }));
    }
  };

  const renderCartIcon = () => {
    const hasLowAttempts = attemptsRemaining <= 2;

    return (
      <div
        className={`transition-all duration-1000 transform ${showCartIcon ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
      >
        <div className="flex flex-col items-center space-y-3">
          {/* Attempts indicator */}
          <div className="flex items-center space-x-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-lg">
            <Battery className={hasLowAttempts ? "text-orange-400" : "text-green-400"} size={16} />
            <span className="font-bpdots text-sm text-white/80">
              ATTEMPTS:
            </span>
            <span className={`font-bpdots text-lg font-bold ${hasLowAttempts ? "text-orange-400" : "text-green-400"}`}>
              {attemptsRemaining}/5
            </span>
          </div>

          {/* Cart button */}
          <button
            onClick={openPurchaseModal}
            className="group relative p-4 bg-white/5 backdrop-blur-sm border border-white/20 rounded-full hover:bg-white/10 hover:border-white/40 transition-all duration-300 hover:scale-110 active:scale-95"
            aria-label="Open purchase store"
          >
            <ShoppingCart
              className="text-white/80 group-hover:text-white transition-colors duration-300"
              size={24}
            />

            {/* Notification dot for low attempts */}
            {hasLowAttempts && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-pulse" />
            )}

            {/* Glow effect */}
            <div className="absolute -inset-2 bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500" />
          </button>

          <p className="text-xs font-bpdots text-white/60 text-center">
            Need more attempts?
          </p>
        </div>
      </div>
    );
  };

  const renderPurchaseModal = () => {
    if (!purchaseState.isModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-lg mx-4 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="relative p-6 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-white/10">
            <button
              onClick={closePurchaseModal}
              disabled={purchaseState.isProcessing}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close store"
            >
              <X size={20} />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-xl flex items-center justify-center">
                <Gift className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-bpdots text-white">
                  Game Store
                </h2>
                <p className="text-white/60 font-bpdots text-sm">
                  Get more attempts to keep playing
                </p>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="p-6 space-y-4">
            {Object.values(PRODUCTS).map((product) => {
              const isProcessing = purchaseState.isProcessing && purchaseState.selectedProduct === product.type;
              const isBundle = product.category === 'bundle';

              return (
                <div
                  key={product.type}
                  className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${isBundle
                      ? "bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-400/30 hover:border-purple-400/50"
                      : "bg-white/5 border-white/20 hover:border-white/40"
                    } ${isProcessing ? "opacity-50" : "hover:scale-105"}`}
                >
                  {/* Popular badge */}
                  {product.popular && (
                    <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-2 py-1 rounded-full text-xs font-bold font-bpdots">
                      <Crown size={12} className="inline mr-1" />
                      POPULAR
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`text-3xl ${isBundle ? "animate-bounce" : ""}`}>
                          {product.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold font-bpdots text-white">
                            {product.title}
                          </h3>
                          <p className="text-white/70 text-sm">
                            {product.description}
                          </p>
                          {product.bonus && (
                            <span className="inline-block mt-1 px-2 py-1 bg-yellow-400/20 text-yellow-300 text-xs font-bold font-bpdots rounded">
                              {product.bonus}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold font-bpdots text-white">
                          {product.price} ⭐
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {product.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="text-green-400 flex-shrink-0" size={14} />
                          <span className="text-white/80 text-sm">{benefit}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handlePurchase(product.type)}
                      disabled={purchaseState.isProcessing}
                      className={`w-full py-3 px-4 rounded-lg font-bpdots font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${isBundle
                          ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                          : "bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40"
                        } ${isProcessing ? "cursor-not-allowed" : "hover:scale-105 active:scale-95"}`}
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="animate-spin" size={16} />
                          <span>PROCESSING...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <Sparkles size={16} />
                          <span>BUY NOW</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 bg-white/5 border-t border-white/10">
            <p className="text-center text-xs font-bpdots text-white/60">
              💫 Powered by Telegram Stars • Secure & Instant
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderPurchaseAnimation = () => {
    if (!purchaseState.showAnimation || !purchaseState.animation) return null;

    const { animation } = purchaseState;
    const isSuccess = animation.type === 'success';
    const isError = animation.type === 'error';
    const isLoading = animation.type === 'loading';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md mx-4 text-center animate-fade-in">
          <div className="mb-4">
            {isLoading && (
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center animate-pulse">
                <Loader2 className="text-white animate-spin" size={32} />
              </div>
            )}
            {isSuccess && (
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle className="text-white" size={32} />
              </div>
            )}
            {isError && (
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-red-400 to-pink-400 rounded-full flex items-center justify-center animate-pulse">
                <AlertCircle className="text-white" size={32} />
              </div>
            )}
          </div>

          <h3 className="text-xl font-bold font-bpdots text-white mb-2">
            {animation.message}
          </h3>

          {animation.submessage && (
            <p className="text-white/70 font-bpdots text-sm">
              {animation.submessage}
            </p>
          )}

          {isSuccess && (
            <div className="mt-4 p-3 bg-green-500/20 rounded-lg border border-green-400/30">
              <p className="text-green-300 font-bpdots text-sm">
                ⚡ Attempts: {attemptsRemaining} → {attemptsRemaining + (purchaseState.selectedProduct === 'restore_attempts' ? 5 : 1)}
              </p>
            </div>
          )}
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
      </div>

      {/* Main Content */}
      <div className="text-center z-20 space-y-12 flex flex-col items-center justify-center">
        {/* Title Section */}
        <div className="relative">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold font-bpdots tracking-widest text-white">
            {titleText}
          </h1>
        </div>

        {/* Action Button */}
        <div
          className={`transition-all duration-1000 transform ${showButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

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
            </button>
          </div>
        </div>

        {/* Shopping Cart */}
        {renderCartIcon()}

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

      {/* Purchase Modal */}
      {renderPurchaseModal()}

      {/* Purchase Animation */}
      {renderPurchaseAnimation()}
    </div>
  );
}