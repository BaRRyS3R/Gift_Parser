// src/app/page.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ с усиленной безопасностью

"use client";

import type { TelegramUser } from "@/lib/supabase";
import type { RegistrationResult, LoginResult } from "@/hooks/modules/useAuth";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@nextui-org/react";
import { Zap, Gift, AlertTriangle, Shield } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import {
  extractReferralCode,
  parseTelegramInitData,
  getTelegramInitData,
  quickAuthDateCheck, // 🚨 НОВЫЙ ИМПОРТ
} from "@/lib/telegram-auth";

interface PageState {
  isInitializing: boolean;
  needsAuthentication: boolean;
  securityBlocked: boolean; // 🚨 НОВОЕ ПОЛЕ
  referralInfo?: {
    code: string;
    bonus: number;
    referrerName?: string;
    referrerUsername?: string;
  };
  securityError?: string; // 🚨 НОВОЕ ПОЛЕ
}

export default function IntroPage(): JSX.Element {
  const router = useRouter();
  const t = useT();

  const {
    authState,
    telegramUser,
    setTelegramUser,
    register,
    login,
    isLoading: userLoading,
  } = useUser();

  const authInitializedRef = useRef<boolean>(false);
  const operationInProgressRef = useRef<boolean>(false);
  const securityCheckPerformedRef = useRef<boolean>(false); // 🚨 НОВЫЙ REF

  const [pageState, setPageState] = useState<PageState>({
    isInitializing: true,
    needsAuthentication: false,
    securityBlocked: false, // 🚨 НОВОЕ ПОЛЕ
  });

  const [fontLoaded, setFontLoaded] = useState<boolean>(false);

  const authStateRef = useRef(authState);

  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  /**
   * 🚨 НОВАЯ ФУНКЦИЯ: Комплексная проверка безопасности initData
   */
  const performSecurityChecks = useCallback((initData: string): {
    passed: boolean;
    error?: string;
    warnings: string[];
  } => {
    const warnings: string[] = [];
    
    if (!initData) {
      return {
        passed: false,
        error: "No authentication data available",
        warnings
      };
    }

    // Проверка 1: Быстрая проверка auth_date
    const quickCheck = quickAuthDateCheck(initData);
    if (!quickCheck.isValid) {
      console.error(`[CLIENT SECURITY] Quick auth_date check failed: ${quickCheck.error}`);
      return {
        passed: false,
        error: quickCheck.error,
        warnings
      };
    }

    // Проверка 2: Размер данных
    if (initData.length > 5000) {
      console.error(`[CLIENT SECURITY] InitData too large: ${initData.length} characters`);
      return {
        passed: false,
        error: "Authentication data format invalid",
        warnings
      };
    }

    // Проверка 3: Подозрительные символы
    if (!/^[a-zA-Z0-9=&%\-_{}:"',\s\/.\\]+$/.test(initData)) {
      console.error("[CLIENT SECURITY] Suspicious characters in initData");
      return {
        passed: false,
        error: "Authentication data contains invalid characters",
        warnings
      };
    }

    // Проверка 4: Возраст данных (предупреждения)
    if (quickCheck.authDate) {
      const currentTime = Math.floor(Date.now() / 1000);
      const age = currentTime - quickCheck.authDate;
      
      if (age > 1800) { // Старше 30 минут
        warnings.push(`Authentication data is ${Math.round(age / 60)} minutes old`);
      }
      
      if (age > 3600) { // Старше 1 часа
        console.warn(`[CLIENT SECURITY] Old auth data: ${age} seconds`);
        warnings.push("Authentication data may be expired");
      }
    }

    console.log(`[CLIENT SECURITY] Security checks passed. Warnings: ${warnings.length}`);
    return {
      passed: true,
      warnings
    };
  }, []);

  /**
   * Extract Telegram user data from WebApp API with enhanced security
   * 🚨 ОБНОВЛЕННАЯ ВЕРСИЯ с дополнительными проверками
   */
  const getTelegramUserData = useCallback((): {
    user: TelegramUser | null;
    initData: string;
    securityWarnings: string[];
  } => {
    const initData = getTelegramInitData();

    if (!initData) {
      console.warn("[CLIENT] No Telegram initData available");
      return { user: null, initData: "", securityWarnings: [] };
    }

    // 🚨 ВЫПОЛНИТЬ ПРОВЕРКИ БЕЗОПАСНОСТИ
    if (!securityCheckPerformedRef.current) {
      const securityCheck = performSecurityChecks(initData);
      securityCheckPerformedRef.current = true;
      
      if (!securityCheck.passed) {
        console.error(`[CLIENT] Security check failed: ${securityCheck.error}`);
        setPageState(prev => ({
          ...prev,
          securityBlocked: true,
          securityError: securityCheck.error
        }));
        return { user: null, initData: "", securityWarnings: [] };
      }
      
      if (securityCheck.warnings.length > 0) {
        console.warn(`[CLIENT] Security warnings:`, securityCheck.warnings);
      }
    }

    // Парсинг данных с исправленной валидацией
    const parseResult = parseTelegramInitData(initData);

    if (!parseResult.success || !parseResult.user) {
      console.error("Failed to parse Telegram data:", parseResult.error);
      return { user: null, initData, securityWarnings: [] };
    }

    // 🚨 ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ ПОЛЬЗОВАТЕЛЯ
    const user = parseResult.user;
    const userWarnings: string[] = [];
    
    // Проверка разумности данных пользователя
    if (user.id <= 0 || user.id > 9999999999) {
      console.error(`[CLIENT] Suspicious user ID: ${user.id}`);
      setPageState(prev => ({
        ...prev,
        securityBlocked: true,
        securityError: "Invalid user data detected"
      }));
      return { user: null, initData, securityWarnings: [] };
    }
    
    if (user.first_name.length < 1 || user.first_name.length > 64) {
      console.error(`[CLIENT] Suspicious first name length: ${user.first_name.length}`);
      userWarnings.push("Unusual name format detected");
    }

    console.log(`[CLIENT] Successfully extracted user data: ${user.id} (${user.first_name})`);
    return { user, initData, securityWarnings: userWarnings };
  }, [performSecurityChecks]);

  /**
   * Validate referral code with enhanced checks
   * 🚨 ОБНОВЛЕННАЯ ВЕРСИЯ с дополнительной валидацией
   */
  const validateReferralCode = useCallback(
    async (
      code: string,
    ): Promise<{
      isValid: boolean;
      code: string;
      bonus: number;
      referrerName?: string;
      referrerUsername?: string;
    }> => {
      try {
        // Проверка формата реферального кода
        if (!/^[A-Z0-9]{8}$/.test(code)) {
          console.warn(`[CLIENT] Invalid referral code format: ${code}`);
          return { isValid: false, code, bonus: 0 };
        }

        // Здесь можно добавить дополнительные проверки
        // Например, проверку на известные запрещенные коды
        const bannedCodes = ['TESTTEST', '00000000', 'AAAAAAAA'];
        if (bannedCodes.includes(code)) {
          console.warn(`[CLIENT] Banned referral code: ${code}`);
          return { isValid: false, code, bonus: 0 };
        }

        console.log(`[CLIENT] Referral code appears valid: ${code}`);
        return {
          isValid: true,
          code,
          bonus: 5,
        };
      } catch (error) {
        console.error("Error validating referral code:", error);
        return { isValid: false, code, bonus: 0 };
      }
    },
    [],
  );

  /**
   * Attempt user authentication with enhanced error handling
   * 🚨 ОБНОВЛЕННАЯ ВЕРСИЯ с улучшенной обработкой ошибок
   */
  const attemptAuthentication = useCallback(
    async (initData: string): Promise<LoginResult> => {
      try {
        console.log("[CLIENT] Attempting authentication...");
        const result = await login(initData);

        if (!result.success && result.error === "USER_NOT_FOUND") {
          console.log("[CLIENT] User not found - new user registration needed");
          return result;
        }

        if (result.success && result.user) {
          console.log(`[CLIENT] Authentication successful for ${result.user.first_name}`);
          
          if (result.security) {
            if (result.security.blocked) {
              console.log("[CLIENT] User is blocked - redirecting to blocked page");
              setTimeout(() => {
                router.push("/blocked");
              }, 1000);
              return result;
            }

            if (
              result.security.verificationRequired &&
              result.security.verificationType
            ) {
              console.log(`[CLIENT] Verification required: ${result.security.verificationType}`);
              setTimeout(() => {
                router.push("/nebula");
              }, 1000);
              return result;
            }
          }

          console.log("[CLIENT] Full access granted - redirecting to main page");
          setTimeout(() => {
            router.push("/main");
          }, 1000);
        } else {
          console.error("Login failed with error:", result.error);
        }

        return result;
      } catch (error) {
        console.error("Authentication error:", error);

        return {
          success: false,
          error: error instanceof Error ? error.message : "Authentication failed",
        };
      }
    },
    [login, router],
  );

  /**
   * Register new user and redirect to main page
   * 🚨 ОБНОВЛЕННАЯ ВЕРСИЯ с дополнительными проверками
   */
  const registerNewUser = useCallback(
    async (
      initData: string,
      referralCode?: string,
    ): Promise<RegistrationResult> => {
      if (operationInProgressRef.current) {
        console.warn("[CLIENT] Registration already in progress");
        return { success: false, error: "Registration already in progress" };
      }

      operationInProgressRef.current = true;

      try {
        console.log("[CLIENT] Starting user registration...");
        
        // Дополнительная проверка перед регистрацией
        const securityCheck = performSecurityChecks(initData);
        if (!securityCheck.passed) {
          console.error(`[CLIENT] Final security check failed: ${securityCheck.error}`);
          return { success: false, error: "Security validation failed" };
        }

        const result = await register(initData, referralCode);

        if (result.success && result.user) {
          console.log(`[CLIENT] Registration successful for ${result.user.first_name}`);
          
          setPageState((prev) => ({
            ...prev,
            isInitializing: false,
            needsAuthentication: false,
          }));

          setTimeout(() => {
            router.push("/main");
          }, 1000);
        } else {
          console.error(`[CLIENT] Registration failed: ${result.error}`);
        }

        return result;
      } catch (error) {
        console.error("Registration error:", error);

        return {
          success: false,
          error: error instanceof Error ? error.message : "Registration failed",
        };
      } finally {
        operationInProgressRef.current = false;
      }
    },
    [register, router, performSecurityChecks],
  );

  /**
   * Initialize authentication flow with enhanced security
   * 🚨 ОБНОВЛЕННАЯ ВЕРСИЯ с улучшенной безопасностью
   */
  const initializeAuthentication = useCallback(async () => {
    if (authInitializedRef.current) {
      return;
    }

    authInitializedRef.current = true;

    try {
      console.log("[CLIENT] Initializing authentication flow...");
      
      const { user: telegramUserData, initData, securityWarnings } = getTelegramUserData();

      if (securityWarnings.length > 0) {
        console.warn("[CLIENT] Security warnings detected:", securityWarnings);
        // Показываем предупреждения пользователю, но не блокируем
      }

      if (!telegramUserData || !initData) {
        console.error("Telegram data unavailable or security blocked");
        setPageState((prev) => ({
          ...prev,
          isInitializing: false,
          securityBlocked: !telegramUserData && !initData,
        }));
        return;
      }

      setTelegramUser(telegramUserData);

      const referralCode = extractReferralCode(initData);
      let referralInfo:
        | {
            code: string;
            bonus: number;
            referrerName?: string;
            referrerUsername?: string;
          }
        | undefined;

      if (referralCode) {
        console.log(`[CLIENT] Processing referral code: ${referralCode}`);
        const validation = await validateReferralCode(referralCode);

        if (validation.isValid) {
          referralInfo = {
            code: referralCode,
            bonus: validation.bonus,
            referrerName: validation.referrerName,
            referrerUsername: validation.referrerUsername,
          };
          console.log(`[CLIENT] Referral code validated, bonus: ${validation.bonus}`);
        } else {
          console.warn(`[CLIENT] Invalid referral code: ${referralCode}`);
        }
      }

      setPageState((prev) => ({
        ...prev,
        referralInfo,
      }));

      const authResult = await attemptAuthentication(initData);

      if (!authResult.success && authResult.error === "USER_NOT_FOUND") {
        console.log("[CLIENT] New user detected - showing registration");
        setPageState((prev) => ({
          ...prev,
          isInitializing: false,
          needsAuthentication: true,
        }));
        return;
      }

      if (!authResult.success && authResult.error !== "USER_NOT_FOUND") {
        console.error("Authentication failed with error:", authResult.error);
        setPageState((prev) => ({
          ...prev,
          isInitializing: false,
          securityBlocked: Boolean(authResult.error?.includes("security") || authResult.error?.includes("invalid")),
          securityError: authResult.error,
        }));
        return;
      }
    } catch (error) {
      console.error("Authentication initialization error:", error);
      setPageState((prev) => ({
        ...prev,
        isInitializing: false,
        securityBlocked: true,
        securityError: error instanceof Error ? error.message : "Authentication failed",
      }));
    }
  }, [
    getTelegramUserData,
    setTelegramUser,
    validateReferralCode,
    attemptAuthentication,
  ]);

  /**
   * Handle initialization button click with security checks
   * 🚨 ОБНОВЛЕННАЯ ВЕРСИЯ с дополнительными проверками
   */
  const handleInitialization = useCallback(async () => {
    const initData = getTelegramInitData();

    if (!initData || authState.isRegistering || operationInProgressRef.current) {
      console.warn("[CLIENT] Cannot proceed with initialization");
      return;
    }

    // Финальная проверка безопасности перед регистрацией
    const securityCheck = performSecurityChecks(initData);
    if (!securityCheck.passed) {
      console.error(`[CLIENT] Security check failed during initialization: ${securityCheck.error}`);
      setPageState(prev => ({
        ...prev,
        securityBlocked: true,
        securityError: securityCheck.error
      }));
      return;
    }

    const registrationResult = await registerNewUser(
      initData,
      pageState.referralInfo?.code,
    );

    if (!registrationResult.success) {
      console.error("Initialization failed:", registrationResult.error);
      
      // Проверка на security-related ошибки
      if (Boolean(registrationResult.error?.includes("security") || 
          registrationResult.error?.includes("invalid") ||
          registrationResult.error?.includes("blocked"))) {
        setPageState(prev => ({
          ...prev,
          securityBlocked: true,
          securityError: registrationResult.error
        }));
      }
    }
  }, [authState.isRegistering, registerNewUser, pageState.referralInfo?.code, performSecurityChecks]);

  // Initialize Service Worker and font loading
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
        .then(() => setFontLoaded(true))
        .catch(() => setFontLoaded(true));
    } else {
      setTimeout(() => setFontLoaded(true), 1000);
    }
  }, []);

  // Initialize authentication flow
  useEffect(() => {
    if (!authInitializedRef.current && !authState.isAuthenticated) {
      initializeAuthentication();
    }
  }, [initializeAuthentication, authState.isAuthenticated]);

  const isInitialLoading =
    pageState.isInitializing || userLoading || !fontLoaded;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Loading Screen */}
      {isInitialLoading && !pageState.securityBlocked && (
        <div className="loader-container">
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: "100%" }} />
          </div>
          <p className="text-white mt-4 text-sm">
            {pageState.isInitializing
              ? t("auth.checkingUser")
              : t("common.loading")}
          </p>
        </div>
      )}

      {/* 🚨 НОВЫЙ ЭКРАН: Security Block Screen */}
      {pageState.securityBlocked && !isInitialLoading && (
        <div className="loader-container">
          <div className="flex items-center justify-center mb-4">
            <Shield className="text-red-400" size={48} />
          </div>
          <p className="text-white text-center mb-4 font-bold text-lg">
            Security Check Failed
          </p>
          <p className="text-red-400 text-center mb-6 text-sm max-w-md">
            {pageState.securityError || "Authentication data appears to be invalid or compromised"}
          </p>
          <p className="text-gray-400 text-center text-xs mb-4">
            This may be due to:
            <br />• Expired authentication data
            <br />• Tampered authentication data
            <br />• System clock issues
          </p>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            onClick={() => {
              // Сброс состояния и попытка заново
              authInitializedRef.current = false;
              operationInProgressRef.current = false;
              securityCheckPerformedRef.current = false;
              setPageState({
                isInitializing: true,
                needsAuthentication: false,
                securityBlocked: false,
              });
              
              // Перезагрузка страницы для получения свежих данных
              setTimeout(() => {
                window.location.reload();
              }, 500);
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Authentication Error Screen */}
      {authState.error && !isInitialLoading && !pageState.securityBlocked && (
        <div className="loader-container">
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="text-red-400" size={48} />
          </div>
          <p className="text-white text-center mb-4">{authState.error}</p>
          <button
            className="px-4 py-2 bg-white text-black rounded"
            onClick={() => {
              authInitializedRef.current = false;
              operationInProgressRef.current = false;
              securityCheckPerformedRef.current = false;
              setPageState((prev) => ({
                ...prev,
                isInitializing: true,
                securityBlocked: false,
              }));
              initializeAuthentication();
            }}
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {/* Registration Screen */}
      {pageState.needsAuthentication &&
        !pageState.isInitializing &&
        !authState.error &&
        !isInitialLoading &&
        !pageState.securityBlocked && (
          <div className="min-h-screen bg-black flex items-center justify-center p-6 fixed inset-0 z-50">
            <div className="w-full max-w-md space-y-8">
              {authState.isRegistering ? (
                <div className="text-center">
                  <Spinner color="white" size="lg" />
                  <p className="text-white mt-4">{t("auth.registering")}</p>
                  {pageState.referralInfo && (
                    <p className="text-green-400 mt-2 text-sm">
                      {t("auth.processingReferralBonus")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-8">
                  <div className="space-y-4">
                    <div className="relative">
                      <h1 className="text-4xl font-bold text-white tracking-wider">
                        {t("main.welcome")}
                      </h1>
                      <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-2 w-16 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                    </div>
                    <p className="text-white/70 text-sm">
                      {t("main.greeting", {
                        name: telegramUser?.first_name || "User",
                      })}
                    </p>

                    {pageState.referralInfo && (
                      <div className="bg-green-500/20 border border-green-400/40 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-center space-x-2">
                          <Gift className="text-green-400" size={20} />
                          <span className="text-green-300 font-bold">
                            {t("auth.referralBonus")}
                          </span>
                        </div>
                        <p className="text-green-400/60 text-xs">by John Doe</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <button
                      className="group relative w-full px-8 py-6 bg-transparent border-2 border-white/60 text-white rounded-2xl text-xl font-bold hover:border-white hover:bg-white/5 transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      disabled={authState.isRegistering}
                      style={{ pointerEvents: "auto", zIndex: 100 }}
                      onClick={handleInitialization}
                    >
                      <div className="flex items-center justify-center space-x-4">
                        <div className="relative">
                          <Zap
                            className="text-white group-hover:translate-x-1 transition-transform duration-300"
                            size={24}
                          />
                        </div>
                        <span className="tracking-wider">
                          {t("main.initialize")}
                        </span>
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
}