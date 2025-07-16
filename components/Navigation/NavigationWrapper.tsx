// src/components/Navigation/NavigationWrapper.tsx - Updated with security integration

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { useSecurity } from "@/hooks/useSecurity";
import BottomNav from "./BottomNav";

const hiddenPaths = [
  "/",
  "/game/reaction",
  "/game/survival",
  "/game/physics",
  "/game",
  "/tournament/play",
  "/tournament",
  "/game/rotation",
  "/blocked",
];

export default function NavigationWrapper() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [animationClass, setAnimationClass] = useState("");
  const prevPathRef = useRef<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Security integration
  const { shouldBlockUI, manualTriggerSecurityCheck } = useSecurity();

  const shouldShowNav = !hiddenPaths.includes(pathname);
  const isNavBlocked = shouldBlockUI();

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
      // Show navigation
      setRendered(true);
      requestAnimationFrame(() => {
        setAnimationClass("animate-fade-in-up");
        setVisible(true);
      });
    } else if (!shouldShowNav && prevShouldShow) {
      // Hide navigation
      setAnimationClass("animate-fade-out-down");
      setVisible(false);

      // Wait for animation to complete
      setTimeout(() => {
        setRendered(false);
      }, 400);
    }

    // Update route reference
    prevPathRef.current = pathname;
  }, [pathname, shouldShowNav, isInitialized]);

  // Handle blocked navigation click
  const handleBlockedInteraction = async () => {
    if (isNavBlocked) {
      console.log("Navigation blocked due to security requirements");
      await manualTriggerSecurityCheck();
    }
  };

  if (!rendered) return null;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-50 
        transition-transform duration-500
        ${animationClass}
        ${isNavBlocked ? 'pointer-events-none' : ''}
      `}
    >
      {/* Security overlay when navigation is blocked */}
      {isNavBlocked && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 rounded-t-lg cursor-pointer"
          onClick={handleBlockedInteraction}
        >
          <div className="flex items-center justify-center h-full">
            <div className="text-white/80 text-center">
              <div className="w-6 h-6 mx-auto mb-1 border-2 border-white/60 rounded border-dashed animate-pulse"></div>
              <p className="text-xs font-medium">Tap to continue</p>
            </div>
          </div>
        </div>
      )}

      <BottomNav isBlocked={isNavBlocked} onBlockedClick={handleBlockedInteraction} />
    </div>
  );
}