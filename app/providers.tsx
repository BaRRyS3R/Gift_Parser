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
  isChecking: boolean;
  isAllowed: boolean | null;
  denialReason: string | null;
}

// Loading component for device verification
function DeviceVerificationLoader() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-white text-sm">Verifying device compatibility...</p>
      </div>
    </div>
  );
}

// Access control wrapper component
function AccessControlWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [accessState, setAccessState] = useState<AccessState>({
    isChecking: true,
    isAllowed: null,
    denialReason: null
  });

  useEffect(() => {
    // Skip access control for the mobile-only page itself
    if (pathname === '/mobile-only') {
      setAccessState({
        isChecking: false,
        isAllowed: true,
        denialReason: null
      });
      return;
    }

    // Perform device verification with a slight delay to ensure DOM is ready
    const verifyDevice = async () => {
      try {
        // Minimal delay for Telegram WebApp initialization (reduced due to simplified detection)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const allowed = isAccessAllowed();
        const reason = allowed ? null : getAccessDenialReason();
        
        setAccessState({
          isChecking: false,
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
          isChecking: false,
          isAllowed: false,
          denialReason: 'verification_error'
        });
        router.replace('/mobile-only');
      }
    };

    verifyDevice();
  }, [pathname, router]);

  // Show loader while checking device
  if (accessState.isChecking) {
    return <DeviceVerificationLoader />;
  }

  // Allow access if verified or on the mobile-only page
  if (accessState.isAllowed || pathname === '/mobile-only') {
    return <>{children}</>;
  }

  // This should not normally be reached due to router.replace above,
  // but provides a fallback
  return <DeviceVerificationLoader />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [telegramInitialized, setTelegramInitialized] = useState(false);

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

        setTelegramInitialized(true);
      } catch (error) {
        console.error("Error initializing Telegram WebApp:", error);
        setTelegramInitialized(true); // Continue even if initialization fails
      }
    } else {
      console.warn("Telegram WebApp not available");
      setTelegramInitialized(true);
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

  // Show loader until Telegram is initialized
  if (!telegramInitialized) {
    return (
      <NextUIProvider>
        <DeviceVerificationLoader />
      </NextUIProvider>
    );
  }

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