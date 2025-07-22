// src/app/main/page.tsx - Updated to use API instead of direct DB

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Settings as SettingsIcon,
  Info,
  Trophy,
  Clock,
  Calendar,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useAttempts } from "@/hooks/modules/useAttempts";
import { useT } from "@/contexts/LocalizationContext";
import { useSettings } from "@/contexts/SettingsContext";
import AuthGuard from "@/components/Auth/AuthGuard";
import Settings from "@/components/Settings/Settings";
import AboutModal from "@/components/AboutModal/AboutModal";
import AttemptsDisplay from "@/components/AttemptsDisplay";
import CompactLeagueDisplay from "@/components/LeagueProgress/CompactLeagueDisplay";
import LeagueProgressModal from "@/components/LeagueProgress/LeagueProgressModal";

// Tournament types (from new API)
interface Tournament {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  prizes: string[];
  created_at: string;
  updated_at: string;
}

interface TournamentStatus {
  isActive: boolean;
  activeTournament: Tournament | null;
  timeRemaining?: number;
  hasStarted?: boolean;
}

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
    isLoading: attemptsLoading,
    error: attemptsError,
    canPlay,
    attemptsRemaining,
    fetchAttemptsStatus,
    clearError,
  } = useAttempts();
  const { settings } = useSettings();
  const t = useT();

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
  const [showLeagueDisplay, setShowLeagueDisplay] = useState(!isFirstVisit);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLeagueProgressOpen, setIsLeagueProgressOpen] = useState(false);

  /* -------------------------------------------------
   * Tournament state - using new API
   * -------------------------------------------------*/
  const [tournamentStatus, setTournamentStatus] = useState<TournamentStatus>({
    isActive: false,
    activeTournament: null,
  });
  const [tournamentTimeRemaining, setTournamentTimeRemaining] =
    useState<string>("");
  const [showTournamentButton, setShowTournamentButton] = useState(false);
  const [tournamentLoading, setTournamentLoading] = useState(false);
  const [tournamentError, setTournamentError] = useState<string | null>(null);

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
   * Tournament data loading using new API
   * -------------------------------------------------*/
  useEffect(() => {
    const loadTournamentStatus = async () => {
      if (!makeAuthenticatedRequest) return;

      try {
        setTournamentLoading(true);
        setTournamentError(null);

        console.log("Loading tournament status using API...");

        const response = await makeAuthenticatedRequest(
          "/api/tournament/active",
        );

        if (!response.ok) {
          // Silently handle errors for main page
          console.log("Tournament API not available or no active tournament");
          setTournamentStatus({
            isActive: false,
            activeTournament: null,
          });
          setShowTournamentButton(false);

          return;
        }

        const result = await response.json();

        if (!result.success) {
          console.log("No active tournament available");
          setTournamentStatus({
            isActive: false,
            activeTournament: null,
          });
          setShowTournamentButton(false);

          return;
        }

        const status: TournamentStatus = result.data;

        setTournamentStatus(status);

        if (status.isActive && status.activeTournament) {
          setShowTournamentButton(true);

          if (status.timeRemaining) {
            setTournamentTimeRemaining(
              formatTimeRemaining(status.timeRemaining),
            );

            // Set up countdown timer
            const interval = setInterval(() => {
              const now = new Date();
              const endDate = new Date(status.activeTournament!.end_date);
              const diff = endDate.getTime() - now.getTime();

              if (diff <= 0) {
                setTournamentStatus({
                  isActive: false,
                  activeTournament: null,
                });
                setShowTournamentButton(false);
                setTournamentTimeRemaining("");
                clearInterval(interval);
              } else {
                setTournamentTimeRemaining(formatTimeRemaining(diff));
              }
            }, 1000);

            return () => clearInterval(interval);
          }
        } else {
          setShowTournamentButton(false);
        }

        console.log("Tournament status loaded:", {
          isActive: status.isActive,
          tournamentName: status.activeTournament?.name,
        });
      } catch (error) {
        console.log("Tournament loading failed (silently handled):", error);
        setTournamentStatus({
          isActive: false,
          activeTournament: null,
        });
        setShowTournamentButton(false);
      } finally {
        setTournamentLoading(false);
      }
    };

    // Only load tournament status if user is authenticated
    if (user) {
      loadTournamentStatus();
    }
  }, [user, makeAuthenticatedRequest]);

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
        setTimeout(() => setShowLeagueDisplay(true), 600);
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

  const handleOpenTournament = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      router.push("/tournament");
    }, 600);
  };

  const handleOpenSeasons = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      router.push("/seasons");
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

  const handleOpenLeagueProgress = () => {
    console.log("League progress click detected");
    console.log("Current user:", user);
    console.log("User loading:", userLoading);
    setIsLeagueProgressOpen(true);
  };

  const handleCloseLeagueProgress = () => {
    console.log("Closing league progress modal");
    setIsLeagueProgressOpen(false);
  };

  const handleAttemptsRetry = () => {
    clearError();
    fetchAttemptsStatus(true);
  };

  useEffect(() => {
    console.log("League modal state:", isLeagueProgressOpen);
  }, [isLeagueProgressOpen]);

  /* -------------------------------------------------
   * Render
   * -------------------------------------------------*/
  return (
    <div
      className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden ${isTransitioning
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
            <source src="/videos/mainbg.mp4" type="video/mp4" />
          </video>
        </div>
      )}

      {/* Top Navigation Icons */}
      <div
        className={`fixed left-0 right-0 z-30 px-6 ${isFirstVisit
          ? `transition-all duration-1000 transform ${showTopButtons
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-8"
          }`
          : "opacity-100 translate-y-0"
          }`}
        style={{ top: headerOffset }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              aria-label={t("common.settings")}
              className="group relative w-12 h-12 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-full hover:border-white hover:bg-white/20 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isTransitioning}
              onClick={handleOpenSettings}
            >
              <div className="flex items-center justify-center">
                <SettingsIcon
                  className="text-white group-hover:rotate-90 transition-transform duration-300"
                  size={20}
                />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-1000" />
            </button>

            <button
              aria-label="About"
              className="group relative w-12 h-12 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-full hover:border-white hover:bg-white/20 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isTransitioning}
              onClick={handleOpenAbout}
            >
              <div className="flex items-center justify-center">
                <Info
                  className="text-white group-hover:rotate-90 transition-transform duration-300"
                  size={20}
                />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-1000" />
            </button>
          </div>

          {/* Tournament Button */}
          {showTournamentButton && tournamentStatus.activeTournament && (
            <button
              aria-label="Active Tournament"
              className="group relative px-4 py-2 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 backdrop-blur-sm border-2 border-yellow-400/40 text-yellow-300 rounded-full hover:border-yellow-400 hover:from-yellow-400/30 hover:to-orange-500/30 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isTransitioning}
              onClick={handleOpenTournament}
            >
              <div className="flex items-center space-x-2">
                <Trophy
                  className="text-yellow-300 group-hover:scale-110 transition-transform duration-300"
                  size={16}
                />
                <div className="text-xs">
                  <div className="font-bold text-yellow-300">TOURNAMENT</div>
                  {tournamentTimeRemaining && (
                    <div className="text-yellow-400/80 flex items-center space-x-1">
                      <Clock size={10} />
                      <span>{tournamentTimeRemaining}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/30 via-orange-500/20 to-yellow-400/30 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-1000" />
              <div className="absolute inset-0 rounded-full bg-yellow-400/10 animate-pulse opacity-50" />
            </button>
          )}
        </div>
      </div>


      {/* Seasons Button */}
        <div
          className={`fixed left-1/2 transform -translate-x-1/2 z-30 ${isFirstVisit
            ? `transition-all duration-1000 transform ${showTopButtons
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-8"
            }`
            : "opacity-100 translate-y-0"
            }`}
          style={{ top: headerOffset + 60 }}
        >
          <button
            aria-label="Current Season"
            className="group relative px-6 py-3 bg-gradient-to-br from-purple-400/20 to-blue-500/20 backdrop-blur-sm border-2 border-purple-400/40 text-purple-300 rounded-full hover:border-purple-400 hover:from-purple-400/30 hover:to-blue-500/30 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isTransitioning}
            onClick={handleOpenSeasons}
          >
            <div className="flex items-center space-x-2">
              <Calendar
                className="text-purple-300 group-hover:scale-110 transition-transform duration-300"
                size={16}
              />
              <div className="text-sm">
                <div className="font-bold text-purple-300">SEASON</div>
                  <div className="text-purple-400/80 flex items-center space-x-1">
                    <Clock size={10} />
                    <span>Active</span>
                  </div>
              </div>
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-400/30 via-blue-500/20 to-purple-400/30 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-1000" />
            <div className="absolute inset-0 rounded-full bg-purple-400/10 animate-pulse opacity-50" />
          </button>
        </div>

      {/* Main Content */}
      <div className="text-center z-20 space-y-8 flex flex-col items-center justify-center">
        {/* Title Section */}
        <div className="relative">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold font-bpdots tracking-widest text-white">
            circusle
          </h1>
        </div>

        {/* Action Button */}
        <div
          className={`${isFirstVisit
            ? `transition-all duration-1000 transform ${showButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`
            : "opacity-100 translate-y-0"
            }`}
        >
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
          className={`${isFirstVisit
            ? `transition-all duration-1000 transform ${showGreeting
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

      {/* League Progress Modal */}
      <LeagueProgressModal
        isOpen={isLeagueProgressOpen}
        onClose={handleCloseLeagueProgress}
      />

      {/* Централизованное отображение попыток */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 ${isFirstVisit
          ? `transition-all duration-1000 transform ${showTopButtons
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8"
          }`
          : "opacity-100 translate-y-0"
          }`}
        style={{ paddingBottom: "140px" }}
      >
        <AttemptsDisplay
          attemptsRemaining={attemptsRemaining}
          attemptsStatus={attemptsStatus}
          canPlay={canPlay}
          error={attemptsError}
          isLoading={attemptsLoading}
          showShopButton={false}
          onRetry={handleAttemptsRetry}
        />
      </div>

      {/* Level and League Display */}
      {user && !userLoading && (
        <div
          className={`fixed left-0 right-0 flex justify-center pointer-events-auto ${isFirstVisit
            ? `transition-all duration-1000 transform ${showLeagueDisplay
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
            }`
            : "opacity-100 translate-y-0"
            }`}
          style={{
            bottom: "96px",
            zIndex: 50,
          }}
        >
          <div className="pointer-events-auto">
            <CompactLeagueDisplay
              className="cursor-pointer"
              onClick={handleOpenLeagueProgress}
            />
          </div>
        </div>
      )}
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
