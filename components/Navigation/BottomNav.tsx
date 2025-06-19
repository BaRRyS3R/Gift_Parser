// src/components/Navigation/BottomNav.tsx - Исправленная навигация без перекрытий

"use client";

import { usePathname, useRouter } from "next/navigation";
import { Gamepad2, Trophy, User } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  const navItems = [
    {
      name: t("nav.home"),
      path: "/main",
      icon: Gamepad2,
    },
    {
      name: t("nav.leaderboard"),
      path: "/leaderboard",
      icon: Trophy,
    },
    {
      name: t("nav.profile"),
      path: "/profile",
      icon: User,
    },
  ];

  const isActive = (path: string) => {
    if (path === "/main") {
      return pathname === "/" || pathname === "/main";
    }

    return pathname === path;
  };

  const handleNavigation = (path: string) => {
    if (pathname !== path) {
      router.push(path);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm border-t border-white/5 safe-area-inset-bottom">
      <div className="w-full max-w-lg mx-auto px-4">
        <div className="flex items-center justify-center h-16 gap-8">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                aria-label={item.name}
                className={`
                  relative flex flex-col items-center justify-center
                  w-12 h-12 rounded-lg transition-all duration-300 ease-out
                  ${active
                    ? "text-white"
                    : "text-white/60 hover:text-white/80"
                  }
                `}
                onClick={() => handleNavigation(item.path)}
              >
                {/* Фоновая подсветка для активного состояния */}
                {active && (
                  <div className="absolute inset-0 bg-white/10 rounded-lg transition-all duration-300" />
                )}

                {/* Фоновая подсветка при наведении */}
                <div className="absolute inset-0 bg-white/5 rounded-lg opacity-0 hover:opacity-100 transition-all duration-300" />

                {/* Иконка */}
                <div className={`
                  relative z-10 transition-all duration-300
                  ${active ? "transform -translate-y-0.5" : ""}
                `}>
                  <Icon
                    className={`
                      transition-all duration-300
                      ${active ? "stroke-2" : "stroke-1.5"}
                    `}
                    size={20}
                  />
                </div>

                {/* Индикатор активного состояния */}
                {active && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Декоративная линия */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-white/10 rounded-full" />
    </div>
  );
}