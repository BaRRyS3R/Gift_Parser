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
          }, 300)

          // Показ статистики
          setTimeout(() => {
            setShowStats(true)
          }, 600)

          // Показ кнопки игры
          setTimeout(() => {
            setShowGameButton(true)
          }, 900)
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
    }, 800)
  }

  return (
    <div className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden pb-24 ${isTransitioning
      ? 'opacity-0 transition-opacity duration-700 ease-in'
      : pageLoaded
        ? 'opacity-100 transition-opacity duration-1000 ease-out'
        : 'opacity-0 transition-opacity duration-1000 ease-out'
      }`}>

      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-green-500/10 z-10"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 z-20"></div>

      {/* Фоновое видео */}
      <div
        className="fixed top-0 left-0 w-full h-full z-0"
        style={{
          filter: 'brightness(0.3) saturate(1.2)'
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

      {/* Floating Particles Effect */}
      <div className="absolute inset-0 z-10">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400/30 rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-green-400/40 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-purple-400/30 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-yellow-400/40 rounded-full animate-ping" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="text-center z-20 space-y-12 max-w-4xl mx-auto px-6">
        {/* Анимированный заголовок */}
        <div className="mb-16">
          <div className="relative">
            <h1 className="text-5xl sm:text-7xl font-bold font-bpdots tracking-wider min-h-[80px] flex items-center justify-center bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent">
              {titleText}
            </h1>
            {titleText === 'something' && (
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-green-400/20 rounded-2xl blur-xl animate-pulse"></div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-blue-400 rounded-full animate-spin mx-auto" style={{ animationDelay: '0.1s' }}></div>
            </div>
            <p className="text-xl text-white/80 font-bpdots">Loading user data...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Приветственное сообщение */}
            <div className={`transition-all duration-1000 transform ${showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
              <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                <p className="text-2xl sm:text-3xl text-white font-bpdots bg-gradient-to-r from-blue-200 via-white to-green-200 bg-clip-text text-transparent">
                  Welc0me, <span className="text-blue-400 font-bold">/•{username}•/</span>
                </p>
                <div className="mt-4 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                <p className="text-white/70 font-bpdots text-sm mt-4">
                  Ready to test your reflexes?
                </p>
              </div>
            </div>

            {/* Statistics Preview */}
            <div className={`transition-all duration-1000 transform ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-400/20 to-blue-600/10 backdrop-blur-xl border border-blue-400/20 rounded-2xl p-4">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400/30 to-blue-600/20 rounded-xl flex items-center justify-center">
                      <Zap size={20} className="text-blue-400" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold font-bpdots text-blue-400">FAST</div>
                    <div className="text-xs font-bpdots text-white/60">REFLEXES</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-400/20 to-green-600/10 backdrop-blur-xl border border-green-400/20 rounded-2xl p-4">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400/30 to-green-600/20 rounded-xl flex items-center justify-center">
                      <Target size={20} className="text-green-400" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold font-bpdots text-green-400">PRECISE</div>
                    <div className="text-xs font-bpdots text-white/60">ACCURACY</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-400/20 to-purple-600/10 backdrop-blur-xl border border-purple-400/20 rounded-2xl p-4">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400/30 to-purple-600/20 rounded-xl flex items-center justify-center">
                      <Trophy size={20} className="text-purple-400" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold font-bpdots text-purple-400">COMPETE</div>
                    <div className="text-xs font-bpdots text-white/60">GLOBALLY</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Секция с кнопкой игры */}
            <div className={`transition-all duration-1000 transform ${showGameButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
              <div className="flex flex-col items-center space-y-8">
                <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 max-w-lg shadow-2xl">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400/30 to-orange-600/20 rounded-2xl flex items-center justify-center">
                      <Activity size={28} className="text-orange-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-2xl font-bpdots text-white font-bold bg-gradient-to-r from-orange-400 to-orange-200 bg-clip-text text-transparent">
                        REACTION GAME
                      </h3>
                      <p className="text-white/60 font-bpdots text-sm">
                        Neural speed test
                      </p>
                    </div>
                  </div>
                  <p className="text-white/80 font-bpdots text-center leading-relaxed">
                    Test your reflexes and reaction speed in our fast-paced circle-clicking challenge.
                    Compete with players worldwide and climb the global leaderboard.
                  </p>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                  <button
                    onClick={handleStartGame}
                    disabled={isTransitioning}
                    className="relative px-16 py-5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl border-2 border-white/30 text-white rounded-2xl font-bpdots text-2xl font-bold hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-500 hover:scale-110 active:scale-95 hover:shadow-2xl hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transform group-hover:translate-y-1"
                  >
                    <div className="flex items-center space-x-4">
                      <Play size={28} className="text-white fill-current" />
                      <span>{isTransitioning ? 'LOADING...' : 'START GAME'}</span>
                    </div>

                    {/* Button glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/0 via-purple-400/20 to-green-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </button>
                </div>

                {/* Additional game features */}
                <div className="grid grid-cols-2 gap-6 mt-8 w-full max-w-md">
                  <div className="text-center p-4 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:scale-105 transition-transform duration-300">
                    <div className="text-2xl font-bold font-bpdots text-yellow-400">5</div>
                    <div className="text-xs font-bpdots text-white/60">DIFFICULTY MODES</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:scale-105 transition-transform duration-300">
                    <div className="text-2xl font-bold font-bpdots text-green-400">30s</div>
                    <div className="text-xs font-bpdots text-white/60">QUICK ROUNDS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Corner decorations */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-white/20 rounded-tl-2xl z-20"></div>
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-white/20 rounded-tr-2xl z-20"></div>
      <div className="absolute bottom-32 left-8 w-16 h-16 border-l-2 border-b-2 border-white/20 rounded-bl-2xl z-20"></div>
      <div className="absolute bottom-32 right-8 w-16 h-16 border-r-2 border-b-2 border-white/20 rounded-br-2xl z-20"></div>
    </div>
  )
}