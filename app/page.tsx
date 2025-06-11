// src/app/page.tsx

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@nextui-org/react'
import { userService, type TelegramUser, type User } from '@/lib/supabase'

interface AuthState {
    isChecking: boolean
    isRegistering: boolean
    user: User | null
    telegramUser: TelegramUser | null
    error: string | null
}

export default function IntroPage() {
    const router = useRouter()
    const videoRef = useRef<HTMLVideoElement>(null)

    // Состояние аутентификации
    const [authState, setAuthState] = useState<AuthState>({
        isChecking: true,
        isRegistering: false,
        user: null,
        telegramUser: null,
        error: null
    })

    // Состояние загрузки контента
    const [contentState, setContentState] = useState({
        isLoading: true,
        loadProgress: 0,
        fontLoaded: false,
        isReady: false,
        isPlaying: false,
        videoError: false
    })

    // Получение данных пользователя Telegram
    const getTelegramUser = useCallback((): TelegramUser | null => {
        if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
            return null
        }

        const tg = window.Telegram.WebApp
        const user = tg.initDataUnsafe?.user

        if (!user || !user.id) {
            return null
        }

        return {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            language_code: user.language_code,
            is_premium: user.is_premium
        }
    }, [])

    // Проверка существования пользователя в базе данных
    const checkUserExists = useCallback(async (telegramUser: TelegramUser): Promise<User | null> => {
        try {
            const existingUser = await userService.findByTelegramId(telegramUser.id)
            return existingUser
        } catch (error) {
            console.error('Ошибка при проверке пользователя:', error)
            throw error
        }
    }, [])

    // Регистрация нового пользователя
    const registerUser = useCallback(async (telegramUser: TelegramUser): Promise<User> => {
        try {
            setAuthState(prev => ({ ...prev, isRegistering: true, error: null }))
            const newUser = await userService.create(telegramUser)
            return newUser
        } catch (error) {
            console.error('Ошибка при регистрации:', error)
            setAuthState(prev => ({
                ...prev,
                isRegistering: false,
                error: 'Ошибка при регистрации пользователя'
            }))
            throw error
        }
    }, [])

    // Инициализация авторизации
    const initializeAuth = useCallback(async () => {
        try {
            const telegramUser = getTelegramUser()

            if (!telegramUser) {
                setAuthState(prev => ({
                    ...prev,
                    isChecking: false,
                    error: 'Данные пользователя Telegram недоступны'
                }))
                return
            }

            setAuthState(prev => ({ ...prev, telegramUser }))

            const existingUser = await checkUserExists(telegramUser)

            if (existingUser) {
                // Пользователь найден - перенаправляем на главную страницу
                setAuthState(prev => ({ ...prev, user: existingUser, isChecking: false }))
                router.push('/main')
            } else {
                // Пользователь не найден - показываем кнопки регистрации
                setAuthState(prev => ({ ...prev, isChecking: false }))
            }
        } catch (error) {
            console.error('Ошибка инициализации:', error)
            setAuthState(prev => ({
                ...prev,
                isChecking: false,
                error: 'Ошибка подключения к базе данных'
            }))
        }
    }, [getTelegramUser, checkUserExists, router])

    // Обработка регистрации с видео
    const handleInitWithVideo = async () => {
        if (!authState.telegramUser) return

        try {
            const video = videoRef.current
            if (!video || contentState.videoError) {
                handleQuickInit()
                return
            }

            setContentState(prev => ({ ...prev, isPlaying: true }))

            // Регистрируем пользователя параллельно с проигрыванием видео
            const userPromise = registerUser(authState.telegramUser)

            video.currentTime = 0
            await video.play()

            // Ждем завершения регистрации
            await userPromise

        } catch (error) {
            console.error('Ошибка при воспроизведении видео или регистрации:', error)
            // Если видео не удалось воспроизвести, используем быструю регистрацию
            handleQuickInit()
        }
    }

    // Обработка быстрой регистрации без видео
    const handleQuickInit = async () => {
        if (!authState.telegramUser) return

        try {
            await registerUser(authState.telegramUser)
            router.push('/main')
        } catch (error) {
            console.error('Ошибка быстрой регистрации:', error)
        }
    }

    // Инициализация Service Worker
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('ServiceWorker зарегистрирован'))
                .catch(err => console.error('ServiceWorker регистрация не удалась:', err))
        }

        // Проверка загрузки шрифта
        if ('fonts' in document) {
            document.fonts.load('1rem "BPDots Diamond"')
                .then(() => setContentState(prev => ({ ...prev, fontLoaded: true })))
                .catch(() => setContentState(prev => ({ ...prev, fontLoaded: true })))
        } else {
            setTimeout(() => setContentState(prev => ({ ...prev, fontLoaded: true })), 1000)
        }
    }, [])

    // Инициализация видео
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handleLoadedMetadata = () => {
            video.volume = 1
            setContentState(prev => ({ ...prev, isReady: true }))
        }

        const handleProgress = () => {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1)
                const duration = video.duration
                if (duration > 0) {
                    const progress = (bufferedEnd / duration) * 100
                    setContentState(prev => ({ ...prev, loadProgress: progress }))
                }
            }
        }

        const handleCanPlayThrough = () => {
            setContentState(prev => ({ ...prev, isLoading: false }))
        }

        const handleEnded = () => {
            router.push('/main')
        }

        const handleError = (e: Event) => {
            console.error('Ошибка видео:', e)
            setContentState(prev => ({ ...prev, videoError: true, isLoading: false }))
        }

        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('progress', handleProgress)
        video.addEventListener('canplaythrough', handleCanPlayThrough)
        video.addEventListener('ended', handleEnded)
        video.addEventListener('error', handleError)

        video.load()

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('progress', handleProgress)
            video.removeEventListener('canplaythrough', handleCanPlayThrough)
            video.removeEventListener('ended', handleEnded)
            video.removeEventListener('error', handleError)
        }
    }, [router])

    // Инициализация авторизации после загрузки компонента
    useEffect(() => {
        initializeAuth()
    }, [initializeAuth])

    // Состояние загрузки
    const isInitialLoading = authState.isChecking ||
        (contentState.isLoading && !contentState.videoError) ||
        !contentState.fontLoaded

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            {/* Экран загрузки */}
            {isInitialLoading && (
                <div className="loader-container">
                    <div className="progress-bar">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${contentState.loadProgress}%` }}
                        />
                    </div>
                    <p className="text-white mt-4 text-sm font-bpdots">
                        {authState.isChecking ? 'Проверка пользователя...' : `Загрузка... ${Math.round(contentState.loadProgress)}%`}
                    </p>
                </div>
            )}

            {/* Экран ошибки */}
            {authState.error && !isInitialLoading && (
                <div className="loader-container">
                    <p className="text-white text-center font-bpdots mb-4">{authState.error}</p>
                    <button
                        onClick={initializeAuth}
                        className="px-4 py-2 bg-white text-black rounded font-bpdots"
                    >
                        Повторить
                    </button>
                </div>
            )}

            {/* Экран регистрации */}
            {!authState.user && !authState.isChecking && !authState.error && authState.telegramUser && (
                <div className="loader-container">
                    {authState.isRegistering ? (
                        <div className="text-center">
                            <Spinner size="lg" color="white" />
                            <p className="text-white mt-4 font-bpdots">Регистрация...</p>
                        </div>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold font-bpdots text-white mb-2">
                                    Добро пожаловать!
                                </h1>
                                <p className="text-gray-400 font-bpdots">
                                    {authState.telegramUser.first_name}, выберите способ входа
                                </p>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={handleInitWithVideo}
                                    disabled={contentState.videoError}
                                    className="block px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bpdots text-xl hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    -init-/
                                </button>

                                <button
                                    onClick={handleQuickInit}
                                    className="block px-6 py-3 bg-transparent border border-white/60 text-white/80 rounded-lg font-bpdots text-sm hover:bg-white/5 hover:border-white hover:text-white transition-colors"
                                >
                                    Быстрый вход (для слабых устройств)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Видео контейнер */}
            <div className={`video-container ${contentState.isPlaying ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
                <video
                    ref={videoRef}
                    className="video-player"
                    playsInline
                    preload="auto"
                >
                    <source src="/videos/intro.mp4" type="video/mp4" />
                    Ваш браузер не поддерживает воспроизведение видео.
                </video>
            </div>
        </div>
    )
}