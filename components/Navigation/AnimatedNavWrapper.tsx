"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import BottomNav from "./BottomNav";

const hiddenPaths = [
  "/",
  "/game",
  "/game/reaction",
  "/game/survival",
  "/game/physics",
  "/tournament",
  "/tournament/play",
  "/tournament/active",
  "/ton-shop",
];

export default function NavigationWrapper() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const prevPathRef = useRef<string | null>(null);
  const [animate, setAnimate] = useState(false);

  const shouldShowNav = !hiddenPaths.includes(pathname);

  useEffect(() => {
    const prevShouldShow = !hiddenPaths.includes(prevPathRef.current || "");

    if (prevShouldShow !== shouldShowNav) {
      setAnimate(true); // включаем анимацию только если меняется наличие меню
    } else {
      setAnimate(false); // без анимации, если не поменялось
    }

    setVisible(shouldShowNav);
    prevPathRef.current = pathname;
  }, [pathname, shouldShowNav]);

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500
        ${visible ? "translate-y-0" : "translate-y-full"}
        ${animate ? "" : "transition-none"}
      `}
    >
      <BottomNav />
    </div>
  );
}
