// src/app/main/page.tsx - Updated with security UI blocking and unified modal

"use client";

import type { Tournament } from "@/types/tournaments";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Settings as SettingsIcon,
  Info,
  Trophy,
  Clock,
  Shield,
  AlertTriangle,
  Lock,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useSecurity } from "@/hooks/useSecurity";
import { useT } from "@/contexts/LocalizationContext";
import { useSettings } from "@/contexts/SettingsContext";
import { authService } from "@/lib/authService";
import { formatTimeRemaining } from "@/types/tournaments";
import Settings from "@/components/Settings/Settings";
import AboutModal from "@/components/AboutModal/AboutModal";
import AttemptsDisplay from "@/components/AttemptsDisplay";
import CompactLeagueDisplay from "@/components/LeagueProgress/CompactLeagueDisplay";
import LeagueProgressModal from "@/components/LeagueProgress/LeagueProgressModal";
import UnifiedSecurityModal from "@/components/Security/UnifiedSecurityModal";

export default function MainPage() {
  const router = useRouter();
  const {
    user,
    isLoading: userLoading,
    telegramUser,
    setTelegramUser,
    isAuthenticated,
  } = useUser();

  const {
    securityState,
    showSecurityModal,
    securityModalType,
    captchaData,
    handleSecuritySuccess,
    handleSecurityFailure,
    isSecurityCheckNeeded,
    shouldBlockUI,
    formatTrustScore,
    manualTriggerSecurityCheck,
  } = useSecurity();

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
   * Tournament state
   * -------------------------------------------------*/
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [tournamentTimeRemaining, setTournamentTimeRemaining] = useState<string>("");
  const [showTournamentButton, setShowTournamentButton] = useState(false);
  const [tournamentLoading, setTournamentLoading] = useState(false);

  /* -------------------------------------------------
   * Security state
   * -------------------------------------------------*/
  const [securityWarningVisible, setSecurityWarningVisible] = useState(false);

  /* -------------------------------------------------
   * NEW: UI blocking logic based on security state
   * -------------------------------------------------*/
  const isUIBlocked = shouldBlockUI();
  const needsVerification = isSecurityCheckNeeded();

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

  // Check authentication status and redirect if needed
  useEffect(() => {
    if (!isAuthenticated && !userLoading) {
      console.log("User not authenticated, redirecting to login");
      router.push("/");
      return;
    }
  }, [isAuthenticated, userLoading, router]);

  // Check if user is blocked and redirect
  useEffect(() => {
    if (securityState.isBlocked) {
      console.log("User is blocked, redirecting to blocked page");
      router.push("/blocked");
    }
  }, [securityState.isBlocked, router]);

  // Show security warning for low trust scores but don't show exact score
  useEffect(() => {
    if (
      securityState.trustScore < 40 &&
      !securityState.isBlocked &&
      !securityState.isLoading
    ) {
      setSecurityWarningVisible(true);
    } else {
      setSecurityWarningVisible(false);
    }
  }, [
    securityState.trustScore,
    securityState.isBlocked,
    securityState.isLoading,
  ]);

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

  // Initialize telegramUser safely
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
   * Tournament data loading
   * -------------------------------------------------*/
  useEffect(() => {
    const loadTournamentStatus = async () => {
      if (!isAuthenticated) {
        console.log("User not authenticated, skipping tournament data load");
        return;
      }

      setTournamentLoading(true);

      try {
        console.log("Loading tournament status via secure API...");

        const tournamentStatus = await authService.getTournamentStatus();

        if (tournamentStatus.isActive && tournamentStatus.activeTournament) {
          setActiveTournament(tournamentStatus.activeTournament);
          setShowTournamentButton(true);

          if (tournamentStatus.timeRemaining) {
            setTournamentTimeRemaining(
              formatTimeRemaining(tournamentStatus.timeRemaining),
            );

            const interval = setInterval(() => {
              const now = new Date();
              const endDate = new Date(
                tournamentStatus.activeTournament!.end_date,
              );
              const diff = endDate.getTime() - now.getTime();

              if (diff <= 0) {
                setActiveTournament(null);
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
          setActiveTournament(null);
          setShowTournamentButton(false);
        }

        console.log("Tournament status loaded successfully via secure API");
      } catch (error) {
        console.error("Error loading tournament status via secure API:", error);

        if (
          error instanceof Error &&
          error.message.includes("Authentication expired")
        ) {
          console.log(
            "Token expired during tournament load, user will be signed out",
          );
        }

        setActiveTournament(null);
        setShowTournamentButton(false);
      } finally {
        setTournamentLoading(false);
      }
    };

    if (isAuthenticated) {
      loadTournamentStatus();
    }
  }, [isAuthenticated]);

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
   * Handlers - Updated with security checks
   * -------------------------------------------------*/
  const handleStartGame = async () => {
    // NEW: Check security before allowing any action
    if (isUIBlocked) {
      console.log("UI blocked due to security requirements");
      if (needsVerification) {
        await manualTriggerSecurityCheck();
      }
      return;
    }

    setIsTransitioning(true);
    setTimeout(() => {
      router.push("/game");
    }, 600);
  };

  const handleOpenTournament = async () => {
    // NEW: Check security before allowing any action
    if (isUIBlocked) {
      console.log("UI blocked due to security requirements");
      if (needsVerification) {
        await manualTriggerSecurityCheck();
      }
      return;
    }

    setIsTransitioning(true);
    setTimeout(() => {
      router.push("/tournament");
    }, 600);
  };

  const handleOpenSettings = () => {
    // Settings should always be accessible
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleOpenAbout = () => {
    // About should always be accessible
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

  // Get trust score display info
  const trustScoreInfo = formatTrustScore(securityState.trustScore);

  /* -------------------------------------------------
   * Early return if not authenticated
   * -------------------------------------------------*/
  if (!isAuthenticated && !userLoading) {
    return null; // Will redirect in useEffect
  }

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

      {/* Security Warning Banner */}
      {securityWarningVisible && (
        <div
          className="fixed top-0 left-0 right-0 z-40 p-4"
          style={{ top: headerOffset - 20 }}
        >
          <div className="max-w-md mx-auto bg-yellow-500/20 border border-yellow-400/40 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-yellow-300">
              <AlertTriangle size={16} />
              <span className="text-sm font-semibold">{t("security.securityNotice" as any)}</span>
            </div>
            <p className="text-yellow-200/80 text-xs mt-1">
              {t("security.lowTrustScore" as any)}
            </p>
          </div>
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

          {/* Tournament Button - Updated with security blocking */}
          {showTournamentButton && activeTournament && (
            <button
              aria-label="Active Tournament"
              className={`group relative px-4 py-2 backdrop-blur-sm border-2 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isUIBlocked
                  ? "bg-gray-500/20 border-gray-500/40 text-gray-400"
                  : "bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border-yellow-400/40 text-yellow-300 hover:border-yellow-400 hover:from-yellow-400/30 hover:to-orange-500/30"
                }`}
              disabled={isTransitioning || isUIBlocked || tournamentLoading}
              onClick={handleOpenTournament}
            >
              <div className="flex items-center space-x-2">
                {isUIBlocked ? (
                  <Lock size={16} className="text-gray-400" />
                ) : (
                  <Trophy
                    className="text-yellow-300 group-hover:scale-110 transition-transform duration-300"
                    size={16}
                  />
                )}
                <div className="text-xs">
                  <div className="font-bold">
                    {isUIBlocked ? "LOCKED" : "TOURNAMENT"}
                  </div>
                  {tournamentTimeRemaining && !isUIBlocked && (
                    <div className="text-yellow-400/80 flex items-center space-x-1">
                      <Clock size={10} />
                      <span>{tournamentTimeRemaining}</span>
                    </div>
                  )}
                </div>
              </div>
              {!isUIBlocked && (
                <>
                  <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/30 via-orange-500/20 to-yellow-400/30 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-1000" />
                  <div className="absolute inset-0 rounded-full bg-yellow-400/10 animate-pulse opacity-50" />
                </>
              )}
            </button>
          )}

          {/* Tournament Loading Indicator */}
          {tournamentLoading && (
            <div className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full">
              <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
              <span className="text-white/60 text-xs">Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="text-center z-20 space-y-8 flex flex-col items-center justify-center">
        {/* Title Section */}
        <div className="relative">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold font-bpdots tracking-widest text-white">
            circusle
          </h1>
        </div>

        {/* Action Button - Updated with security blocking */}
        <div
          className={`${isFirstVisit
              ? `transition-all duration-1000 transform ${showButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`
              : "opacity-100 translate-y-0"
            }`}
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

            <button
              className={`relative w-full max-w-sm mx-auto block px-12 py-6 bg-transparent border-2 text-white rounded-xl text-xl font-bold transition-all duration-500 hover:scale-105 active:scale-95 disabled:cursor-not-allowed group-hover:bg-white/5 ${isUIBlocked
                  ? "border-white/60 text-white opacity-75"
                  : "border-white/60 hover:border-white"
                } ${isTransitioning ? "opacity-50" : ""}`}
              disabled={isTransitioning}
              onClick={handleStartGame}
            >
              <div className="flex items-center justify-center space-x-4">
                {isUIBlocked ? (
                  <Lock
                    className="text-gray-400 group-hover:translate-x-1 transition-transform duration-300"
                    size={24}
                  />
                ) : needsVerification ? (
                  <Shield
                    className="text-yellow-300 group-hover:translate-x-1 transition-transform duration-300"
                    size={24}
                  />
                ) : (
                  <Play
                    className="text-white group-hover:translate-x-1 transition-transform duration-300"
                    size={24}
                  />
                )}
                <span className="tracking-wider">
                  {isTransitioning
                    ? t("main.loading")
                    : isUIBlocked
                      ? "LOCKED"
                      : t("main.startGame")}
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

      {/* Security Modal - NEW: Unified modal */}
      {showSecurityModal && securityModalType && (
        <UnifiedSecurityModal
          isOpen={showSecurityModal}
          type={securityModalType}
          onSuccess={handleSecuritySuccess}
          onFailure={handleSecurityFailure}
        />
      )}

      {/* Other Modals */}
      <Settings isOpen={isSettingsOpen} onClose={handleCloseSettings} />
      <AboutModal isOpen={isAboutOpen} onClose={handleCloseAbout} />
      <LeagueProgressModal
        isOpen={isLeagueProgressOpen}
        onClose={handleCloseLeagueProgress}
      />

      {/* Attempts Display */}
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
        <AttemptsDisplay />
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