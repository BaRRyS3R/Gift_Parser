"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";

const hiddenPaths = [
  "/", "/game", "/game/reaction", "/game/survival", "/game/physics",
  "/tournament", "/tournament/play", "/tournament/active"
];

export default function NavigationWrapper() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false); // для размонтирования после fade-out
  const [animationClass, setAnimationClass] = useState("");
  const prevPathRef = useRef<string | null>(null);

  const shouldShowNav = !hiddenPaths.includes(pathname);

  useEffect(() => {
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
  }, [pathname, shouldShowNav]);

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
