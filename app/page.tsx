// src/app/page.tsx - Simplified authentication page with single initialization button

"use client";

import type { TelegramUser } from "@/lib/supabase";
import type { RegistrationResult, LoginResult } from "@/hooks/modules/useAuth";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@nextui-org/react";
import { Zap, Gift, AlertTriangle } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import {
  extractReferralCode,
  parseTelegramInitData,
  getTelegramInitData,
} from "@/lib/telegram-auth";

interface PageState {
  isInitializing: boolean;
  needsAuthentication: boolean;
  referralInfo?: {
    code: string;
    bonus: number;
    referrerName?: string;
    referrerUsername?: string;
  };
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

  const [pageState, setPageState] = useState<PageState>({
    isInitializing: true,
    needsAuthentication: false,
  });

  const [fontLoaded, setFontLoaded] = useState<boolean>(false);

  const authStateRef = useRef(authState);

  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  /**
   * Extract Telegram user data from WebApp API
   */
  const getTelegramUserData = useCallback((): {
    user: TelegramUser | null;
    initData: string;
  } => {
    const initData = getTelegramInitData();

    if (!initData) {
      console.log("No Telegram initData available");

      return { user: null, initData: "" };
    }

    const parseResult = parseTelegramInitData(initData);

    if (!parseResult.success || !parseResult.user) {
      console.log("Failed to parse Telegram data:", parseResult.error);

      return { user: null, initData };
    }

    console.log("Successfully parsed Telegram user data:", parseResult.user);

    return { user: parseResult.user, initData };
  }, []);

  /**
   * Validate referral code
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
   * Attempt user authentication with comprehensive Nebula security integration
   */
  const attemptAuthentication = useCallback(
    async (initData: string): Promise<LoginResult> => {
      try {
        console.log("NEBULA DEBUG: Updated authentication function is running");
        console.log("Attempting user authentication...");
        const result = await login(initData);

        console.log("Login result received:", {
          success: result.success,
          hasUser: !!result.user,
          hasSecurity: !!result.security,
          error: result.error,
        });

        if (!result.success && result.error === "USER_NOT_FOUND") {
          console.log("User not found - this is expected for new users");

          return result;
        }

        if (result.success && result.user) {
          console.log(
            "Authentication successful for user:",
            result.user.first_name,
          );

          if (result.security) {
            console.log("Processing Nebula security checks:", {
              blocked: result.security.blocked,
              verificationRequired: result.security.verificationRequired,
              verificationType: result.security.verificationType,
              trustScore: result.security.trustScore,
            });

            if (result.security.blocked) {
              console.log("User is blocked - redirecting to blocked page");
              setTimeout(() => {
                router.push("/blocked");
              }, 1000);

              return result;
            }

            if (
              result.security.verificationRequired &&
              result.security.verificationType
            ) {
              console.log(
                `User requires ${result.security.verificationType} verification (trust score: ${result.security.trustScore}) - redirecting to Nebula page`,
              );
              setTimeout(() => {
                router.push("/nebula");
              }, 1000);

              return result;
            }

            console.log(
              `User passed all Nebula security checks (trust score: ${result.security.trustScore}) - redirecting to main page`,
            );
          } else {
            console.log(
              "No security object in response - proceeding to main page",
            );
          }

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
          error:
            error instanceof Error ? error.message : "Authentication failed",
        };
      }
    },
    [login, router],
  );

  /**
   * Register new user and redirect to main page
   */
  const registerNewUser = useCallback(
    async (
      initData: string,
      referralCode?: string,
    ): Promise<RegistrationResult> => {
      if (operationInProgressRef.current) {
        console.log("Registration already in progress, skipping...");

        return { success: false, error: "Registration already in progress" };
      }

      operationInProgressRef.current = true;

      try {
        console.log("Registering new user...");
        const result = await register(initData, referralCode);

        if (result.success && result.user) {
          console.log(
            "Registration successful for new user:",
            result.user.first_name,
          );

          if (result.referralBonus) {
            console.log("Referral bonus received:", result.referralBonus);
          }

          setPageState((prev) => ({
            ...prev,
            isInitializing: false,
            needsAuthentication: false,
          }));

          console.log(
            "New user registration complete - redirecting to main page",
          );
          setTimeout(() => {
            router.push("/main");
          }, 1000);
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
    [register, router],
  );

  /**
   * Initialize authentication flow with proper handling for existing and new users
   */
  const initializeAuthentication = useCallback(async () => {
    if (authInitializedRef.current) {
      console.log("Auth already initialized, skipping...");

      return;
    }

    authInitializedRef.current = true;

    try {
      console.log("Initializing authentication...");

      const { user: telegramUserData, initData } = getTelegramUserData();

      console.log("Telegram user data:", telegramUserData);
      console.log("InitData available:", !!initData);

      if (!telegramUserData || !initData) {
        console.error("Telegram data unavailable");
        setPageState((prev) => ({
          ...prev,
          isInitializing: false,
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
        const validation = await validateReferralCode(referralCode);

        if (validation.isValid) {
          referralInfo = {
            code: referralCode,
            bonus: validation.bonus,
            referrerName: validation.referrerName,
            referrerUsername: validation.referrerUsername,
          };
          console.log(`Valid referral code found: ${referralCode}`);
        }
      }

      setPageState((prev) => ({
        ...prev,
        referralInfo,
      }));

      console.log("Attempting authentication for existing user...");
      const authResult = await attemptAuthentication(initData);

      if (!authResult.success && authResult.error === "USER_NOT_FOUND") {
        console.log("User not found - showing registration UI for new user");
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
        }));

        return;
      }
    } catch (error) {
      console.error("Authentication initialization error:", error);
      setPageState((prev) => ({
        ...prev,
        isInitializing: false,
      }));
    }
  }, [
    getTelegramUserData,
    setTelegramUser,
    validateReferralCode,
    attemptAuthentication,
  ]);

  /**
   * Handle initialization button click
   */
  const handleInitialization = useCallback(async () => {
    const initData = getTelegramInitData();

    if (
      !initData ||
      authState.isRegistering ||
      operationInProgressRef.current
    ) {
      console.log("Cannot start initialization:", {
        hasInitData: !!initData,
        isRegistering: authState.isRegistering,
        operationInProgress: operationInProgressRef.current,
      });

      return;
    }

    const registrationResult = await registerNewUser(
      initData,
      pageState.referralInfo?.code,
    );

    if (!registrationResult.success) {
      console.error("Initialization failed:", registrationResult.error);
    }
  }, [authState.isRegistering, registerNewUser, pageState.referralInfo?.code]);

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
      {isInitialLoading && (
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

      {/* Authentication Error Screen */}
      {authState.error && !isInitialLoading && (
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
              setPageState((prev) => ({
                ...prev,
                isInitializing: true,
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
        !isInitialLoading && (
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
