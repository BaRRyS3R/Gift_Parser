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
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Check if font is loaded
        if ('fonts' in document) {
            document.fonts.load('1rem "BPDots Diamond"').then(() => {
                setFontLoaded(true)
            }).catch(() => {
                setFontLoaded(true)
            })
        } else {
            setTimeout(() => setFontLoaded(true), 1000)
        }
    }, [])

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        // Handle video metadata loaded
        const handleLoadedMetadata = () => {
            video.volume = 1
            // Try to play with sound
            const playPromise = video.play()
            
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    console.error('Initial play error:', err)
                    // If autoplay fails, try to play muted first
                    video.muted = true
                    video.play().then(() => {
                        // Once playing, unmute
                        video.muted = false
                    }).catch((err) => {
                        console.error('Muted play error:', err)
                        setError('Failed to play video. Please try again.')
                    })
                })
            }
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
        }

        // Handle video end
        const handleEnded = () => {
            router.push('/main')
        }

        // Handle video errors
        const handleError = (e: Event) => {
            console.error('Video error:', e)
            setError('Failed to load video. Please try again.')
        }

        // Add event listeners
        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('progress', handleProgress)
        video.addEventListener('canplaythrough', handleCanPlayThrough)
        video.addEventListener('ended', handleEnded)
        video.addEventListener('error', handleError)

        // Force load the video
        video.load()

        // Cleanup
        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('progress', handleProgress)
            video.removeEventListener('canplaythrough', handleCanPlayThrough)
            video.removeEventListener('ended', handleEnded)
            video.removeEventListener('error', handleError)
        }
    }, [router])

    const handleRetry = async () => {
        const video = videoRef.current
        if (!video) return

        try {
            video.currentTime = 0
            await video.play()
            setError(null)
        } catch (err) {
            console.error('Video play error:', err)
            setError('Failed to play video. Please try again.')
        }
    }

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            {/* Loading overlay */}
            {(isLoading || !fontLoaded) && (
                <div className="loader-container">
                    <div className="progress-bar">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${loadProgress}%` }}
                        />
                    </div>
                    <p className="text-white mt-4 text-sm font-bpdots">Loading... {Math.round(loadProgress)}%</p>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="loader-container">
                    <p className="text-white text-center font-bpdots">{error}</p>
                    <button 
                        onClick={handleRetry}
                        className="mt-4 px-4 py-2 bg-white text-black rounded font-bpdots"
                    >
                        Retry
                    </button>
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
                    autoPlay
                >
                    <source src="/videos/intro.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>
    )
}