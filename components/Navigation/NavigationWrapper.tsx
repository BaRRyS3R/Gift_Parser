// src/components/Navigation/NavigationWrapper.tsx

'use client'

import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

export default function NavigationWrapper() {
    const pathname = usePathname()

    // Определяем страницы, где НЕ нужно показывать нижнее меню
    const hideNavOnPages = ['/', '/game']
    const shouldHideNav = hideNavOnPages.includes(pathname)

    console.log('NavigationWrapper - Current pathname:', pathname)
    console.log('NavigationWrapper - Should hide nav:', shouldHideNav)

    // Условное отображение навигационного меню
    if (shouldHideNav) {
        return null
    }

    return <BottomNav />
}