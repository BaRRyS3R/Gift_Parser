// src/app/game/page.tsx - Исправленная страница игр с корректным отображением состояний кнопок

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Crosshair,
  Play,
  Shield,
  Atom,
  ChevronDown,
  ChevronUp,
  Gamepad2,
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
  color: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    border: string;
    hover: string;
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
    color: {
      primary: "text-white",
      secondary: "text-white/90",
      accent: "text-white/80",
      background: "bg-white/5",
      border: "border-white/20",
      hover: "hover:bg-white/10 hover:border-white/30",
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
    color: {
      primary: "text-red-400",
      secondary: "text-red-300",
      accent: "text-red-200",
      background: "bg-red-500/5",
      border: "border-red-400/20",
      hover: "hover:bg-red-500/10 hover:border-red-400/30",
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
    color: {
      primary: "text-purple-400",
      secondary: "text-purple-300",
      accent: "text-purple-200",
      background: "bg-purple-500/5",
      border: "border-purple-400/20",
      hover: "hover:bg-purple-500/10 hover:border-purple-400/30",
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
    color: {
      primary: "text-orange-400",
      secondary: "text-orange-300",
      accent: "text-orange-200",
      background: "bg-orange-500/5",
      border: "border-orange-400/20",
      hover: "hover:bg-orange-500/10 hover:border-orange-400/30",
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

const CompactGameModeCard = ({
  mode,
  isExpanded,
  onToggleExpand,
  onStart,
  isDisabled,
  isCurrentModeLoading,
  isAnyModeLoading,
}: {
  mode: GameMode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStart: () => void;
  isDisabled: boolean;
  isCurrentModeLoading: boolean;
  isAnyModeLoading: boolean;
}) => {
  const t = useT();
  const Icon = mode.icon;

  return (
    <div
      className={`
        relative backdrop-blur-sm border rounded-xl transition-all duration-300 overflow-hidden
        ${mode.color.background} ${mode.color.border}
        ${isDisabled || isAnyModeLoading ? "opacity-50" : mode.color.hover}
        ${isExpanded ? "ring-1 ring-white/20" : ""}
      `}
    >
      <div className="absolute right-0 top-1/2 transform translate-x-1/3 -translate-y-1/2 pointer-events-none">
        <Gamepad2
          className="text-white/5"
          size={120}
          style={{
            transform: 'rotate(15deg)'
          }}
        />
      </div>

      <div className="p-4 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode.color.background} border ${mode.color.border}`}
            >
              <Icon className={mode.color.primary} size={20} />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${mode.color.primary}`}>
                {t(mode.nameKey as any)}
              </h3>
              <div className="flex items-center space-x-2 text-xs">
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
            onClick={onToggleExpand}
            disabled={isAnyModeLoading}
            className={`p-2 rounded-lg transition-all duration-300 ${mode.color.background} hover:bg-white/10 relative z-20 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isExpanded ? (
              <ChevronUp className={mode.color.accent} size={16} />
            ) : (
              <ChevronDown className={mode.color.accent} size={16} />
            )}
          </button>
        </div>

        <p className={`text-sm ${mode.color.secondary} mb-4 leading-relaxed`}>
          {t(mode.descriptionKey as any)}
        </p>

        {isExpanded && !isAnyModeLoading && (
          <div className="space-y-4 mb-4 animate-fade-in">
            <div>
              <h4 className={`text-sm font-bold ${mode.color.primary} mb-2`}>
                Features:
              </h4>
              <div className="space-y-1">
                {mode.featuresKeys.map((featureKey, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div
                      className={`w-1 h-1 rounded-full ${mode.id === "reaction"
                        ? "bg-white/60"
                        : mode.id === "survival"
                          ? "bg-red-400/60"
                          : mode.id === "physics"
                            ? "bg-purple-400/60"
                            : "bg-orange-400/60"
                        }`}
                    />
                    <span className={`text-xs ${mode.color.secondary}`}>
                      {t(featureKey as any)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onStart}
          disabled={isAnyModeLoading || isDisabled}
          className={`
            w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg relative z-20
            text-sm font-bold transition-all duration-300
            ${mode.color.background} ${mode.color.primary} ${mode.color.border} border
            ${isDisabled || isAnyModeLoading
              ? "opacity-50 cursor-not-allowed"
              : "hover:scale-105 active:scale-95 hover:shadow-lg hover:border-opacity-80"
            }
          `}
        >
          {isCurrentModeLoading ? (
            // Показываем загрузку только для текущего режима
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>{t("common.loading")}</span>
            </>
          ) : isAnyModeLoading && !isCurrentModeLoading ? (
            // Показываем заблокированное состояние когда загружается другой режим
            <>
              <Shield size={16} />
              <span>{t("game.general.lock")}</span>
            </>
          ) : (
            // Обычное состояние
            <>
              <Play size={16} />
              <span>
                {isDisabled
                  ? t("game.general.noAttempts")
                  : t("common.play")}
              </span>
            </>
          )}
        </button>
      </div>

      {isDisabled && !isAnyModeLoading && (
        <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center z-30">
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
    clearError
  } = useAttempts();
  const t = useT();

  const [loadingModeId, setLoadingModeId] = useState<string | null>(null);
  const [expandedModes, setExpandedModes] = useState<string[]>([]);
  const [consumeError, setConsumeError] = useState<string | null>(null);

  const handleModeStart = useCallback(async (mode: GameMode) => {
    if (loadingModeId || !canPlay) {
      console.log('Cannot start game:', { loadingModeId, canPlay });
      return;
    }

    setLoadingModeId(mode.id);
    setConsumeError(null);

    try {
      console.log(`Starting ${mode.id} game - consuming attempt first...`);

      // Потребляем попытку перед началом игры
      const updatedStatus = await consumeAttempt();

      if (!updatedStatus) {
        throw new Error('Failed to consume attempt');
      }

      console.log(`Attempt consumed successfully. Remaining: ${updatedStatus.attemptsRemaining}`);

      // Небольшая задержка для показа анимации загрузки
      setTimeout(() => {
        router.push(mode.route);
      }, 600);

    } catch (error) {
      console.error('Error consuming attempt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start game';
      setConsumeError(errorMessage);
      setLoadingModeId(null);

      // Обновляем статус попыток после ошибки
      setTimeout(() => {
        fetchAttemptsStatus(true);
      }, 1000);
    }
  }, [loadingModeId, canPlay, consumeAttempt, router, fetchAttemptsStatus]);

  const handleToggleExpand = useCallback((modeId: string) => {
    if (loadingModeId) return;

    setExpandedModes((prev) =>
      prev.includes(modeId)
        ? prev.filter((id) => id !== modeId)
        : [...prev, modeId]
    );
  }, [loadingModeId]);

  const handleAttemptsRetry = useCallback(() => {
    clearError();
    setConsumeError(null);
    fetchAttemptsStatus(true);
  }, [clearError, fetchAttemptsStatus]);

  // Clear consume error when attempts change
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
          <p className="text-red-300 text-xs">
            {consumeError}
          </p>
          <button
            onClick={handleAttemptsRetry}
            className="mt-2 text-xs text-red-300 hover:text-red-200 transition-colors underline"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {/* Централизованное отображение попыток */}
      <div className="mb-8 animate-fade-in">
        <AttemptsDisplay
          attemptsStatus={attemptsStatus}
          isLoading={attemptsLoading}
          error={attemptsError}
          canPlay={canPlay}
          attemptsRemaining={attemptsRemaining}
          onRetry={handleAttemptsRetry}
          showShopButton={true}
        />
      </div>

      <div className="mb-8">
        <TournamentCard />
      </div>

      <div className="space-y-4 mb-8">
        {GAME_MODES.map((mode) => (
          <CompactGameModeCard
            key={mode.id}
            mode={mode}
            isExpanded={expandedModes.includes(mode.id)}
            onToggleExpand={() => handleToggleExpand(mode.id)}
            onStart={() => handleModeStart(mode)}
            isDisabled={!canPlay}
            isCurrentModeLoading={loadingModeId === mode.id}
            isAnyModeLoading={loadingModeId !== null}
          />
        ))}
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