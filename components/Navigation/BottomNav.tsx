// src/components/Navigation/BottomNav.tsx - Fixed security verification blocking

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Gamepad2,
  Trophy,
  User,
  ShoppingCart,
  CheckSquare,
} from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";
import { useSecurity } from "@/hooks/useSecurity";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const { isSecurityCheckNeeded, isSecurityInitialized } = useSecurity();

  // SECURITY FIX: Block immediately if security check needed or not initialized
  const isBlocked = isSecurityCheckNeeded() || !isSecurityInitialized();

  const navItems = [
    {
      name: t("nav.profile"),
      path: "/profile",
      icon: User,
    },
    {
      name: t("nav.leaderboard"),
      path: "/leaderboard",
      icon: Trophy,
    },
    {
      name: t("nav.home"),
      path: "/main",
      icon: Gamepad2,
    },
    {
      name: t("nav.shop"),
      path: "/shop",
      icon: ShoppingCart,
    },
    {
      name: t("nav.tasks"),
      path: "/tasks",
      icon: CheckSquare,
    },
  ];

  const isActive = (path: string) => {
    if (path === "/main") {
      return pathname === "/" || pathname === "/main";
    }
    return pathname === path;
  };

  const handleNavigation = (path: string) => {
    // Block navigation if security verification is needed
    if (isBlocked) {
      console.log("Navigation blocked due to pending security verification");
      return;
    }

    if (pathname !== path) {
      router.push(path);
    }
  };

  return (
    <div className="bg-black/50 backdrop-blur-sm border-t border-white/5 safe-area-inset-bottom">
      <div className="w-full px-4">
        <div className="flex items-center justify-between h-14">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                aria-label={item.name}
                className={`
                  relative flex items-center justify-center
                  w-12 h-12 rounded-full transition-all duration-300 ease-out
                  ${active
                    ? "text-white scale-110"
                    : isBlocked
                      ? "text-white/30 cursor-not-allowed"
                      : "text-white/60 hover:text-white/80 hover:scale-105"
                  }
                `}
                disabled={isBlocked}
                onClick={() => handleNavigation(item.path)}
              >
                {/* Background highlight for active state */}
                {active && !isBlocked && (
                  <div className="absolute inset-0 bg-white/20 rounded-full transition-all duration-300" />
                )}

                {/* Background highlight on hover - disabled when blocked */}
                {!isBlocked && (
                  <div className="absolute inset-0 bg-white/10 rounded-full opacity-0 hover:opacity-100 transition-all duration-300" />
                )}

                {/* Security overlay when blocked */}
                {isBlocked && (
                  <div className="absolute inset-0 bg-red-500/10 rounded-full" />
                )}

                {/* Icon */}
                <div className="relative z-10">
                  <Icon
                    className={`
                      transition-all duration-300
                      ${active ? "stroke-2" : "stroke-1.5"}
                      ${isBlocked ? "opacity-50" : ""}
                    `}
                    size={active ? 24 : 22}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full-width decorative line at the top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10" />

      {/* Security warning overlay */}
      {isBlocked && (
        <div className="absolute inset-0 bg-red-500/5 border-t border-red-500/20">
          <div className="flex items-center justify-center h-full">
            <p className="text-red-300 text-xs font-medium">
              {!isSecurityInitialized ? "Initializing security..." : "Security verification required"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}