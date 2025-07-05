// src/app/main/page.tsx - Обновленная главная страница с кнопкой информации о приложении

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

          // Initialize countdown timer - исправляем расчет времени
          const updateCountdown = () => {
            if (tournamentStatus.activeTournament) {
              const now = new Date();
              const endDate = new Date(tournamentStatus.activeTournament.end_date);
              const timeLeft = endDate.getTime() - now.getTime();

              if (timeLeft <= 0) {
                setTournamentTimeRemaining("Ended");
                setActiveTournament(null);
                setShowTournamentButton(false);
              } else {
                const remaining = formatTimeRemaining(timeLeft);
                setTournamentTimeRemaining(remaining);
              }
            }
          };

          updateCountdown();
          const interval = setInterval(updateCountdown, 1000);

          return () => clearInterval(interval);
        }
      } catch (error) {
        console.error("Error loading tournament status:", error);
      }
    };

    loadTournamentStatus();
  }, []);

  /* -------------------------------------------------
   * Page animations and loading
   * -------------------------------------------------*/
  useEffect(() => {
    if (!userLoading && user) {
      const timer = setTimeout(() => {
        setPageLoaded(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [userLoading, user]);

  useEffect(() => {
    if (!pageLoaded) return;

    const animateTitle = () => {
      const title = "SOMETHING";
      let currentIndex = 0;

      const typeText = () => {
        if (currentIndex <= title.length) {
          setTitleText(title.slice(0, currentIndex) + "|");
          currentIndex++;
          setTimeout(typeText, 150);
        } else {
          setTimeout(() => {
            setTitleText(title);
            setShowButton(true);
          }, 500);
        }
      };

      typeText();
    };

    animateTitle();
  }, [pageLoaded]);

  useEffect(() => {
    if (!showButton) return;

    const timer = setTimeout(() => {
      if (user?.first_name) {
        const greeting = t("main.greeting", { name: user.first_name });
        let currentIndex = 0;

        const typeGreeting = () => {
          if (currentIndex <= greeting.length) {
            setGreetingText(greeting.slice(0, currentIndex));
            currentIndex++;
            setTimeout(typeGreeting, 50);
          } else {
            setTimeout(() => {
              setShowTopButtons(true);
            }, 500);
          }
        };

        setShowGreeting(true);
        typeGreeting();
      } else {
        setTimeout(() => {
          setShowTopButtons(true);
        }, 500);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [showButton, user, t]);

  /* -------------------------------------------------
   * Event handlers
   * -------------------------------------------------*/
  const handleStartGame = () => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    router.push("/game");
  };

  const handleTournamentClick = () => {
    if (isTransitioning || !activeTournament) return;

    setIsTransitioning(true);
    router.push(`/tournament/${activeTournament.id}`);
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
  if (userLoading || !user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">{t("main.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.3),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(74,144,226,0.2),transparent_70%)]" />

      {/* Top Controls */}
      <div
        className="relative z-10 w-full flex justify-end items-center p-4 gap-3"
        style={{ marginTop: `${headerOffset}px` }}
      >
        {showTopButtons && (
          <div className="flex gap-3 animate-fade-in">
            <button
              onClick={handleOpenAbout}
              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-110"
              aria-label="About"
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={handleOpenSettings}
              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-110"
              aria-label="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-300 to-blue-400 bg-clip-text text-transparent mb-4">
            {titleText}
          </h1>

          {/* Greeting */}
          {showGreeting && (
            <div className="min-h-[2rem] flex items-center justify-center">
              <p className="text-lg text-white/80 animate-fade-in">
                {greetingText}
              </p>
            </div>
          )}
        </div>

        {/* Attempts Display */}
        {showButton && (
          <div className="mb-8 animate-slide-up">
            <AttemptsDisplay />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          {/* Main Game Button */}
          {showButton && (
            <button
              onClick={handleStartGame}
              disabled={isTransitioning}
              className="group relative w-full h-14 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-semibold text-white border border-white/20 overflow-hidden transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex items-center justify-center gap-3">
                <Play className="w-5 h-5" />
                <span>{t("main.startGame")}</span>
              </div>
            </button>
          )}

          {/* Tournament Button */}
          {showTournamentButton && activeTournament && (
            <button
              onClick={handleTournamentClick}
              disabled={isTransitioning}
              className="group relative w-full h-14 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-semibold text-white border border-white/20 overflow-hidden transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 animate-slide-up"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex items-center justify-center gap-3">
                <Trophy className="w-5 h-5" />
                <div className="text-center">
                  <div className="text-sm">{activeTournament.name}</div>
                  <div className="text-xs opacity-80 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {tournamentTimeRemaining}
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <Settings isOpen={isSettingsOpen} onClose={handleCloseSettings} />
      <AboutModal isOpen={isAboutOpen} onClose={handleCloseAbout} />
    </div>
  );
}