// src/app/providers.tsx

"use client";

import { NextUIProvider } from "@nextui-org/react";
import { useEffect, useState } from "react";

import { UserProvider } from "@/hooks/useUser";
import { I18nProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  const [telegramLanguageCode, setTelegramLanguageCode] = useState<
    string | undefined
  >();

  useEffect(() => {
    // Инициализация Telegram Web App
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      tg.ready();
      tg.expand();
      tg.setHeaderColor("#000000");
      tg.setBackgroundColor("#000000");

      // Отключение подтверждения закрытия для лучшего UX
      tg.disableClosingConfirmation();

      // Получаем язык из Telegram
      const user = tg.initDataUnsafe?.user;

      if (user?.language_code) {
        setTelegramLanguageCode(user.language_code);
      }
    }
  }, []);

  return (
    <NextUIProvider>
      <I18nProvider telegramLanguageCode={telegramLanguageCode}>
        <UserProvider>{children}</UserProvider>
      </I18nProvider>
    </NextUIProvider>
  );
}
