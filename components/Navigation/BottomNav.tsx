// src/components/Navigation/BottomNav.tsx - Updated with security blocking support

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

interface BottomNavProps {
  isBlocked?: boolean;
  onBlockedClick?: () => void;
}

export default function BottomNav({ isBlocked = false, onBlockedClick }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

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
    if (isBlocked) {
      onBlockedClick?.();
      return;
    }

    if (pathname !== path) {
      router.push(path);
    }
  };

  return (
    <div className={`bg-black/50 backdrop-blur-sm border-t border-white/5 safe-area-inset-bottom relative ${isBlocked ? 'opacity-60' : ''}`}>
      <div className="w-full px-4">
        <div className="flex items-center justify-between h-14">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                aria-label={item.name}
                disabled={isBlocked}
                className={`
                  relative flex items-center justify-center
                  w-12 h-12 rounded-full transition-all duration-300 ease-out
                  ${isBlocked ? 'cursor-default' : 'cursor-pointer'}
                  ${active
                    ? "text-white scale-110"
                    : isBlocked
                      ? "text-white/40"
                      : "text-white/60 hover:text-white/80 hover:scale-105"
                  }
                `}
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

                {/* Icon */}
                <div className="relative z-10">
                  <Icon
                    className={`
                      transition-all duration-300
                      ${active ? "stroke-2" : "stroke-1.5"}
                      ${isBlocked ? 'opacity-60' : ''}
                    `}
                    size={active ? 24 : 22}
                  />
                </div>

                {/* Blocked indicator - subtle animation */}
                {isBlocked && (
                  <div className="absolute inset-0 border border-white/20 rounded-full opacity-30 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Full-width decorative line at the top */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${isBlocked ? 'bg-white/5' : 'bg-white/10'} transition-colors duration-300`} />

      {/* Optional blocked state indicator line */}
      {isBlocked && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-yellow-400/30 animate-pulse" />
      )}
    </div>
  );
}