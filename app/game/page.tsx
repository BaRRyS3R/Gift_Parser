// src/app/game/page.tsx - Enhanced with animated borders and info modal

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardFooter, Image, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/react";
import {
  Crosshair,
  Play,
  Shield,
  Atom,
  RotateCw,
  Zap,
  AlertTriangle,
  Info,
  X,
  Target,
  Clock,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useAttempts } from "@/hooks/modules/useAttempts";
import { useT } from "@/contexts/LocalizationContext";
import { usePCDetection } from "@/hooks/usePCDetection";
import FutureTechAttemptsDisplay from "@/components/AttemptsDisplay/FutureTechAttemptsDisplay";
import WinxEasterEggModal from "@/components/EasterEggs/WinxEasterEggModal";

// Easter Egg chance configuration
const EASTER_EGG_CHANCE = 0.001; // 0.1% chance

interface GameMode {
  id: string;
  nameKey: string;
  descriptionKey: string;
  objectiveKey: string;
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
    border: string;
    borderHover: string;
    borderActive: string;
    glow: string;
    gradientFrom: string;
    gradientTo: string;
  };
  featuresKeys: string[];
  basicRules: string[];
}

const GAME_MODES: GameMode[] = [
  {
    id: "reaction",
    nameKey: "game.modes.reaction.name",
    descriptionKey: "game.modes.reaction.description",
    objectiveKey: "game.modes.reaction.objective",
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
      border: "border-blue-400/30",
      borderHover: "border-blue-400/60",
      borderActive: "border-blue-400",
      glow: "shadow-blue-400/20",
      gradientFrom: "from-blue-400/20",
      gradientTo: "to-blue-600/20",
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
    objectiveKey: "game.modes.survival.objective",
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
      border: "border-red-400/30",
      borderHover: "border-red-400/60",
      borderActive: "border-red-400",
      glow: "shadow-red-400/20",
      gradientFrom: "from-red-400/20",
      gradientTo: "to-red-600/20",
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
    objectiveKey: "game.modes.physics.objective",
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
      border: "border-purple-400/30",
      borderHover: "border-purple-400/60",
      borderActive: "border-purple-400",
      glow: "shadow-purple-400/20",
      gradientFrom: "from-purple-400/20",
      gradientTo: "to-purple-600/20",
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
    objectiveKey: "game.modes.rotation.objective",
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
      border: "border-orange-400/30",
      borderHover: "border-orange-400/60",
      borderActive: "border-orange-400",
      glow: "shadow-orange-400/20",
      gradientFrom: "from-orange-400/20",
      gradientTo: "to-orange-600/20",
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
  const { user, makeAuthenticatedRequest } = useUser();
  const {
    attemptsStatus,
    isLoading: attemptsLoading,
    error: attemptsError,
    canPlay,
    attemptsRemaining,
    fetchAttemptsStatus,
    canPlayFast,
    clearError,
  } = useAttempts(makeAuthenticatedRequest);
  const t = useT();

  // PC Detection with game-specific configuration
  const pcDetection = usePCDetection(makeAuthenticatedRequest, {
    enabled: true,
    sensitivityThreshold: 1,
    detectionTimeWindow: 2000,
    excludePointerEvents: true,
  });

  const [loadingModeId, setLoadingModeId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  // Easter Egg state
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [easterEggChecked, setEasterEggChecked] = useState(false);

  // Info Modal state
  const [selectedModeInfo, setSelectedModeInfo] = useState<GameMode | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Initialize attempts status loading
  useEffect(() => {
    if (user && !attemptsLoading && !attemptsStatus) {
      fetchAttemptsStatus();
    }
  }, [
    user,
    makeAuthenticatedRequest,
    attemptsLoading,
    attemptsStatus,
    fetchAttemptsStatus,
  ]);

  // Easter Egg check on page load
  useEffect(() => {
    if (!easterEggChecked) {
      const randomValue = Math.random();

      console.log(
        `Easter egg check: ${randomValue} (threshold: ${EASTER_EGG_CHANCE})`,
      );

      if (randomValue < EASTER_EGG_CHANCE) {
        console.log("🎉 Easter egg triggered!");
        setShowEasterEgg(true);
      }

      setEasterEggChecked(true);
    }
  }, [easterEggChecked]);

  const handleModeStart = useCallback(
    async (mode: GameMode) => {
      if (loadingModeId) {
        console.warn("Cannot start game: already loading another mode");
        return;
      }

      setLoadingModeId(mode.id);
      setStartError(null);

      try {
        // Quick check without consuming attempt - let game managers handle consumption
        const canPlayNow = await canPlayFast();
        
        if (!canPlayNow) {
          throw new Error("No attempts remaining");
        }

        // Small delay for loading animation
        setTimeout(() => {
          router.push(mode.route);
        }, 600);

      } catch (error) {
        console.error("Error starting game:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to start game";

        setStartError(errorMessage);
        setLoadingModeId(null);

        // Refresh attempts status after error
        setTimeout(() => {
          fetchAttemptsStatus(true);
        }, 1000);
      }
    },
    [loadingModeId, canPlayFast, router, fetchAttemptsStatus],
  );

  const handleShowInfo = useCallback((mode: GameMode) => {
    setSelectedModeInfo(mode);
    setIsInfoModalOpen(true);
  }, []);

  const handleCloseInfoModal = useCallback(() => {
    setIsInfoModalOpen(false);
    setSelectedModeInfo(null);
  }, []);

  const handleAttemptsRetry = useCallback(() => {
    clearError();
    setStartError(null);
    fetchAttemptsStatus(true);
  }, [clearError, fetchAttemptsStatus]);

  const handleCloseEasterEgg = useCallback(() => {
    setShowEasterEgg(false);
  }, []);

  // Clear start error when attempts change
  useEffect(() => {
    if (startError && attemptsStatus) {
      setStartError(null);
    }
  }, [attemptsStatus, startError]);

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
        tg.BackButton.offClick(() => {});
      };
    }
  }, [router]);

  return (
    <div
      className={`min-h-screen bg-black text-white safe-area-inset-bottom safe-area-inset ${
        loadingModeId
          ? "opacity-0 transition-opacity duration-500 ease-in"
          : "opacity-100 transition-opacity duration-1000 ease-out"
      }`}
    >
      {/* Easter Egg Modal */}
      <WinxEasterEggModal
        chance={EASTER_EGG_CHANCE * 100}
        isOpen={showEasterEgg}
        makeAuthenticatedRequest={makeAuthenticatedRequest}
        onClose={handleCloseEasterEgg}
      />

      {/* Game Mode Info Modal */}
      <Modal 
        isOpen={isInfoModalOpen} 
        onClose={handleCloseInfoModal}
        size="lg"
        classNames={{
          base: "bg-black/95 backdrop-blur-xl border-2 border-white/20",
          header: "border-b border-white/20",
          body: "py-6",
          footer: "border-t border-white/20",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between">
                {selectedModeInfo && (
                  <div className="flex items-center space-x-3">
                    <div 
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm border ${selectedModeInfo.color.border} flex items-center justify-center`}
                    >
                      <selectedModeInfo.icon className={selectedModeInfo.color.primary} size={24} />
                    </div>
                    <div>
                      <h3 className={`text-2xl font-bold ${selectedModeInfo.color.primary}`}>
                        {t(selectedModeInfo.nameKey as any)}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className={selectedModeInfo.color.accent}>
                          {t(selectedModeInfo.durationKey as any)}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-white/40" />
                        <span className={selectedModeInfo.color.accent}>
                          {selectedModeInfo.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  isIconOnly
                  variant="light"
                  onPress={onClose}
                  className="text-white/60 hover:text-white"
                >
                  <X size={20} />
                </Button>
              </ModalHeader>
              <ModalBody>
                {selectedModeInfo && (
                  <div className="space-y-6">
                    {/* Objective */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Target className={selectedModeInfo.color.primary} size={16} />
                        <h4 className={`font-bold ${selectedModeInfo.color.primary}`}>
                          {t("game.general.objective")}
                        </h4>
                      </div>
                      <p className={`text-sm leading-relaxed ${selectedModeInfo.color.secondary}`}>
                        {t(selectedModeInfo.objectiveKey as any)}
                      </p>
                    </div>

                    {/* Rules */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Shield className={selectedModeInfo.color.primary} size={16} />
                        <h4 className={`font-bold ${selectedModeInfo.color.primary}`}>
                          {t("game.general.rules")}
                        </h4>
                      </div>
                      <ul className="space-y-2">
                        {selectedModeInfo.basicRules.map((ruleKey, index) => (
                          <li key={index} className={`text-sm flex items-start space-x-2 ${selectedModeInfo.color.secondary}`}>
                            <span className={`text-xs mt-1 ${selectedModeInfo.color.accent}`}>•</span>
                            <span>{t(ruleKey as any)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Features */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Zap className={selectedModeInfo.color.primary} size={16} />
                        <h4 className={`font-bold ${selectedModeInfo.color.primary}`}>
                          Особенности
                        </h4>
                      </div>
                      <ul className="space-y-2">
                        {selectedModeInfo.featuresKeys.map((featureKey, index) => (
                          <li key={index} className={`text-sm flex items-start space-x-2 ${selectedModeInfo.color.secondary}`}>
                            <span className={`text-xs mt-1 ${selectedModeInfo.color.accent}`}>•</span>
                            <span>{t(featureKey as any)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Difficulty Info */}
                    <div className={`p-4 rounded-lg border ${selectedModeInfo.color.border} bg-white/5`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <Clock className={selectedModeInfo.color.primary} size={14} />
                            <span className={`text-sm font-bold ${selectedModeInfo.color.primary}`}>
                              {t("game.general.difficulty")}
                            </span>
                          </div>
                          <span className={`text-xs ${selectedModeInfo.color.accent}`}>
                            {t(selectedModeInfo.durationKey as any)}
                          </span>
                        </div>
                        <div className="text-2xl">
                          {selectedModeInfo.difficulty}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                {selectedModeInfo && (
                  <div className="flex space-x-3 w-full">
                    <Button
                      variant="bordered"
                      onPress={onClose}
                      className="flex-1 border-white/30 text-white/80 hover:border-white/50"
                    >
                      Закрыть
                    </Button>
                    <Button
                      color={selectedModeInfo.color.buttonColor}
                      onPress={() => {
                        onClose();
                        handleModeStart(selectedModeInfo);
                      }}
                      isDisabled={!canPlay || loadingModeId !== null}
                      className="flex-1"
                      startContent={!canPlay ? <Shield size={16} /> : <Play size={16} />}
                    >
                      {!canPlay ? t("game.general.lock") : t("common.play")}
                    </Button>
                  </div>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <div className="px-4">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
            {t("game.modes.title")}
          </h1>
          <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
            {t("game.modes.subtitle")}
          </p>
        </div>

        {/* Start error display */}
        {startError && (
          <div className="mb-6 animate-fade-in">
            <div
              className="bg-black/90 backdrop-blur-xl border-2 border-red-400/40 text-white w-full relative overflow-hidden"
              style={{
                clipPath:
                  "polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)",
              }}
            >
              <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />
              <div className="relative z-10 p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="text-red-400" size={16} />
                  <span className="text-red-400 font-mono text-sm tracking-wider uppercase">
                    {t("common.error")}
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-red-400/30 to-transparent mb-2" />
                <p className="text-red-300 font-mono text-xs mb-2">
                  {startError}
                </p>
                <button
                  className="font-mono text-xs tracking-wider text-red-300 hover:text-red-200 transition-colors underline"
                  onClick={handleAttemptsRetry}
                >
                  {t("common.retry")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Future Tech attempts display */}
        <div className="mb-8 animate-fade-in">
          <FutureTechAttemptsDisplay
            attemptsRemaining={attemptsRemaining}
            attemptsStatus={attemptsStatus}
            canPlay={canPlay}
            error={attemptsError}
            isLoading={attemptsLoading}
            showShopButton={true}
            onRetry={handleAttemptsRetry}
          />
        </div>
      </div>

      {/* Enhanced horizontal scrolling cards with bottom glow effect */}
      <div className="mb-8 animate-fade-in">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex space-x-6 px-4" style={{ width: "max-content" }}>
            {GAME_MODES.map((mode) => {
              const Icon = mode.icon;
              const isCurrentModeLoading = loadingModeId === mode.id;
              const isAnyModeLoading = loadingModeId !== null;
              const isDisabled = !canPlay;

              return (
                <div key={mode.id} className="relative group">
                  <Card
                    isFooterBlurred
                    className={`w-[280px] h-[400px] border-2 transition-all duration-500 backdrop-blur-md ${
                      mode.color.border
                    } ${
                      isDisabled || isAnyModeLoading 
                        ? "opacity-50" 
                        : `group-hover:${mode.color.borderActive} group-hover:shadow-lg group-hover:${mode.color.glow}`
                    }`}
                    style={{
                      background: "rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    <CardHeader className="absolute z-10 top-4 flex-col items-start bg-black/30 backdrop-blur-sm rounded-xl mx-4 border border-white/10">
                      <div className="flex items-center space-x-3 mb-2">
                        <div 
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm border ${mode.color.border} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:${mode.color.borderHover}`}
                        >
                          <Icon className={mode.color.primary} size={20} />
                        </div>
                        <div>
                          <h4
                            className={`font-bold text-xl ${mode.color.primary} transition-all duration-300 group-hover:drop-shadow-lg`}
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
                      className="z-0 w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                      fallbackSrc="/game-placeholder.jpg"
                      src={mode.imageUrl}
                    />

                    <CardFooter className="absolute bg-black/50 backdrop-blur-md bottom-0 border-t-1 border-white/20 z-10 justify-between">
                      <div className="flex space-x-2 w-full">
                        <Button
                          isIconOnly
                          variant="bordered"
                          size="sm"
                          className="min-w-[40px] border-white/30 text-white/80 hover:border-white/50"
                          onPress={() => handleShowInfo(mode)}
                        >
                          <Info size={14} />
                        </Button>
                        <Button
                          className="text-tiny flex-1 transition-all duration-300"
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
                      </div>
                    </CardFooter>

                    {/* Bottom glow highlight effect */}
                    <div 
                      className={`absolute inset-x-0 bottom-0 h-1/3 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden`}
                    >
                      <div 
                        className="absolute inset-0 animate-bottom-glow"
                        style={{
                          background: `linear-gradient(to top, ${
                            mode.id === 'reaction' ? '#3b82f680' :
                            mode.id === 'survival' ? '#ef444480' :
                            mode.id === 'physics' ? '#a855f780' :
                            '#f59e0b80'
                          }, transparent 70%)`,
                        }}
                      />
                    </div>

                    {/* Enhanced glow effect overlay */}
                    <div 
                      className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none bg-gradient-to-br ${mode.color.gradientFrom} ${mode.color.gradientTo}`}
                    />
                  </Card>

                  {/* Enhanced locked state overlay */}
                  {isDisabled && !isAnyModeLoading && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center z-30 border-2 border-gray-600/50">
                      <div className="text-center space-y-3">
                        <Shield className="text-white/60 mx-auto" size={32} />
                        <p className="text-white/80 text-sm font-bold">
                          {t("game.general.noAttemptsLeft")}
                        </p>
                        <div className="w-12 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent mx-auto" />
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

      {/* CSS Animation for bottom glow effect */}
      <style>{`
        @keyframes bottom-glow {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          50% {
            transform: translateY(0%);
            opacity: 1;
          }
          100% {
            transform: translateY(-20%);
            opacity: 0.8;
          }
        }
        
        .animate-bottom-glow {
          animation: bottom-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function GamePage() {
  return <GamePageContent />;
}