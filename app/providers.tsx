// src/app/providers.tsx - Simplified (Telegram init moved to layout)

"use client";

import { NextUIProvider } from "@nextui-org/react";

import { UserProvider } from "@/hooks/useUser";

export function Providers({ children }: { children: React.ReactNode }) {
  // Telegram WebApp инициализация теперь в layout.tsx
  // Здесь оставляем только провайдеры React

  return (
    <NextUIProvider>
      <UserProvider>{children}</UserProvider>
    </NextUIProvider>
  );
}