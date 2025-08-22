// src/app/main/page.tsx - Updated main page with repositioned Daily Quest Button

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, Settings as SettingsIcon, Info } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useAttempts } from "@/hooks/modules/useAttempts";
import { useT } from "@/contexts/LocalizationContext";
import { useSettings } from "@/contexts/SettingsContext";
import { usePCDetection } from "@/hooks/usePCDetection"; // NEW: PC Detection
import AuthGuard from "@/components/Auth/AuthGuard";
import Settings from "@/components/Settings/Settings";
import AboutModal from "@/components/AboutModal/AboutModal";
import AttemptsDisplay from "@/components/AttemptsDisplay/AttemptsDisplay";
import SeasonButton from "@/components/SeasonButton/SeasonButton";
import SeasonInfoModal from "@/components/SeasonInfoModal/SeasonInfoModal";
import TournamentButton from "@/components/Tournaments/TournamentButton";
import DailyQuestButton from "@/components/DailyQuestButton/DailyQuestButton";
import DailyQuestModal from "@/components/DailyQuestModal/DailyQuestModal";

// Utility function to format time remaining
const formatTimeRemaining = (milliseconds: number): string => {
  if (milliseconds <= 0) return "Ended";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);

  if (days > 0) {
    const hours = totalHours % 24;

    return `${days}d ${hours}h`;
  } else if (totalHours > 0) {
    const minutes = totalMinutes % 60;

    return `${totalHours}h ${minutes}m`;
  } else if (totalMinutes > 0) {
    const seconds = totalSeconds % 60;

    return `${totalMinutes}m ${seconds}s`;
  } else {
    return `${totalSeconds}s`;
  }
};

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

  // NEW: PC Detection with production configuration
  const pcDetection = usePCDetection(makeAuthenticatedRequest, {
    enabled: true,
    sensitivityThreshold: 2, // Lower threshold for main page (more sensitive)
    detectionTimeWindow: 3000, // 3 seconds window
    excludePointerEvents: true, // Exclude pointer events to avoid false positives
  });

  /* -------------------------------------------------
   * Animation control - First visit detection
   * -------------------------------------------------*/
  const checkFirstVisit = () => {
    if (typeof window === "undefined") return false;

    return !sessionStorage.getItem("mainPageVisited");
  };

  const isFirstVisit = checkFirstVisit();

  /* -------------------------------------------------
   * UI state
   * -------------------------------------------------*/
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [showButton, setShowButton] = useState(!isFirstVisit);
  const [showGreeting, setShowGreeting] = useState(!isFirstVisit);
  const [greetingText, setGreetingText] = useState("");
  const [showTopButtons, setShowTopButtons] = useState(!isFirstVisit);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isDailyQuestModalOpen, setIsDailyQuestModalOpen] = useState(false);

  /* -------------------------------------------------
   * Dynamic offset for Telegram system UI
   * -------------------------------------------------*/
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

  // Mark page as visited
  useEffect(() => {
    if (isFirstVisit && typeof window !== "undefined") {
      sessionStorage.setItem("mainPageVisited", "true");
    }
  }, [isFirstVisit]);

  // Initialize greeting for non-first visits
  useEffect(() => {
    if (!isFirstVisit && user?.first_name) {
      const fullGreeting = t("main.greeting", { name: user.first_name });

      setGreetingText(fullGreeting);
    }
  }, [isFirstVisit, user?.first_name, t]);

  // Initialize telegramUser if not set
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

  /* -------------------------------------------------
   * Attempts initialization
   * -------------------------------------------------*/
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

  /* -------------------------------------------------
   * Background video logic
   * -------------------------------------------------*/
  const videoRef = useRef<HTMLVideoElement>(null);
  const username = user?.first_name || "unknown";
  const fullGreeting = t("main.greeting", { name: username });

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

  /* -------------------------------------------------
   * Mount / animation logic
   * -------------------------------------------------*/
  useEffect(() => {
    const pageLoadTimer = setTimeout(() => {
      setPageLoaded(true);
      if (isFirstVisit) {
        setTimeout(() => setShowButton(true), 150);
        setTimeout(() => setShowGreeting(true), 300);
        setTimeout(() => setShowTopButtons(true), 450);
      }
    }, 300);

    return () => clearTimeout(pageLoadTimer);
  }, [isFirstVisit]);

  // Greeting typing animation for first visit only
  useEffect(() => {
    if (!showGreeting || userLoading || !isFirstVisit) {
      return;
    }

    let currentChar = 0;
    const typingInterval = setInterval(() => {
      if (currentChar <= fullGreeting.length) {
        setGreetingText(fullGreeting.slice(0, currentChar));
        currentChar++;
      } else {
        clearInterval(typingInterval);
      }
    }, 60);

    return () => clearInterval(typingInterval);
  }, [showGreeting, fullGreeting, userLoading, isFirstVisit]);

  /* -------------------------------------------------
   * Handlers
   * -------------------------------------------------*/
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

  /* -------------------------------------------------
   * Render
   * -------------------------------------------------*/
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

      {/* Top Navigation Icons */}
      <div
        className={`fixed left-0 right-0 z-30 px-6 ${
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
        <div className="flex flex-col gap-3">
          {/* Top row - About and Tournament buttons */}
          <div className="flex items-center justify-between">
            <button
              aria-label="About"
              className="group relative w-12 h-12 bg-black/80 backdrop-blur-sm border border-blue-600/50 text-white rounded-lg hover:border-blue-500 hover:bg-black/90 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              disabled={isTransitioning}
              onClick={handleOpenAbout}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex items-center justify-center w-full h-full">
                <Info
                  className="text-blue-400 group-hover:text-white group-hover:rotate-12 transition-all duration-300"
                  size={18}
                />
              </div>
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-blue-500/20 rounded-lg blur-sm" />
              </div>
              <div
                className="absolute -inset-1 rounded-lg blur-sm opacity-0 group-hover:opacity-50 transition-opacity duration-300 bg-gradient-to-br from-blue-500/40 to-blue-600/20"
                style={{ zIndex: -1 }}
              />
              <div
                className="absolute top-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                style={{ animation: "shimmer 2s ease-in-out infinite" }}
              />
            </button>

            <TournamentButton
              isTransitioning={isTransitioning}
              onClick={handleOpenTournaments}
            />
          </div>

          {/* Bottom row - Settings button */}
          <div className="flex items-center">
            <button
              aria-label={t("common.settings")}
              className="group relative w-12 h-12 bg-black/80 backdrop-blur-sm border border-slate-600/50 text-white rounded-lg hover:border-slate-500 hover:bg-black/90 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              disabled={isTransitioning}
              onClick={handleOpenSettings}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex items-center justify-center w-full h-full">
                <SettingsIcon
                  className="text-slate-400 group-hover:text-white group-hover:rotate-90 transition-all duration-300"
                  size={18}
                />
              </div>
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-slate-500/20 rounded-lg blur-sm" />
              </div>
              <div
                className="absolute -inset-1 rounded-lg blur-sm opacity-0 group-hover:opacity-50 transition-opacity duration-300 bg-gradient-to-br from-slate-500/40 to-slate-600/20"
                style={{ zIndex: -1 }}
              />
              <div
                className="absolute top-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-slate-400 to-transparent"
                style={{ animation: "shimmer 2s ease-in-out infinite" }}
              />
            </button>
          </div>
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
        </div>

        {/* User Greeting */}
        <div
          className={`${
            isFirstVisit
              ? `transition-all duration-1000 transform ${
                  showGreeting
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`
              : "opacity-100 translate-y-0"
          }`}
        >
          {userLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" />
              <div
                className="w-1 h-1 bg-white/60 rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="w-1 h-1 bg-white/60 rounded-full animate-pulse"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          ) : (
            <p className="text-xl text-white/80 tracking-wider">
              {greetingText}
              {isFirstVisit && greetingText.length < fullGreeting.length && (
                <span className="animate-pulse">|</span>
              )}
            </p>
          )}
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

      {/* Enhanced Attempts Display with Level Integration */}
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
        style={{ paddingBottom: "220px" }}
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

      {/* Daily Quest Button - Between Attempts and Bottom Menu */}
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
        style={{ bottom: "140px" }}
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