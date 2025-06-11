// src/components/Navigation/BottomNav.tsx

'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, Trophy, User } from 'lucide-react'

const navItems = [
  {
    name: 'Home',
    path: '/main',
    icon: Home
  },
  {
    name: 'Leaderboard',
    path: '/leaderboard',
    icon: Trophy
  },
  {
    name: 'Profile',
    path: '/profile',
    icon: User
  }
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (path: string) => {
    if (path === '/main') {
      return pathname === '/' || pathname === '/main'
    }
    return pathname === path
  }

  const handleNavigation = (path: string) => {
    if (pathname !== path) {
      router.push(path)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm border-t border-white/5">
      {/* Контейнер с правильной центровкой */}
      <div className="w-full max-w-lg mx-auto px-4">
        <div className="flex items-center justify-around h-20">
          {navItems.map((item) => {
            const active = isActive(item.path)
            const Icon = item.icon

            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.path)}
                className={`
                  flex flex-col items-center justify-center space-y-1 p-2 rounded-lg
                  transition-all duration-300 ease-out group min-w-0 flex-1
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
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full animate-pulse" />
                  )}
                </div>

                <span className={`
                  text-xs font-bpdots font-medium transition-all duration-300 truncate
                  ${active
                    ? 'text-white'
                    : 'text-white/60 group-hover:text-white/80'
                  }
                `}>
                  {item.name}
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
      </div>

      {/* Декоративная линия */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-white/10 rounded-full" />
    </div>
  )
}