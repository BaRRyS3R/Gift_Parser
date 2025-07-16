// src/components/Navigation/BottomNav.tsx - Updated with UI lock awareness

"use client";

import { usePathname, useRouter } from "next/navigation";
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
  const { isSilentCheck, isSecurityCheckNeeded } = useSecurity();

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
    // Block navigation during silent check or if security verification needed
    if (isSilentCheck || isSecurityCheckNeeded()) {
      console.log("Navigation blocked due to security check");
      return;
    }

    if (pathname !== path) {
      router.push(path);
    }
  };

  // Determine if UI should be locked
  const shouldLockUI = isSilentCheck || isSecurityCheckNeeded();

  return (
    <div className={`bg-black/50 backdrop-blur-sm border-t border-white/5 safe-area-inset-bottom ${shouldLockUI ? "opacity-50 pointer-events-none" : ""
      }`}>
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
                    : "text-white/60 hover:text-white/80 hover:scale-105"
                  }
                  ${shouldLockUI ? "cursor-not-allowed" : "cursor-pointer"}
                `}
                disabled={shouldLockUI}
                onClick={() => handleNavigation(item.path)}
              >
                {/* Background highlight for active state */}
                {active && (
                  <div className="absolute inset-0 bg-white/20 rounded-full transition-all duration-300" />
                )}

                {/* Background highlight on hover (only when not locked) */}
                {!shouldLockUI && (
                  <div className="absolute inset-0 bg-white/10 rounded-full opacity-0 hover:opacity-100 transition-all duration-300" />
                )}

                {/* Icon */}
                <div className="relative z-10">
                  <Icon
                    className={`
                      transition-all duration-300
                      ${active ? "stroke-2" : "stroke-1.5"}
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

      {/* UI Lock indicator */}
      {shouldLockUI && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-yellow-400/60" />
      )}
    </div>
  );
}