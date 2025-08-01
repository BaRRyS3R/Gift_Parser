// src/app/game/page.tsx - Оптимизированная страница игр с быстрой загрузкой попыток

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardFooter, Image, Button } from "@nextui-org/react";
import {
  Crosshair,
  Play,
  Shield,
  Atom,
  RotateCw,
  Zap,
  AlertTriangle,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useAttempts } from "@/hooks/modules/useAttempts";
import { useT } from "@/contexts/LocalizationContext";
import AuthGuard from "@/components/Auth/AuthGuard";
import AttemptsDisplay from "@/components/AttemptsDisplay";
import TournamentCard from "@/components/TournamentCard/TournamentCard";

interface GameMode {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ComponentType<any>;
  route: string;
  difficulty: "🤡" | "💋😈" | "👉👌" | "🌀";
  durationKey: string;
  imageUrl: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
    buttonColor: "primary" | "danger" | "secondary" | "warning";
  };
  featuresKeys: string[];
  basicRules: string[];
}

const GAME_MODES: GameMode[] = [
  {
    id: "reaction",
    nameKey: "game.modes.reaction.name",
    descriptionKey: "game.modes.reaction.description",
    icon: Zap,
    route: "/game/reaction",
    difficulty: "🤡",
    durationKey: "game.modes.reaction.duration",
    imageUrl: "https://notfren.com/circusle/reaction.jpg",
    color: {
      primary: "text-white",
      secondary: "text-white/90",
      accent: "text-white/80",
      buttonColor: "primary",
    },
    featuresKeys: [
      "game.modes.reaction.features.0",
      "game.modes.reaction.features.1",
      "game.modes.reaction.features.2",
      "game.modes.reaction.features.3",
    ],
    basicRules: [
      "game.modes.reaction.rules.0",
      "game.modes.reaction.rules.1",
      "game.modes.reaction.rules.2",
    ],
  },
  {
    id: "survival",
    nameKey: "game.modes.survival.name",
    descriptionKey: "game.modes.survival.description",
    icon: Crosshair,
    route: "/game/survival",
    difficulty: "💋😈",
    durationKey: "game.modes.survival.duration",
    imageUrl: "https://notfren.com/circusle/survival.jpg",
    color: {
      primary: "text-red-100",
      secondary: "text-red-200",
      accent: "text-red-300",
      buttonColor: "danger",
    },
    featuresKeys: [
      "game.modes.survival.features.0",
      "game.modes.survival.features.1",
      "game.modes.survival.features.2",
      "game.modes.survival.features.3",
    ],
    basicRules: [
      "game.modes.survival.rules.0",
      "game.modes.survival.rules.1",
      "game.modes.survival.rules.2",
    ],
  },
  {
    id: "physics",
    nameKey: "game.modes.physics.name",
    descriptionKey: "game.modes.physics.description",
    icon: Atom,
    route: "/game/physics",
    difficulty: "👉👌",
    durationKey: "game.modes.physics.duration",
    imageUrl: "https://notfren.com/circusle/physics.jpg",
    color: {
      primary: "text-purple-100",
      secondary: "text-purple-200",
      accent: "text-purple-300",
      buttonColor: "secondary",
    },
    featuresKeys: [
      "game.modes.physics.features.0",
      "game.modes.physics.features.1",
      "game.modes.physics.features.2",
      "game.modes.physics.features.3",
    ],
    basicRules: [
      "game.modes.physics.rules.0",
      "game.modes.physics.rules.1",
      "game.modes.physics.rules.2",
    ],
  },
  {
    id: "rotation",
    nameKey: "game.modes.rotation.name",
    descriptionKey: "game.modes.rotation.description",
    icon: RotateCw,
    route: "/game/rotation",
    difficulty: "🌀",
    durationKey: "game.modes.rotation.duration",
    imageUrl: "https://notfren.com/circusle/rotation.jpg",
    color: {
      primary: "text-orange-100",
      secondary: "text-orange-200",
      accent: "text-orange-300",
      buttonColor: "warning",
    },
    featuresKeys: [
      "game.modes.rotation.features.0",
      "game.modes.rotation.features.1",
      "game.modes.rotation.features.2",
      "game.modes.rotation.features.3",
    ],
    basicRules: [
      "game.modes.rotation.rules.0",
      "game.modes.rotation.rules.1",
      "game.modes.rotation.rules.2",
    ],
  },
];

function GamePageContent() {
  const router = useRouter();
  const { user } = useUser();
  const {
    attemptsStatus,
    isLoading: attemptsLoading,
    error: attemptsError,
    canPlay,
    attemptsRemaining,
    fetchAttemptsStatus,
    consumeAttempt,
    clearError,
  } = useAttempts();
  const t = useT();

  const [loadingModeId, setLoadingModeId] = useState<string | null>(null);
  const [consumeError, setConsumeError] = useState<string | null>(null);

  // Мемоизированные значения для предотвращения ненужных перерендеров
  const gameModesData = useMemo(() => GAME_MODES, []);

  const isAnyModeLoading = useMemo(() => loadingModeId !== null, [loadingModeId]);

  const attemptsDisplayProps = useMemo(() => ({
    attemptsRemaining,
    attemptsStatus,
    canPlay,
    error: attemptsError,
    isLoading: attemptsLoading,
    showShopButton: true,
    onRetry: () => {
      clearError();
      setConsumeError(null);
      fetchAttemptsStatus();
    }
  }), [attemptsRemaining, attemptsStatus, canPlay, attemptsError, attemptsLoading, clearError, fetchAttemptsStatus]);

  /**
   * Оптимизированная обработка запуска игрового режима
   */
  const handleModeStart = useCallback(
    async (mode: GameMode) => {
      // Предварительные проверки для предотвращения некорректных состояний
      if (isAnyModeLoading || !canPlay) {
        console.log("Невозможно запустить игру:", {
          loadingModeId,
          canPlay,
          attemptsRemaining
        });
        return;
      }

      setLoadingModeId(mode.id);
      setConsumeError(null);

      try {
        console.log(`Запуск игры ${mode.id} - потребление попытки...`);

        // Оптимистичное потребление попытки с немедленным откликом интерфейса
        const updatedStatus = await consumeAttempt();

        if (!updatedStatus) {
          throw new Error("Не удалось потребить попытку");
        }

        console.log(
          `Попытка успешно потреблена. Осталось: ${updatedStatus.attemptsRemaining}`,
        );

        // Сокращенная задержка для улучшения восприятия скорости
        setTimeout(() => {
          router.push(mode.route);
        }, 300);
      } catch (error) {
        console.error("Ошибка потребления попытки:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Не удалось запустить игру";

        setConsumeError(errorMessage);
        setLoadingModeId(null);

        // Обновляем статус попыток после ошибки с минимальной задержкой
        setTimeout(() => {
          fetchAttemptsStatus();
        }, 500);
      }
    },
    [isAnyModeLoading, canPlay, consumeAttempt, router, fetchAttemptsStatus, attemptsRemaining, loadingModeId],
  );

  /**
   * Обработчик повторной попытки загрузки данных попыток
   */
  const handleAttemptsRetry = useCallback(() => {
    clearError();
    setConsumeError(null);
    fetchAttemptsStatus();
  }, [clearError, fetchAttemptsStatus]);

  // Автоматическая очистка ошибки потребления при изменении статуса попыток
  useEffect(() => {
    if (consumeError && attemptsStatus) {
      setConsumeError(null);
    }
  }, [attemptsStatus, consumeError]);

  // Конфигурация Telegram WebApp back button
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      tg.BackButton.show();
      const handleBackClick = () => router.push("/main");
      tg.BackButton.onClick(handleBackClick);

      return () => {
        tg.BackButton.hide();
        tg.BackButton.offClick(handleBackClick);
      };
    }
  }, [router]);

  return (
    <div
      className={`min-h-screen bg-black text-white safe-area-inset-bottom safe-area-inset ${isAnyModeLoading
          ? "opacity-0 transition-opacity duration-300 ease-in"
          : "opacity-100 transition-opacity duration-500 ease-out"
        }`}
    >
      <div className="px-4">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
            {t("game.modes.title")}
          </h1>
          <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
            {t("game.modes.subtitle")}
          </p>
        </div>

        {/* Централизованное отображение ошибок потребления попыток */}
        {consumeError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-400/30 rounded-xl animate-fade-in">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="text-red-400" size={16} />
              <span className="text-red-400 text-sm font-bold">
                {t("common.error")}
              </span>
            </div>
            <p className="text-red-300 text-xs">{consumeError}</p>
            <button
              className="mt-2 text-xs text-red-300 hover:text-red-200 transition-colors underline"
              onClick={handleAttemptsRetry}
            >
              {t("common.retry")}
            </button>
          </div>
        )}

        {/* Оптимизированное отображение попыток */}
        <div className="mb-8 animate-fade-in">
          <AttemptsDisplay
            {...attemptsDisplayProps}
          />
        </div>

        <div className="mb-8">
          <TournamentCard />
        </div>
      </div>

      {/* Оптимизированная горизонтальная прокрутка карточек игровых режимов */}
      <div className="mb-8 animate-fade-in">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex space-x-4 px-4" style={{ width: "max-content" }}>
            {gameModesData.map((mode) => {
              const Icon = mode.icon;
              const isCurrentModeLoading = loadingModeId === mode.id;
              const isDisabled = !canPlay;

              return (
                <div key={mode.id} className="relative">
                  <Card
                    isFooterBlurred
                    className={`w-[280px] h-[400px] transition-all duration-300 ${isDisabled || isAnyModeLoading ? "opacity-50" : ""
                      }`}
                  >
                    <CardHeader className="absolute z-10 top-4 flex-col items-start bg-black/20 backdrop-blur-sm rounded-xl mx-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                          <Icon className={mode.color.primary} size={20} />
                        </div>
                        <div>
                          <h4
                            className={`font-bold text-xl ${mode.color.primary}`}
                          >
                            {t(mode.nameKey as any)}
                          </h4>
                          <div className="flex items-center space-x-2 text-xs">
                            <span className={mode.color.accent}>
                              {t(mode.durationKey as any)}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-white/40" />
                            <span className={mode.color.accent}>
                              {mode.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p
                        className={`text-sm ${mode.color.secondary} leading-relaxed`}
                      >
                        {t(mode.descriptionKey as any)}
                      </p>
                    </CardHeader>

                    <Image
                      removeWrapper
                      alt={`${mode.id}_game_card`}
                      className="z-0 w-full h-full object-cover"
                      fallbackSrc="/game-placeholder.jpg"
                      src={mode.imageUrl}
                    />

                    <CardFooter className="absolute bg-black/40 backdrop-blur-sm bottom-0 border-t-1 border-white/20 z-10 justify-between">
                      <Button
                        className="text-tiny min-w-[80px]"
                        color={mode.color.buttonColor}
                        isDisabled={isAnyModeLoading || isDisabled}
                        isLoading={isCurrentModeLoading}
                        radius="full"
                        size="sm"
                        startContent={
                          !isCurrentModeLoading && !isAnyModeLoading ? (
                            isDisabled ? (
                              <Shield size={14} />
                            ) : (
                              <Play size={14} />
                            )
                          ) : null
                        }
                        onClick={() => handleModeStart(mode)}
                      >
                        {isCurrentModeLoading
                          ? t("common.loading")
                          : isAnyModeLoading && !isCurrentModeLoading
                            ? t("game.general.lock")
                            : isDisabled
                              ? t("game.general.lock")
                              : t("common.play")}
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Оверлей для заблокированного состояния */}
                  {isDisabled && !isAnyModeLoading && (
                    <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center z-30">
                      <div className="text-center space-y-2">
                        <Shield className="text-white/60 mx-auto" size={32} />
                        <p className="text-white/80 text-sm font-bold">
                          {t("game.general.noAttemptsLeft")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="text-center space-y-2 animate-fade-in pb-8">
          <p className="text-white/30 text-xs">{t("game.general.useWisely")}</p>
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <AuthGuard requireCompleteAuth={true} showError={true}>
      <GamePageContent />
    </AuthGuard>
  );
}