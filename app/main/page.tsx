// src/app/main/page.tsx

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Zap, Trophy, Target, Activity } from 'lucide-react'

export default function MainPage() {
  const router = useRouter()
  const [username, setUsername] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pageLoaded, setPageLoaded] = useState(false)
  const [titleText, setTitleText] = useState('|')
  const [showWelcome, setShowWelcome] = useState(false)
  const [showGameButton, setShowGameButton] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const targetText = 'something'
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
    // Получение данных пользователя Telegram
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      const user = tg.initDataUnsafe?.user

      if (user) {
        setUsername(user.username || user.first_name || 'User')
      } else {
        setUsername('Guest')
      }

      setIsLoading(false)
    }
  }, [])

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
    // Запуск анимации загрузки страницы
    const pageLoadTimer = setTimeout(() => {
      setPageLoaded(true)
    }, 500)

    return () => clearTimeout(pageLoadTimer)
  }, [])

  useEffect(() => {
    if (!pageLoaded) return

    // Анимация заголовка после загрузки страницы
    const titleAnimationTimer = setTimeout(() => {
      let currentStep = 0

      const titleInterval = setInterval(() => {
        if (currentStep < animationSteps.length) {
          setTitleText(animationSteps[currentStep])
          currentStep++
        } else {
          clearInterval(titleInterval)

          // Показ приветственного сообщения
          setTimeout(() => {
            setShowWelcome(true)
          }, 200)

          // Показ статистики
          setTimeout(() => {
            setShowStats(true)
          }, 400)

          // Показ кнопки игры
          setTimeout(() => {
            setShowGameButton(true)
          }, 600)
        }
      }, 60)

      return () => clearInterval(titleInterval)
    }, 600)

    return () => clearTimeout(titleAnimationTimer)
  }, [pageLoaded])

  const handleStartGame = () => {
    setIsTransitioning(true)

    setTimeout(() => {
      router.push('/game')
    }, 800)
  }

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
          filter: 'brightness(0.25) contrast(1.1) grayscale(0.8)'
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
          aria-label="Фоновое декоративное видео главной страницы"
        >
          <source src="/videos/mainbg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 z-10"></div>

      <div className="text-center z-20 space-y-6 max-w-2xl mx-auto px-4">
        {/* Анимированный заголовок */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold font-bpdots tracking-wider min-h-[50px] flex items-center justify-center text-white">
            {titleText}
          </h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
            <p className="text-lg text-white/80 font-bpdots">Loading user data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Приветственное сообщение */}
            <div className={`transition-all duration-700 transform ${showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                <p className="text-xl text-white font-bpdots">
                  Welcome, <span className="font-bold">/•{username}•/</span>
                </p>
                <p className="text-white/70 font-bpdots text-sm mt-2">
                  Ready to test your reflexes?
                </p>
              </div>
            </div>

            {/* Statistics Preview */}
            <div className={`transition-all duration-700 transform ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-3">
                  <div className="flex items-center justify-center mb-2">
                    <Zap size={16} className="text-white/80" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold font-bpdots text-white">FAST</div>
                    <div className="text-xs font-bpdots text-white/60">REFLEXES</div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-3">
                  <div className="flex items-center justify-center mb-2">
                    <Target size={16} className="text-white/80" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold font-bpdots text-white">PRECISE</div>
                    <div className="text-xs font-bpdots text-white/60">ACCURACY</div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-3">
                  <div className="flex items-center justify-center mb-2">
                    <Trophy size={16} className="text-white/80" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold font-bpdots text-white">COMPETE</div>
                    <div className="text-xs font-bpdots text-white/60">GLOBALLY</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Секция с кнопкой игры */}
            <div className={`transition-all duration-700 transform ${showGameButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 max-w-sm">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Activity size={20} className="text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bpdots text-white font-bold">
                        REACTION GAME
                      </h3>
                      <p className="text-white/60 font-bpdots text-xs">
                        Neural speed test
                      </p>
                    </div>
                  </div>
                  <p className="text-white/80 font-bpdots text-sm text-center">
                    Test your reflexes in our fast-paced circle-clicking challenge.
                  </p>
                </div>

                <button
                  onClick={handleStartGame}
                  disabled={isTransitioning}
                  className="px-8 py-3 bg-white/20 backdrop-blur-xl border-2 border-white/40 text-white rounded-xl font-bpdots text-lg font-bold hover:bg-white/30 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-3">
                    <Play size={20} className="text-white fill-current" />
                    <span>{isTransitioning ? 'LOADING...' : 'START GAME'}</span>
                  </div>
                </button>

                {/* Additional game features */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                  <div className="text-center p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg">
                    <div className="text-lg font-bold font-bpdots text-white">5</div>
                    <div className="text-xs font-bpdots text-white/60">MODES</div>
                  </div>
                  <div className="text-center p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg">
                    <div className="text-lg font-bold font-bpdots text-white">30s</div>
                    <div className="text-xs font-bpdots text-white/60">ROUNDS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}