// src/components/Navigation/NavigationWrapper.tsx - Updated with accessibility fixes

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

  // Handle blocked navigation interaction with keyboard support
  const handleBlockedInteraction = async () => {
    if (isNavBlocked) {
      console.log("Navigation blocked due to security requirements");
      await manualTriggerSecurityCheck();
    }
  };

  // Handle keyboard events for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleBlockedInteraction();
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
        <button
          type="button"
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 rounded-t-lg cursor-pointer border-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-inset"
          onClick={handleBlockedInteraction}
          onKeyDown={handleKeyDown}
          aria-label="Security verification required - tap to continue"
          aria-describedby="security-overlay-description"
        >
          <div className="flex items-center justify-center h-full">
            <div className="text-white/80 text-center">
              <p id="security-overlay-description" className="text-xs font-medium">
                Locked
              </p>
            </div>
          </div>
        </button>
      )}

      <BottomNav isBlocked={isNavBlocked} onBlockedClick={handleBlockedInteraction} />
    </div>
  );
}