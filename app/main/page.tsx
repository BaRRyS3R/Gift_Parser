// src/app/main/page.tsx

'use client'

import { useEffect, useState } from 'react'
import PixelBackground from '../../components/PixelBackground'

export default function MainPage() {
    const [username, setUsername] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Get Telegram user data
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp
            const user = tg.initDataUnsafe?.user

            if (user) {
                // Use username if available, otherwise use first name
                setUsername(user.username || user.first_name || 'User')
            } else {
                // Fallback for development environment
                setUsername('Guest')
            }

            setIsLoading(false)
        }
    }, [])

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
            <PixelBackground />
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-8 font-bpdots">
                    something
                </h1>

                {isLoading ? (
                    <p className="text-lg text-gray-400 font-bpdots">Loading user data...</p>
                ) : (
                    <p className="text-xl text-gray-300 font-bpdots">
                        Welc0me, /•{username}•/
                    </p>
                )}
            </div>
        </div>
    )
}