// src/components/Navigation/NavigationWrapper.tsx - Optimized with CSS transitions

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import BottomNav from "./BottomNav";

const hiddenPaths = [
  "/",
  "/game/reaction",
  "/game/survival",
  "/game/physics",
  "/game",
  "/game/rotation",
  "/nebula",
  "/blocked",
  "/seasons",
  "/ton-shop",
];

export default function NavigationWrapper() {
  const pathname = usePathname();
  const [shouldShow, setShouldShow] = useState(false);
  const [rendered, setRendered] = useState(false);
  const prevPathRef = useRef<string | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentShouldShow = !hiddenPaths.includes(pathname);

  useEffect(() => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // First mount initialization
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;

      if (currentShouldShow) {
        setRendered(true);
        // Use setTimeout to ensure DOM is ready before showing
        setTimeout(() => setShouldShow(true), 16);
      }

      prevPathRef.current = pathname;

      return;
    }

    const prevShouldShow = !hiddenPaths.includes(prevPathRef.current || "");

    // Only animate if visibility state actually changes
    if (currentShouldShow !== prevShouldShow) {
      if (currentShouldShow) {
        // Show navigation
        setRendered(true);
        // Use setTimeout to ensure DOM element is rendered before applying show class
        setTimeout(() => setShouldShow(true), 16);
      } else {
        // Hide navigation
        setShouldShow(false);
        // Wait for CSS transition to complete before removing from DOM
        hideTimeoutRef.current = setTimeout(() => {
          setRendered(false);
        }, 300); // Match CSS transition duration
      }
    }

    prevPathRef.current = pathname;
  }, [pathname, currentShouldShow]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Don't render if component should not be visible
  if (!rendered) {
    return null;
  }

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-50 
        nav-smooth-transition
        ${shouldShow ? "nav-show" : "nav-hide"}
      `}
    >
      <BottomNav />
    </div>
  );
}
