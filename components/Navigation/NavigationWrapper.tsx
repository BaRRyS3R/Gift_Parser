// src/components/Navigation/NavigationWrapper.tsx - Исправлено для стабильности на Android

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
  "/tournaments",
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

  // NEW: Enhanced viewport and layout stability for Android
  useEffect(() => {
    // Set stable viewport configuration for Android
    const setStableViewport = () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute(
          "content",
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content, shrink-to-fit=no"
        );
      }

      // NEW: Prevent Android navigation bar interference
      if (typeof window !== "undefined") {
        // Force consistent viewport height calculation
        const setViewportHeight = () => {
          const vh = window.innerHeight * 0.01;
          document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', () => {
          setTimeout(setViewportHeight, 100);
        });

        // NEW: Android-specific layout stability
        if (/Android/i.test(navigator.userAgent)) {
          // Prevent layout shifts by setting minimum height
          document.documentElement.style.minHeight = '100vh';
          document.documentElement.style.minHeight = '100dvh'; // Dynamic viewport height
          
          // Force repaint to stabilize layout
          document.body.style.transform = 'translateZ(0)';
          
          // Prevent overscroll behavior that can trigger system UI changes
          document.body.style.overscrollBehavior = 'none';
          document.documentElement.style.overscrollBehavior = 'none';
        }

        return () => {
          window.removeEventListener('resize', setViewportHeight);
          window.removeEventListener('orientationchange', setViewportHeight);
        };
      }
    };

    setStableViewport();
  }, []);

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
      style={{
        // NEW: Enhanced stability for Android devices
        contain: "layout style paint",
        willChange: shouldShow ? "transform, opacity" : "auto",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "translateZ(0)", // Force GPU acceleration
        WebkitTransform: "translateZ(0)",
        // NEW: Prevent interaction with system navigation
        touchAction: "manipulation",
        WebkitTouchCallout: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        // NEW: Stabilize position relative to viewport
        position: "fixed",
        bottom: "env(safe-area-inset-bottom, 0px)",
        minHeight: "env(safe-area-inset-bottom, 0px)",
        // NEW: Prevent overscroll that can trigger system UI changes
        overscrollBehavior: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <BottomNav />
    </div>
  );
}