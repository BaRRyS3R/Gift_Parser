// src/components/Navigation/BottomNav.tsx

'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Home, User, Trophy, Gamepad2, LucideIcon } from 'lucide-react'

interface NavItem {
    id: string
    label: string
    icon: LucideIcon
    path: string
}

const navItems: NavItem[] = [
    {
        id: 'home',
        label: 'HOME',
        icon: Home,
        path: '/main'
    },
    {
        id: 'game',
        label: 'GAME',
        icon: Gamepad2,
        path: '/game'
    },
    {
        id: 'leaderboard',
        label: 'TOP',
        icon: Trophy,
        path: '/leaderboard'
    },
    {
        id: 'profile',
        label: 'PROFILE',
        icon: User,
        path: '/profile'
    }
]

export default function BottomNav() {
    const router = useRouter()
    const pathname = usePathname()

    const handleNavigation = (path: string) => {
        if (pathname !== path) {
            router.push(path)
        }
    }

    const isActive = (path: string) => {
        if (path === '/main') {
            return pathname === '/' || pathname === '/main'
        }
        return pathname === path || pathname.startsWith(path + '/')
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-t border-white/10">
            <div className="flex items-center justify-around h-20 px-4 max-w-md mx-auto">
                {navItems.map((item) => {
                    const active = isActive(item.path)
                    const Icon = item.icon

                    return (
                        <button
                            key={item.id}
                            onClick={() => handleNavigation(item.path)}
                            className={`
                flex flex-col items-center justify-center space-y-1 p-2 rounded-lg
                transition-all duration-300 ease-out group
                ${active
                                    ? 'text-white scale-110'
                                    : 'text-white/60 hover:text-white/80 hover:scale-105'
                                }
              `}
                        >
                            <div className={`
                relative transition-all duration-300
                ${active ? 'transform -translate-y-1' : 'group-hover:transform group-hover:-translate-y-0.5'}
              `}>
                                <Icon
                                    size={20}
                                    className={`
                    transition-all duration-300
                    ${active ? 'stroke-2' : 'stroke-1.5 group-hover:stroke-2'}
                  `}
                                />

                                {/* Активный индикатор */}
                                {active && (
                                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full animate-pulse" />
                                )}
                            </div>

                            <span className={`
                text-xs font-bpdots font-medium transition-all duration-300
                ${active
                                    ? 'text-white'
                                    : 'text-white/60 group-hover:text-white/80'
                                }
              `}>
                                {item.label}
                            </span>

                            {/* Подсветка при наведении */}
                            <div className={`
                absolute inset-0 rounded-lg transition-all duration-300
                ${active
                                    ? 'bg-white/5'
                                    : 'bg-transparent group-hover:bg-white/5'
                                }
              `} />
                        </button>
                    )
                })}
            </div>

            {/* Декоративная линия */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-white/20 rounded-full" />
        </div>
    )
}