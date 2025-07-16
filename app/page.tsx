// src/app/page.tsx - Полная исправленная страница входа без бесконечных вызовов

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@nextui-org/react";
import { Play, Zap, Wifi, WifiOff, Gift, Shield } from "lucide-react";

import { type TelegramUser } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import {
  authService,
  type LoginResult,
  type RegistrationResult,
} from "@/lib/authService";

interface AuthState {
  isChecking: boolean;
  isRegistering: boolean;
  telegramUser: TelegramUser | null;
  error: string | null;
  needsRegistration: boolean;
  referralCode?: string;
  referralBonus?: number;
  referrerName?: string;
  referrerUsername?: string;
  isBlocked?: boolean;
  blockReason?: string;
  timeUntilUnblock?: number;
}

// КРИТИЧЕСКИ ВАЖНО: Глобальные флаги для предотвращения множественных инициализаций
const GLOBAL_INIT_STATE = {
  hasCheckedAuth: false,
  isCheckingAuth: false,
  checkPromise: null as Promise<void> | null,
};

export default function IntroPage(): JSX.Element {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    updateUser,
    setTelegramUser,
    isAuthenticated,
    user: contextUser,
    isLoading: contextLoading,
    authenticateWithTelegram, // ИСПРАВЛЕНО: Добавлен импорт метода аутентификации
  } = useUser();
  const t = useT();

  // ИСПРАВЛЕНО: Флаги для предотвращения множественных операций
  const pageInitializedRef = useRef<boolean>(false);
  const videoCompletedRef = useRef<boolean>(false);

  // Authorization state
  const [authState, setAuthState] = useState<AuthState>({
    isChecking: true,
    isRegistering: false,
    telegramUser: null,
    error: null,
    needsRegistration: false,
  });

  // Enhanced loading state management
  const [stableLoadingState, setStableLoadingState] = useState({
    isInitializing: true,
    isVideoReady: false,
    isAuthReady: false,
  });

  // Video state
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // ИСПРАВЛЕНО: Правильный порядок объявления функций
  
  // 1. Вспомогательные функции для работы с Telegram
  const getTelegramUser = useCallback((): TelegramUser | null => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!window.Telegram?.WebApp) {
      console.log("Telegram WebApp API unavailable");
      if (process.env.NODE_ENV === "development") {
        console.log("Returning test user for development");

        return {
          id: 430743609,
          first_name: "Test User",
          last_name: "Developer",
          username: "testuser",
          language_code: "en",
          is_premium: false,
        };
      }

      return null;
    }

    const tg = window.Telegram.WebApp;
    const user = tg.initDataUnsafe?.user;

    console.log("Telegram user data:", user);

    if (!user || !user.id) {
      console.log("Telegram user not found or invalid");
      if (process.env.NODE_ENV === "development") {
        return {
          id: 430743609,
          first_name: "Test User",
          last_name: "Developer",
          username: "testuser",
          language_code: "en",
          is_premium: false,
        };
      }

      return null;
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      language_code: user.language_code,
      is_premium: user.is_premium,
    };
  }, []);

  // Get Telegram WebApp init data for authentication
  const getTelegramInitData = useCallback((): string | null => {
    if (typeof window === "undefined") return null;

    if (!window.Telegram?.WebApp) {
      console.log("Telegram WebApp API unavailable");
      if (process.env.NODE_ENV === "development") {
        const mockUser = {
          id: 430743609,
          first_name: "Test User",
          last_name: "Developer",
          username: "testuser",
          language_code: "en",
          is_premium: false,
        };

        return `user=${JSON.stringify(mockUser)}&hash=mock_hash&auth_date=${Math.floor(Date.now() / 1000)}`;
      }

      return null;
    }

    const tg = window.Telegram.WebApp;
    return tg.initData || null;
  }, []);

  // Extract referral code from Telegram start parameter
  const extractReferralCode = useCallback((): string | undefined => {
    if (typeof window === "undefined") return undefined;

    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const startParam = tg.initDataUnsafe?.start_param;

      if (startParam && startParam.length === 8) {
        console.log("Referral code extracted from start param:", startParam);
        return startParam;
      }
    }

    if (process.env.NODE_ENV === "development") {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get("ref");

      if (refCode) {
        console.log("Referral code extracted from URL (dev):", refCode);
        return refCode;
      }
    }

    return undefined;
  }, []);

  // 2. Упрощенная регистрация через контекст (только для новых пользователей после видео)
  const registerNewUser = useCallback(
    async (
      telegramUser: TelegramUser,
      referralCode?: string,
    ): Promise<RegistrationResult> => {
      setAuthState((prev) => ({ ...prev, isRegistering: true, error: null }));

      try {
        console.log("Registering new user via context...");
        const initData = getTelegramInitData();
        if (!initData) {
          throw new Error(t("auth.telegramDataUnavailable"));
        }

        // Используем контекстный метод для регистрации
        await authenticateWithTelegram(initData, referralCode);
        
        console.log("User registration successful");
        return { success: true };
      } catch (error) {
        console.error("User registration failed:", error);
        setAuthState((prev) => ({
          ...prev,
          isRegistering: false,
          error: t("auth.registrationFailed"),
        }));
        throw error;
      } finally {
        setAuthState((prev) => ({ ...prev, isRegistering: false }));
      }
    },
    [getTelegramInitData, authenticateWithTelegram, t],
  );

  // 3. Основная функция инициализации аутентификации
  const initializeAuthOnUserAction = useCallback(async () => {
    try {
      console.log("Initializing auth on user action...");

      const telegramUser = getTelegramUser();
      const referralCode = extractReferralCode();

      console.log("Retrieved Telegram user:", telegramUser);
      console.log("Referral code:", referralCode);

      if (!telegramUser) {
        console.error("Telegram user data unavailable");
        setAuthState((prev) => ({
          ...prev,
          isChecking: false,
          error: t("auth.telegramDataUnavailable"),
        }));
        return false;
      }

      // Set telegram user in context
      setTelegramUser(telegramUser);

      // ИСПРАВЛЕНО: Всегда используем полную аутентификацию через контекст
      try {
        const initData = getTelegramInitData();
        if (!initData) {
          throw new Error(t("auth.telegramDataUnavailable"));
        }

        console.log("Starting full authentication through context...");
        await authenticateWithTelegram(initData, referralCode);
        
        console.log("Authentication completed successfully");
        setAuthState((prev) => ({
          ...prev,
          isChecking: false,
          needsRegistration: false,
        }));

        return true; // Success, ready to redirect
      } catch (authError) {
        console.error("Full authentication failed:", authError);
        
        // Check if this is a registration case
        if (authError instanceof Error && authError.message.includes("needsRegistration")) {
          console.log("New user detected, showing registration screen");
          
          setAuthState((prev) => ({
            ...prev,
            telegramUser,
            referralCode,
            isChecking: false,
            needsRegistration: true,
          }));

          return false; // Show registration UI
        }

        // Check if this is a blocked user
        if (authError instanceof Error && authError.message.includes("blocked")) {
          console.log("User is blocked");
          
          setAuthState((prev) => ({
            ...prev,
            isChecking: false,
            isBlocked: true,
          }));
          
          router.push("/blocked");
          return false;
        }

        // Handle other authentication errors
        setAuthState((prev) => ({
          ...prev,
          isChecking: false,
          error: authError instanceof Error ? authError.message : "Authentication failed",
        }));
        
        return false;
      }
    } catch (error) {
      console.error("Error initializing authorization:", error);
      setAuthState((prev) => ({
        ...prev,
        isChecking: false,
        error: `${t("auth.databaseConnectionError")}: ${error instanceof Error ? error.message : t("auth.unknownError")}`,
      }));
      
      return false;
    }
  }, [
    getTelegramUser,
    extractReferralCode,
    router,
    setTelegramUser,
    authenticateWithTelegram,
    getTelegramInitData,
    t,
  ]);

  // 4. useEffect хуки в правильном порядке
  
  // Восстановленная автоматическая проверка аутентификации при загрузке
  useEffect(() => {
    // Предотвращаем множественные проверки
    if (GLOBAL_INIT_STATE.hasCheckedAuth || GLOBAL_INIT_STATE.isCheckingAuth) {
      if (GLOBAL_INIT_STATE.checkPromise) {
        GLOBAL_INIT_STATE.checkPromise.then(() => {
          if (isAuthenticated && contextUser) {
            console.log("User already authenticated (from global check), redirecting");
            router.push("/main");
          }
        });
      }
      return;
    }

    if (pageInitializedRef.current) {
      return;
    }

    pageInitializedRef.current = true;
    GLOBAL_INIT_STATE.isCheckingAuth = true;

    const checkAuthPromise = (async () => {
      try {
        console.log("Performing single auth check...");
        
        if (isAuthenticated && contextUser) {
          console.log("User already authenticated, redirecting to main");
          setStableLoadingState((prev) => ({ ...prev, isAuthReady: true }));
          
          // Небольшая задержка для плавности
          setTimeout(() => {
            router.push("/main");
          }, 500);
          return;
        }

        // Автоматическая инициализация аутентификации при загрузке
        const authSuccess = await initializeAuthOnUserAction();
        
        if (authSuccess) {
          // ИСПРАВЛЕНО: Увеличенная задержка для корректного сохранения токена
          console.log("Authentication successful, waiting for token to save...");
          setTimeout(() => {
            router.push("/main");
          }, 1500); // Увеличена до 1.5 секунд для надежности
        } else {
          // Если нужна регистрация или есть ошибка, обновляем состояние UI
          setStableLoadingState((prev) => ({ ...prev, isAuthReady: true }));
        }
        
        GLOBAL_INIT_STATE.hasCheckedAuth = true;
      } catch (error) {
        console.error("Auth check error:", error);
        setAuthState((prev) => ({
          ...prev,
          isChecking: false,
          error: "Authentication check failed",
        }));
        setStableLoadingState((prev) => ({ ...prev, isAuthReady: true }));
        GLOBAL_INIT_STATE.hasCheckedAuth = true;
      } finally {
        GLOBAL_INIT_STATE.isCheckingAuth = false;
        GLOBAL_INIT_STATE.checkPromise = null;
      }
    })();

    GLOBAL_INIT_STATE.checkPromise = checkAuthPromise;

    return () => {
      GLOBAL_INIT_STATE.isCheckingAuth = false;
    };
  }, [isAuthenticated, contextUser, router, initializeAuthOnUserAction]);

  // Initialize Service Worker and font
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => console.log("ServiceWorker registered"))
        .catch((err) =>
          console.error("ServiceWorker registration failed:", err),
        );
    }

    if ("fonts" in document) {
      document.fonts
        .load('1rem "BPDots Diamond"')
        .then(() => {
          setFontLoaded(true);
          setStableLoadingState((prev) => ({ ...prev, isInitializing: false }));
        })
        .catch(() => {
          setFontLoaded(true);
          setStableLoadingState((prev) => ({ ...prev, isInitializing: false }));
        });
    } else {
      setTimeout(() => {
        setFontLoaded(true);
        setStableLoadingState((prev) => ({ ...prev, isInitializing: false }));
      }, 1000);
    }
  }, []); // Пустой массив зависимостей

  // Video initialization
  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const handleLoadedMetadata = () => {
      video.volume = 1;
      setIsReady(true);
      setStableLoadingState((prev) => ({ ...prev, isVideoReady: true }));
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;

        if (duration > 0) {
          const progress = (bufferedEnd / duration) * 100;
          setLoadProgress(progress);
        }
      }
    };

    const handleCanPlayThrough = () => {
      setIsLoading(false);
    };

    // Упрощенная обработка завершения видео
    const handleEnded = async () => {
      console.log("Video completed");

      if (videoCompletedRef.current) return;
      videoCompletedRef.current = true;

      if (authState.isBlocked) {
        console.log("User is blocked, redirecting to blocked page");
        router.push("/blocked");
        return;
      }

      // Perform registration after video ends (for new users)
      if (authState.telegramUser && authState.needsRegistration && !authState.isRegistering) {
        console.log("Starting registration after video");
        try {
          const registrationResult = await registerNewUser(
            authState.telegramUser,
            authState.referralCode,
          );

          if (registrationResult.success) {
            console.log("Registration successful, redirecting to main in 1 second");
            setTimeout(() => {
              router.push("/main");
            }, 1000);
          }
        } catch (error) {
          console.error("Registration error after video:", error);
          setTimeout(() => {
            router.push("/main");
          }, 2000);
        }
      } else if (isAuthenticated) {
        console.log("User already authenticated, redirecting to main");
        router.push("/main");
      } else {
        console.log("Unexpected state after video, forcing redirect");
        setTimeout(() => {
          router.push("/main");
        }, 1000);
      }
    };

    const handleError = (e: Event) => {
      console.error("Video error:", e);
      setVideoError("Failed to load video. Please try again.");
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("canplaythrough", handleCanPlayThrough);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("canplaythrough", handleCanPlayThrough);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
    };
  }, [router, registerNewUser, isAuthenticated, authState]); // Минимальные зависимости

  // 5. Обработчики событий
  
  // Упрощенная функция запуска видео с инициализацией
  const handleStart = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      // Сначала инициализируем аутентификацию
      const authSuccess = await initializeAuthOnUserAction();
      
      if (authSuccess) {
        // Если аутентификация прошла успешно, сразу переходим
        router.push("/main");
        return;
      }

      // Если нужна регистрация, запускаем видео
      video.currentTime = 0;
      await video.play();
      setIsPlaying(true);
      setVideoError(null);
    } catch (err) {
      console.error("Video play error:", err);
      setVideoError("Failed to play video. Please try again.");
    }
  };

  // Упрощенная быстрая инициализация
  const handleQuickInit = async () => {
    if (authState.isRegistering) {
      return;
    }

    try {
      const authSuccess = await initializeAuthOnUserAction();
      
      if (authSuccess) {
        // Если аутентификация прошла успешно
        router.push("/main");
        return;
      }

      // Если нужна регистрация
      if (authState.telegramUser && authState.needsRegistration) {
        const registrationResult = await registerNewUser(
          authState.telegramUser,
          authState.referralCode,
        );

        if (registrationResult.success) {
          console.log("Quick registration successful");
          setTimeout(() => {
            router.push("/main");
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Quick registration error:", error);
    }
  };

  // 6. Вспомогательные функции для UI
  
  // Function to format referrer display name
  const getDisplayReferrerName = (): string => {
    if (authState.referrerUsername) {
      return `@${authState.referrerUsername}`;
    }
    if (authState.referrerName) {
      return authState.referrerName;
    }
    return "s0meone";
  };

  // Format time remaining for blocked users
  const formatTimeRemaining = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    } else {
      return `${seconds}s`;
    }
  };

  // Get block reason text
  const getBlockReasonText = (reason?: string): string => {
    switch (reason) {
      case "captcha_failed":
        return "Failed Captcha Verification";
      case "biometric_failed":
        return "Failed Biometric Authentication";
      case "suspicious_activity":
        return "Suspicious Activity Detected";
      default:
        return "Security Violation";
    }
  };

  // Упрощенное определение состояния загрузки
  const isInitialLoading =
    stableLoadingState.isInitializing ||
    (authState.isChecking && !isPlaying) ||
    (contextLoading && !isPlaying && !GLOBAL_INIT_STATE.hasCheckedAuth) ||
    (isLoading && !videoError && !stableLoadingState.isVideoReady && !isPlaying);

  // 7. JSX разметка
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Loading screen */}
      {isInitialLoading && (
        <div className="loader-container">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <p className="text-white mt-4 text-sm">
            {authState.isChecking
              ? t("auth.checkingUser")
              : `${t("common.loading")} ${Math.round(loadProgress)}%`}
          </p>
        </div>
      )}

      {/* Blocked user screen */}
      {authState.isBlocked && !isInitialLoading && (
        <div className="loader-container">
          <div className="text-center space-y-6 max-w-sm">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <Shield className="text-red-400" size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Account Blocked
              </h2>
              <p className="text-red-300 text-sm mb-4">
                {getBlockReasonText(authState.blockReason)}
              </p>
              {authState.timeUntilUnblock && (
                <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4">
                  <p className="text-red-200 text-sm mb-2">Time remaining:</p>
                  <p className="text-2xl font-bold text-red-400 font-mono">
                    {formatTimeRemaining(authState.timeUntilUnblock)}
                  </p>
                </div>
              )}
            </div>
            <button
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              onClick={() => router.push("/blocked")}
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Authorization error screen */}
      {authState.error && !isInitialLoading && !authState.isBlocked && (
        <div className="loader-container">
          <p className="text-white text-center mb-4">{authState.error}</p>
          <button
            className="px-4 py-2 bg-white text-black rounded"
            onClick={() => {
              // Сброс состояния для повторной попытки
              pageInitializedRef.current = false;
              videoCompletedRef.current = false;
              GLOBAL_INIT_STATE.hasCheckedAuth = false;
              GLOBAL_INIT_STATE.isCheckingAuth = false;
              GLOBAL_INIT_STATE.checkPromise = null;
              
              setAuthState((prev) => ({
                ...prev,
                error: null,
                isChecking: true,
                isBlocked: false,
              }));
              setStableLoadingState({
                isInitializing: false,
                isVideoReady: false,
                isAuthReady: false,
              });
            }}
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {/* Video error screen */}
      {videoError && !isInitialLoading && !authState.error && !authState.isBlocked && (
        <div className="loader-container">
          <p className="text-white text-center mb-4">{videoError}</p>
          <button
            className="px-4 py-2 bg-white text-black rounded mb-4"
            onClick={handleStart}
          >
            {t("common.retry")}
          </button>
          {authState.needsRegistration && (
            <button
              className="block px-6 py-3 bg-transparent border border-white/60 text-white/80 rounded-lg text-sm hover:bg-white/5 hover:border-white hover:text-white transition-colors"
              onClick={handleQuickInit}
            >
              {t("auth.continueWithoutVideo")}
            </button>
          )}
        </div>
      )}

      {/* Registration screen */}
      {authState.needsRegistration &&
        !authState.isChecking &&
        !authState.error &&
        !authState.isBlocked &&
        !videoError &&
        !isPlaying && (
          <div className="min-h-screen bg-black flex items-center justify-center p-6 fixed inset-0 z-50">
            <div className="w-full max-w-md space-y-8">
              {authState.isRegistering ? (
                <div className="text-center">
                  <Spinner color="white" size="lg" />
                  <p className="text-white mt-4">{t("auth.registering")}</p>
                  {authState.referralCode && (
                    <p className="text-green-400 mt-2 text-sm">
                      {t("auth.processingReferralBonus")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-8">
                  {/* Header */}
                  <div className="space-y-4">
                    <div className="relative">
                      <h1 className="text-4xl font-bold text-white tracking-wider">
                        {t("main.welcome")}
                      </h1>
                      <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-2 w-16 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                    </div>
                    <p className="text-white/70 text-sm">
                      {t("main.greeting", {
                        name: authState.telegramUser?.first_name || "User",
                      })}
                    </p>

                    {/* Referral bonus info */}
                    {authState.referralCode && (
                      <div className="bg-green-500/20 border border-green-400/40 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-center space-x-2">
                          <Gift className="text-green-400" size={20} />
                          <span className="text-green-300 font-bold">
                            {t("auth.referralBonus")}
                          </span>
                        </div>
                        <p className="text-green-400 text-sm">
                          {t("auth.youllGet")}{" "}
                          <span className="font-bold">+5 extra attempts</span>
                        </p>
                        <p className="text-green-400/60 text-xs">
                          {t("auth.referredBy")} {getDisplayReferrerName()}
                        </p>
                      </div>
                    )}

                    <p className="text-white/50 text-xs uppercase tracking-widest">
                      {t("main.chooseEntryMethod")}
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="space-y-6">
                    {/* Main Button - With Intro */}
                    <div className="space-y-3">
                      <button
                        className="group relative w-full px-8 py-6 bg-transparent border-2 border-white/60 text-white rounded-2xl text-xl font-bold hover:border-white hover:bg-white/5 transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        disabled={authState.isRegistering}
                        style={{ pointerEvents: "auto", zIndex: 100 }}
                        onClick={handleStart}
                      >
                        <div className="flex items-center justify-center space-x-4">
                          <div className="relative">
                            <Play
                              className="text-white group-hover:translate-x-1 transition-transform duration-300"
                              size={24}
                            />
                            <Wifi
                              className="absolute -top-2 -right-2 text-white/60"
                              size={16}
                            />
                          </div>
                          <span className="tracking-wider">
                            {t("main.initialize")}
                          </span>
                        </div>

                        <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                      </button>

                      <div className="text-center space-y-1">
                        <p className="text-white/60 text-sm">
                          {t("main.fullExperience")}
                        </p>
                        <p className="text-white/40 text-xs">
                          {t("main.recommended")}
                        </p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/20" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-black px-4 text-white/40 text-xs uppercase">
                          {t("common.or")}
                        </span>
                      </div>
                    </div>

                    {/* Alternative Button - Quick Mode */}
                    <div className="space-y-3">
                      <button
                        className="group relative w-full px-6 py-4 bg-transparent border border-white/40 text-white/80 rounded-xl text-lg hover:bg-white/5 hover:border-white/60 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        disabled={authState.isRegistering}
                        style={{ pointerEvents: "auto", zIndex: 100 }}
                        onClick={handleQuickInit}
                      >
                        <div className="flex items-center justify-center space-x-3">
                          <div className="relative">
                            <Zap
                              className="text-white/70 group-hover:text-white transition-colors duration-300"
                              size={20}
                            />
                            <WifiOff
                              className="absolute -top-1 -right-1 text-white/50"
                              size={12}
                            />
                          </div>
                          <span>{t("main.quickStart")}</span>
                        </div>
                      </button>

                      <div className="text-center space-y-1">
                        <p className="text-white/50 text-sm">
                          {t("main.skipIntro")}
                        </p>
                        <p className="text-white/30 text-xs">
                          {t("main.slowConnections")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Video container */}
      <div
        className={`video-container ${isPlaying ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          playsInline
          className="video-player"
          preload="auto"
        >
          <source src="/videos/intro.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}