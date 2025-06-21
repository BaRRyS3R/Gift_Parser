// src/app/game/page.tsx - Enhanced with localization integration

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Crosshair,
  Target,
  Trophy,
  AlertTriangle,
  Clock,
  Info,
  X,
  CheckCircle,
  Play,
  Shield,
  Battery,
  ShoppingCart,
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
  difficulty: "Medium" | "Extreme";
  durationKey: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    border: string;
  };
  featuresKeys: string[];
  detailedInfo: {
    objectiveKey: string;
    rulesKeys: string[];
    tipsKeys: string[];
    scoringKey: string;
  };
}

const GAME_MODES: GameMode[] = [
  {
    id: "reaction",
    nameKey: "game.modes.reaction.name",
    descriptionKey: "game.modes.reaction.description",
    icon: Zap,
    route: "/game/reaction",
    difficulty: "Medium",
    durationKey: "game.modes.reaction.duration",
    color: {
      primary: "text-white",
      secondary: "text-white/90",
      accent: "text-white/80",
      background: "bg-white/5",
      border: "border-white/20",
    },
    featuresKeys: [
      "game.modes.reaction.features.0",
      "game.modes.reaction.features.1",
      "game.modes.reaction.features.2",
      "game.modes.reaction.features.3",
    ],
    detailedInfo: {
      objectiveKey: "game.modes.reaction.objective",
      rulesKeys: [
        "game.modes.reaction.rules.0",
        "game.modes.reaction.rules.1",
        "game.modes.reaction.rules.2",
        "game.modes.reaction.rules.3",
        "game.modes.reaction.rules.4",
      ],
      tipsKeys: [
        "game.modes.reaction.tips.0",
        "game.modes.reaction.tips.1",
        "game.modes.reaction.tips.2",
        "game.modes.reaction.tips.3",
        "game.modes.reaction.tips.4",
      ],
      scoringKey: "game.modes.reaction.scoring",
    },
  },
  {
    id: "survival",
    nameKey: "game.modes.survival.name",
    descriptionKey: "game.modes.survival.description",
    icon: Crosshair,
    route: "/game/survival",
    difficulty: "Extreme",
    durationKey: "game.modes.survival.duration",
    color: {
      primary: "text-red-400",
      secondary: "text-red-300",
      accent: "text-red-200",
      background: "bg-red-500/5",
      border: "border-red-400/20",
    },
    featuresKeys: [
      "game.modes.survival.features.0",
      "game.modes.survival.features.1",
      "game.modes.survival.features.2",
      "game.modes.survival.features.3",
    ],
    detailedInfo: {
      objectiveKey: "game.modes.survival.objective",
      rulesKeys: [
        "game.modes.survival.rules.0",
        "game.modes.survival.rules.1",
        "game.modes.survival.rules.2",
        "game.modes.survival.rules.3",
        "game.modes.survival.rules.4",
        "game.modes.survival.rules.5",
      ],
      tipsKeys: [
        "game.modes.survival.tips.0",
        "game.modes.survival.tips.1",
        "game.modes.survival.tips.2",
        "game.modes.survival.tips.3",
        "game.modes.survival.tips.4",
      ],
      scoringKey: "game.modes.survival.scoring",
    },
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
            className={`h-full transition-all duration-500 ${getBatteryColor().replace("text-", "bg-")}`}
            style={{ width: `${getBatteryLevel()}%` }}
          />
        </div>

        {attemptsRemaining <= 10 ? (
          <div className="flex justify-between mt-1">
            {Array.from(
              { length: Math.min(10, Math.max(5, attemptsRemaining)) },
              (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i < attemptsRemaining
                      ? getBatteryColor().replace("text-", "bg-")
                      : "bg-white/20"
                    }`}
                />
              ),
            )}
          </div>
        ) : (
          <div className="text-center mt-1">
            <span className={`text-xs ${getBatteryColor()}`}>
              {attemptsRemaining} {t("attempts.total")}
            </span>
          </div>
        )}
      </div>

      {/* Расширенное уведомление для пустых попыток с кнопкой магазина */}
      {isEmpty && (
        <div className="space-y-3">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="text-sm font-bold text-red-300">
                {t("game.general.attemptsUsed")}
              </span>
            </div>
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
                <p className="text-white/40 text-xs">
                  {t("game.general.automaticReset")}
                </p>
              </div>
            )}
          </div>

          {/* Кнопка перехода в магазин */}
          <button
            onClick={onShopClick}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/40 text-yellow-300 rounded-lg hover:from-yellow-500/30 hover:to-orange-500/30 hover:border-yellow-400/60 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <ShoppingCart size={16} />
            <span className="font-bold text-sm">
              {t("nav.shop")}
            </span>
          </button>
        </div>
      )}

      {/* Остальные состояния */}
      {!isEmpty && (
        <div className="text-center mt-2">
          {isLow && (
            <p className="text-xs text-orange-400/80">{t("attempts.lowRemaining")}</p>
          )}
          {attemptsRemaining > 5 && (
            <p className="text-xs text-green-400/80">{t("attempts.plenty")}</p>
          )}
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
  const [selectedModeForInfo, setSelectedModeForInfo] =
    useState<GameMode | null>(null);
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
      const status =
        await userService.checkAndUpdateAttemptsWithServerValidation(
          telegramUser.id,
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

  const handleOpenShop = () => {
    router.push("/shop");
  };

  useEffect(() => {
    // Setup Telegram WebApp back button
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

  const handleShowInfo = (mode: GameMode) => {
    setSelectedModeForInfo(mode);
  };

  const handleCloseInfo = () => {
    setSelectedModeForInfo(null);
  };

  const renderModeCard = (mode: GameMode) => {
    const Icon = mode.icon;
    const isReaction = mode.id === "reaction";
    const isDisabled = !attemptsStatus.canPlay;

    return (
      <div
        key={mode.id}
        className={`
          relative w-full max-w-sm mx-auto backdrop-blur-sm border rounded-2xl 
          transition-all duration-300 
          ${isDisabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:scale-[1.02] hover:shadow-xl cursor-pointer"
          }
          ${mode.color.background} ${mode.color.border} 
          ${isDisabled ? "" : "hover:border-opacity-60"}
          bg-black/20 
          ${isDisabled ? "" : "hover:bg-black/30"}
        `}
      >
        <div className="p-8">
          <div className="text-center mb-6">
            <h3
              className={`text-2xl font-bold tracking-wide ${mode.color.primary} mb-2`}
            >
              {t(mode.nameKey as any)}
            </h3>
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-current to-transparent mx-auto opacity-40" />
          </div>

          <div className="space-y-6 mb-8">
            <p
              className={`text-sm leading-relaxed text-center ${mode.color.secondary}`}
            >
              {t(mode.descriptionKey as any)}
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className={`${mode.color.accent}`} size={14} />
                  <span className={`text-xs font-medium ${mode.color.accent}`}>
                    {t(mode.durationKey as any)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {mode.difficulty === "Extreme" ? (
                    <AlertTriangle className="text-red-400" size={14} />
                  ) : (
                    <Target className={`${mode.color.accent}`} size={14} />
                  )}
                  <span
                    className={`text-xs font-medium ${mode.difficulty === "Extreme"
                        ? "text-red-400"
                        : mode.color.accent
                      }`}
                  >
                    {t(`game.general.difficulty`)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {mode.featuresKeys.map((featureKey, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div
                      className={`w-1 h-1 rounded-full ${isReaction ? "bg-white/60" : "bg-red-400/80"
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

          <div className="w-full h-px bg-gradient-to-r from-transparent via-current to-transparent mx-auto opacity-20 mb-6" />

          <div className="flex space-x-3">
            <button
              aria-label={`Start ${t(mode.nameKey as any)} game mode`}
              className={`
                flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl 
                text-sm font-bold transition-all duration-300
                ${mode.color.background} ${mode.color.primary} ${mode.color.border} border
                ${isDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-105 active:scale-95 hover:shadow-lg hover:border-opacity-80"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              disabled={isTransitioning || isDisabled}
              type="button"
              onClick={() => handleModeStart(mode)}
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

            <button
              aria-label={`About ${t(mode.nameKey as any)} game mode`}
              className="px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 bg-white/5 text-white/70 border border-white/20 hover:bg-white/10 hover:border-white/30 hover:text-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isTransitioning}
              type="button"
              onClick={() => handleShowInfo(mode)}
            >
              <Info size={16} />
            </button>
          </div>
        </div>

        {isDisabled && (
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
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

  const renderInfoModal = () => {
    if (!selectedModeForInfo) return null;

    const mode = selectedModeForInfo;
    const Icon = mode.icon;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl animate-fade-in">
          <div className="sticky top-0 bg-black/95 backdrop-blur-sm border-b border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${mode.color.background}`}
                >
                  <Icon className={mode.color.primary} size={24} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${mode.color.primary}`}>
                    {t(mode.nameKey as any)}
                  </h2>
                  <p className="text-sm text-white/60">
                    {t(mode.descriptionKey as any)}
                  </p>
                </div>
              </div>
              <button
                aria-label={t("common.close")}
                className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all duration-300"
                onClick={handleCloseInfo}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
                <Target className="text-white/80" size={18} />
                <span>{t("game.general.objective")}</span>
              </h3>
              <p className="text-white/80 leading-relaxed">
                {t(mode.detailedInfo.objectiveKey as any)}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
                <CheckCircle className="text-white/80" size={18} />
                <span>{t("game.general.rules")}</span>
              </h3>
              <div className="space-y-2">
                {mode.detailedInfo.rulesKeys.map((ruleKey, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                    <span className="text-white/70 text-sm leading-relaxed">
                      {t(ruleKey as any)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
                <Zap className="text-white/80" size={18} />
                <span>{t("game.general.proTips")}</span>
              </h3>
              <div className="space-y-2">
                {mode.detailedInfo.tipsKeys.map((tipKey, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${mode.id === "reaction" ? "bg-white/60" : "bg-red-400/60"
                        }`}
                    />
                    <span className="text-white/70 text-sm leading-relaxed">
                      {t(tipKey as any)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
                <Trophy className="text-white/80" size={18} />
                <span>{t("game.general.scoringSystem")}</span>
              </h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-white/70 text-sm leading-relaxed">
                  {t(mode.detailedInfo.scoringKey as any)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {t(`game.general.difficulty`)}
                </div>
                <div className="text-xs text-white/60 uppercase tracking-wider">
                  {t("game.general.difficulty")}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {t(mode.durationKey as any)}
                </div>
                <div className="text-xs text-white/60 uppercase tracking-wider">
                  {t("game.general.duration")}
                </div>
              </div>
            </div>

            <div className="flex space-x-4 pt-4 border-t border-white/10">
              <button
                className={`
                  flex-1 py-4 px-6 rounded-xl text-lg font-bold transition-all duration-300
                  ${mode.color.background} ${mode.color.primary} ${mode.color.border} border
                  ${!attemptsStatus.canPlay
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:scale-105 active:scale-95"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                disabled={isTransitioning || !attemptsStatus.canPlay}
                onClick={() => {
                  handleCloseInfo();
                  handleModeStart(mode);
                }}
              >
                {!attemptsStatus.canPlay
                  ? t("game.general.noAttemptsLeft")
                  : t("game.general.startPlaying")}
              </button>
              <button
                className="px-6 py-4 rounded-xl text-lg font-bold bg-white/10 text-white/80 border border-white/20 hover:bg-white/15 hover:border-white/40 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
                onClick={handleCloseInfo}
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
      className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative safe-area-inset ${isTransitioning
          ? "opacity-0 transition-opacity duration-500 ease-in"
          : "opacity-100 transition-opacity duration-1000 ease-out"
        }`}
    >
      <div className="text-center z-20 space-y-12 flex flex-col items-center justify-center max-w-6xl px-6 w-full">
        <div className="relative space-y-4">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-widest text-white animate-fade-in">
            {t("game.modes.title")}
          </h1>
          <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
            {t("game.modes.subtitle")}
          </p>
        </div>

        <div className="w-full max-w-md animate-fade-in">
          <AttemptsDisplay
            attemptsStatus={attemptsStatus}
            timeUntilReset={timeUntilReset}
            onShopClick={handleOpenShop}
          />
        </div>

        <div className="w-full space-y-8">
          <div className="grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
            {GAME_MODES.map(renderModeCard)}
          </div>
        </div>

        {/* УДАЛЕНО: дублирующее уведомление о закончившихся попытках */}

        <div className="text-center space-y-2 animate-fade-in">
          <p className="text-white/30 text-xs">{t("game.general.useWisely")}</p>
        </div>
      </div>

      {renderInfoModal()}
    </div>
  );
}