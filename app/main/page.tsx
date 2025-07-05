// src/app/main/page.tsx - Оригинальная главная страница с добавленной кнопкой информации

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, Settings as SettingsIcon, Trophy, Clock, Info } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import { useSettings } from "@/contexts/SettingsContext";
import { tournamentService } from "@/lib/supabase_tournament_extension";
import type { Tournament } from "@/types/tournaments";
import { formatTimeRemaining } from "@/types/tournaments";
import Settings from "@/components/Settings/Settings";
import AboutModal from "@/components/AboutModal/AboutModal";
import AttemptsDisplay from "@/components/AttemptsDisplay";

export default function MainPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { settings } = useSettings();
  const t = useT();

  /* -------------------------------------------------
   * UI state
   * -------------------------------------------------*/
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [titleText, setTitleText] = useState("|");
  const [showButton, setShowButton] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingText, setGreetingText] = useState("");
  const [showTopButtons, setShowTopButtons] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  /* -------------------------------------------------
   * Tournament state
   * -------------------------------------------------*/
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [tournamentTimeRemaining, setTournamentTimeRemaining] = useState<string>("");
  const [showTournamentButton, setShowTournamentButton] = useState(false);

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

  /* -------------------------------------------------
   * Tournament data loading
   * -------------------------------------------------*/
  useEffect(() => {
    const loadTournamentStatus = async () => {
      try {
        const tournamentStatus = await tournamentService.getTournamentStatus();

        if (tournamentStatus.isActive && tournamentStatus.activeTournament) {
          setActiveTournament(tournamentStatus.activeTournament);
          setShowTournamentButton(true);

          // Initialize countdown timer
          if (tournamentStatus.timeRemaining) {
            setTournamentTimeRemaining(formatTimeRemaining(tournamentStatus.timeRemaining));

            // Update countdown every second
            const interval = setInterval(() => {
              const now = new Date();
              const endDate = new Date(tournamentStatus.activeTournament!.end_date);
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
      } catch (error) {
        console.error("Error loading tournament status:", error);
        setActiveTournament(null);
        setShowTournamentButton(false);
      }
    };

    loadTournamentStatus();
  }, []);

  /* -------------------------------------------------
   * Refs & helpers
   * -------------------------------------------------*/
  const videoRef = useRef<HTMLVideoElement>(null);

  const animationSteps = [
    "|",
    "c|",
    "ci-",
    "cir|",
    "cir=/",
    "circ|",
    "circu|",
    "circus///",
    "circusl¿",
    "circusle?",
    "circusle",
  ];

  const username = user?.first_name || "unknown";
  const fullGreeting = t("main.greeting", { name: username });

  /* -------------------------------------------------
   * Background video logic
   * -------------------------------------------------*/
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
    }, 300);

    return () => clearTimeout(pageLoadTimer);
  }, []);

  // Title animation
  useEffect(() => {
    if (!pageLoaded) return;

    const titleAnimationTimer = setTimeout(() => {
      let currentStep = 0;

      const titleInterval = setInterval(() => {
        if (currentStep < animationSteps.length) {
          setTitleText(animationSteps[currentStep]);
          currentStep++;
        } else {
          clearInterval(titleInterval);
          setTimeout(() => setShowButton(true), 300);
          setTimeout(() => setShowGreeting(true), 600);
          setTimeout(() => setShowTopButtons(true), 900);
        }
      }, 80);

      return () => clearInterval(titleInterval);
    }, 800);

    return () => clearTimeout(titleAnimationTimer);
  }, [pageLoaded]);

  // Greeting typing animation
  useEffect(() => {
    if (!showGreeting || userLoading) return;

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
  }, [showGreeting, fullGreeting, userLoading]);

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

  /* -------------------------------------------------
   * Render
   * -------------------------------------------------*/
  return (
    <div
      className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden ${isTransitioning
          ? "opacity-0 transition-opacity duration-500 ease-in"
          : pageLoaded
            ? "opacity-100"
            : "opacity-0"
        }`}
    >
      {/* Background Video */}
      {settings.showBackgroundVideo && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm scale-110"
        >
          <source src="/videos/bg-video.mp4" type="video/mp4" />
        </video>
      )}

      {/* Gradient overlays for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black/60 to-blue-900/20" />
      <div className="absolute inset-0 bg-black/40" />

      {/* Top controls container */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex justify-between items-start p-4 transition-all duration-1000 transform ${showTopButtons ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
          }`}
        style={{ marginTop: `${headerOffset}px` }}
      >
        {/* Left side - placeholder for future controls */}
        <div className="flex space-x-2">
          {/* Could add more controls here in future */}
        </div>

        {/* Right side - Settings and About buttons */}
        <div className="flex space-x-2">
          {/* About Button */}
          <button
            aria-label="About"
            className="relative px-4 py-2 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-full hover:border-white/50 hover:bg-white/20 transition-all duration-300 hover:scale-110 active:scale-95"
            onClick={handleOpenAbout}
          >
            <Info
              className="text-white group-hover:scale-110 transition-transform duration-300"
              size={16}
            />
          </button>

          {/* Settings Button */}
          <button
            aria-label="Settings"
            className="relative px-4 py-2 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-full hover:border-white/50 hover:bg-white/20 transition-all duration-300 hover:scale-110 active:scale-95"
            onClick={handleOpenSettings}
          >
            <SettingsIcon
              className="text-white group-hover:scale-110 transition-transform duration-300"
              size={16}
            />
          </button>

          {/* Tournament Button - Right (перемещена с места магазина) */}
          {showTournamentButton && activeTournament && (
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

      {/* Main Content */}
      <div className="text-center z-20 space-y-8 flex flex-col items-center justify-center">
        {/* Title Section */}
        <div className="relative">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold font-bpdots tracking-widest text-white">
            {titleText}
          </h1>
        </div>

        {/* Action Button */}
        <div
          className={`transition-all duration-1000 transform ${showButton
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
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
          className={`transition-all duration-1000 transform ${showGreeting
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
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
              {greetingText.length < fullGreeting.length && (
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

      {/* Attempts Display - Bottom Above Navigation */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-1000 transform ${showTopButtons
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8"
          }`}
        style={{ paddingBottom: "96px" }} // Space for navigation menu
      >
        <AttemptsDisplay />
      </div>
    </div>
  );
}