// src/app/providers.tsx - Updated providers with SettingsProvider

"use client";

import { NextUIProvider } from "@nextui-org/react";
import { useEffect } from "react";

import { UserProvider } from "@/hooks/useUser";
import { LocalizationProvider } from "@/contexts/LocalizationContext";
import { SettingsProvider } from "@/contexts/SettingsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Telegram Web App
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      tg.ready();
      tg.expand();
      tg.setHeaderColor("#000000");
      tg.setBackgroundColor("#000000");

      // Disable closing confirmation for better UX
      tg.disableClosingConfirmation();
    }
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
