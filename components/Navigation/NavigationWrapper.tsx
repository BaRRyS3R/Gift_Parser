// src/components/Navigation/NavigationWrapper.tsx - Fixed to properly handle page refresh

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";

const hiddenPaths = [
  "/", "/game/reaction", "/game/survival", "/game/physics", "/tournament/play", "/tournament", "/game/rotation"
];

export default function NavigationWrapper() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [animationClass, setAnimationClass] = useState("");
  const prevPathRef = useRef<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const shouldShowNav = !hiddenPaths.includes(pathname);

  // Initialize navigation visibility on mount
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);

      if (shouldShowNav) {
        setRendered(true);
        setVisible(true);
        setAnimationClass("animate-fade-in-up");
      }

      prevPathRef.current = pathname;
      return;
    }

    // Handle subsequent route changes
    const prevShouldShow = !hiddenPaths.includes(prevPathRef.current || "");

    if (shouldShowNav && !prevShouldShow) {
      // Появление
      setRendered(true);
      requestAnimationFrame(() => {
        setAnimationClass("animate-fade-in-up");
        setVisible(true);
      });
    } else if (!shouldShowNav && prevShouldShow) {
      // Исчезновение
      setAnimationClass("animate-fade-out-down");
      setVisible(false);

      // Подождать, пока анимация завершится
      setTimeout(() => {
        setRendered(false);
      }, 400);
    }

    // Обновление маршрута
    prevPathRef.current = pathname;
  }, [pathname, shouldShowNav, isInitialized]);

  if (!rendered) return null;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-50 
        transition-transform duration-500
        ${animationClass}
      `}
    >
      <BottomNav />
    </div>
  );
}