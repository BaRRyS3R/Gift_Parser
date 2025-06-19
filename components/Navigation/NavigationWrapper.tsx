// src/components/Navigation/NavigationWrapper.tsx - Updated for tasks page

"use client";

import { usePathname } from "next/navigation";

import BottomNav from "./BottomNav";

export default function NavigationWrapper() {
  const pathname = usePathname();

  // Определяем страницы, где НЕ нужно показывать нижнее меню
  const hideNavOnPages = [
    "/", // Intro page
    "/game", // Old game page (redirect)
    "/game/reaction", // Reaction game mode
    "/game/survival", // Survival game mode
    "/tournament/play", // Tournament game page
    "/tournament", // Tournament page
  ];

  const shouldHideNav = hideNavOnPages.includes(pathname);

  console.log("NavigationWrapper - Current pathname:", pathname);
  console.log("NavigationWrapper - Should hide nav:", shouldHideNav);

  // Условное отображение навигационного меню
  if (shouldHideNav) {
    return null;
  }

  return <BottomNav />;
}