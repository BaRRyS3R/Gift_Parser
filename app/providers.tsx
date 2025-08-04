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
            console.log("Requesting fullscreen mode...");
            tg.requestFullscreen();
            console.log("Fullscreen mode requested successfully");
            
            // Проверяем состояние fullscreen через небольшую задержку
            setTimeout(() => {
              if (tg.isFullscreen !== undefined) {
                console.log("Current fullscreen state:", tg.isFullscreen);
              }
            }, 100);
            
          } catch (error) {
            console.warn("Fullscreen request failed:", error);
          }
        } else {
          console.log("requestFullscreen method not available in this Telegram version");
        }

        // 🆕 БЛОКИРОВКА ОРИЕНТАЦИИ (Bot API 7.7+)
        if (tg.lockOrientation) {
          try {
            tg.lockOrientation();
            console.log("Orientation locked successfully");
          } catch (error) {
            console.warn("Orientation lock not supported:", error);
          }
        } else {
          console.log("lockOrientation method not available");
        }

        // 🆕 ОТКЛЮЧЕНИЕ ВЕРТИКАЛЬНЫХ СВАЙПОВ (Bot API 7.7+)
        if (tg.disableVerticalSwipes) {
          try {
            tg.disableVerticalSwipes();
            console.log("Vertical swipes disabled successfully");
          } catch (error) {
            console.warn("Vertical swipes control not supported:", error);
          }
        } else {
          console.log("disableVerticalSwipes method not available");
        }

        // 🆕 УСТАНОВКА ЦВЕТА BOTTOM BAR (Mini Apps 2.0)
        if (tg.setBottomBarColor) {
          try {
            tg.setBottomBarColor("#000000");
            console.log("Bottom bar color set successfully");
          } catch (error) {
            console.warn("Bottom bar color setting failed:", error);
          }
        }

        // Enhanced viewport configuration
        if (tg.MainButton) {
          tg.MainButton.hide();
        }

        // 🆕 ОБРАБОТЧИКИ НОВЫХ СОБЫТИЙ
        if (tg.onEvent) {
          // Событие изменения fullscreen режима
          tg.onEvent("fullscreenChanged", (data: any) => {
            console.log("Fullscreen state changed:", data);
            console.log("New fullscreen state:", tg.isFullscreen);
          });

          // Событие ошибки fullscreen
          tg.onEvent("fullscreenFailed", (error: any) => {
            console.error("Fullscreen operation failed:", error);
          });

          // События safe area (для правильного отображения контента)
          tg.onEvent("safeAreaChanged", (data: any) => {
            console.log("Safe area changed:", data);
            if (tg.safeAreaInset) {
              console.log("Current safe area inset:", tg.safeAreaInset);
            }
          });

          tg.onEvent("contentSafeAreaChanged", (data: any) => {
            console.log("Content safe area changed:", data);
            if (tg.contentSafeAreaInset) {
              console.log("Current content safe area inset:", tg.contentSafeAreaInset);
            }
          });

          // Событие активации/деактивации приложения
          tg.onEvent("activated", () => {
            console.log("Mini App activated");
          });

          tg.onEvent("deactivated", () => {
            console.log("Mini App deactivated");
          });

          // Событие изменения viewport (обновленное)
          tg.onEvent("viewportChanged", () => {
            console.log("Viewport changed:", {
              viewportHeight: tg.viewportHeight,
              viewportStableHeight: tg.viewportStableHeight,
              isExpanded: tg.isExpanded,
              isFullscreen: tg.isFullscreen,
              isActive: tg.isActive,
              safeAreaInset: tg.safeAreaInset,
              contentSafeAreaInset: tg.contentSafeAreaInset,
            });
          });

          // 🆕 Событие для Secondary Button (если есть)
          tg.onEvent("secondaryButtonClicked", () => {
            console.log("Secondary button clicked");
          });
        }

        // Log current viewport dimensions for debugging
        console.log("Telegram WebApp viewport (enhanced):", {
          viewportHeight: tg.viewportHeight,
          viewportStableHeight: tg.viewportStableHeight,
          isExpanded: tg.isExpanded,
          isFullscreen: tg.isFullscreen,
          isActive: tg.isActive,
          platform: tg.platform,
          version: tg.version,
          colorScheme: tg.colorScheme,
          safeAreaInset: tg.safeAreaInset,
          contentSafeAreaInset: tg.contentSafeAreaInset,
        });

      } catch (error) {
        console.error("Error initializing Telegram WebApp:", error);
      }
    } else {
      console.log("Telegram WebApp not available (not running in Telegram or outdated version)");
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
            console.log("Vertical swipes re-enabled");
          } catch (error) {
            console.warn("Could not re-enable vertical swipes:", error);
          }
        }

        // Unlock orientation on cleanup (if supported)
        if (tg.unlockOrientation) {
          try {
            tg.unlockOrientation();
            console.log("Orientation unlocked");
          } catch (error) {
            console.warn("Could not unlock orientation:", error);
          }
        }

        // 🆕 Опционально выходим из fullscreen при cleanup
        if (tg.exitFullscreen && tg.isFullscreen) {
          try {
            tg.exitFullscreen();
            console.log("Exited fullscreen mode");
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