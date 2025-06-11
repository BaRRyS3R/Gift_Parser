// src/app/main/page.tsx

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Zap, Trophy, Target, Activity, Clock, Users, Award } from 'lucide-react'
import { useUser } from '@/hooks/useUser'

export default function MainPage() {
  const router = useRouter()
  const { user, isLoading: userLoading } = useUser()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pageLoaded, setPageLoaded] = useState(false)
  const [titleText, setTitleText] = useState('|')
  const [showWelcome, setShowWelcome] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0)
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

  const gameFeatures = [
    { icon: Zap, title: 'FAST REFLEXES', desc: 'Test your reaction speed in milliseconds' },
    { icon: Target, title: 'PRECISION TRAINING', desc: 'Improve your accuracy with every click' },
    { icon: Trophy, title: 'GLOBAL COMPETITION', desc: 'Compete with players worldwide' },
    { icon: Activity, title: '5 DIFFICULTY MODES', desc: 'From beginner to legendary challenges' },
    { icon: Clock, title: '30 SECOND ROUNDS', desc: 'Quick intense gameplay sessions' },
    { icon: Users, title: 'LEADERBOARDS', desc: 'Track your progress and rankings' },
    { icon: Award, title: 'ACHIEVEMENTS', desc: 'Unlock rewards as you improve' }
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
    }, 500)

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

          setTimeout(() => setShowWelcome(true), 200)
          setTimeout(() => setShowButton(true), 400)
          setTimeout(() => setShowDescription(true), 600)
          setTimeout(() => setShowFeatures(true), 800)
        }
      }, 60)

      return () => clearInterval(titleInterval)
    }, 600)

    return () => clearTimeout(titleAnimationTimer)
  }, [pageLoaded])

  // Feature rotation effect
  useEffect(() => {
    if (!showFeatures) return

    const featureRotationTimer = setInterval(() => {
      setCurrentFeatureIndex((prevIndex) => (prevIndex + 1) % gameFeatures.length)
    }, 3000)

    return () => clearInterval(featureRotationTimer)
  }, [showFeatures, gameFeatures.length])

  const handleStartGame = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      router.push('/game')
    }, 800)
  }

  const username = user?.first_name || 'Player'

  return (
    <div className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden pb-20 ${isTransitioning
      ? 'opacity-0 transition-opacity duration-700 ease-in'
      : pageLoaded
        ? 'opacity-100 transition-opacity duration-1000 ease-out'
        : 'opacity-0 transition-opacity duration-1000 ease-out'
      }`}>

      {/* Фоновое видео */}
      <div
        className="fixed top-0 left-0 w-full h-full z-0"
        style={{
          filter: 'brightness(0.2) contrast(1.1) grayscale(0.9)'
        }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover min-w-full min-h-full"
          playsInline
          muted
          loop
          autoPlay
          aria-label="Фоновое декоративное видео главной страницы"
        >
          <source src="/videos/mainbg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 z-10"></div>

      <div className="text-center z-20 space-y-8 max-w-lg mx-auto px-4">
        {/* Анимированный заголовок */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold font-bpdots tracking-wider min-h-[60px] flex items-center justify-center text-white">
            {titleText}
          </h1>
        </div>

        {/* Приветственное сообщение */}
        <div className={`transition-all duration-1000 transform ${showWelcome ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
          }`}>
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all duration-500 hover:scale-105 hover:border-white/20">
            {userLoading ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="text-lg text-white/80 font-bpdots">Loading...</span>
              </div>
            ) : (
              <p className="text-xl text-white font-bpdots">
                Welcome back, <span className="font-bold text-white">{username}</span>
              </p>
            )}
          </div>
        </div>

        {/* Кнопка START GAME */}
        <div className={`transition-all duration-1000 transform ${showButton ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
          }`}>
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-white/20 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <button
              onClick={handleStartGame}
              disabled={isTransitioning}
              className="relative w-full px-8 py-4 bg-white/10 backdrop-blur-2xl border-2 border-white/20 text-white rounded-2xl font-bpdots text-xl font-bold hover:bg-white/15 transition-all duration-500 hover:scale-105 active:scale-95 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed group-hover:shadow-lg group-hover:shadow-white/10"
            >
              <div className="flex items-center justify-center space-x-3">
                <Play size={24} className="text-white fill-current" />
                <span>{isTransitioning ? 'LOADING...' : 'START GAME'}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Описание игры */}
        <div className={`transition-all duration-1000 transform ${showDescription ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
          }`}>
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all duration-500 hover:scale-105 hover:border-white/20">
            <h3 className="text-lg font-bpdots text-white font-bold mb-3">REACTION SPEED TEST</h3>
            <p className="text-white/80 font-bpdots text-sm leading-relaxed">
              Challenge your reflexes in an intense circle-clicking game. React quickly to glowing targets,
              improve your accuracy, and climb the global leaderboard in this neural speed training experience.
            </p>
          </div>
        </div>

        {/* Фишки игры с анимацией смены */}
        <div className={`transition-all duration-1000 transform ${showFeatures ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
          }`}>
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all duration-500 hover:scale-105 hover:border-white/20">
            <div className="flex items-center justify-center space-x-4 min-h-[80px]">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center transition-all duration-500">
                {React.createElement(gameFeatures[currentFeatureIndex].icon, {
                  size: 24,
                  className: "text-white transition-all duration-500"
                })}
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-bpdots text-white font-bold mb-1 transition-all duration-500">
                  {gameFeatures[currentFeatureIndex].title}
                </h4>
                <p className="text-white/70 font-bpdots text-xs leading-relaxed transition-all duration-500">
                  {gameFeatures[currentFeatureIndex].desc}
                </p>
              </div>
            </div>

            {/* Индикаторы текущей фишки */}
            <div className="flex justify-center space-x-1 mt-4">
              {gameFeatures.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${index === currentFeatureIndex ? 'bg-white' : 'bg-white/30'
                    }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Декоративные элементы */}
      <div className="absolute top-8 left-8 w-8 h-8 border-l border-t border-white/20 rounded-tl-lg z-20"></div>
      <div className="absolute top-8 right-8 w-8 h-8 border-r border-t border-white/20 rounded-tr-lg z-20"></div>
      <div className="absolute bottom-24 left-8 w-8 h-8 border-l border-b border-white/20 rounded-bl-lg z-20"></div>
      <div className="absolute bottom-24 right-8 w-8 h-8 border-r border-b border-white/20 rounded-br-lg z-20"></div>
    </div>
  )
}