// src/app/main/page.tsx - Maximum Sarcasm Edition

'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Skull, Target, Zap } from 'lucide-react'
import { useUser } from '@/hooks/useUser'

export default function MainPage() {
  const router = useRouter()
  const { user, isLoading: userLoading } = useUser()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pageLoaded, setPageLoaded] = useState(false)
  const [titleText, setTitleText] = useState('|')
  const [showButton, setShowButton] = useState(false)
  const [showGreeting, setShowGreeting] = useState(false)
  const [greetingText, setGreetingText] = useState('')
  const [sarcasticMessage, setSarcasticMessage] = useState('')
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

  const username = user?.first_name || 'Anonymous Failure'
  const fullGreeting = `Oh look, it's ${username}...`

  // Саркастичные сообщения для приветствия
  const sarcasticGreetings = [
    "Ready to embarrass yourself again? 🤡",
    "Let's see how badly you'll fail this time... 💀",
    "Another brave soul enters the digital slaughterhouse 🔪",
    "Warning: This game may cause existential crisis 📱",
    "Your reflexes called - they're not coming today 🐌",
    "Narrator: They were not ready. 📰",
    "Plot twist: You're the comedy relief 🎭",
    "Breaking: Local person about to get humbled 📺",
    "Your ego has left the chat 💬",
    "Achievement Unlocked: Overconfidence 🏆"
  ]

  // Сообщения основанные на статистике пользователя
  const getPersonalizedSarcasm = () => {
    if (!user) return sarcasticGreetings[Math.floor(Math.random() * sarcasticGreetings.length)]

    const totalGames = user.total_games || 0
    const bestScore = user.best_score || 0
    const accuracy = user.best_accuracy || 0

    if (totalGames === 0) {
      return "First time? How adorable... this won't go well 🍼"
    }

    if (totalGames > 100) {
      return "Still here? Clearly you enjoy punishment 🔗"
    }

    if (bestScore < 10) {
      return "Your 'best' score is... inspirational. To try harder. 📈"
    }

    if (accuracy < 50) {
      return "Fun fact: Random clicking has 50% accuracy. You're special. ✨"
    }

    if (accuracy > 90) {
      return "Oh, a 'pro' player! This should be... entertaining 🍿"
    }

    if (user.precision_games > 0) {
      return "Back for more precision punishment? Masochist detected 🎯"
    }

    return sarcasticGreetings[Math.floor(Math.random() * sarcasticGreetings.length)]
  }

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
          setTimeout(() => setShowButton(true), 300)
          setTimeout(() => setShowGreeting(true), 600)
        }
      }, 80)

      return () => clearInterval(titleInterval)
    }, 800)

    return () => clearTimeout(titleAnimationTimer)
  }, [pageLoaded])

  // Анимация печатания приветствия
  useEffect(() => {
    if (!showGreeting || userLoading) return

    let currentChar = 0
    const typingInterval = setInterval(() => {
      if (currentChar <= fullGreeting.length) {
        setGreetingText(fullGreeting.slice(0, currentChar))
        currentChar++
      } else {
        clearInterval(typingInterval)
        // Показываем саркастичное сообщение после приветствия
        setTimeout(() => {
          setSarcasticMessage(getPersonalizedSarcasm())
        }, 500)
      }
    }, 60)

    return () => clearInterval(typingInterval)
  }, [showGreeting, fullGreeting, userLoading, user])

  const handleStartGame = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      router.push('/game')
    }, 600)
  }

  const getButtonText = () => {
    if (isTransitioning) return 'PREPARING YOUR DOOM...'

    if (!user) return 'ENTER THE ARENA'

    const totalGames = user.total_games || 0
    const bestScore = user.best_score || 0

    if (totalGames === 0) return 'BEGIN YOUR SUFFERING'
    if (totalGames < 5) return 'TRY NOT TO CRY'
    if (bestScore < 10) return 'MAYBE THIS TIME...'
    if (totalGames > 50) return 'GLUTTON FOR PUNISHMENT'

    return 'FACE YOUR FEARS'
  }

  return (
    <div className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden ${isTransitioning
      ? 'opacity-0 transition-opacity duration-500 ease-in'
      : pageLoaded
        ? 'opacity-100 transition-opacity duration-1000 ease-out'
        : 'opacity-0'
      }`}>

      {/* Background Video with extra darkness for dramatic effect */}
      <div
        className="fixed top-0 left-0 w-full h-full z-0"
        style={{
          filter: 'brightness(0.1) contrast(1.5) grayscale(1)'
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

      {/* Ominous Background Elements */}
      <div className="absolute inset-0 z-10">
        {/* Warning stripes */}
        <div className="absolute top-20 left-20 w-1 h-32 bg-red-500/20 rotate-45"></div>
        <div className="absolute top-40 right-32 w-1 h-24 bg-orange-500/20 -rotate-12"></div>
        <div className="absolute bottom-32 left-16 w-1 h-40 bg-red-500/20 rotate-12"></div>
        <div className="absolute bottom-20 right-20 w-1 h-28 bg-orange-500/20 -rotate-45"></div>

        {/* Danger symbols */}
        <div className="absolute top-1/4 left-1/4 w-3 h-3 text-red-500/30">
          <Skull size={12} />
        </div>
        <div className="absolute top-1/3 right-1/3 w-3 h-3 text-orange-500/30">
          <Target size={12} />
        </div>
        <div className="absolute bottom-1/4 right-1/4 w-3 h-3 text-red-500/30">
          <Zap size={12} />
        </div>
      </div>

      {/* Main Content */}
      <div className="text-center z-20 space-y-12 flex flex-col items-center justify-center">

        {/* Title Section with Warning */}
        <div className="relative">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold font-bpdots tracking-widest text-white">
            {titleText}
          </h1>

          {/* Subtitle when title is complete */}
          {titleText === 'something' && (
            <div className="mt-4 text-red-400/80 font-bpdots text-lg tracking-wider animate-fade-in">
              (that will ruin your day)
            </div>
          )}

          {/* Warning decorative lines */}
          <div className="absolute left-0 top-1/2 w-16 h-px bg-gradient-to-r from-transparent to-red-400/40 transform -translate-y-1/2 -translate-x-20"></div>
          <div className="absolute right-0 top-1/2 w-16 h-px bg-gradient-to-l from-transparent to-red-400/40 transform -translate-y-1/2 translate-x-20"></div>
        </div>

        {/* Action Button with sarcastic text */}
        <div className={`transition-all duration-1000 transform ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
          <div className="relative group">

            {/* Ominous Button Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-orange-500/10 to-red-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

            {/* Main Button */}
            <button
              onClick={handleStartGame}
              disabled={isTransitioning}
              className="relative w-full max-w-sm mx-auto block px-12 py-6 bg-transparent border-2 border-red-400/60 text-white rounded-xl font-bpdots text-xl font-bold hover:border-red-400 transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-red-500/5"
            >
              <div className="flex items-center justify-center space-x-4">
                <Play size={24} className="text-red-400 group-hover:translate-x-1 transition-transform duration-300" />
                <span className="tracking-wider">
                  {getButtonText()}
                </span>
              </div>

              {/* Danger accent lines */}
              <div className="absolute top-0 left-8 w-8 h-px bg-red-400/40 transform -translate-y-2"></div>
              <div className="absolute bottom-0 right-8 w-8 h-px bg-red-400/40 transform translate-y-2"></div>
            </button>

            {/* Disclaimer */}
            {showButton && (
              <div className="mt-3 text-center animate-fade-in">
                <p className="text-red-400/60 font-bpdots text-xs italic">
                  ⚠️ Warning: May cause rage, tears, and existential dread ⚠️
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sarcastic User Greeting */}
        <div className={`transition-all duration-1000 transform ${showGreeting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
          {userLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-1 h-1 bg-red-400/60 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-red-400/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1 h-1 bg-red-400/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xl font-bpdots text-white/80 tracking-wider">
                {greetingText}
                {greetingText.length < fullGreeting.length && <span className="animate-pulse">|</span>}
              </p>

              {/* Sarcastic message */}
              {sarcasticMessage && (
                <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3 max-w-md mx-auto animate-fade-in">
                  <p className="text-red-300/80 font-bpdots text-sm italic">
                    {sarcasticMessage}
                  </p>
                </div>
              )}

              {/* Quick stats roast */}
              {user && user.total_games > 0 && (
                <div className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-3 max-w-md mx-auto animate-fade-in">
                  <p className="text-orange-300/80 font-bpdots text-xs">
                    📊 Quick Reminder: {user.total_games} attempts, {user.best_score} best score
                    {user.best_accuracy < 70 && " (ouch, that accuracy though...)"}
                    {user.total_games > 20 && user.best_score < 15 && " 🤦‍♂️"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Corner Warning Elements */}
      <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-red-400/30 z-20"></div>
      <div className="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-red-400/30 z-20"></div>
      <div className="absolute bottom-24 left-8 w-12 h-12 border-l-2 border-b-2 border-red-400/30 z-20"></div>
      <div className="absolute bottom-24 right-8 w-12 h-12 border-r-2 border-b-2 border-red-400/30 z-20"></div>

      {/* Hidden disclaimer */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <p className="text-white/20 font-bpdots text-xs">
          * No self-esteem was harmed in the making of this game (that&apos;s your job)
        </p>
      </div>
    </div>
  )
}