// src/app/providers.tsx - Обновленный с методами fullscreen, но без нового SDK

"use client";

import { NextUIProvider } from "@nextui-org/react";
import { useEffect } from "react";

import { UserProvider } from "@/hooks/useUser";
import { LocalizationProvider } from "@/contexts/LocalizationContext";
import { SettingsProvider } from "@/contexts/SettingsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Telegram Web App с новыми методами fullscreen
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      try {
        // Core initialization
        tg.ready();

        // Enhanced fullscreen configuration
        tg.expand();
        tg.setHeaderColor("#000000");
        tg.setBackgroundColor("#000000");

        // Disable closing confirmation for better UX
        tg.disableClosingConfirmation();

        // 🆕 НОВЫЕ МЕТОДЫ FULLSCREEN (Mini Apps 2.0)
        if (tg.requestFullscreen) {
          try {
            tg.requestFullscreen();
            
          } catch (error) {
            console.warn("Fullscreen request failed:", error);
          }
        } else {
          console.warn("requestFullscreen method not available in this Telegram version");
        }

        // 🆕 БЛОКИРОВКА ОРИЕНТАЦИИ (Bot API 7.7+)
        if (tg.lockOrientation) {
          try {
            tg.lockOrientation();
          } catch (error) {
            console.warn("Orientation lock not supported:", error);
          }
        } 

        if (tg.disableVerticalSwipes) {
          try {
            tg.disableVerticalSwipes();
          } catch (error) {
            console.warn("Vertical swipes control not supported:", error);
          }
        } 

        if (tg.setBottomBarColor) {
          try {
            tg.setBottomBarColor("#000000");
          } catch (error) {
            console.warn("Bottom bar color setting failed:", error);
          }
        }

        // Enhanced viewport configuration
        if (tg.MainButton) {
          tg.MainButton.hide();
        }
      } catch (error) {
        console.error("Error initializing Telegram WebApp:", error);
      }
    } else {
      console.warn("Telegram WebApp not available (not running in Telegram or outdated version)");
    }

    // Enhanced viewport meta tag configuration for fullscreen
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute(
        "content",
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content",
      );
    }

    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    const preventZoom = (e: TouchEvent) => {
      const now = new Date().getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener("touchend", preventZoom, { passive: false });

    // Cleanup function
    return () => {
      document.removeEventListener("touchend", preventZoom);

      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;

        // Re-enable vertical swipes on cleanup (if supported)
        if (tg.enableVerticalSwipes) {
          try {
            tg.enableVerticalSwipes();
          } catch (error) {
            console.warn("Could not re-enable vertical swipes:", error);
          }
        }

        // Unlock orientation on cleanup (if supported)
        if (tg.unlockOrientation) {
          try {
            tg.unlockOrientation();
          } catch (error) {
            console.warn("Could not unlock orientation:", error);
          }
        }

        // 🆕 Опционально выходим из fullscreen при cleanup
        if (tg.exitFullscreen && tg.isFullscreen) {
          try {
            tg.exitFullscreen();
          } catch (error) {
            console.warn("Could not exit fullscreen:", error);
          }
        }
      }
    };
  }, []);

  return (
    <NextUIProvider>
      <SettingsProvider>
        <UserProvider>
          <LocalizationProvider>{children}</LocalizationProvider>
        </UserProvider>
      </SettingsProvider>
    </NextUIProvider>
  );
}