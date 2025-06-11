// src/app/main/page.tsx

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function MainPage() {
  const router = useRouter()
  const [username, setUsername] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pageLoaded, setPageLoaded] = useState(false)
  const [titleText, setTitleText] = useState('|')
  const [showWelcome, setShowWelcome] = useState(false)
  const [showGameButton, setShowGameButton] = useState(false)
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

          // Показ кнопки игры
          setTimeout(() => {
            setShowGameButton(true)
          }, 300)
        }
      }, 50)

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
    <div className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden ${isTransitioning
      ? 'opacity-0 transition-opacity duration-700 ease-in'
      : pageLoaded
        ? 'opacity-100 transition-opacity duration-1000 ease-out'
        : 'opacity-0 transition-opacity duration-1000 ease-out'
      }`}>

      {/* Фоновое видео */}
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
          aria-label="Фоновое декоративное видео главной страницы"
        >
          <source src="/videos/mainbg.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="text-center z-10 space-y-8">
        {/* Анимированный заголовок */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold font-bpdots tracking-wider min-h-[60px] flex items-center justify-center">
            {titleText}
          </h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-lg text-gray-400 font-bpdots">Loading user data...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Приветственное сообщение */}
            <div className={`transition-all duration-700 ${showWelcome ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
              }`}>
              <p className="text-xl text-gray-300 font-bpdots">
                Welc0me, /•{username}•/
              </p>
            </div>

            {/* Секция с кнопкой игры */}
            <div className={`transition-all duration-700 ${showGameButton ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
              }`}>
              <div className="flex flex-col items-center space-y-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 max-w-sm">
                  <h3 className="text-lg font-bpdots text-white mb-3">REACTION GAME</h3>
                  <p className="text-sm text-gray-400 font-bpdots">
                    Test your reflexes and reaction speed in our fast-paced circle-clicking challenge
                  </p>
                </div>

                <button
                  onClick={handleStartGame}
                  disabled={isTransitioning}
                  className="px-12 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bpdots text-lg hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTransitioning ? 'LOADING...' : 'START GAME'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}