// src/app/main/page.tsx - Обновлено с турнирной кнопкой под основной кнопкой

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, Settings as SettingsIcon, Info } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useAttempts } from "@/hooks/modules/useAttempts";
import { useT } from "@/contexts/LocalizationContext";
import { useSettings } from "@/contexts/SettingsContext";
import { usePCDetection } from "@/hooks/usePCDetection";
import AuthGuard from "@/components/Auth/AuthGuard";
import Settings from "@/components/Settings/Settings";
import AboutModal from "@/components/AboutModal/AboutModal";
import AttemptsDisplay from "@/components/AttemptsDisplay/AttemptsDisplay";
import SeasonButton from "@/components/SeasonButton/SeasonButton";
import SeasonInfoModal from "@/components/SeasonInfoModal/SeasonInfoModal";
import TournamentButton from "@/components/Tournaments/TournamentButton";
import DailyQuestButton from "@/components/DailyQuestButton/DailyQuestButton";
import DailyQuestModal from "@/components/DailyQuestModal/DailyQuestModal";

function MainPageContent() {
  const router = useRouter();
  const {
    user,
    isLoading: userLoading,
    telegramUser,
    setTelegramUser,
    makeAuthenticatedRequest,
  } = useUser();
  const {
    attemptsStatus,
    userLevel,
    isLoading: attemptsLoading,
    error: attemptsError,
    canPlay,
    attemptsRemaining,
    fetchAttemptsStatus,
    clearError,
  } = useAttempts(makeAuthenticatedRequest);
  const { settings } = useSettings();
  const t = useT();

  const pcDetection = usePCDetection(makeAuthenticatedRequest, {
    enabled: true,
    sensitivityThreshold: 2,
    detectionTimeWindow: 3000,
    excludePointerEvents: true,
  });

  const checkFirstVisit = () => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("mainPageVisited");
  };

  const isFirstVisit = checkFirstVisit();

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [showButton, setShowButton] = useState(!isFirstVisit);
  const [showTopButtons, setShowTopButtons] = useState(!isFirstVisit);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isDailyQuestModalOpen, setIsDailyQuestModalOpen] = useState(false);

  const DEFAULT_TG_HEADER = 60;
  const EXTRA_OFFSET = 40;
  const [headerOffset, setHeaderOffset] = useState<number>(
    DEFAULT_TG_HEADER + EXTRA_OFFSET,
  );

  useEffect(() => {
    const tgHeader = (window as any)?.Telegram?.WebApp?.headerHeight;
    if (typeof tgHeader === "number" && tgHeader > 0) {
      setHeaderOffset(tgHeader + EXTRA_OFFSET);
    }
  }, []);

  useEffect(() => {
    if (isFirstVisit && typeof window !== "undefined") {
      sessionStorage.setItem("mainPageVisited", "true");
    }
  }, [isFirstVisit]);

  useEffect(() => {
    if (
      !telegramUser &&
      typeof window !== "undefined" &&
      window.Telegram?.WebApp
    ) {
      const tg = window.Telegram.WebApp;
      const user = tg.initDataUnsafe?.user;

      if (user && user.id) {
        const telegramUserData = {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          language_code: user.language_code,
          is_premium: user.is_premium,
        };

        setTelegramUser(telegramUserData);
      }
    }
  }, [telegramUser, setTelegramUser]);

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

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !settings.showBackgroundVideo) return;

    const handleLoadedMetadata = () => {
      video.play().catch(console.error);
    };

    const handleCanPlay = () => {
      video.play().catch(console.error);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [settings.showBackgroundVideo]);

  useEffect(() => {
    const pageLoadTimer = setTimeout(() => {
      setPageLoaded(true);
      if (isFirstVisit) {
        setTimeout(() => setShowButton(true), 150);
        setTimeout(() => setShowTopButtons(true), 450);
      }
    }, 300);

    return () => clearTimeout(pageLoadTimer);
  }, [isFirstVisit]);

  const handleStartGame = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      router.push("/game");
    }, 600);
  };

  const handleOpenTournaments = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      router.push("/tournaments");
    }, 600);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleOpenAbout = () => {
    setIsAboutOpen(true);
  };

  const handleCloseAbout = () => {
    setIsAboutOpen(false);
  };

  const handleOpenSeasons = () => {
    setIsSeasonModalOpen(true);
  };

  const handleCloseSeasonModal = () => {
    setIsSeasonModalOpen(false);
  };

  const handleOpenDailyQuest = () => {
    setIsDailyQuestModalOpen(true);
  };

  const handleCloseDailyQuestModal = () => {
    setIsDailyQuestModalOpen(false);
  };

  const handleAttemptsRetry = () => {
    clearError();
    fetchAttemptsStatus(true);
  };

  return (
    <div
      className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden ${
        isTransitioning
          ? "opacity-0 transition-opacity duration-500 ease-in"
          : pageLoaded
            ? "opacity-100 transition-opacity duration-1000 ease-out"
            : "opacity-0"
      }`}
    >
      {/* Background Video */}
      {settings.showBackgroundVideo && (
        <div
          className="fixed top-0 left-0 w-full h-full z-0"
          style={{
            filter: "brightness(0.15) contrast(1.2) grayscale(1)",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source
              src="https://notfren.com/circusle/videos/mainbg.mp4"
              type="video/mp4"
            />
          </video>
        </div>
      )}

      {/* Top Navigation Icons - Left */}
      <div
        className={`fixed left-0 z-30 px-6 ${
          isFirstVisit
            ? `transition-all duration-1000 transform ${
                showTopButtons
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-8"
              }`
            : "opacity-100 translate-y-0"
        }`}
        style={{ top: headerOffset }}
      >
        <div className="flex items-center gap-4">
          <button
            aria-label="About"
            className="w-10 h-10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isTransitioning}
            onClick={handleOpenAbout}
          >
            <Info size={24} />
          </button>

          <button
            aria-label={t("common.settings")}
            className="w-10 h-10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isTransitioning}
            onClick={handleOpenSettings}
          >
            <SettingsIcon size={24} />
          </button>
        </div>
      </div>

      {/* Season Button - Central position */}
      <div
        className={`fixed left-1/2 transform -translate-x-1/2 z-40 ${
          isFirstVisit
            ? `transition-all duration-1000 transform ${
                showTopButtons
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-8"
              }`
            : "opacity-100 translate-y-0"
        }`}
        style={{ top: "50px" }}
      >
        <SeasonButton
          isTransitioning={isTransitioning}
          onClick={handleOpenSeasons}
        />
      </div>

      {/* Main Content */}
      <div className="text-center z-20 space-y-8 flex flex-col items-center justify-center">
        {/* Title Section */}
        <div className="relative">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold font-bpdots tracking-widest text-white">
            circusle
          </h1>
        </div>

        {/* Action Buttons Container */}
        <div
          className={`space-y-4 ${
            isFirstVisit
              ? `transition-all duration-1000 transform ${
                  showButton
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`
              : "opacity-100 translate-y-0"
          }`}
        >
          {/* Main Play Button */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

            <button
              className="relative w-full max-w-sm mx-auto block px-12 py-6 bg-transparent border-2 border-white/60 text-white rounded-xl text-xl font-bold hover:border-white transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-white/5"
              disabled={isTransitioning}
              onClick={handleStartGame}
            >
              <div className="flex items-center justify-center space-x-4">
                <Play
                  className="text-white group-hover:translate-x-1 transition-transform duration-300"
                  size={24}
                />
                <span className="tracking-wider">
                  {isTransitioning ? t("main.loading") : t("main.startGame")}
                </span>
              </div>
            </button>
          </div>

          {/* Tournament Button - Under Main Play Button */}
          <TournamentButton
            isTransitioning={isTransitioning}
            onClick={handleOpenTournaments}
          />
        </div>
      </div>

      {/* Settings Modal */}
      <Settings isOpen={isSettingsOpen} onClose={handleCloseSettings} />

      {/* About Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={handleCloseAbout} />

      {/* Season Info Modal */}
      <SeasonInfoModal
        isOpen={isSeasonModalOpen}
        makeAuthenticatedRequest={makeAuthenticatedRequest}
        onClose={handleCloseSeasonModal}
      />

      {/* Daily Quest Modal */}
      <DailyQuestModal
        isOpen={isDailyQuestModalOpen}
        makeAuthenticatedRequest={makeAuthenticatedRequest}
        onClose={handleCloseDailyQuestModal}
      />

      {/* Attempts Display */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 ${
          isFirstVisit
            ? `transition-all duration-1000 transform ${
                showTopButtons
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`
            : "opacity-100 translate-y-0"
        }`}
        style={{ paddingBottom: "180px" }}
      >
        <AttemptsDisplay
          attemptsRemaining={attemptsRemaining}
          attemptsStatus={attemptsStatus}
          canPlay={canPlay}
          error={attemptsError}
          isLoading={attemptsLoading}
          mainPageMode={true}
          showShopButton={false}
          userLevel={userLevel}
          onRetry={handleAttemptsRetry}
        />
      </div>

      {/* Daily Quest Button */}
      <div
        className={`fixed left-1/2 transform -translate-x-1/2 z-40 ${
          isFirstVisit
            ? `transition-all duration-1000 transform ${
                showTopButtons
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`
            : "opacity-100 translate-y-0"
        }`}
        style={{ bottom: "100px" }}
      >
        <DailyQuestButton
          isTransitioning={isTransitioning}
          makeAuthenticatedRequest={makeAuthenticatedRequest}
          onClick={handleOpenDailyQuest}
        />
      </div>
    </div>
  );
}

export default function MainPage() {
  return (
    <AuthGuard requireCompleteAuth={true} showError={true}>
      <MainPageContent />
    </AuthGuard>
  );
}