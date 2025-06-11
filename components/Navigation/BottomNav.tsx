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
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.path)}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}