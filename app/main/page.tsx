// src/app/main/page.tsx

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function MainPage() {
    const router = useRouter()
    const [username, setUsername] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)
    const [isTransitioning, setIsTransitioning] = useState(false)
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

    const handleStartGame = () => {
        setIsTransitioning(true)

        // Wait for fade out animation to complete before navigation
        setTimeout(() => {
            router.push('/game')
        }, 500)
    }

    return (
        <div className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {/* Video background */}
            <div
                className="fixed top-0 left-0 w-full h-full"
                style={{
                    filter: 'brightness(0.4)'
                }}
            >
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

            <div className="text-center z-10 space-y-8">
                <h1 className="text-4xl font-bold mb-8 font-bpdots">
                    something
                </h1>

                {isLoading ? (
                    <p className="text-lg text-gray-400 font-bpdots">Loading user data...</p>
                ) : (
                    <div className="space-y-8">
                        <p className="text-xl text-gray-300 font-bpdots">
                            Welc0me, /•{username}•/
                        </p>

                        {/* Game Button */}
                        <div className="flex flex-col items-center space-y-4">
                            <button
                                onClick={handleStartGame}
                                disabled={isTransitioning}
                                className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bpdots text-lg hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Start Reaction Game
                            </button>

                            <p className="text-sm text-gray-500 font-bpdots max-w-xs">
                                Test your reflexes in our fast-paced reaction game
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}