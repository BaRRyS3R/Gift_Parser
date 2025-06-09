// src/app/providers.tsx

'use client'

import { NextUIProvider } from '@nextui-org/react'
import { useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Initialize Telegram Web App
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp
            tg.ready()
            tg.expand()
            tg.setHeaderColor('#000000')
            tg.setBackgroundColor('#000000')
        }
    }, [])

    return (
        <NextUIProvider>
            {children}
        </NextUIProvider>
    )
}