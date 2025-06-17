// src/app/main/page.tsx - Updated with settings and repositioned shop button

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, ShoppingCart, Settings as SettingsIcon } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import { useSettings } from "@/contexts/SettingsContext";
import Settings from "@/components/Settings/Settings";

export default function MainPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { settings } = useSettings();
  const t = useT();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [titleText, setTitleText] = useState("|");
  const [showButton, setShowButton] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingText, setGreetingText] = useState("");
  const [showTopButtons, setShowTopButtons] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const animationSteps = [
    "|",
    "s|",
    "so-",
    "som|",
    "some=/",
    "somet|",
    "someth|",
    "somethi///",
    "somethin¿",
    "something?",
    "something",
  ];

  const username = user?.first_name || "unknown";
  const fullGreeting = t('main.greeting', { name: username });

  // Initialize video
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

  // Page load animation
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

  // Greeting animation
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

  const handleStartGame = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      router.push("/game");
    }, 600);
  };

  const handleOpenShop = () => {
    router.push("/shop");
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

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

      {/* Geometric Background Elements */}
      <div className="absolute inset-0 z-10">
        <div className="absolute top-20 left-20 w-1 h-32 bg-white/10 rotate-45" />
        <div className="absolute top-40 right-32 w-1 h-24 bg-white/5 -rotate-12" />
        <div className="absolute bottom-32 left-16 w-1 h-40 bg-white/8 rotate-12" />
        <div className="absolute bottom-20 right-20 w-1 h-28 bg-white/6 -rotate-45" />

        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rotate-45" />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/30" />
        <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-white/15 rotate-45" />
      </div>

      {/* Top Navigation Icons */}
      <div
        className={`fixed top-26 left-0 right-0 z-30 px-6 transition-all duration-1000 transform ${showTopButtons ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
          }`}
      >
        <div className="flex items-center justify-between">
          {/* Settings Button - Left */}
          <button
            onClick={handleOpenSettings}
            disabled={isTransitioning}
            className="group relative w-12 h-12 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-full hover:border-white hover:bg-white/20 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('common.settings')}
          >
            <div className="flex items-center justify-center">
              <SettingsIcon
                className="text-white group-hover:rotate-90 transition-transform duration-300"
                size={20}
              />
            </div>

            {/* Button glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-1000" />
          </button>

          {/* Shop Button - Right */}
          <button
            onClick={handleOpenShop}
            disabled={isTransitioning}
            className="group relative w-12 h-12 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 backdrop-blur-sm border-2 border-yellow-400/40 text-yellow-300 rounded-full hover:border-yellow-400 hover:from-yellow-400/30 hover:to-orange-500/30 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('nav.shop')}
          >
            <div className="flex items-center justify-center">
              <ShoppingCart
                className="text-yellow-300 group-hover:scale-110 transition-transform duration-300"
                size={20}
              />
            </div>

            {/* Enhanced glow effect for shop */}
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/30 via-orange-500/20 to-yellow-400/30 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-1000" />

            {/* Subtle pulsing effect */}
            <div className="absolute inset-0 rounded-full bg-yellow-400/10 animate-pulse opacity-50" />
          </button>
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
          className={`transition-all duration-1000 transform ${showButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
        >
          <div className="relative group">
            {/* Button Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

            {/* Main Button */}
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
                  {isTransitioning ? t('main.loading') : t('main.startGame')}
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
      <Settings
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
      />
    </div>
  );
}