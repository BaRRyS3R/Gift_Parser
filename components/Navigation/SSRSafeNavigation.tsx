// src/components/Navigation/SSRSafeNavigation.tsx - Безопасная для SSR навигация

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    Gamepad2,
    Trophy,
    User,
    ShoppingCart,
    CheckSquare,
} from "lucide-react";

// Статические лейблы для навигации без зависимости от контекста
const navigationLabels = {
    en: {
        profile: "Profile",
        leaderboard: "Leaderboard",
        home: "Home",
        shop: "Shop",
        tasks: "Tasks",
    },
    ru: {
        profile: "Профиль",
        leaderboard: "Рейтинг",
        home: "Главная",
        shop: "Магазин",
        tasks: "Задания",
    }
};

interface NavigationItem {
    name: string;
    path: string;
    icon: any;
}

export default function SSRSafeNavigation() {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ru'>('en');

    // Список путей, где навигация должна быть скрыта
    const hiddenPaths = [
        "/",
        "/game/reaction",
        "/game/survival",
        "/game/physics",
        "/game",
        "/tournament/play",
        "/tournament",
        "/game/rotation",
        "/404",
        "/_not-found",
        "/not-found"
    ];

    const shouldShowNav = !hiddenPaths.includes(pathname);

    // Определение языка после монтирования компонента
    useEffect(() => {
        setMounted(true);

        // Безопасное определение языка
        const detectLanguage = () => {
            try {
                // Попытка получить сохраненный язык
                const savedLanguage = localStorage.getItem('user_language_preference');
                if (savedLanguage === 'ru' || savedLanguage === 'en') {
                    return savedLanguage;
                }

                // Попытка определить язык из Telegram
                if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                    const telegramLang = window.Telegram.WebApp.initDataUnsafe?.user?.language_code;
                    return telegramLang === 'ru' ? 'ru' : 'en';
                }

                return 'en';
            } catch (error) {
                console.warn('Language detection failed, using English');
                return 'en';
            }
        };

        setCurrentLanguage(detectLanguage());
    }, []);

    const labels = navigationLabels[currentLanguage];

    const navItems: NavigationItem[] = [
        {
            name: labels.profile,
            path: "/profile",
            icon: User,
        },
        {
            name: labels.leaderboard,
            path: "/leaderboard",
            icon: Trophy,
        },
        {
            name: labels.home,
            path: "/main",
            icon: Gamepad2,
        },
        {
            name: labels.shop,
            path: "/shop",
            icon: ShoppingCart,
        },
        {
            name: labels.tasks,
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
        if (pathname !== path) {
            router.push(path);
        }
    };

    // Не отображать во время SSR
    if (!mounted) {
        return null;
    }

    // Не отображать на скрытых страницах
    if (!shouldShowNav) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500">
            <div className="bg-black/50 backdrop-blur-sm border-t border-white/5 safe-area-inset-bottom">
                <div className="w-full px-4">
                    <div className="flex items-center justify-between h-14">
                        {navItems.map((item) => {
                            const active = isActive(item.path);
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.path}
                                    aria-label={item.name}
                                    className={`
                    relative flex items-center justify-center
                    w-12 h-12 rounded-full transition-all duration-300 ease-out
                    ${active
                                            ? "text-white scale-110"
                                            : "text-white/60 hover:text-white/80 hover:scale-105"
                                        }
                  `}
                                    onClick={() => handleNavigation(item.path)}
                                >
                                    {/* Фоновая подсветка для активного состояния */}
                                    {active && (
                                        <div className="absolute inset-0 bg-white/20 rounded-full transition-all duration-300" />
                                    )}

                                    {/* Фоновая подсветка при наведении */}
                                    <div className="absolute inset-0 bg-white/10 rounded-full opacity-0 hover:opacity-100 transition-all duration-300" />

                                    {/* Иконка */}
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

                {/* Декоративная линия сверху */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10" />
            </div>
        </div>
    );
}