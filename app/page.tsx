// src/app/page.tsx - Optimized with Nebula Security Integration

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@nextui-org/react";
import { Play, Zap, Wifi, WifiOff, Gift, Shield, AlertTriangle } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import {
  extractReferralCode,
  parseTelegramInitData,
  getTelegramInitData
} from "@/lib/telegram-auth";
import DebugLanguage from "@/components/DebugLanguage";
import type { TelegramUser } from "@/lib/supabase";
import type { RegistrationResult, LoginResult } from "@/hooks/modules/useAuth";

interface PageState {
  isInitializing: boolean;
  needsAuthentication: boolean;
  isVideoMode: boolean;
  videoError: string | null;
  referralInfo?: {
    code: string;
    bonus: number;
    referrerName?: string;
    referrerUsername?: string;
  };
}

interface VideoState {
  isLoading: boolean;
  loadProgress: number;
  isReady: boolean;
  isPlaying: boolean;
  fontLoaded: boolean;
}

export default function IntroPage(): JSX.Element {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const t = useT();

  const {
    authState,
    telegramUser,
    setTelegramUser,
    register,
    login,
    isLoading: userLoading
  } = useUser();

  const authInitializedRef = useRef<boolean>(false);
  const operationInProgressRef = useRef<boolean>(false);

  const [pageState, setPageState] = useState<PageState>({
    isInitializing: true,
    needsAuthentication: false,
    isVideoMode: false,
    videoError: null,
  });

  const [videoState, setVideoState] = useState<VideoState>({
    isLoading: true,
    loadProgress: 0,
    isReady: false,
    isPlaying: false,
    fontLoaded: false,
  });

  const authStateRef = useRef(authState);
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  /**
   * Extract Telegram user data from WebApp API
   */
  const getTelegramUserData = useCallback((): { user: TelegramUser | null; initData: string } => {
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
  const validateReferralCode = useCallback(async (code: string): Promise<{
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
  }, []);

  /**
   * Attempt user authentication with comprehensive Nebula security integration
   */
  const attemptAuthentication = useCallback(async (
    initData: string
  ): Promise<LoginResult> => {
    try {
      console.log("NEBULA DEBUG: Updated authentication function is running");
      console.log("Attempting user authentication...");
      const result = await login(initData);

      console.log("Login result received:", {
        success: result.success,
        hasUser: !!result.user,
        hasSecurity: !!result.security,
        error: result.error
      });

      if (!result.success && result.error === 'USER_NOT_FOUND') {
        console.log("User not found - this is expected for new users");
        return result;
      }

      if (result.success && result.user) {
        console.log("Authentication successful for user:", result.user.first_name);

        if (result.security) {
          console.log("Processing Nebula security checks:", {
            blocked: result.security.blocked,
            verificationRequired: result.security.verificationRequired,
            verificationType: result.security.verificationType,
            trustScore: result.security.trustScore
          });

          if (result.security.blocked) {
            console.log("User is blocked - redirecting to blocked page");
            setTimeout(() => {
              router.push("/blocked");
            }, 1000);
            return result;
          }

          if (result.security.verificationRequired && result.security.verificationType) {
            console.log(`User requires ${result.security.verificationType} verification (trust score: ${result.security.trustScore}) - redirecting to Nebula page`);
            setTimeout(() => {
              router.push("/nebula");
            }, 1000);
            return result;
          }

          console.log(`User passed all Nebula security checks (trust score: ${result.security.trustScore}) - redirecting to main page`);
        } else {
          console.log("No security object in response - proceeding to main page");
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
        error: error instanceof Error ? error.message : "Authentication failed"
      };
    }
  }, [login, router]);

  /**
   * Register new user without Nebula security checks
   * New users receive default trust_score and do not require immediate verification
   */
  const registerNewUser = useCallback(async (
    initData: string,
    referralCode?: string
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
        console.log("Registration successful for new user:", result.user.first_name);

        if (result.referralBonus) {
          console.log("Referral bonus received:", result.referralBonus);
        }

        setPageState(prev => ({
          ...prev,
          isInitializing: false,
          needsAuthentication: false,
        }));

        console.log("New user registration complete - redirecting to main page");
        setTimeout(() => {
          router.push("/main");
        }, 1000);
      }

      return result;
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed"
      };
    } finally {
      operationInProgressRef.current = false;
    }
  }, [register, router]);

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
        setPageState(prev => ({
          ...prev,
          isInitializing: false,
          videoError: t("auth.telegramDataUnavailable"),
        }));
        return;
      }

      setTelegramUser(telegramUserData);

      const referralCode = extractReferralCode(initData);
      let referralInfo: {
        code: string;
        bonus: number;
        referrerName?: string;
        referrerUsername?: string;
      } | undefined;

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

      setPageState(prev => ({
        ...prev,
        referralInfo,
      }));

      console.log("Attempting authentication for existing user...");
      const authResult = await attemptAuthentication(initData);

      if (!authResult.success && authResult.error === 'USER_NOT_FOUND') {
        console.log("User not found - showing registration UI for new user");
        setPageState(prev => ({
          ...prev,
          isInitializing: false,
          needsAuthentication: true,
        }));
        return;
      }

      if (!authResult.success && authResult.error !== 'USER_NOT_FOUND') {
        console.error("Authentication failed with error:", authResult.error);
        setPageState(prev => ({
          ...prev,
          isInitializing: false,
          videoError: `Authentication error: ${authResult.error}`,
        }));
        return;
      }

    } catch (error) {
      console.error("Authentication initialization error:", error);
      setPageState(prev => ({
        ...prev,
        isInitializing: false,
        videoError: `${t("auth.databaseConnectionError")}: ${error instanceof Error ? error.message : t("auth.unknownError")}`,
      }));
    }
  }, [
    getTelegramUserData,
    setTelegramUser,
    validateReferralCode,
    attemptAuthentication,
    t
  ]);

  /**
   * Handle video completion and trigger new user registration
   */
  const handleVideoCompletion = useCallback(async () => {
    console.log("Video completed");

    const currentAuthState = authStateRef.current;
    const initData = getTelegramInitData();

    console.log("Current auth state:", {
      isAuthenticated: currentAuthState.isAuthenticated,
      user: !!currentAuthState.user,
      isRegistering: currentAuthState.isRegistering,
    });

    if (!currentAuthState.isAuthenticated &&
      !currentAuthState.isRegistering &&
      initData) {

      console.log("Starting registration after video completion");

      const registrationResult = await registerNewUser(
        initData,
        pageState.referralInfo?.code
      );

      if (!registrationResult.success) {
        console.error("Registration failed after video:", registrationResult.error);
        setTimeout(() => {
          router.push("/main");
        }, 2000);
      }
    } else if (currentAuthState.isAuthenticated) {
      console.log("User already authenticated, redirecting to main");
      router.push("/main");
    } else {
      console.log("Unexpected state, redirecting to main");
      router.push("/main");
    }
  }, [registerNewUser, pageState.referralInfo?.code, router]);

  /**
   * Handle quick registration without video for new users
   */
  const handleQuickRegistration = useCallback(async () => {
    const initData = getTelegramInitData();

    if (!initData || authState.isRegistering || operationInProgressRef.current) {
      console.log("Cannot start quick registration:", {
        hasInitData: !!initData,
        isRegistering: authState.isRegistering,
        operationInProgress: operationInProgressRef.current
      });
      return;
    }

    const registrationResult = await registerNewUser(
      initData,
      pageState.referralInfo?.code
    );

    if (!registrationResult.success) {
      console.error("Quick registration failed:", registrationResult.error);
    }
  }, [authState.isRegistering, registerNewUser, pageState.referralInfo?.code]);

  /**
   * Start video playback
   */
  const handleStartVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.currentTime = 0;
      await video.play();
      setVideoState(prev => ({ ...prev, isPlaying: true }));
      setPageState(prev => ({ ...prev, isVideoMode: true, videoError: null }));
    } catch (err) {
      console.error("Video play error:", err);
      setPageState(prev => ({
        ...prev,
        videoError: "Failed to play video. Please try again."
      }));
    }
  }, []);

  // Initialize Service Worker and font loading
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => console.log("ServiceWorker registered"))
        .catch((err) => console.error("ServiceWorker registration failed:", err));
    }

    if ("fonts" in document) {
      document.fonts
        .load('1rem "BPDots Diamond"')
        .then(() => setVideoState(prev => ({ ...prev, fontLoaded: true })))
        .catch(() => setVideoState(prev => ({ ...prev, fontLoaded: true })));
    } else {
      setTimeout(() => setVideoState(prev => ({ ...prev, fontLoaded: true })), 1000);
    }
  }, []);

  // Initialize video setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      video.volume = 1;
      setVideoState(prev => ({ ...prev, isReady: true }));
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;

        if (duration > 0) {
          const progress = (bufferedEnd / duration) * 100;
          setVideoState(prev => ({ ...prev, loadProgress: progress }));
        }
      }
    };

    const handleCanPlayThrough = () => {
      setVideoState(prev => ({ ...prev, isLoading: false }));
    };

    const handleEnded = () => {
      console.log("Video playback ended");
      handleVideoCompletion();
    };

    const handleError = (e: Event) => {
      console.error("Video error:", e);
      setPageState(prev => ({
        ...prev,
        videoError: "Failed to load video. Please try again."
      }));
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
  }, [handleVideoCompletion]);

  // Initialize authentication flow
  useEffect(() => {
    if (!authInitializedRef.current && !authState.isAuthenticated) {
      initializeAuthentication();
    }
  }, [initializeAuthentication, authState.isAuthenticated]);

  const isInitialLoading = pageState.isInitializing ||
    userLoading ||
    (videoState.isLoading && !pageState.videoError) ||
    !videoState.fontLoaded;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Loading Screen */}
      {isInitialLoading && (
        <div className="loader-container">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${videoState.loadProgress}%` }}
            />
          </div>
          <p className="text-white mt-4 text-sm">
            {pageState.isInitializing
              ? t("auth.checkingUser")
              : `${t("common.loading")} ${Math.round(videoState.loadProgress)}%`}
          </p>
          <DebugLanguage />
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
              setPageState(prev => ({
                ...prev,
                isInitializing: true,
                videoError: null,
              }));
              initializeAuthentication();
            }}
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {/* Video Error Screen */}
      {pageState.videoError && !isInitialLoading && !authState.error && (
        <div className="loader-container">
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="text-red-400" size={48} />
          </div>
          <p className="text-white text-center mb-4">{pageState.videoError}</p>
          <button
            className="px-4 py-2 bg-white text-black rounded mb-4"
            onClick={handleStartVideo}
          >
            {t("common.retry")}
          </button>
          <button
            className="block px-6 py-3 bg-transparent border border-white/60 text-white/80 rounded-lg text-sm hover:bg-white/5 hover:border-white hover:text-white transition-colors"
            onClick={handleQuickRegistration}
          >
            {t("auth.continueWithoutVideo")}
          </button>
        </div>
      )}

      {/* Registration Screen */}
      {pageState.needsAuthentication &&
        !pageState.isInitializing &&
        !authState.error &&
        !pageState.videoError &&
        !videoState.isPlaying && (
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
                        <p className="text-green-400/60 text-xs">
                          by John Doe
                        </p>
                      </div>
                    )}

                    <p className="text-white/50 text-xs uppercase tracking-widest">
                      {t("main.chooseEntryMethod")}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <button
                        className="group relative w-full px-8 py-6 bg-transparent border-2 border-white/60 text-white rounded-2xl text-xl font-bold hover:border-white hover:bg-white/5 transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        disabled={authState.isRegistering}
                        style={{ pointerEvents: "auto", zIndex: 100 }}
                        onClick={handleStartVideo}
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

                    <div className="space-y-3">
                      <button
                        className="group relative w-full px-6 py-4 bg-transparent border border-white/40 text-white/80 rounded-xl text-lg hover:bg-white/5 hover:border-white/60 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        disabled={authState.isRegistering}
                        style={{ pointerEvents: "auto", zIndex: 100 }}
                        onClick={handleQuickRegistration}
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

      {/* Video Container */}
      <div
        className={`video-container ${videoState.isPlaying ? "opacity-100" : "opacity-0"
          } transition-opacity duration-500`}
      >
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