// src/app/page.tsx - Updated with referral system support

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@nextui-org/react";
import { Play, Zap, Wifi, WifiOff, Gift } from "lucide-react";

import { userService, type TelegramUser, type User } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { useI18n } from "@/lib/i18n";

interface AuthState {
  isChecking: boolean;
  isRegistering: boolean;
  user: User | null;
  telegramUser: TelegramUser | null;
  error: string | null;
  needsRegistration: boolean;
  referralCode?: string;
  referralBonus?: number;
  referrerName?: string; // Добавляем поле для имени приглашающего
}

export default function IntroPage(): JSX.Element {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { refreshUser, updateUser, setTelegramUser } = useUser();
  const { t } = useI18n();

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

  // UPDATED validateReferralCode - добавляем получение имени приглашающего
  const validateReferralCode = useCallback(
    async (referralCode: string): Promise<{ isValid: boolean; bonus: number; referrerName: string }> => {
      try {
        const referrer = await userService.findByReferralCode(referralCode);
        if (referrer) {
          // Формируем отображаемое имя
          let displayName = "s0meone"; // Дефолтное значение

          if (referrer.username) {
            displayName = `@${referrer.username}`;
          } else if (referrer.first_name) {
            displayName = referrer.first_name + (referrer.last_name ? ` ${referrer.last_name}` : '');
          }

          return {
            isValid: true,
            bonus: referrer.referral_bonus,
            referrerName: displayName
          };
        }
        return { isValid: false, bonus: 0, referrerName: "s0meone" };
      } catch (error) {
        console.error("Ошибка при проверке реферального кода:", error);
        return { isValid: false, bonus: 0, referrerName: "s0meone" };
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
          error: "Ошибка при регистрации пользователя",
        }));
        throw error;
      } finally {
        registrationInProgressRef.current = false;
      }
    },
    [updateUser],
  );

  // UPDATED initializeAuth - добавляем логику получения имени приглашающего
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
          error: "Данные пользователя Telegram недоступны",
        }));

        return;
      }

      // Проверяем реферальный код если есть
      let referralBonus = 0;
      let referrerName = "";
      if (referralCode) {
        const validation = await validateReferralCode(referralCode);
        if (validation.isValid) {
          referralBonus = validation.bonus;
          referrerName = validation.referrerName;
          console.log(`Валидный реферальный код. Бонус: +${referralBonus} попыток от ${referrerName}`);
        } else {
          console.log("Невалидный реферальный код");
        }
      }

      setAuthState((prev) => ({
        ...prev,
        telegramUser,
        referralCode: referralCode,
        referralBonus: referralBonus,
        referrerName: referrerName
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
        error: `Ошибка подключения к базе данных: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
      }));
    }
  }, [getTelegramUser, extractReferralCode, validateReferralCode, checkUserExists, router, updateUser, setTelegramUser]);

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
    <main className="relative min-h-screen bg-black text-white">
      {/* Video Background */}
      <div className="absolute inset-0 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Spinner size="lg" color="white" />
            <span className="ml-2">{t('home.loading')}</span>
          </div>
        )}
        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <span className="text-red-500">{t('home.error.video')}</span>
          </div>
        )}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          onLoadedMetadata={handleLoadedMetadata}
          onProgress={handleProgress}
          onCanPlayThrough={handleCanPlayThrough}
          onEnded={handleEnded}
          onError={handleError}
        >
          <source src="/videos/intro.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-4xl font-bold mb-8">{t('home.welcome')}</h1>

        {authState.isChecking && (
          <div className="flex items-center">
            <Spinner size="sm" color="white" />
            <span className="ml-2">{t('auth.checking')}</span>
          </div>
        )}

        {authState.isRegistering && (
          <div className="flex items-center">
            <Spinner size="sm" color="white" />
            <span className="ml-2">{t('auth.registering')}</span>
          </div>
        )}

        {authState.error && (
          <div className="text-red-500 mb-4">{t('auth.error')}</div>
        )}

        {authState.referralCode && (
          <div className="mb-4 text-center">
            <p>{t('home.referral.invitedBy')}: {authState.referrerName}</p>
            <p>{t('home.referral.bonus')}: {authState.referralBonus}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-blue-600 rounded-lg flex items-center"
            disabled={!isReady || authState.isChecking || authState.isRegistering}
          >
            <Play className="w-5 h-5 mr-2" />
            {t('home.start')}
          </button>
          <button
            onClick={handleQuickInit}
            className="px-6 py-3 bg-green-600 rounded-lg flex items-center"
            disabled={!isReady || authState.isChecking || authState.isRegistering}
          >
            <Zap className="w-5 h-5 mr-2" />
            {t('home.quickStart')}
          </button>
        </div>
      </div>
    </main>
  );
}