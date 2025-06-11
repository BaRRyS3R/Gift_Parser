// src/app/page.tsx

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@nextui-org/react";

import { userService, type TelegramUser, type User } from "@/lib/supabase";

interface AuthState {
  isChecking: boolean;
  isRegistering: boolean;
  user: User | null;
  telegramUser: TelegramUser | null;
  error: string | null;
  needsRegistration: boolean;
}

export default function IntroPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Флаги для предотвращения повторных операций
  const authInitializedRef = useRef<boolean>(false);
  const registrationInProgressRef = useRef<boolean>(false);

  const [authState, setAuthState] = useState<AuthState>({
    isChecking: true,
    isRegistering: false,
    user: null,
    telegramUser: null,
    error: null,
    needsRegistration: false,
  });

  const [contentState, setContentState] = useState({
    isLoading: true,
    loadProgress: 0,
    fontLoaded: false,
    isReady: false,
    isPlaying: false,
    videoError: false,
  });

  const getTelegramUser = useCallback((): TelegramUser | null => {
    if (typeof window === "undefined" || !window.Telegram?.WebApp) {
      return null;
    }

    const tg = window.Telegram.WebApp;
    const user = tg.initDataUnsafe?.user;

    if (!user || !user.id) {
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
        const existingUser = await userService.findByTelegramId(
          telegramUser.id,
        );

        return existingUser;
      } catch (error) {
        console.error("Ошибка при проверке пользователя:", error);
        throw error;
      }
    },
    [],
  );

  const registerUser = useCallback(
    async (telegramUser: TelegramUser): Promise<User> => {
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

        console.log("Начинаем регистрацию пользователя:", telegramUser.id);
        const newUser = await userService.create(telegramUser);

        console.log("Пользователь успешно зарегистрирован:", newUser.id);

        setAuthState((prev) => ({
          ...prev,
          user: newUser,
          isRegistering: false,
          needsRegistration: false,
        }));

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
    [],
  );

  const initializeAuth = useCallback(async () => {
    if (authInitializedRef.current) {
      return;
    }

    authInitializedRef.current = true;

    try {
      console.log("Инициализация авторизации...");

      const telegramUser = getTelegramUser();

      if (!telegramUser) {
        setAuthState((prev) => ({
          ...prev,
          isChecking: false,
          error: "Данные пользователя Telegram недоступны",
        }));

        return;
      }

      console.log("Данные Telegram пользователя получены:", telegramUser.id);
      setAuthState((prev) => ({ ...prev, telegramUser }));

      const existingUser = await checkUserExists(telegramUser);

      if (existingUser) {
        console.log("Пользователь найден в базе данных:", existingUser.id);
        setAuthState((prev) => ({
          ...prev,
          user: existingUser,
          isChecking: false,
          needsRegistration: false,
        }));

        // Небольшая задержка перед перенаправлением для плавности
        setTimeout(() => {
          router.push("/main");
        }, 500);
      } else {
        console.log("Пользователь не найден, требуется регистрация");
        setAuthState((prev) => ({
          ...prev,
          isChecking: false,
          needsRegistration: true,
        }));
      }
    } catch (error) {
      console.error("Ошибка инициализации:", error);
      setAuthState((prev) => ({
        ...prev,
        isChecking: false,
        error: "Ошибка подключения к базе данных",
      }));
    }
  }, [getTelegramUser, checkUserExists, router]);

  const handleInitWithVideo = async () => {
    if (
      !authState.telegramUser ||
      authState.isRegistering ||
      registrationInProgressRef.current
    ) {
      return;
    }

    try {
      const video = videoRef.current;

      if (!video || contentState.videoError) {
        await handleQuickInit();

        return;
      }

      setContentState((prev) => ({ ...prev, isPlaying: true }));

      // Запускаем видео
      video.currentTime = 0;
      await video.play();

      // Регистрируем пользователя параллельно
      await registerUser(authState.telegramUser);
    } catch (error) {
      console.error("Ошибка при воспроизведении видео или регистрации:", error);
      await handleQuickInit();
    }
  };

  const handleQuickInit = async () => {
    if (
      !authState.telegramUser ||
      authState.isRegistering ||
      registrationInProgressRef.current
    ) {
      return;
    }

    try {
      await registerUser(authState.telegramUser);

      // Небольшая задержка перед перенаправлением
      setTimeout(() => {
        router.push("/main");
      }, 1000);
    } catch (error) {
      console.error("Ошибка быстрой регистрации:", error);
    }
  };

  // Service Worker инициализация
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
        .then(() => setContentState((prev) => ({ ...prev, fontLoaded: true })))
        .catch(() =>
          setContentState((prev) => ({ ...prev, fontLoaded: true })),
        );
    } else {
      setTimeout(
        () => setContentState((prev) => ({ ...prev, fontLoaded: true })),
        1000,
      );
    }
  }, []);

  // Видео инициализация
  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const handleLoadedMetadata = () => {
      video.volume = 1;
      setContentState((prev) => ({ ...prev, isReady: true }));
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;

        if (duration > 0) {
          const progress = (bufferedEnd / duration) * 100;

          setContentState((prev) => ({ ...prev, loadProgress: progress }));
        }
      }
    };

    const handleCanPlayThrough = () => {
      setContentState((prev) => ({ ...prev, isLoading: false }));
    };

    const handleEnded = () => {
      // Перенаправляем только если пользователь уже зарегистрирован
      if (authState.user) {
        router.push("/main");
      }
    };

    const handleError = (e: Event) => {
      console.error("Ошибка видео:", e);
      setContentState((prev) => ({
        ...prev,
        videoError: true,
        isLoading: false,
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
  }, [router, authState.user]);

  // Однократная инициализация авторизации
  useEffect(() => {
    if (!authInitializedRef.current) {
      initializeAuth();
    }
  }, [initializeAuth]);

  const isInitialLoading =
    authState.isChecking ||
    (contentState.isLoading && !contentState.videoError) ||
    !contentState.fontLoaded;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Экран загрузки */}
      {isInitialLoading && (
        <div className="loader-container">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${contentState.loadProgress}%` }}
            />
          </div>
          <p className="text-white mt-4 text-sm font-bpdots">
            {authState.isChecking
              ? "Проверка пользователя..."
              : `Загрузка... ${Math.round(contentState.loadProgress)}%`}
          </p>
        </div>
      )}

      {/* Экран ошибки */}
      {authState.error && !isInitialLoading && (
        <div className="loader-container">
          <p className="text-white text-center font-bpdots mb-4">
            {authState.error}
          </p>
          <button
            className="px-4 py-2 bg-white text-black rounded font-bpdots"
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
            Повторить
          </button>
        </div>
      )}

      {/* Экран регистрации */}
      {authState.needsRegistration &&
        !authState.isChecking &&
        !authState.error &&
        authState.telegramUser && (
          <div className="loader-container">
            {authState.isRegistering ? (
              <div className="text-center">
                <Spinner color="white" size="lg" />
                <p className="text-white mt-4 font-bpdots">Регистрация...</p>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold font-bpdots text-white mb-2">
                    Добро пожаловать!
                  </h1>
                  <p className="text-gray-400 font-bpdots">
                    {authState.telegramUser.first_name}, выберите способ входа
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    className="block px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bpdots text-xl hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      contentState.videoError || authState.isRegistering
                    }
                    onClick={handleInitWithVideo}
                  >
                    -init-/
                  </button>

                  <button
                    className="block px-6 py-3 bg-transparent border border-white/60 text-white/80 rounded-lg font-bpdots text-sm hover:bg-white/5 hover:border-white hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={authState.isRegistering}
                    onClick={handleQuickInit}
                  >
                    Быстрый вход (для слабых устройств)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Видео контейнер */}
      <div
        className={`video-container ${contentState.isPlaying ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}
      >
        <video
          ref={videoRef}
          playsInline
          aria-label="Вступительное видео приложения"
          className="video-player"
          preload="auto"
        >
          <source src="/videos/intro.mp4" type="video/mp4" />
          <track
            default
            kind="captions"
            label="English captions"
            src="/captions/empty.vtt"
            srcLang="en"
          />
          Ваш браузер не поддерживает воспроизведение видео.
        </video>
      </div>
    </div>
  );
}
