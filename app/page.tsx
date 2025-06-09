// src/app/page.tsx

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@nextui-org/react'

export default function IntroPage() {
    const router = useRouter()
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadProgress, setLoadProgress] = useState(0)
    const [fontLoaded, setFontLoaded] = useState(false)

    useEffect(() => {
        // Check if font is loaded
        if ('fonts' in document) {
            document.fonts.load('1rem "BPDots Diamond"').then(() => {
                setFontLoaded(true)
            }).catch(() => {
                // Fallback if font loading fails
                setFontLoaded(true)
            })
        } else {
            // Fallback for browsers that don't support Font Loading API
            setTimeout(() => setFontLoaded(true), 1000)
        }
    }, [])

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        // Handle video metadata loaded
        const handleLoadedMetadata = () => {
            // Start playing when metadata is loaded
            video.play().catch(console.error)
        }

        // Handle video progress loading
        const handleProgress = () => {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1)
                const duration = video.duration
                if (duration > 0) {
                    const progress = (bufferedEnd / duration) * 100
                    setLoadProgress(progress)
                }
            }
        }

        // Handle when video can play through
        const handleCanPlayThrough = () => {
            setIsLoading(false)
            video.play().catch(console.error)
        }

        // Handle video end
        const handleEnded = () => {
            // Navigate to main page when video ends
            router.push('/main')
        }

        // Add event listeners
        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('progress', handleProgress)
        video.addEventListener('canplaythrough', handleCanPlayThrough)
        video.addEventListener('ended', handleEnded)

        // Force load the video
        video.load()

        // Cleanup
        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('progress', handleProgress)
            video.removeEventListener('canplaythrough', handleCanPlayThrough)
            video.removeEventListener('ended', handleEnded)
        }
    }, [router])

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            {/* Loading overlay */}
            {(isLoading || !fontLoaded) && (
                <div className="loader-container">
                    <Spinner
                        size="lg"
                        color="white"
                        classNames={{
                            circle1: "border-b-white",
                            circle2: "border-b-white/30"
                        }}
                    />
                    <div className="progress-bar">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${loadProgress}%` }}
                        />
                    </div>
                    <p className="text-white mt-4 text-sm">Loading... {Math.round(loadProgress)}%</p>
                </div>
            )}

            {/* Video container */}
            <div className="video-container">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                    ref={videoRef}
                    className="video-player"
                    playsInline
                    preload="auto"
                >
                    <source src="/videos/intro.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>
    )
}