// src/app/game/page.tsx - Страница игр с галереей режимов

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Crosshair,
  Play,
  Shield,
  Atom,
  Gamepad2,
  RotateCw,
  Zap,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useAttempts } from "@/hooks/modules/useAttempts";
import { useT } from "@/contexts/LocalizationContext";
import AuthGuard from "@/components/Auth/AuthGuard";
import AttemptsDisplay from "@/components/AttemptsDisplay";
import TournamentCard from "@/components/TournamentCard/TournamentCard";
import CircularGallery from "@/components/CircularGallery"; // Предполагаем, что компонент будет помещен сюда

interface GameMode {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ComponentType<any>;
  route: string;
  difficulty: "🤡" | "💋😈" | "👉👌" | "🌀";
  durationKey: string;
  image: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    border: string;
    hover: string;
  };
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
    image: "https://notfren.com/circusle/reaction.jpg",
    color: {
      primary: "text-white",
      secondary: "text-white/90",
      accent: "text-white/80",
      background: "bg-white/5",
      border: "border-white/20",
      hover: "hover:bg-white/10 hover:border-white/30",
    },
  },
  {
    id: "survival",
    nameKey: "game.modes.survival.name",
    descriptionKey: "game.modes.survival.description",
    icon: Crosshair,
    route: "/game/survival",
    difficulty: "💋😈",
    durationKey: "game.modes.survival.duration",
    image: "https://notfren.com/circusle/survival.jpg",
    color: {
      primary: "text-red-400",
      secondary: "text-red-300",
      accent: "text-red-200",
      background: "bg-red-500/5",
      border: "border-red-400/20",
      hover: "hover:bg-red-500/10 hover:border-red-400/30",
    },
  },
  {
    id: "physics",
    nameKey: "game.modes.physics.name",
    descriptionKey: "game.modes.physics.description",
    icon: Atom,
    route: "/game/physics",
    difficulty: "👉👌",
    durationKey: "game.modes.physics.duration",
    image: "https://notfren.com/circusle/physics.jpg",
    color: {
      primary: "text-purple-400",
      secondary: "text-purple-300",
      accent: "text-purple-200",
      background: "bg-purple-500/5",
      border: "border-purple-400/20",
      hover: "hover:bg-purple-500/10 hover:border-purple-400/30",
    },
  },
  {
    id: "rotation",
    nameKey: "game.modes.rotation.name",
    descriptionKey: "game.modes.rotation.description",
    icon: RotateCw,
    route: "/game/rotation",
    difficulty: "🌀",
    durationKey: "game.modes.rotation.duration",
    image: "https://notfren.com/circusle/rotation.jpg",
    color: {
      primary: "text-orange-400",
      secondary: "text-orange-300",
      accent: "text-orange-200",
      background: "bg-orange-500/5",
      border: "border-orange-400/20",
      hover: "hover:bg-orange-500/10 hover:border-orange-400/30",
    },
  },
];

const GameModeOverlay = ({
  mode,
  onStart,
  isDisabled,
  isCurrentModeLoading,
  isAnyModeLoading,
}: {
  mode: GameMode;
  onStart: () => void;
  isDisabled: boolean;
  isCurrentModeLoading: boolean;
  isAnyModeLoading: boolean;
}) => {
  const t = useT();
  const Icon = mode.icon;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 rounded-b-xl">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode.color.background} border ${mode.color.border}`}
          >
            <Icon className={mode.color.primary} size={20} />
          </div>
          <div>
            <h3 className={`text-xl font-bold ${mode.color.primary}`}>
              {t(mode.nameKey as any)}
            </h3>
            <div className="flex items-center justify-center space-x-2 text-sm">
              <span className={mode.color.accent}>
                {t(mode.durationKey as any)}
              </span>
              <div className="w-1 h-1 rounded-full bg-white/40" />
              <span
                className={`${mode.difficulty === "💋😈"
                    ? "text-red-400"
                    : mode.difficulty === "👉👌"
                      ? "text-purple-400"
                      : mode.difficulty === "🌀"
                        ? "text-orange-400"
                        : mode.color.accent
                  }`}
              >
                {mode.difficulty}
              </span>
            </div>
          </div>
        </div>

        <button
          className={`
            w-full max-w-sm mx-auto flex items-center justify-center space-x-2 py-3 px-6 rounded-lg
            text-sm font-bold transition-all duration-300
            ${mode.color.background} ${mode.color.primary} ${mode.color.border} border
            ${isDisabled || isAnyModeLoading
              ? "opacity-50 cursor-not-allowed"
              : "hover:scale-105 active:scale-95 hover:shadow-lg hover:border-opacity-80 hover:bg-white/10"
            }
          `}
          disabled={isAnyModeLoading || isDisabled}
          onClick={onStart}
        >
          {isCurrentModeLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>{t("common.loading")}</span>
            </>
          ) : isAnyModeLoading && !isCurrentModeLoading ? (
            <>
              <Shield size={16} />
              <span>{t("game.general.lock")}</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>
                {isDisabled ? t("game.general.noAttempts") : t("common.play")}
              </span>
            </>
          )}
        </button>
      </div>

      {isDisabled && !isAnyModeLoading && (
        <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
          <div className="text-center space-y-2">
            <Shield className="text-white/60 mx-auto" size={24} />
            <p className="text-white/80 text-sm font-bold">
              {t("game.general.noAttemptsLeft")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const GameModeGallery = ({
  modes,
  currentModeIndex,
  onModeChange,
  onModeStart,
  isDisabled,
  loadingModeId,
}: {
  modes: GameMode[];
  currentModeIndex: number;
  onModeChange: (index: number) => void;
  onModeStart: (mode: GameMode) => void;
  isDisabled: boolean;
  loadingModeId: string | null;
}) => {
  const galleryItems = modes.map((mode) => ({
    image: mode.image,
    text: mode.id,
  }));

  const currentMode = modes[currentModeIndex];
  const isAnyModeLoading = loadingModeId !== null;
  const isCurrentModeLoading = loadingModeId === currentMode.id;

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden bg-black/20 backdrop-blur-sm border border-white/10">
      {/* Галерея */}
      <div className="absolute inset-0">
        <CircularGallery
          items={galleryItems}
          bend={3}
          borderRadius={0.02}
          scrollSpeed={2}
          scrollEase={0.1}
        />
      </div>

      {/* Overlay с информацией о режиме */}
      <GameModeOverlay
        mode={currentMode}
        onStart={() => onModeStart(currentMode)}
        isDisabled={isDisabled}
        isCurrentModeLoading={isCurrentModeLoading}
        isAnyModeLoading={isAnyModeLoading}
      />

      {/* Навигационные кнопки */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
        <button
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-all duration-300 disabled:opacity-50"
          disabled={isAnyModeLoading}
          onClick={() => onModeChange((currentModeIndex - 1 + modes.length) % modes.length)}
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
        <button
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-all duration-300 disabled:opacity-50"
          disabled={isAnyModeLoading}
          onClick={() => onModeChange((currentModeIndex + 1) % modes.length)}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Индикаторы */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {modes.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentModeIndex
                ? "bg-white"
                : "bg-white/30 hover:bg-white/50"
              }`}
            disabled={isAnyModeLoading}
            onClick={() => onModeChange(index)}
          />
        ))}
      </div>
    </div>
  );
};

function GamePageContent() {
  const router = useRouter();
  const { user, makeAuthenticatedRequest } = useUser();
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
  const [currentModeIndex, setCurrentModeIndex] = useState(0);
  const [consumeError, setConsumeError] = useState<string | null>(null);

  const handleModeStart = useCallback(
    async (mode: GameMode) => {
      if (loadingModeId || !canPlay) {
        console.log("Cannot start game:", { loadingModeId, canPlay });
        return;
      }

      setLoadingModeId(mode.id);
      setConsumeError(null);

      try {
        console.log(`Starting ${mode.id} game - consuming attempt first...`);

        const updatedStatus = await consumeAttempt();

        if (!updatedStatus) {
          throw new Error("Failed to consume attempt");
        }

        console.log(
          `Attempt consumed successfully. Remaining: ${updatedStatus.attemptsRemaining}`,
        );

        setTimeout(() => {
          router.push(mode.route);
        }, 600);
      } catch (error) {
        console.error("Error consuming attempt:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to start game";

        setConsumeError(errorMessage);
        setLoadingModeId(null);

        setTimeout(() => {
          fetchAttemptsStatus(true);
        }, 1000);
      }
    },
    [loadingModeId, canPlay, consumeAttempt, router, fetchAttemptsStatus],
  );

  const handleModeChange = useCallback((index: number) => {
    if (loadingModeId) return;
    setCurrentModeIndex(index);
  }, [loadingModeId]);

  const handleAttemptsRetry = useCallback(() => {
    clearError();
    setConsumeError(null);
    fetchAttemptsStatus(true);
  }, [clearError, fetchAttemptsStatus]);

  useEffect(() => {
    if (consumeError && attemptsStatus) {
      setConsumeError(null);
    }
  }, [attemptsStatus, consumeError]);

  // Telegram WebApp back button
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        router.push("/main");
      });

      return () => {
        tg.BackButton.hide();
        tg.BackButton.offClick(() => { });
      };
    }
  }, [router]);

  return (
    <div
      className={`min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset ${loadingModeId
          ? "opacity-0 transition-opacity duration-500 ease-in"
          : "opacity-100 transition-opacity duration-1000 ease-out"
        }`}
    >
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
          {t("game.modes.title")}
        </h1>
        <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
          {t("game.modes.subtitle")}
        </p>
      </div>

      {/* Отображение ошибки потребления попыток */}
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

      {/* Централизованное отображение попыток */}
      <div className="mb-8 animate-fade-in">
        <AttemptsDisplay
          attemptsRemaining={attemptsRemaining}
          attemptsStatus={attemptsStatus}
          canPlay={canPlay}
          error={attemptsError}
          isLoading={attemptsLoading}
          showShopButton={true}
          onRetry={handleAttemptsRetry}
        />
      </div>

      <div className="mb-8">
        <TournamentCard />
      </div>

      {/* Галерея режимов игры */}
      <div className="mb-8">
        <GameModeGallery
          modes={GAME_MODES}
          currentModeIndex={currentModeIndex}
          onModeChange={handleModeChange}
          onModeStart={handleModeStart}
          isDisabled={!canPlay}
          loadingModeId={loadingModeId}
        />
      </div>

      <div className="text-center space-y-2 animate-fade-in pb-8">
        <p className="text-white/30 text-xs">{t("game.general.useWisely")}</p>
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