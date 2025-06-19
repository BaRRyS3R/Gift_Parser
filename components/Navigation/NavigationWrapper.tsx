// src/components/Navigation/NavigationWrapper.tsx - Updated with attempts display above navigation

"use client";

import { usePathname } from "next/navigation";

import BottomNav from "./BottomNav";
import AttemptsDisplay from "@/components/AttemptsDisplay";

export default function NavigationWrapper() {
  const pathname = usePathname();

  // Определяем страницы, где НЕ нужно показывать нижнее меню
  const hideNavOnPages = [
    "/", // Intro page
    "/game", // Old game page (redirect)
    "/game/reaction", // Reaction game mode
    "/game/survival", // Survival game mode
    "/shop", // Shop page
    "/tournament", // Tournament page
    "/tournament/play", // Tournament game page
  ];

  const shouldHideNav = hideNavOnPages.includes(pathname);

  console.log("NavigationWrapper - Current pathname:", pathname);
  console.log("NavigationWrapper - Should hide nav:", shouldHideNav);

  // Условное отображение навигационного меню и счетчика попыток
  if (shouldHideNav) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Attempts Display - Above Navigation */}
      <AttemptsDisplay />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}