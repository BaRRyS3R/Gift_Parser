// src/app/main/page.tsx

'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { useUser } from '@/hooks/useUser'

export default function MainPage() {
  const router = useRouter()
  const { user, isLoading: userLoading } = useUser()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pageLoaded, setPageLoaded] = useState(false)
  const [titleText, setTitleText] = useState('|')
  const [showContent, setShowContent] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const animationSteps = [
    '|',
    's|',
    'so-',
    'som|',
    'some=/',
    'somet|',
    'someth|',
    'somethi///',
    'somethin¿',
    'something?',
    'something'
  ]

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      video.play().catch(console.error)
    }

    const handleCanPlay = () => {
      video.play().catch(console.error)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('canplay', handleCanPlay)
    video.load()

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('canplay', handleCanPlay)
    }
  }, [])

  useEffect(() => {
    const pageLoadTimer = setTimeout(() => {
      setPageLoaded(true)
    }, 300)

    return () => clearTimeout(pageLoadTimer)
  }, [])

  useEffect(() => {
    if (!pageLoaded) return

    const titleAnimationTimer = setTimeout(() => {
      let currentStep = 0

      const titleInterval = setInterval(() => {
        if (currentStep < animationSteps.length) {
          setTitleText(animationSteps[currentStep])
          currentStep++
        } else {
          clearInterval(titleInterval)
          setTimeout(() => setShowContent(true), 400)
        }
      }, 80)

      return () => clearInterval(titleInterval)
    }, 800)

    return () => clearTimeout(titleAnimationTimer)
  }, [pageLoaded])

  const handleStartGame = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      router.push('/game')
    }, 600)
  }

  const username = user?.first_name || 'unknown'

  return (
    <div className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden ${isTransitioning
        ? 'opacity-0 transition-opacity duration-500 ease-in'
        : pageLoaded
          ? 'opacity-100 transition-opacity duration-1000 ease-out'
          : 'opacity-0'
      }`}>

      {/* Background Video */}
      <div
        className="fixed top-0 left-0 w-full h-full z-0"
        style={{
          filter: 'brightness(0.15) contrast(1.2) grayscale(1)'
        }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          loop
          autoPlay
        >
          <source src="/videos/mainbg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Geometric Background Elements */}
      <div className="absolute inset-0 z-10">
        <div className="absolute top-20 left-20 w-1 h-32 bg-white/10 rotate-45"></div>
        <div className="absolute top-40 right-32 w-1 h-24 bg-white/5 -rotate-12"></div>
        <div className="absolute bottom-32 left-16 w-1 h-40 bg-white/8 rotate-12"></div>
        <div className="absolute bottom-20 right-20 w-1 h-28 bg-white/6 -rotate-45"></div>

        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rotate-45"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/30"></div>
        <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-white/15 rotate-45"></div>
      </div>

      {/* Main Content */}
      <div className="text-center z-20 space-y-12 max-w-2xl mx-auto px-8">

        {/* Title Section */}
        <div className="space-y-8">
          <div className="relative">
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold font-bpdots tracking-widest text-white min-h-[120px] flex items-center justify-center">
              {titleText}
            </h1>

            {/* Decorative lines around title */}
            <div className="absolute left-0 top-1/2 w-16 h-px bg-gradient-to-r from-transparent to-white/40 transform -translate-y-1/2 -translate-x-20"></div>
            <div className="absolute right-0 top-1/2 w-16 h-px bg-gradient-to-l from-transparent to-white/40 transform -translate-y-1/2 translate-x-20"></div>
          </div>

          {/* User Greeting */}
          <div className={`transition-all duration-1000 transform ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-white/5 blur-xl"></div>
              <div className="relative backdrop-blur-sm border border-white/20 rounded-lg px-6 py-3">
                {userLoading ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                ) : (
                  <p className="text-sm font-bpdots text-white/80 uppercase tracking-wider">
                    Hello, <span className="text-white font-bold">{username}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className={`transition-all duration-1000 transform ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ transitionDelay: showContent ? '0.3s' : '0s' }}>
          <div className="relative group">

            {/* Button Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

            {/* Main Button */}
            <button
              onClick={handleStartGame}
              disabled={isTransitioning}
              className="relative w-full max-w-sm mx-auto block px-12 py-6 bg-transparent border-2 border-white/60 text-white rounded-xl font-bpdots text-xl font-bold hover:border-white transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-white/5"
            >
              <div className="flex items-center justify-center space-x-4">
                <Play size={24} className="text-white group-hover:translate-x-1 transition-transform duration-300" />
                <span className="tracking-wider">
                  {isTransitioning ? 'LOADING...' : 'START GAME'}
                </span>
              </div>

              {/* Button accent lines */}
              <div className="absolute top-0 left-8 w-8 h-px bg-white/40 transform -translate-y-2"></div>
              <div className="absolute bottom-0 right-8 w-8 h-px bg-white/40 transform translate-y-2"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Corner Frame Elements */}
      <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-white/20 z-20"></div>
      <div className="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-white/20 z-20"></div>
      <div className="absolute bottom-24 left-8 w-12 h-12 border-l-2 border-b-2 border-white/20 z-20"></div>
      <div className="absolute bottom-24 right-8 w-12 h-12 border-r-2 border-b-2 border-white/20 z-20"></div>

      {/* Subtle animated elements */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-white/5 rounded-full animate-pulse z-10" style={{ animationDuration: '4s' }}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-white/3 rounded-full animate-pulse z-10" style={{ animationDuration: '6s', animationDelay: '1s' }}></div>
    </div>
  )
}