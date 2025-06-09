// src/app/main/page.tsx

'use client'

import { useEffect, useState, useRef } from 'react'

export default function MainPage() {
    const [username, setUsername] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)
    const videoRef = useRef<HTMLVideoElement>(null)

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

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        // Start playing when metadata is loaded
        const handleLoadedMetadata = () => {
            video.play().catch(console.error)
        }

        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.load()

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        }
    }, [])

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden">
            {/* Video background */}
            <div className="fixed top-0 left-0 w-full h-full bg-red-500">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover min-w-full min-h-full"
                    playsInline
                    muted
                    loop
                    autoPlay
                >
                    <source src="/videos/mainbg.mp4" type="video/mp4" />
                </video>
            </div>

            <div className="text-center z-10">
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