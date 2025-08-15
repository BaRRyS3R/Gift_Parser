// src/app/providers.tsx - Updated with DevTools protection

"use client";

import { NextUIProvider } from "@nextui-org/react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { UserProvider } from "@/hooks/useUser";
import { LocalizationProvider } from "@/contexts/LocalizationContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import {
  isAccessAllowed,
  getAccessDenialReason,
} from "@/utils/deviceDetection";

// Import DevTools protection
import { devToolsProtection } from "@/utils/devToolsProtection";

interface AccessState {
  isAllowed: boolean | null;
  denialReason: string | null;
}

// Access control wrapper component
function AccessControlWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [accessState, setAccessState] = useState<AccessState>({
    isAllowed: null,
    denialReason: null,
  });

  useEffect(() => {
    // Skip access control entirely for the mobile-only page
    if (pathname === "/mobile-only") {
      return;
    }

    // Perform device verification only once on mount for non-mobile-only pages
    const verifyDevice = () => {
      try {
        const allowed = isAccessAllowed();

        setAccessState({
          isAllowed: allowed,
          denialReason: allowed ? null : getAccessDenialReason(),
        });

        // Redirect to mobile-only page if access is denied
        if (!allowed) {
          router.replace("/mobile-only");
        }
      } catch (error) {
        console.error("Device verification error:", error);
        router.replace("/mobile-only");
      }
    };

    verifyDevice();
  }, [pathname, router]);

  // Always allow mobile-only page to render without checks
  if (pathname === "/mobile-only") {
    return <>{children}</>;
  }

  // For other pages, allow access if verified
  if (accessState.isAllowed) {
    return <>{children}</>;
  }

  // Show nothing while verification/redirect is in progress
  return null;
}

// Conditional providers wrapper that excludes auth providers for mobile-only page
function ConditionalProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Initialize DevTools protection for all pages
  useEffect(() => {
    // Start DevTools protection
    devToolsProtection.start();
    
    // Cleanup on unmount
    return () => {
      devToolsProtection.stop();
    };
  }, []);

  // For mobile-only page, skip authentication and access control providers
  if (pathname === "/mobile-only") {
    return (
      <SettingsProvider>
        <LocalizationProvider>{children}</LocalizationProvider>
      </SettingsProvider>
    );
  }

  // For all other pages, include full provider stack
  return (
    <AccessControlWrapper>
      <SettingsProvider>
        <UserProvider>
          <LocalizationProvider>{children}</LocalizationProvider>
        </UserProvider>
      </SettingsProvider>
    </AccessControlWrapper>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Telegram Web App with enhanced fullscreen configuration
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

        // Modern fullscreen methods (Mini Apps 2.0)
        if (tg.requestFullscreen) {
          try {
            tg.requestFullscreen();
            console.log("Fullscreen mode requested");
          } catch (error) {
            console.warn("Fullscreen request failed:", error);
          }
        } else {
          console.warn(
            "requestFullscreen method not available in this Telegram version",
          );
        }

        // Orientation lock (Bot API 7.7+)
        if (tg.lockOrientation) {
          try {
            tg.lockOrientation();
            console.log("Orientation locked");
          } catch (error) {
            console.warn("Orientation lock not supported:", error);
          }
        }

        // Disable vertical swipes for better game control
        if (tg.disableVerticalSwipes) {
          try {
            tg.disableVerticalSwipes();
            console.log("Vertical swipes disabled");
          } catch (error) {
            console.warn("Vertical swipes control not supported:", error);
          }
        }

        // Set bottom bar color if supported
        if (tg.setBottomBarColor) {
          try {
            tg.setBottomBarColor("#000000");
          } catch (error) {
            console.warn("Bottom bar color setting failed:", error);
          }
        }

        // Hide main button as we don't use it
        if (tg.MainButton) {
          tg.MainButton.hide();
        }

        console.log("Telegram WebApp initialized:", {
          platform: tg.platform,
          version: tg.version,
          isExpanded: tg.isExpanded,
          viewportHeight: tg.viewportHeight,
          viewportStableHeight: tg.viewportStableHeight,
        });
      } catch (error) {
        console.error("Error initializing Telegram WebApp:", error);
      }
    } else {
      console.warn("Telegram WebApp not available");
    }

    // Enhanced viewport meta tag configuration for fullscreen experience
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

        // Exit fullscreen on cleanup if needed
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
      <ConditionalProviders>{children}</ConditionalProviders>
    </NextUIProvider>
  );
}