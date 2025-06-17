// src/components/Navigation/BottomNav.tsx

"use client";

import { usePathname, useRouter } from "next/navigation";
import { Gamepad2, Trophy, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const navItems = [
  {
    key: "home",
    path: "/main",
    icon: Gamepad2,
  },
  {
    key: "leaderboard",
    path: "/leaderboard",
    icon: Trophy,
  },
  {
    key: "profile",
    path: "/profile",
    icon: User,
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

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
      {/* Контейнер с правильной центровкой */}
      <div className="w-full max-w-lg mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-lg
                  transition-all duration-300 ease-out group min-w-0 flex-1
                  ${active
                    ? "text-white scale-110"
                    : "text-white/60 hover:text-white/80 hover:scale-105"
                  }
                `}
                onClick={() => handleNavigation(item.path)}
                aria-label={t(`navigation.${item.key}`)}
              >
                <div
                  className={`
                  relative transition-all duration-300
                  ${active ? "transform -translate-y-1" : "group-hover:transform group-hover:-translate-y-0.5"}
                `}
                >
                  <Icon
                    className={`
                      transition-all duration-300
                      ${active ? "stroke-2" : "stroke-1.5 group-hover:stroke-2"}
                    `}
                    size={24}
                  />
                </div>

                {/* Подсветка при наведении */}
                <div
                  className={`
                  absolute inset-0 rounded-lg transition-all duration-300
                  ${active
                      ? "bg-white/5"
                      : "bg-transparent group-hover:bg-white/5"
                    }
                `}
                />
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