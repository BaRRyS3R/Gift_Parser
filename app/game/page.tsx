// src/app/game/page.tsx - Compact expandable game mode cards

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Crosshair,
  Target,
  AlertTriangle,
  Clock,
  Play,
  Shield,
  ShoppingCart,
  Atom,
  ChevronDown,
  ChevronUp,
  Battery,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { userService, type AttemptsStatus } from "@/lib/supabase";
import { useT } from "@/contexts/LocalizationContext";

interface GameMode {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ComponentType<any>;
  route: string;
  difficulty: "🤡" | "💋😈" | "👉👌";
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
];

const AttemptsDisplay = ({
  attemptsStatus,
  timeUntilReset,
  onShopClick,
}: {
  attemptsStatus: AttemptsStatus;
  timeUntilReset: string;
  onShopClick: () => void;
}) => {
  const t = useT();
  const attemptsRemaining = attemptsStatus.attemptsRemaining;
  const isEmpty = attemptsRemaining === 0;
  const isLow = attemptsRemaining <= 2 && attemptsRemaining > 0;

  const getBatteryLevel = () => {
    if (attemptsRemaining <= 0) return 0;
    if (attemptsRemaining <= 5) return (attemptsRemaining / 5) * 100;
    return 100;
  };

  const getBatteryColor = () => {
    if (isEmpty) return "text-red-400";
    if (isLow) return "text-orange-400";
    return "text-green-400";
  };

  const getBatteryBgColor = () => {
    if (isEmpty) return "bg-red-500/20 border-red-400/40";
    if (isLow) return "bg-orange-500/20 border-orange-400/40";
    return "bg-white/10 border-white/30";
  };

  return (
    <div
      className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 ${getBatteryBgColor()}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Battery className={getBatteryColor()} size={16} />
          <span className={`text-sm font-bold ${getBatteryColor()}`}>
            {t("attempts.current")}
          </span>
        </div>
        <span className={`text-lg font-bold ${getBatteryColor()}`}>
          {attemptsRemaining} ⚡
        </span>
      </div>

      <div className="mb-3">
        <div
          className={`w-full h-2 rounded-full overflow-hidden ${isEmpty
            ? "bg-red-400/20"
            : isLow
              ? "bg-orange-400/20"
              : "bg-white/20"
            }`}
        >
          <div
            className={`h-full transition-all duration-500 ${getBatteryColor().replace(
              "text-",
              "bg-"
            )}`}
            style={{ width: `${getBatteryLevel()}%` }}
          />
        </div>
      </div>

      {isEmpty && (
        <div className="space-y-3">
          <div className="text-center space-y-2">
            <p className="text-red-400/80 text-xs">
              {t("game.general.waitForReset")}
            </p>
            {timeUntilReset && (
              <div className="space-y-1">
                <div className="text-xs text-white/60 uppercase tracking-wider">
                  {t("attempts.resetTime")}
                </div>
                <div className="text-lg font-bold text-green-400">
                  {timeUntilReset}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onShopClick}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/40 text-yellow-300 rounded-lg hover:from-yellow-500/30 hover:to-orange-500/30 hover:border-yellow-400/60 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <ShoppingCart size={16} />
            <span className="font-bold text-sm">{t("nav.shop")}</span>
          </button>
        </div>
      )}
    </div>
  );
};

const CompactGameModeCard = ({
  mode,
  isExpanded,
  onToggleExpand,
  onStart,
  isDisabled,
  isTransitioning,
}: {
  mode: GameMode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStart: () => void;
  isDisabled: boolean;
  isTransitioning: boolean;
}) => {
  const t = useT();
  const Icon = mode.icon;

  return (
    <div
      className={`
        relative backdrop-blur-sm border rounded-xl transition-all duration-300
        ${mode.color.background} ${mode.color.border}
        ${isDisabled ? "opacity-50" : mode.color.hover}
        ${isExpanded ? "ring-1 ring-white/20" : ""}
      `}
    >
      {/* Main Card Content */}
      <div className="p-4">
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
                      : mode.color.accent
                    }`}
                >
                  {mode.difficulty === "👉👌" ? "👉👌" : mode.difficulty}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onToggleExpand}
            className={`p-2 rounded-lg transition-all duration-300 ${mode.color.background} hover:bg-white/10`}
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

        {/* Expanded Content */}
        {isExpanded && (
          <div className="space-y-4 mb-4 animate-fade-in">
            {/* Features */}
            <div>
              <h4 className={`text-sm font-bold ${mode.color.primary} mb-2`}>
                Особенности:
              </h4>
              <div className="space-y-1">
                {mode.featuresKeys.map((featureKey, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div
                      className={`w-1 h-1 rounded-full ${mode.id === "reaction"
                        ? "bg-white/60"
                        : mode.id === "survival"
                          ? "bg-red-400/60"
                          : "bg-purple-400/60"
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

        {/* Action Button */}
        <button
          onClick={onStart}
          disabled={isTransitioning || isDisabled}
          className={`
            w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg
            text-sm font-bold transition-all duration-300
            ${mode.color.background} ${mode.color.primary} ${mode.color.border} border
            ${isDisabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:scale-105 active:scale-95 hover:shadow-lg hover:border-opacity-80"
            }
          `}
        >
          <Play size={16} />
          <span>
            {isTransitioning
              ? t("common.loading")
              : isDisabled
                ? t("game.general.noAttempts")
                : t("common.play")}
          </span>
        </button>
      </div>

      {/* Disabled Overlay */}
      {isDisabled && (
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

export default function GamePage() {
  const router = useRouter();
  const { telegramUser } = useUser();
  const t = useT();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [expandedModes, setExpandedModes] = useState<string[]>([]);
  const [attemptsStatus, setAttemptsStatus] = useState<AttemptsStatus>({
    canPlay: true,
    attemptsRemaining: 0,
  });
  const [timeUntilReset, setTimeUntilReset] = useState<string>("");
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(true);

  const checkAttempts = useCallback(async () => {
    if (!telegramUser?.id) return;

    try {
      setIsLoadingAttempts(true);
      const status = await userService.checkAndUpdateAttemptsWithServerValidation(
        telegramUser.id
      );
      setAttemptsStatus(status);
    } catch (error) {
      console.error("Error checking attempts:", error);
    } finally {
      setIsLoadingAttempts(false);
    }
  }, [telegramUser?.id]);

  useEffect(() => {
    checkAttempts();
  }, [checkAttempts]);

  useEffect(() => {
    if (!attemptsStatus.resetTime || attemptsStatus.canPlay) {
      setTimeUntilReset("");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = attemptsStatus.resetTime!.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilReset("");
        checkAttempts();
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeUntilReset(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attemptsStatus.resetTime, attemptsStatus.canPlay, checkAttempts]);

  const handleModeStart = (mode: GameMode) => {
    if (!attemptsStatus.canPlay) return;
    setIsTransitioning(true);
    setTimeout(() => {
      router.push(mode.route);
    }, 600);
  };

  const handleToggleExpand = (modeId: string) => {
    setExpandedModes((prev) =>
      prev.includes(modeId)
        ? prev.filter((id) => id !== modeId)
        : [...prev, modeId]
    );
  };

  const handleOpenShop = () => {
    router.push("/shop");
  };

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

  if (isLoadingAttempts) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white">{t("game.general.checkingAttempts")}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset ${isTransitioning
        ? "opacity-0 transition-opacity duration-500 ease-in"
        : "opacity-100 transition-opacity duration-1000 ease-out"
        }`}
    >
      {/* Header */}
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
          {t("game.modes.title")}
        </h1>
        <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
          {t("game.modes.subtitle")}
        </p>
      </div>

      {/* Attempts Display */}
      <div className="mb-8 animate-fade-in">
        <AttemptsDisplay
          attemptsStatus={attemptsStatus}
          timeUntilReset={timeUntilReset}
          onShopClick={handleOpenShop}
        />
      </div>

      {/* Game Mode Cards */}
      <div className="space-y-4 mb-8">
        {GAME_MODES.map((mode) => (
          <CompactGameModeCard
            key={mode.id}
            mode={mode}
            isExpanded={expandedModes.includes(mode.id)}
            onToggleExpand={() => handleToggleExpand(mode.id)}
            onStart={() => handleModeStart(mode)}
            isDisabled={!attemptsStatus.canPlay}
            isTransitioning={isTransitioning}
          />
        ))}
      </div>

      {/* Footer Message */}
      <div className="text-center space-y-2 animate-fade-in pb-8">
        <p className="text-white/30 text-xs">{t("game.general.useWisely")}</p>
      </div>
    </div>
  );
}