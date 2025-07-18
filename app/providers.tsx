// src/app/providers.tsx  
// ИСПРАВЛЕНО: NavigationWrapper теперь внутри UserProvider

"use client";

import { NextUIProvider } from "@nextui-org/react";
import { useEffect } from "react";

import { UserProvider } from "@/hooks/useUser";
import { LocalizationProvider } from "@/contexts/LocalizationContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import NavigationWrapper from "@/components/Navigation/NavigationWrapper";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Telegram Web App with enhanced fullscreen settings
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

        // Enhanced fullscreen settings (Bot API 7.7+)
        if (tg.lockOrientation) {
          try {
            tg.lockOrientation();
            console.log("Orientation locked successfully");
          } catch (error) {
            console.warn("Orientation lock not supported:", error);
          }
        }

        // Disable vertical swipes to prevent pull-to-refresh and swipe-to-close
        if (tg.disableVerticalSwipes) {
          try {
            tg.disableVerticalSwipes();
            console.log("Vertical swipes disabled successfully");
          } catch (error) {
            console.warn("Vertical swipes control not supported:", error);
          }
        }

        // Enhanced viewport configuration
        if (tg.MainButton) {
          tg.MainButton.hide();
        }

        // Log current viewport dimensions for debugging
        console.log("Telegram WebApp viewport:", {
          viewportHeight: tg.viewportHeight,
          viewportStableHeight: tg.viewportStableHeight,
          isExpanded: tg.isExpanded,
          platform: tg.platform,
          version: tg.version,
        });

        // Listen for viewport changes
        tg.onEvent("viewportChanged", () => {
          console.log("Viewport changed:", {
            viewportHeight: tg.viewportHeight,
            viewportStableHeight: tg.viewportStableHeight,
            isExpanded: tg.isExpanded,
          });
        });
      } catch (error) {
        console.error("Error initializing Telegram WebApp:", error);
      }
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
      }
    };
  }, []);

  return (
    <NextUIProvider>
      <LocalizationProvider>
        <SettingsProvider>
          <UserProvider>
            {children}
            {/* ИСПРАВЛЕНО: NavigationWrapper теперь внутри UserProvider */}
            <NavigationWrapper />
          </UserProvider>
        </SettingsProvider>
      </LocalizationProvider>
    </NextUIProvider>
  );
}