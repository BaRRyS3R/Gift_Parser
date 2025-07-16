// src/app/game/page.tsx - Updated with security system integration

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Crosshair,
  Play,
  Shield,
  ShoppingCart,
  Atom,
  ChevronDown,
  ChevronUp,
  Battery,
  Gamepad2,
  RotateCw,
  TrendingUp,
  Coffee,
  Lock,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useSecurity } from "@/hooks/useSecurity";
import { type AttemptsStatus } from "@/lib/supabase";
import { useT } from "@/contexts/LocalizationContext";
import TournamentCard from "@/components/TournamentCard/TournamentCard";
import UnifiedSecurityModal from "@/components/Security/UnifiedSecurityModal";

interface GameMode {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ComponentType<any>;
  route: string;
  difficulty: "🤡" | "💋😈" | "👉👌" | "🌀";
  durationKey: string;
  progressType: "competitive" | "casual";
  progressInfoKey: string;
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
    progressType: "casual",
    progressInfoKey: "game.modes.reaction.progressInfo",
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
    progressType: "competitive",
    progressInfoKey: "game.modes.survival.progressInfo",
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
    progressType: "competitive",
    progressInfoKey: "game.modes.physics.progressInfo",
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
    progressType: "competitive",
    progressInfoKey: "game.modes.rotation.progressInfo",
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

const AttemptsDisplay = ({
  attemptsStatus,
  timeUntilReset,
  onShopClick,
  isLoading,
}: {
  attemptsStatus: AttemptsStatus | null;
  timeUntilReset: string;
  onShopClick: () => void;
  isLoading: boolean;
}) => {
  const t = useT();

  if (isLoading || !attemptsStatus) {
    return (
      <div className="bg-white/10 border border-white/30 backdrop-blur-sm rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Battery className="text-white/60" size={16} />
            <span className="text-sm font-bold text-white/60">
              {t("attempts.current")}
            </span>
          </div>
          <div className="w-8 h-4 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="w-full h-2 bg-white/20 rounded animate-pulse mb-3" />
        <div className="text-center">
          <div className="w-24 h-4 bg-white/20 rounded animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

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
              "bg-",
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
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/40 text-yellow-300 rounded-lg hover:from-yellow-500/30 hover:to-orange-500/30 hover:border-yellow-400/60 transition-all duration-300 hover:scale-105 active:scale-95"
            onClick={onShopClick}
          >
            <ShoppingCart size={16} />
            <span className="font-bold text-sm">{t("nav.shop")}</span>
          </button>
        </div>
      )}
    </div>
  );
};

const ProgressIndicator = ({ mode }: { mode: GameMode }) => {
  const t = useT();

  const isCompetitive = mode.progressType === "competitive";

  return (
    <div
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${isCompetitive
          ? "bg-green-500/10 border-green-400/30 text-green-300"
          : "bg-gray-500/10 border-gray-400/30 text-gray-300"
        }`}
    >
      {isCompetitive ? <TrendingUp size={12} /> : <Coffee size={12} />}
      <span>{t(mode.progressInfoKey as any)}</span>
    </div>
  );
};

const CompactGameModeCard = ({
  mode,
  isExpanded,
  onToggleExpand,
  onStart,
  isDisabled,
  isCurrentModeLoading,
  isAnyModeLoading,
  isUIBlocked,
}: {
  mode: GameMode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStart: () => void;
  isDisabled: boolean;
  isCurrentModeLoading: boolean;
  isAnyModeLoading: boolean;
  isUIBlocked: boolean;
}) => {
  const t = useT();
  const Icon = mode.icon;

  const effectivelyDisabled = isDisabled || isUIBlocked;

  return (
    <div
      className={`
        relative backdrop-blur-sm border rounded-xl transition-all duration-300 overflow-hidden
        ${mode.color.background} ${mode.color.border}
        ${effectivelyDisabled || isAnyModeLoading ? "opacity-50" : mode.color.hover}
        ${isExpanded ? "ring-1 ring-white/20" : ""}
      `}
    >
      {/* Background Gamepad Icon */}
      <div className="absolute right-0 top-1/2 transform translate-x-1/3 -translate-y-1/2 pointer-events-none">
        <Gamepad2
          className="text-white/5"
          size={120}
          style={{
            transform: "rotate(15deg)",
          }}
        />
      </div>

      {/* Main Card Content */}
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
            className={`p-2 rounded-lg transition-all duration-300 ${mode.color.background} hover:bg-white/10 relative z-20 disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={isAnyModeLoading}
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronUp className={mode.color.accent} size={16} />
            ) : (
              <ChevronDown className={mode.color.accent} size={16} />
            )}
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mb-4">
          <ProgressIndicator mode={mode} />
        </div>

        <p className={`text-sm ${mode.color.secondary} mb-4 leading-relaxed`}>
          {t(mode.descriptionKey as any)}
        </p>

        {/* Expanded Content */}
        {isExpanded && !isAnyModeLoading && (
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
                            : mode.id === "physics"
                              ? "bg-purple-400/60"
                              : "bg-orange-400/60" // rotation
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
          className={`
            w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg relative z-20
            text-sm font-bold transition-all duration-300
            ${mode.color.background} ${mode.color.primary} ${mode.color.border} border
            ${effectivelyDisabled || isAnyModeLoading
              ? "opacity-50 cursor-not-allowed"
              : "hover:scale-105 active:scale-95 hover:shadow-lg hover:border-opacity-80"
            }
          `}
          disabled={isAnyModeLoading || effectivelyDisabled}
          onClick={onStart}
        >
          {isCurrentModeLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>{t("common.loading")}</span>
            </>
          ) : (
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

      {/* Disabled Overlay */}
      {effectivelyDisabled && !isAnyModeLoading && (
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

export default function GamePage() {
  const router = useRouter();
  const { telegramUser, getAttemptsStatus, getCachedAttemptsStatus } = useUser();

  // NEW: Security integration
  const {
    securityState,
    showSecurityModal,
    securityModalType,
    handleSecuritySuccess,
    handleSecurityFailure,
    isSecurityCheckNeeded,
    shouldBlockUI,
    manualTriggerSecurityCheck,
  } = useSecurity();

  const t = useT();

  // Component state
  const [loadingModeId, setLoadingModeId] = useState<string | null>(null);
  const [expandedModes, setExpandedModes] = useState<string[]>([]);
  const [attemptsStatus, setAttemptsStatus] = useState<AttemptsStatus | null>(
    null,
  );
  const [timeUntilReset, setTimeUntilReset] = useState<string>("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // NEW: UI blocking based on security state
  const isUIBlocked = shouldBlockUI();
  const needsVerification = isSecurityCheckNeeded();

  // Check attempts with caching
  const checkAttempts = useCallback(async () => {
    if (!telegramUser?.id) return;

    try {
      const status = await getAttemptsStatus();
      setAttemptsStatus(status);
    } catch (error) {
      console.error("Error checking attempts:", error);
      setAttemptsStatus({
        canPlay: false,
        attemptsRemaining: 0,
      });
    }
  }, [telegramUser?.id, getAttemptsStatus]);

  // Initialize data on component load
  useEffect(() => {
    const initializeData = async () => {
      if (!telegramUser?.id) {
        setIsInitialLoading(false);
        return;
      }

      const cachedStatus = getCachedAttemptsStatus();

      if (cachedStatus) {
        setAttemptsStatus(cachedStatus);
        setIsInitialLoading(false);
        checkAttempts().finally(() => {
          // Data may have changed, but UI is already displayed
        });
      } else {
        await checkAttempts();
        setIsInitialLoading(false);
      }
    };

    initializeData();
  }, [telegramUser?.id, getCachedAttemptsStatus, checkAttempts]);

  // Timer for countdown
  useEffect(() => {
    if (!attemptsStatus?.resetTime || attemptsStatus.canPlay) {
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
  }, [attemptsStatus?.resetTime, attemptsStatus?.canPlay, checkAttempts]);

  // Game start handler with security checks
  const handleModeStart = useCallback(
    async (mode: GameMode) => {
      // NEW: Check security first
      if (isUIBlocked) {
        console.log("UI blocked due to security requirements");
        if (needsVerification) {
          await manualTriggerSecurityCheck();
        }
        return;
      }

      if (!attemptsStatus?.canPlay || loadingModeId) return;

      setLoadingModeId(mode.id);

      try {
        console.log(`Starting ${mode.id} game - verifying attempts on server`);
        const freshStatus = await getAttemptsStatus();

        if (!freshStatus.canPlay) {
          console.warn("Attempts check failed - cannot start game");
          setAttemptsStatus(freshStatus);
          setLoadingModeId(null);
          return;
        }

        setTimeout(() => {
          router.push(mode.route);
        }, 600);
      } catch (error) {
        console.error("Error verifying attempts before game start:", error);
        setLoadingModeId(null);
      }
    },
    [
      isUIBlocked,
      needsVerification,
      manualTriggerSecurityCheck,
      attemptsStatus?.canPlay,
      loadingModeId,
      getAttemptsStatus,
      router,
    ],
  );

  const handleToggleExpand = useCallback(
    (modeId: string) => {
      if (loadingModeId) return;

      setExpandedModes((prev) =>
        prev.includes(modeId)
          ? prev.filter((id) => id !== modeId)
          : [...prev, modeId],
      );
    },
    [loadingModeId],
  );

  const handleOpenShop = useCallback(() => {
    router.push("/shop");
  }, [router]);

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

  // Check if user is blocked and redirect
  useEffect(() => {
    if (securityState.isBlocked) {
      console.log("User is blocked, redirecting to blocked page");
      router.push("/blocked");
    }
  }, [securityState.isBlocked, router]);

  // Determine if games can be played
  const canPlay = attemptsStatus?.canPlay ?? false;

  return (
    <div
      className={`min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset ${loadingModeId
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
          isLoading={isInitialLoading}
          timeUntilReset={timeUntilReset}
          onShopClick={handleOpenShop}
        />
      </div>

      {/* Tournament Card */}
      <div className="mb-8">
        <TournamentCard />
      </div>

      {/* Game Mode Cards */}
      <div className="space-y-4 mb-8">
        {GAME_MODES.map((mode) => (
          <CompactGameModeCard
            key={mode.id}
            isAnyModeLoading={loadingModeId !== null}
            isCurrentModeLoading={loadingModeId === mode.id}
            isDisabled={!canPlay}
            isExpanded={expandedModes.includes(mode.id)}
            isUIBlocked={isUIBlocked}
            mode={mode}
            onStart={() => handleModeStart(mode)}
            onToggleExpand={() => handleToggleExpand(mode.id)}
          />
        ))}
      </div>

      {/* Footer Message */}
      <div className="text-center space-y-2 animate-fade-in pb-8">
        <p className="text-white/30 text-xs">{t("game.general.useWisely")}</p>
      </div>

      {/* NEW: Security Modal */}
      {showSecurityModal && securityModalType && (
        <UnifiedSecurityModal
          isOpen={showSecurityModal}
          type={securityModalType}
          onSuccess={handleSecuritySuccess}
          onFailure={handleSecurityFailure}
        />
      )}
    </div>
  );
}