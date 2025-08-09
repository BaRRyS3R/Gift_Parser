// src/app/providers.tsx - Enhanced with comprehensive device detection

"use client";

import { NextUIProvider } from "@nextui-org/react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { UserProvider } from "@/hooks/useUser";
import { LocalizationProvider } from "@/contexts/LocalizationContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { isAccessAllowed, getDeviceInfo, getAccessDenialReason } from "@/utils/deviceDetection";

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
    denialReason: null
  });

  useEffect(() => {
    // Skip access control for the mobile-only page itself
    if (pathname === '/mobile-only') {
      setAccessState({
        isAllowed: true,
        denialReason: null
      });
      return;
    }

    // Perform device verification immediately (no visual loading needed)
    const verifyDevice = () => {
      try {
        const allowed = isAccessAllowed();
        const reason = allowed ? null : getAccessDenialReason();

        setAccessState({
          isAllowed: allowed,
          denialReason: reason
        });

        // Redirect to mobile-only page if access is denied
        if (!allowed) {
          router.replace('/mobile-only');
        }
      } catch (error) {
        console.error('Device verification error:', error);
        setAccessState({
          isAllowed: false,
          denialReason: 'verification_error'
        });
        router.replace('/mobile-only');
      }
    };

    verifyDevice();
  }, [pathname, router]);

  // Allow access if verified or on the mobile-only page
  if (accessState.isAllowed || pathname === '/mobile-only') {
    return <>{children}</>;
  }

  // If access is denied, component will be redirected via router.replace
  // Allow content to render normally while redirect is processing
  return <>{children}</>;
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
          console.warn("requestFullscreen method not available in this Telegram version");
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

        // Log device and platform information for debugging
        console.log("Telegram WebApp initialized:", {
          platform: tg.platform,
          version: tg.version,
          isExpanded: tg.isExpanded,
          viewportHeight: tg.viewportHeight,
          viewportStableHeight: tg.viewportStableHeight
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
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content"
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
      <AccessControlWrapper>
        <SettingsProvider>
          <UserProvider>
            <LocalizationProvider>{children}</LocalizationProvider>
          </UserProvider>
        </SettingsProvider>
      </AccessControlWrapper>
    </NextUIProvider>
  );
}