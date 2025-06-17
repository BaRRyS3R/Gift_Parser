// src/app/page.tsx - Updated with localization support

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@nextui-org/react";
import { Play, Zap, Wifi, WifiOff, Gift } from "lucide-react";

import { userService, type TelegramUser, type User } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import DebugLanguage from '@/components/DebugLanguage';

interface AuthState {
  isChecking: boolean;
  isRegistering: boolean;
  user: User | null;
  telegramUser: TelegramUser | null;
  error: string | null;
  needsRegistration: boolean;
  referralCode?: string;
  referralBonus?: number;
}

export default function IntroPage(): JSX.Element {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { refreshUser, updateUser, setTelegramUser } = useUser();
  const t = useT();

  // Флаги для предотвращения повторных операций
  const authInitializedRef = useRef<boolean>(false);
  const registrationInProgressRef = useRef<boolean>(false);

  // Состояние авторизации
  const [authState, setAuthState] = useState<AuthState>({
    isChecking: true,
    isRegistering: false,
    user: null,
    telegramUser: null,
    error: null,
    needsRegistration: false,
  });

  // Ref для хранения актуального состояния авторизации
  const authStateRef = useRef<AuthState>(authState);

  // Обновляем ref при изменении состояния
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  // Состояние видео
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

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

    // Fallback: check URL parameters for development
    if (process.env.NODE_ENV === "development") {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      if (refCode) {
        console.log("Referral code extracted from URL (dev):", refCode);
        return refCode;
      }
    }

    return undefined;
  }, []);

  const getTelegramUser = useCallback((): TelegramUser | null => {
    if (typeof window === "undefined") {
      return null;
    }

    // Проверяем наличие Telegram WebApp API
    if (!window.Telegram?.WebApp) {
      console.log("Telegram WebApp API недоступен");
      // Для тестирования вне Telegram возвращаем тестового пользователя
      if (process.env.NODE_ENV === "development") {
        console.log("Возвращаем тестового пользователя для разработки");

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

    console.log("Данные Telegram пользователя:", user);

    if (!user || !user.id) {
      console.log("Пользователь Telegram не найден или некорректен");
      // Для тестирования возвращаем тестового пользователя
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

  const checkUserExists = useCallback(
    async (telegramUser: TelegramUser): Promise<User | null> => {
      try {
        return await userService.findByTelegramId(telegramUser.id);
      } catch (error) {
        console.error("Ошибка при проверке пользователя:", error);
        throw error;
      }
    },
    [],
  );

  const validateReferralCode = useCallback(
    async (referralCode: string): Promise<{ isValid: boolean; bonus: number }> => {
      try {
        const referrer = await userService.findByReferralCode(referralCode);
        if (referrer) {
          return { isValid: true, bonus: referrer.referral_bonus };
        }
        return { isValid: false, bonus: 0 };
      } catch (error) {
        console.error("Ошибка при проверке реферального кода:", error);
        return { isValid: false, bonus: 0 };
      }
    },
    [],
  );

  const registerUser = useCallback(
    async (telegramUser: TelegramUser, referralCode?: string): Promise<User> => {
      if (registrationInProgressRef.current) {
        throw new Error("Регистрация уже в процессе");
      }

      try {
        registrationInProgressRef.current = true;

        setAuthState((prev) => ({
          ...prev,
          isRegistering: true,
          error: null,
        }));

        console.log("Создаем нового пользователя в БД...");
        const newUser = await userService.create(telegramUser, referralCode);

        console.log("Пользователь успешно создан:", newUser);

        // Обновляем локальное состояние
        setAuthState((prev) => ({
          ...prev,
          user: newUser,
          isRegistering: false,
          needsRegistration: false,
        }));

        // КРИТИЧНО: Обновляем контекст приложения
        console.log("Обновляем контекст пользователя...");
        updateUser(newUser);

        return newUser;
      } catch (error) {
        console.error("Ошибка при регистрации:", error);
        setAuthState((prev) => ({
          ...prev,
          isRegistering: false,
          error: t('auth.registrationFailed'),
        }));
        throw error;
      } finally {
        registrationInProgressRef.current = false;
      }
    },
    [updateUser, t],
  );

  const initializeAuth = useCallback(async () => {
    if (authInitializedRef.current) return;

    authInitializedRef.current = true;

    try {
      console.log("Инициализация авторизации...");

      const telegramUser = getTelegramUser();
      const referralCode = extractReferralCode();

      console.log("Полученный пользователь Telegram:", telegramUser);
      console.log("Реферальный код:", referralCode);

      if (!telegramUser) {
        console.error("Данные пользователя Telegram недоступны");
        setAuthState((prev) => ({
          ...prev,
          isChecking: false,
          error: t('auth.telegramDataUnavailable'),
        }));

        return;
      }

      // Проверяем реферальный код если есть
      let referralBonus = 0;
      if (referralCode) {
        const validation = await validateReferralCode(referralCode);
        if (validation.isValid) {
          referralBonus = validation.bonus;
          console.log(`Валидный реферальный код. Бонус: +${referralBonus} попыток`);
        } else {
          console.log("Невалидный реферальный код");
        }
      }

      setAuthState((prev) => ({
        ...prev,
        telegramUser,
        referralCode: referralCode,
        referralBonus: referralBonus
      }));

      // Устанавливаем telegram пользователя в контекст
      setTelegramUser(telegramUser);

      console.log("Проверяем существование пользователя в БД...");
      const existingUser = await checkUserExists(telegramUser);

      console.log("Результат проверки пользователя:", existingUser);

      if (existingUser) {
        console.log(
          "Пользователь найден в базе данных, обновляем контекст и перенаправляем на /main",
        );
        setAuthState((prev) => ({
          ...prev,
          user: existingUser,
          isChecking: false,
          needsRegistration: false,
        }));

        // Обновляем контекст для существующего пользователя
        updateUser(existingUser);

        setTimeout(() => {
          router.push("/main");
        }, 500);
      } else {
        console.log("Пользователь не найден в БД, требуется регистрация");
        setAuthState((prev) => ({
          ...prev,
          isChecking: false,
          needsRegistration: true,
        }));
      }
    } catch (error) {
      console.error("Ошибка инициализации авторизации:", error);
      setAuthState((prev) => ({
        ...prev,
        isChecking: false,
        error: `${t('auth.databaseConnectionError')}: ${error instanceof Error ? error.message : t('auth.unknownError')}`,
      }));
    }
  }, [getTelegramUser, extractReferralCode, validateReferralCode, checkUserExists, router, updateUser, setTelegramUser, t]);

  // Инициализация Service Worker и шрифта
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => console.log("ServiceWorker зарегистрирован"))
        .catch((err) =>
          console.error("ServiceWorker регистрация не удалась:", err),
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

  // Инициализация видео
  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const handleLoadedMetadata = () => {
      video.volume = 1;
      setIsReady(true);
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

    const handleEnded = () => {
      console.log("Видео завершено");

      // Используем актуальное состояние из ref
      const currentAuthState = authStateRef.current;

      console.log("Актуальное состояние авторизации:", {
        telegramUser: !!currentAuthState.telegramUser,
        user: !!currentAuthState.user,
        isRegistering: currentAuthState.isRegistering,
        needsRegistration: currentAuthState.needsRegistration,
        referralCode: currentAuthState.referralCode,
      });

      // Выполняем регистрацию пользователя после окончания видео
      if (
        currentAuthState.telegramUser &&
        !currentAuthState.user &&
        !currentAuthState.isRegistering
      ) {
        console.log("Начинаем регистрацию после видео");
        registerUser(currentAuthState.telegramUser, currentAuthState.referralCode)
          .then((registeredUser) => {
            console.log("Регистрация успешна, пользователь:", registeredUser);
            console.log("Перенаправляем на main через 1 секунду");
            // После успешной регистрации перенаправляем на main
            setTimeout(() => {
              router.push("/main");
            }, 1000);
          })
          .catch((error) => {
            console.error("Ошибка регистрации после видео:", error);
            // Даже при ошибке регистрации пытаемся обновить контекст
            setTimeout(() => {
              refreshUser()
                .then(() => {
                  router.push("/main");
                })
                .catch(() => {
                  router.push("/main");
                });
            }, 2000);
          });
      } else if (currentAuthState.user) {
        console.log("Пользователь уже зарегистрирован, перенаправляем на main");
        // Если пользователь уже зарегистрирован, просто перенаправляем
        router.push("/main");
      } else {
        console.log(
          "Условия для регистрации не выполнены, принудительно перенаправляем",
        );
        console.log("Детали состояния:", currentAuthState);
        // Принудительно обновляем контекст и перенаправляем
        setTimeout(() => {
          refreshUser()
            .then(() => {
              router.push("/main");
            })
            .catch(() => {
              router.push("/main");
            });
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
  }, [router, registerUser, refreshUser]);

  // Инициализация авторизации
  useEffect(() => {
    if (!authInitializedRef.current) {
      initializeAuth();
    }
  }, [initializeAuth]);

  // Функция запуска видео
  const handleStart = async () => {
    const video = videoRef.current;

    if (!video) return;

    try {
      video.currentTime = 0;
      await video.play();
      setIsPlaying(true);
      setVideoError(null);
    } catch (err) {
      console.error("Video play error:", err);
      setVideoError("Failed to play video. Please try again.");
    }
  };

  // Быстрая регистрация без видео
  const handleQuickInit = async () => {
    if (
      !authState.telegramUser ||
      authState.isRegistering ||
      registrationInProgressRef.current
    ) {
      return;
    }

    try {
      const registeredUser = await registerUser(authState.telegramUser, authState.referralCode);

      console.log("Быстрая регистрация успешна:", registeredUser);
      setTimeout(() => {
        router.push("/main");
      }, 1000);
    } catch (error) {
      console.error("Ошибка быстрой регистрации:", error);
    }
  };

  const isInitialLoading =
    authState.isChecking || (isLoading && !videoError) || !fontLoaded;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Экран загрузки */}
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
              ? t('auth.checkingUser')
              : `${t('common.loading')} ${Math.round(loadProgress)}%`}
          </p>
          {/* Добавьте компонент отладки */}
          <DebugLanguage />
        </div>
      )}

      {/* Экран ошибки авторизации */}
      {authState.error && !isInitialLoading && (
        <div className="loader-container">
          <p className="text-white text-center mb-4">
            {authState.error}
          </p>
          <button
            className="px-4 py-2 bg-white text-black rounded"
            onClick={() => {
              authInitializedRef.current = false;
              registrationInProgressRef.current = false;
              setAuthState((prev) => ({
                ...prev,
                error: null,
                isChecking: true,
              }));
              initializeAuth();
            }}
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Экран ошибки видео */}
      {videoError && !isInitialLoading && !authState.error && (
        <div className="loader-container">
          <p className="text-white text-center mb-4">
            {videoError}
          </p>
          <button
            className="px-4 py-2 bg-white text-black rounded mb-4"
            onClick={handleStart}
          >
            {t('common.retry')}
          </button>
          <button
            className="block px-6 py-3 bg-transparent border border-white/60 text-white/80 rounded-lg text-sm hover:bg-white/5 hover:border-white hover:text-white transition-colors"
            onClick={handleQuickInit}
          >
            {t('auth.continueWithoutVideo')}
          </button>
        </div>
      )}

      {/* Экран регистрации */}
      {authState.needsRegistration &&
        !authState.isChecking &&
        !authState.error &&
        !videoError &&
        !isPlaying && (
          <div className="min-h-screen bg-black flex items-center justify-center p-6 fixed inset-0 z-50">
            <div className="w-full max-w-md space-y-8">
              {authState.isRegistering ? (
                <div className="text-center">
                  <Spinner color="white" size="lg" />
                  <p className="text-white mt-4">{t('auth.registering')}</p>
                  {authState.referralCode && (
                    <p className="text-green-400 mt-2 text-sm">
                      {t('auth.processingReferralBonus')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-8">
                  {/* Header */}
                  <div className="space-y-4">
                    <div className="relative">
                      <h1 className="text-4xl font-bold text-white tracking-wider">
                        {t('main.welcome')}
                      </h1>
                      <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-2 w-16 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                    </div>
                    <p className="text-white/70 text-sm">
                      {t('main.greeting', { name: authState.telegramUser?.first_name || 'User' })}
                    </p>

                    {/* Referral Bonus Info */}
                    {authState.referralCode && authState.referralBonus && authState.referralBonus > 0 && (
                      <div className="bg-green-500/20 border border-green-400/40 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-center space-x-2">
                          <Gift className="text-green-400" size={20} />
                          <span className="text-green-300 font-bold">
                            {t('auth.referralBonus')}
                          </span>
                        </div>
                        <p className="text-green-400 text-sm">
                          {t('auth.youllGet')} <span className="font-bold">+{authState.referralBonus} {authState.referralBonus > 1 ? t('auth.extraAttempts') : t('auth.extraAttempt')}</span>
                        </p>
                        <p className="text-green-400/60 text-xs">
                          {t('auth.referredBy')} {authState.referralCode}
                        </p>
                      </div>
                    )}

                    <p className="text-white/50 text-xs uppercase tracking-widest">
                      {t('main.chooseEntryMethod')}
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
                          <span className="tracking-wider">{t('main.initialize')}</span>
                        </div>

                        {/* Glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                      </button>

                      <div className="text-center space-y-1">
                        <p className="text-white/60 text-sm">
                          {t('main.fullExperience')}
                        </p>
                        <p className="text-white/40 text-xs">
                          {t('main.recommended')}
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
                          {t('common.or')}
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
                          <span>{t('main.quickStart')}</span>
                        </div>
                      </button>

                      <div className="text-center space-y-1">
                        <p className="text-white/50 text-sm">
                          {t('main.skipIntro')}
                        </p>
                        <p className="text-white/30 text-xs">
                          {t('main.slowConnections')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Видео контейнер */}
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